const express = require("express");
const { exec } = require("child_process");
const client = require("prom-client");   // ← add this

// ─── Prometheus Metrics ──────────────────────────────────────
const register = new client.Registry();
client.collectDefaultMetrics({ register }); // CPU, memory, event loop lag, etc.

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

// ─── Metrics Tracking ───────────────────────────────────────
const startTime = Date.now();
let totalRequests = 0;
let successfulDeploys = 0;
let failedDeploys = 0;
// ─────────────────────────────────────────────────────────────

const app = express();
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

const version = "api-enabled";

app.get("/", (req, res) => {
  res.send(`App is running 🚀 | Version: ${version}`);
});

app.get("/version", (req, res) => {
  exec("docker ps --filter name=deployed-app --format '{{.Image}}'", (err, stdout) => {
    if (err) {
      return res.send("Error fetching version");
    }
    res.send("Running: " + stdout);
  });
});

// 🚀 DEPLOY API
app.post("/deploy/:version", (req, res) => {
  const version = req.params.version;

  const deployStart = Date.now();                              // ⏱ track deploy time

  const cmd = `
docker rm -f deployed-app 2>/dev/null || true
docker pull unfilteredvivek/deployment-tracker:${version}
docker run -d -p 3001:3000 --name deployed-app -v /var/run/docker.sock:/var/run/docker.sock unfilteredvivek/deployment-tracker:${version}
`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      failedDeploys++;                                         // ❌ track failure
      deployFailureCounter.inc(); 
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
  deploySuccessCounter.inc();                          // ← add
  const deployTime = ((Date.now() - deployStart) / 1000).toFixed(2);
  deployDurationSeconds.observe(parseFloat(deployTime)); // ← add
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

  const rollbackStart = Date.now();                            // ⏱ track rollback time

  const cmd = `
docker rm -f deployed-app 2>/dev/null || true
docker pull unfilteredvivek/deployment-tracker:${version}
docker run -d -p 3001:3000 --name deployed-app -v /var/run/docker.sock:/var/run/docker.sock unfilteredvivek/deployment-tracker:${version}
`;

  exec(cmd, (err, stdout, stderr) => {
  if (err) {
    failedDeploys++;
    deployFailureCounter.inc();                              // ← add
    return res.status(500).json({
      success: false,
      message: `Rollback failed ❌`,
      error: stderr
    });
  }

  successfulDeploys++;                                       // ← add
  deploySuccessCounter.inc();                                // ← add
  const rollbackTime = ((Date.now() - rollbackStart) / 1000).toFixed(2);
  rollbackDurationSeconds.observe(parseFloat(rollbackTime)); // ← add
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
    if (err) {
      return res.send(`Error fetching logs ❌ \n ${stderr}`);
    }
    res.send(stdout || stderr);
  });
});

// ─── Health Check Endpoint ───────────────────────────────────
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