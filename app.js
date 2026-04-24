const { exec } = require("child_process");

const express = require("express");

const app = express();

const VERSION = "api-enabled";

app.get("/", (req, res) => {
  res.send(`App is running 🚀 | Version: ${VERSION}`);
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", version: VERSION });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});

app.post("/deploy/:version", (req, res) => {
  const version = req.params.version;

  const cmd = `
    docker pull unfilteredvivek/deployment-tracker:${version} &&
    docker stop app || true &&
    docker rm app || true &&
    docker run -d -p 3000:3000 --name app unfilteredvivek/deployment-tracker:${version}
  `;

  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      console.error(stderr);
      return res.status(500).send("Deployment failed");
    }
    res.send(`Deployed version ${version}`);
  });
});

app.get("/version", (req, res) => {
  res.send(`Current Version: ${VERSION}`);
});