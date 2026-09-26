# NER-Mind: AI-Based Cognitive Gaming & Memory Assistance Platform

[![SIH Problem Statement](https://img.shields.io/badge/SIH%202026-Problem%2026003-blue.svg)](https://www.sih.gov.in)
[![Testing Suite](https://img.shields.io/badge/Tests-76%2F76%20Passing%20(100%25)-brightgreen.svg)]()
[![Security Baseline](https://img.shields.io/badge/Security-OWASP%20ASVS%205.0%20Compliant-success.svg)]()
[![PWA Ready](https://img.shields.io/badge/PWA-Offline%20First%20Installable-orange.svg)]()

> **SIH Problem Statement 26003:** AI-Based Cognitive Gaming and Memory Assistance Platform for Elderly Dementia Patients in the North Eastern Region (NER).  
> **Core Innovation:** **Closed-Loop Real-Life Cognitive Adaptation** — We do not optimize only for game scores. We evaluate whether cognitive exercises transfer to everyday activities in rural North Eastern households.  
> **Clinical Non-Diagnostic Policy:** This platform **does not diagnose dementia**, determine clinical staging, predict progression rates, or recommend medications. It reports observed task-performance trends and recommends caregiver / health-worker review when persistent declines are detected.

---

## 🌟 The Core Innovation: Closed-Loop Real-Life Adaptation

```
   ┌─────────────────────────────────────────────────────────────┐
   │ 1. REAL-LIFE BASELINE TASK (e.g., Morning Tea Routine)      │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 2. COGNITIVE ANALYSIS (Sequencing & Attention Baseline)     │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 3. PERSONALIZED DRILLS (Assam Tea, Bamboo Jaapi, Gamusa)    │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 4. ADAPTIVE DIFFICULTY (Moving Window, Anti-Hysteresis)     │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 5. CROSS-CONTEXT TRAINING (Kitchen ➔ Market ➔ Routine)      │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 6. REAL-LIFE VERIFICATION TASK (Post-Training Re-test)      │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 7. TRANSFER ANALYSIS (Δ Transfer Index & Confidence)        │
   └──────────────────────────────┬──────────────────────────────┘
                                  ▼
   ┌─────────────────────────────────────────────────────────────┐
   │ 8. CAREGIVER VISIBILITY ("Observed performance trend")      │
   └─────────────────────────────────────────────────────────────┘
```

---

## 🏛️ System Architecture

- **Shared Core Engine (`packages/core`):** TypeScript-first deterministic cognitive scoring, bounded adaptive difficulty engine, transfer analysis engine, personal memory schemas, and cryptographic sync outbox protocol.
- **Patient PWA (`packages/patient-app`):** Accessible, high-contrast, offline-first Progressive Web Application with 6 localized cognitive exercises, IndexedDB durability, and 7-language regional audio architecture (Assamese, Bengali, Manipuri, Khasi, Bodo, Hindi, English).
- **Caregiver & Server API (`packages/server`):** Node.js / Express backend implementing OWASP ASVS 5.0 security baseline, Scrypt password hashing, session tokens in PostgreSQL, durable sync deduplication, and non-diagnostic caregiver trend views.

---

## 🚀 One-Command Deployment

For judging and staging environments with Docker installed:

```bash
# 1. Clone repository
git clone https://github.com/your-org/ner-mind.git
cd ner-mind

# 2. Deploy all services (PostgreSQL + Server + NGINX Frontend)
docker compose up --build
```

Access:
- **Patient PWA:** `http://localhost:3000` (or `http://localhost`)
- **Caregiver Portal:** `http://localhost:3000/caregiver`
- **Backend Health Check:** `http://localhost:4000/health`

---

## 💻 Local Development Setup (Without Docker)

```bash
# Install workspace dependencies
npm install

# Run all automated tests (76/76 passing)
npm test

# Build production bundles
npm run build

# Start backend server
npm run --workspace=@ner-mind/server dev

# In a separate terminal, start patient frontend
npm run --workspace=@ner-mind/patient-app dev
```

---

## 📂 Documentation Directory

| Document | Description |
| :--- | :--- |
| [DEMO_GUIDE.md](file:///f:/SIH/DEMO_GUIDE.md) | **5–7 Minute SIH Live Presentation & Evaluation Script** |
| [DEPLOYMENT.md](file:///f:/SIH/DEPLOYMENT.md) | Complete Production & Docker Deployment Guide |
| [SECURITY.md](file:///f:/SIH/SECURITY.md) | Security Baseline, Threat Model & OWASP ASVS 5.0 Audit |
| [POSTGRES_DEPLOYMENT.md](file:///f:/SIH/POSTGRES_DEPLOYMENT.md) | PostgreSQL Durability, Migrations & Integration |
| [PROJECT_STATUS.md](file:///f:/SIH/PROJECT_STATUS.md) | Engineering Source of Truth & Audit History |
| [ARCHITECTURE.md](file:///f:/SIH/ARCHITECTURE.md) | Complete Architecture Blueprint & Design Principles |
