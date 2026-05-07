const express = require("express");
const { exec } = require("child_process");

const app = express();

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

const cmd = `
docker rm -f deployed-app 2>/dev/null || true
docker pull unfilteredvivek/deployment-tracker:${version}
docker run -d -p 3001:3000 --name deployed-app unfilteredvivek/deployment-tracker:${version}
`;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
     console.log("ERROR:", err);
     console.log("STDERR:", stderr);
     return res.send(`Deployment failed ❌ \n ${stderr}`);
   }
   res.send(`Deployed version: ${version} ✅`);
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

app.listen(3000, () => {
  console.log("Server running on port 3000");
  console.log("🔥 DEPLOY TIME:", new Date().toISOString());
  console.log("🔥 VERSION:", process.env.VERSION);
});