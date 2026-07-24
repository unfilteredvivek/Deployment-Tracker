# 🚀 Deployment Tracker - Full-Stack DevOps Automation Project

A full-stack DevOps project demonstrating automated CI/CD, containerized deployment, Kubernetes orchestration, and real-time observability — built on AWS EC2 with Docker, GitHub Actions, Kubernetes, Prometheus, and Grafana.

The project includes a live deployment dashboard for:
- Deploying and rolling back app versions
- Monitoring running containers
- Viewing real-time logs
- Tracking deployed image versions

---

## 📌 Project Overview

This project demonstrates an end-to-end DevOps workflow across two parallel environments — Docker (application-managed) and Kubernetes (orchestrator-managed):

1. Developer pushes code to GitHub
2. GitHub Actions pipeline triggers automatically
3. Docker image is built and pushed to Docker Hub
4. Pipeline SSHs into EC2 and updates the **controller** container (dashboard + API)
5. Dashboard allows deploying/rolling back a separate **deployed-app** container via its own API
6. Kubernetes (Minikube) runs the app as a managed Deployment, supporting native rollouts (`kubectl set image`) and rollbacks (`kubectl rollout undo`)
7. Prometheus scrapes custom application metrics and Kubernetes state metrics
8. Grafana visualizes HTTP traffic, CPU/memory usage, deploy counters, and rollout activity

---

## 🏗️ Architecture

```text
Developer
   ↓
GitHub Repository
   ↓
GitHub Actions (CI/CD)
   ↓
Docker Hub (Image Registry)
   ↓
AWS EC2 (m7i-flex.large)
   ├── controller (Docker) — dashboard + deploy/rollback API, port 3001
   ├── deployed-app (Docker) — managed workload, port 3002
   └── Minikube (Kubernetes)
         ├── deployment-tracker Deployment/Pod
         ├── Prometheus + Grafana (via kube-prometheus-stack)
         └── ServiceMonitor scraping custom app metrics
```

**Key design decision:** the `controller` (API/dashboard) and `deployed-app` (managed workload) are deliberately separate containers. This mirrors real-world control-plane vs. workload separation — ensuring a deploy/rollback action can never accidentally terminate the very server issuing that command.

---

## 🔧 Tech Stack

- **Backend:** Node.js, Express
- **Containerization:** Docker
- **CI/CD:** GitHub Actions
- **Orchestration:** Kubernetes (Minikube), Helm
- **Observability:** Prometheus (`prom-client`, `kube-prometheus-stack`), Grafana
- **Cloud:** AWS EC2

---

## 📊 Observability

Custom application metrics exposed via `/metrics`:
- `http_requests_total`
- `deploy_success_total` / `deploy_failure_total`
- `deploy_duration_seconds` / `rollback_duration_seconds`

Grafana dashboard includes 5 panels: HTTP request rate, CPU usage, memory usage, application deploy success/failure, and Kubernetes rollout activity (via `kube-state-metrics`).

---

## 🚧 Roadmap

- [ ] Terraform for infrastructure provisioning
- [ ] Amazon ECR (replacing Docker Hub)
- [ ] IAM least-privilege roles
- [ ] CloudWatch + SNS alerting
- [ ] Application Load Balancer