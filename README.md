# 🚀 Deployment Tracker - Full-Stack DevOps Automation Platform

A full-stack DevOps project demonstrating automated CI/CD, containerized deployment, Kubernetes orchestration, infrastructure as code, cloud security, and real-time observability — built on AWS with Terraform, Docker, GitHub Actions, Kubernetes, Amazon ECR, Amazon RDS, Prometheus, and Grafana.

The project includes a live deployment dashboard for:
- Deploying and rolling back app versions
- Monitoring running containers
- Viewing real-time logs
- Tracking deployed image versions
- Viewing persistent deployment history (three-tier data layer)

---

## 📌 Project Overview

This project demonstrates an end-to-end DevOps workflow across three layers — infrastructure, application deployment, and orchestration:

1. Developer pushes code to GitHub
2. GitHub Actions pipeline triggers automatically
3. Docker image is built and pushed to **Amazon ECR** (private container registry)
4. Pipeline SSHs into EC2 and updates the **controller** container (dashboard + API)
5. Dashboard allows deploying/rolling back a separate **deployed-app** container via its own API — each deploy/rollback event is persisted to **Amazon RDS (PostgreSQL)**
6. Kubernetes (Minikube) runs the app as a managed Deployment, supporting native rollouts (`kubectl set image`) and rollbacks (`kubectl rollout undo`)
7. Prometheus scrapes custom application metrics and Kubernetes state metrics
8. Grafana visualizes HTTP traffic, CPU/memory usage, deploy counters, and rollout activity
9. CloudWatch monitors EC2-level health and alerts via SNS on sustained high CPU
10. All AWS infrastructure — EC2, security groups, IAM roles, ECR, RDS, CloudWatch, SNS — is provisioned and managed as code using **Terraform**

---

## 🏗️ Architecture

```text
Developer
   ↓
GitHub Repository
   ↓
GitHub Actions (CI/CD)
   ↓
Amazon ECR (Private Image Registry)
   ↓
AWS EC2 (m7i-flex.large) — provisioned via Terraform
   ├── controller (Docker) — dashboard + deploy/rollback API, port 3001
   │     └── connects to → Amazon RDS (PostgreSQL) — deployment history
   ├── deployed-app (Docker) — managed workload, port 3002
   └── Minikube (Kubernetes)
         ├── deployment-tracker Deployment/Pod
         ├── Prometheus + Grafana (via kube-prometheus-stack)
         └── ServiceMonitor scraping custom app metrics

AWS CloudWatch → SNS (Email) — infrastructure-level alerting, independent of app health
```

**Key design decisions:**

- **Controller / deployed-app separation:** the API/dashboard and the managed workload run as deliberately separate containers. This mirrors real-world control-plane vs. workload separation — ensuring a deploy/rollback action can never accidentally terminate the very server issuing that command.
- **Three-tier data layer:** deployment/rollback history is persisted to Amazon RDS rather than kept in application memory, so history survives container restarts — verified by restarting the `controller` container and confirming prior records remain queryable.
- **Credential-free registry access:** EC2 authenticates to ECR via an attached IAM instance role (read-only), while the CI/CD pipeline uses a separate, dedicated IAM user scoped to ECR push access only — no long-lived credentials stored on the server.
- **Infrastructure-level alerting independent of the app:** CloudWatch runs external to the EC2 instance, so it can alert on instance-level failure even in scenarios where the in-cluster Prometheus/Grafana stack itself might be affected.

---

## 🔧 Tech Stack

- **Backend:** Node.js, Express
- **Database:** Amazon RDS (PostgreSQL)
- **Containerization:** Docker
- **Container Registry:** Amazon ECR
- **CI/CD:** GitHub Actions
- **Orchestration:** Kubernetes (Minikube), Helm
- **Infrastructure as Code:** Terraform
- **Cloud:** AWS (EC2, ECR, RDS, IAM, CloudWatch, SNS, VPC/Security Groups)
- **Observability:** Prometheus (`prom-client`, `kube-prometheus-stack`), Grafana
- **Alerting:** Amazon CloudWatch, Amazon SNS

---

## 📊 Observability

Custom application metrics exposed via `/metrics`:
- `http_requests_total`
- `deploy_success_total` / `deploy_failure_total`
- `deploy_duration_seconds` / `rollback_duration_seconds`

Grafana dashboard includes 5 panels: HTTP request rate, CPU usage, memory usage, application deploy success/failure, and Kubernetes rollout activity (via `kube-state-metrics`).

**Infrastructure-level alerting:** a CloudWatch alarm monitors EC2 CPU utilization and publishes to an SNS topic (email subscription) when usage exceeds 80% for a sustained period — verified end-to-end via live load testing, including both the alarm trigger and recovery notification.

---

## 🗄️ Data Persistence

Deployment and rollback events are recorded to a PostgreSQL `deployments` table (Amazon RDS), capturing action type, version, success/failure, duration, and error details where applicable. A `/history` endpoint exposes the last 20 records, surfaced in the dashboard UI. This closes the gap from the original two-tier design, where deployment counters lived only in application memory and reset on every restart.

---

## 🔐 Security & IAM

Access is scoped using least-privilege IAM policies, built iteratively:
- **EC2 instance role:** read-only ECR access only (`AmazonEC2ContainerRegistryReadOnly`) — no credentials stored on the server
- **CI/CD IAM user:** scoped to ECR push permissions only, separate from infrastructure-provisioning credentials
- **Terraform IAM user:** custom policy limited to EC2, security groups, IAM role management (scoped to project-specific role ARNs), ECR, RDS, and CloudWatch/SNS — replacing initial `AdministratorAccess` entirely, verified via a clean `terraform plan` with zero drift

---

## 🚧 Roadmap

- [ ] Application Load Balancer
- [ ] Alertmanager-based in-cluster alerting (complementing CloudWatch's infrastructure-level alerts)
- [ ] Second portfolio project
