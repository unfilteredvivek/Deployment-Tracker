const express = require("express");

const app = express();

const VERSION = "v2";

app.get("/", (req, res) => {
  res.send(`App is running 🚀 | Version: ${VERSION}`);
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", version: VERSION });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});