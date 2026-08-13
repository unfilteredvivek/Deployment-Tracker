const express = require("express");
const { exec } = require("child_process");
const client = require("prom-client");
const { Pool } = require('pg');
const path = require("path");

// ─── Database Connection ─────────────────────────────────────
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: 'deployment_tracker',
  user: 'dt_admin',
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS deployments (
    id               SERIAL PRIMARY KEY,
    action           VARCHAR(10) NOT NULL,
    version          VARCHAR(50) NOT NULL,
    success          BOOLEAN NOT NULL,
    duration_seconds DECIMAL(6,2),
    error_message    TEXT,
    created_at       TIMESTAMP DEFAULT NOW()
  );
`).then(() => console.log('✅ Deployments table ready'))
  .catch(err => console.error('❌ DB init error:', err.message));

async function logDeployment(action, version, success, duration, errorMsg = null) {
  try {
    await pool.query(
      `INSERT INTO deployments (action, version, success, duration_seconds, error_message)
       VALUES ($1, $2, $3, $4, $5)`,
      [action, version, success, duration, errorMsg]
    );
  } catch (err) {
    console.error('❌ Failed to log deployment:', err.message);
  }
}
// ─────────────────────────────────────────────────────────────

// ─── Prometheus Metrics ──────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [register]
});

const deploySuccessCounter = new client.Counter({
  name: "deploy_success_total",
  help: "Total successful deployments",
  registers: [register]
});

const deployFailureCounter = new client.Counter({
  name: "deploy_failure_total",
  help: "Total failed deployments",
  registers: [register]
});

const deployDurationSeconds = new client.Histogram({
  name: "deploy_duration_seconds",
  help: "Duration of deployments in seconds",
  buckets: [1, 2, 5, 10, 20, 30, 60],
  registers: [register]
});

const rollbackDurationSeconds = new client.Histogram({
  name: "rollback_duration_seconds",
  help: "Duration of rollbacks in seconds",
  buckets: [1, 2, 5, 10, 20, 30, 60],
  registers: [register]
});
// ─────────────────────────────────────────────────────────────

// ─── Metrics Tracking ────────────────────────────────────────
const startTime = Date.now();
let totalRequests = 0;
let successfulDeploys = 0;
let failedDeploys = 0;
// ─────────────────────────────────────────────────────────────

const app = express();
app.use(express.static(path.join(__dirname)));
const cors = require("cors");
app.use(cors());
app.use(express.json());

// Count every incoming request
app.use((req, res, next) => {
  totalRequests++;
  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.route ? req.route.path : req.path,
      status: res.statusCode
    });
  });
  next();
});

app.get("/version", (req, res) => {
  exec("docker ps --filter name=deployed-app --format '{{.Image}}'", (err, stdout) => {
    if (err) return res.send("Error fetching version");
    res.send("Running: " + stdout);
  });
});

// 🚀 DEPLOY API
app.post("/deploy/:version", (req, res) => {
  const version = req.params.version;
  const deployStart = Date.now();

  const ecrRegistry = "395671099497.dkr.ecr.ap-south-1.amazonaws.com";
  const cmd = `
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ${ecrRegistry}
docker rm -f deployed-app 2>/dev/null || true
docker pull ${ecrRegistry}/deployment-tracker:${version}
docker run -d -p 3002:3000 --name deployed-app -v /var/run/docker.sock:/var/run/docker.sock ${ecrRegistry}/deployment-tracker:${version}
`;

  exec(cmd, async (err, stdout, stderr) => {
    if (err) {
      failedDeploys++;
      deployFailureCounter.inc();
      await logDeployment('deploy', version, false, null, stderr);
      console.log("ERROR:", err);
      console.log("STDERR:", stderr);
      return res.status(500).json({
        success: false,
        message: `Deployment failed ❌`,
        error: stderr,
        total_failed: failedDeploys
      });
    }

    successfulDeploys++;
    deploySuccessCounter.inc();
    const deployTime = ((Date.now() - deployStart) / 1000).toFixed(2);
    deployDurationSeconds.observe(parseFloat(deployTime));
    await logDeployment('deploy', version, true, deployTime);
    console.log(`✅ Deployed ${version} in ${deployTime}s`);

    res.json({
      success: true,
      message: `Deployed version: ${version} ✅`,
      deploy_time_seconds: deployTime,
      total_successful: successfulDeploys
    });
  });
});

// 🔁 ROLLBACK API
app.post("/rollback/:version", (req, res) => {
  const version = req.params.version;
  const rollbackStart = Date.now();

  const ecrRegistry = "395671099497.dkr.ecr.ap-south-1.amazonaws.com";
  const cmd = `
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin ${ecrRegistry}
docker rm -f deployed-app 2>/dev/null || true
docker pull ${ecrRegistry}/deployment-tracker:${version}
docker run -d -p 3002:3000 --name deployed-app -v /var/run/docker.sock:/var/run/docker.sock ${ecrRegistry}/deployment-tracker:${version}
`;

  exec(cmd, async (err, stdout, stderr) => {
    if (err) {
      failedDeploys++;
      deployFailureCounter.inc();
      await logDeployment('rollback', version, false, null, stderr);
      return res.status(500).json({
        success: false,
        message: `Rollback failed ❌`,
        error: stderr
      });
    }

    successfulDeploys++;
    deploySuccessCounter.inc();
    const rollbackTime = ((Date.now() - rollbackStart) / 1000).toFixed(2);
    rollbackDurationSeconds.observe(parseFloat(rollbackTime));
    await logDeployment('rollback', version, true, rollbackTime);
    console.log(`🔁 Rolled back to ${version} in ${rollbackTime}s`);

    res.json({
      success: true,
      message: `Rolled back to version: ${version} ✅`,
      rollback_time_seconds: rollbackTime
    });
  });
});

app.get("/logs", (req, res) => {
  exec("docker logs deployed-app --since 10s", (err, stdout, stderr) => {
    if (err) return res.send(`Error fetching logs ❌ \n ${stderr}`);
    res.send(stdout || stderr);
  });
});

// ─── History Endpoint ─────────────────────────────────────────
app.get("/history", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT action, version, success, duration_seconds, error_message, created_at
       FROM deployments ORDER BY created_at DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ─────────────────────────────────────────────────────────────

// ─── Health Check ─────────────────────────────────────────────
app.get("/health", (req, res) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  res.json({
    status:             "healthy",
    uptime_seconds:     uptimeSeconds,
    uptime_human:       `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`,
    total_requests:     totalRequests,
    successful_deploys: successfulDeploys,
    failed_deploys:     failedDeploys,
    memory_mb:          Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    node_version:       process.version,
    timestamp:          new Date().toISOString()
  });
});
// ─────────────────────────────────────────────────────────────

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
  console.log("🔥 DEPLOY TIME:", new Date().toISOString());
  console.log("🔥 VERSION:", process.env.VERSION);
});
