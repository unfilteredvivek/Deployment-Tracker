# 🚀 Deployment Tracker - CI/CD DevOps Project

A full-stack DevOps project that automates Docker image build, push, and deployment using GitHub Actions, Docker Hub, and AWS EC2.

The project also includes a live deployment dashboard for:
- Deploying versions
- Monitoring running containers
- Viewing logs
- Tracking deployed image versions

---

# 📌 Project Overview

This project demonstrates an end-to-end CI/CD workflow:

1. Developer pushes code to GitHub
2. GitHub Actions pipeline starts automatically
3. Docker image is built
4. Image is pushed to Docker Hub
5. EC2 server pulls latest image
6. Existing container is replaced with new version
7. Dashboard shows deployment status and logs

---

# 🏗️ Architecture

```text
Developer
   ↓
GitHub Repository
   ↓
GitHub Actions (CI/CD)
   ↓
Docker Hub (Artifact Registry)
   ↓
AWS EC2 Server
   ↓
Docker Container
   ↓
Deployment Dashboard# test Sun, Jun 14, 2026 10:04:47 PM
# test Sun, Jun 14, 2026 10:07:47 PM
# test Sun, Jun 14, 2026 10:10:28 PM
