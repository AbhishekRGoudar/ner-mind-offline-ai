# NER-Mind — PostgreSQL Production Deployment Guide

> **Environment Note:** Docker Engine and native PostgreSQL are not present on the current local Windows development host. The repository includes dual-mode operation: unit tests and offline environments leverage strict in-memory / IndexedDB persistence, while production runtime connects to PostgreSQL via `DATABASE_URL`. Actual PostgreSQL runtime execution remains environment-dependent upon provisioning a PostgreSQL instance or starting Docker.

---

## 1. Static Configuration Verification

### A. Docker Compose Specification (`docker-compose.yml`)
The container configuration defines an isolated PostgreSQL 16 container with automatic healthcheck and schema bootstrap:
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ner_mind_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ner_mind
      POSTGRES_USER: ner_admin
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-ner_secure_password_2026}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./packages/server/src/db/schema.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ner_admin -d ner_mind"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### B. Database Schema & Migration Verification (`packages/server/src/db/`)
- **Schema (`schema.sql`)**:
  - `users` table: UUID primary keys, role-based checks (`PATIENT`, `CAREGIVER`, `HEALTH_WORKER`, `ADMIN`), scrypt password hash storage, failed login attempts counter, lockout timestamp.
  - `sessions` table: SHA-256 token hashing, expires_at tracking, user foreign key.
  - `patients` table: Assigned caregiver foreign key, preferred & secondary language tags.
  - `cognitive_observations` table: Domain metrics, raw metrics JSONB, sync event ID.
  - `transfer_evaluations` table: Real-life task transfer indices, verified observations counter.
  - `sync_events` table: Idempotent deduplication via unique `event_id` constraint.
  - `alert_reviews` table: Clinical review records, resolution tracking.
  - `audit_logs` table: OWASP-compliant security event audit log.
- **Migration Script (`migrate.ts`)**:
  - Automatically executes DDL in `schema.sql` on empty or updated databases.
  - Automatically seeds default role-based test accounts with hashed passwords if no users exist.

---

## 2. Step-by-Step Deployment Commands

### Step 1: Start PostgreSQL via Docker Compose
In environments where Docker is available:
```bash
# Start PostgreSQL service in background
docker compose up -d postgres

# Verify health status
docker compose ps
```
Or for standalone PostgreSQL (Ubuntu/Debian server):
```bash
sudo systemctl start postgresql
sudo -u postgres psql -c "CREATE USER ner_admin WITH ENCRYPTED PASSWORD 'ner_secure_password_2026';"
sudo -u postgres psql -c "CREATE DATABASE ner_mind OWNER ner_admin;"
```

### Step 2: Configure Environment Variables
Set the connection URL in `packages/server/.env` (or via shell environment):
```bash
export DATABASE_URL="postgresql://ner_admin:ner_secure_password_2026@localhost:5432/ner_mind?sslmode=disable"
export NODE_ENV="production"
export PORT=4000
export CORS_ORIGIN="https://ner-mind.assam.gov.in,http://localhost:3000"
```

### Step 3: Run Database Migrations
Execute the standalone migration runner:
```bash
# From workspace root
npm run --workspace=@ner-mind/server migrate

# Expected output:
# [Migration] Running PostgreSQL schema migrations...
# [Migration] Schema tables and indexes verified.
# [Migration] Seeding initial staff accounts with Scrypt password hashes...
# [Migration] Initial users and patients seeded successfully.
# [Migration] Done.
```

### Step 4: Start Backend Server
```bash
# In production build:
npm run --workspace=@ner-mind/server build
node packages/server/dist/server.js

# Or in development mode with tsx:
npm run --workspace=@ner-mind/server dev
```
The server will log:
```
[NER-Mind Server] Initializing PostgreSQL connection from DATABASE_URL...
[PostgreSQL] Connected successfully to database.
[NER-Mind Server] Running securely on http://localhost:4000
[Security Baseline] OWASP ASVS 5.0 Active, Helmet CSP & RateLimiting Enabled.
```

### Step 5: Start or Serve Frontend PWA
```bash
# Build production bundle with Service Worker and precache manifest
npm run --workspace=@ner-mind/patient-app build

# Preview production build locally on port 3000
npm run --workspace=@ner-mind/patient-app preview
```
In production web servers (e.g. NGINX), serve `packages/patient-app/dist` over HTTPS with `Cache-Control: no-cache` for `sw.js` and `manifest.webmanifest`, and immutable caching for hashed assets in `/assets/`.
