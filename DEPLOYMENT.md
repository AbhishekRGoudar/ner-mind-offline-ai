# NER-Mind: Production & Docker Deployment Guide

This document outlines the deployment process for **NER-Mind** across Docker containerized environments, cloud virtual machines, and offline field judging devices.

---

## 1. One-Command Docker Deployment (Recommended)

### Prerequisites
- Docker Engine 24.0+
- Docker Compose v2.20+
- At least 2 GB RAM available

### Step 1: Clone Repository & Configure Environment
```bash
git clone https://github.com/your-org/ner-mind.git
cd ner-mind

# Copy production environment template
cp .env.example .env
```

Review `.env` and set your preferred passwords:
```env
POSTGRES_DB=ner_mind
POSTGRES_USER=ner_admin
POSTGRES_PASSWORD=ner_secure_password_2026
SESSION_SECRET=a_cryptographically_secure_random_string_32_chars_long
CORS_ORIGIN=http://localhost:3000,http://localhost:80
```

### Step 2: Launch All Services
```bash
docker compose up --build -d
```

### Step 3: Verify Container Health
```bash
docker compose ps
```

Expected output:
| Name | Image | Status | Ports |
| :--- | :--- | :--- | :--- |
| `ner_mind_postgres` | `postgres:16-alpine` | Up (healthy) | `0.0.0.0:5432->5432/tcp` |
| `ner_mind_server` | `ner-mind-server` | Up (healthy) | `0.0.0.0:4000->4000/tcp` |
| `ner_mind_frontend` | `ner-mind-frontend` | Up (healthy) | `0.0.0.0:80->80/tcp`, `0.0.0.0:3000->80/tcp` |

### Step 4: Access Application
- **Patient PWA Application:** `http://localhost:3000` (or `http://localhost`)
- **Caregiver Portal:** `http://localhost:3000/caregiver`
- **Backend API Health Check:** `http://localhost:4000/health`

---

## 2. Real PostgreSQL Integration & Durability Verification

In environments where the PostgreSQL container or native PostgreSQL service is running, verify complete persistence and durability with:

```bash
# Set database connection string
export DATABASE_URL="postgresql://ner_admin:ner_secure_password_2026@localhost:5432/ner_mind?sslmode=disable"

# Execute deterministic PostgreSQL verification script
npm run --workspace=@ner-mind/server verify:postgres
```

The script verifies:
1. Live PostgreSQL connection
2. Automatic schema table migrations
3. Initial user accounts with scrypt password hashes
4. Session durability across simulated backend restarts
5. Patient records with language preferences
6. Cognitive observations persistence
7. Idempotent sync event deduplication (zero duplicates on re-submission)
8. Transfer evaluations persistence
9. Caregiver alert review & acknowledgement tracking

---

## 3. Local Development Deployment (Without Docker)

For laptops without Docker installed:

```bash
# 1. Install all dependencies
npm install

# 2. Build shared core engine
npm run build --workspace=@ner-mind/core

# 3. Start backend API (runs in in-memory fallback mode if DATABASE_URL is unset)
npm run --workspace=@ner-mind/server dev

# 4. In a second terminal, start Vite frontend
npm run --workspace=@ner-mind/patient-app dev
```

Frontend will be available at `http://localhost:3000` and proxies `/api` calls to port 4000.

---

## 4. Offline Field Deployment (Standalone Judging Tablet/Laptop)

To run the application entirely offline during field evaluations:
1. Launch the application once with network access (or from local files) at `http://localhost:3000`.
2. The Service Worker installs and precaches the application shell (`/index.html`, `/manifest.webmanifest`, `/offline.html`, icons, CSS, and JS).
3. Close the browser, turn off Wi-Fi completely.
4. Reopen the browser and visit `http://localhost:3000` (or launch from the installed PWA desktop shortcut).
5. The application shell loads from CacheStorage, patient data loads from local IndexedDB, and all activities remain fully playable.

---

## 5. Clean Container Shutdown
```bash
# Graceful stop with volume preservation
docker compose down

# Stop and wipe database volume (clean reset)
docker compose down -v
```
