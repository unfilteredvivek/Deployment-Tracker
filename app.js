const express = require("express");
const { exec } = require("child_process");

const app = express();

const VERSION = "api-enabled";

app.get("/", (req, res) => {
  res.send(`App is running 🚀 | Version: ${VERSION}`);
});

app.get("/version", (req, res) => {
  exec("docker ps --filter name=app --format '{{.Image}}'", (err, stdout) => {
    if (err) return res.send("Error fetching version");
    res.send(`Running: ${stdout}`);
  });
});

// 🚀 DEPLOY API
app.post("/deploy/:version", (req, res) => {
  const version = req.params.version;

  const cmd = `
    docker pull unfilteredvivek/deployment-tracker:${version} &&
    docker stop app || true &&
    docker rm app || true &&
    docker run -d -p 3000:3000 --name app unfilteredvivek/deployment-tracker:${version}
  `;

  exec(cmd, (err, stdout, stderr) => {
    if (err) return res.send("Deployment failed ❌");
    res.send(`Deployed version: ${version} ✅`);
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});