-- SIH Problem Statement 26003: Relational PostgreSQL Schema
-- Closed-Loop Cognitive Platform for Elderly Patients in NER

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users / Caregivers / Health Workers
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(64) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('PATIENT', 'CAREGIVER', 'HEALTH_WORKER', 'ADMIN')),
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Patients & Baseline Profiles
CREATE TABLE IF NOT EXISTS patients (
    id VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(120) NOT NULL,
    caregiver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    preferred_language VARCHAR(10) NOT NULL DEFAULT 'en',
    secondary_language VARCHAR(10) DEFAULT 'as',
    accessibility_config JSONB NOT NULL DEFAULT '{}',
    consent_record JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at TIMESTAMPTZ
);

-- 3. Idempotent Sync Events (Deduplication across server restarts)
CREATE TABLE IF NOT EXISTS sync_events (
    event_id UUID PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    client_created_at TIMESTAMPTZ NOT NULL,
    client_sequence_number BIGINT NOT NULL,
    idempotency_hash VARCHAR(64) NOT NULL,
    server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sync_events_patient ON sync_events(patient_id);
CREATE INDEX IF NOT EXISTS idx_sync_events_received ON sync_events(server_received_at);

-- 4. Cognitive Observations (Raw Telemetry from 6 Domains)
CREATE TABLE IF NOT EXISTS cognitive_observations (
    id UUID PRIMARY KEY,
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    event_id UUID REFERENCES sync_events(event_id) ON DELETE CASCADE,
    domain VARCHAR(32) NOT NULL CHECK (domain IN ('memory', 'attention', 'recognition', 'sequencing', 'calculation', 'planning')),
    task_id VARCHAR(64) NOT NULL,
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
    context VARCHAR(32) NOT NULL,
    raw_score NUMERIC(5, 3) NOT NULL CHECK (raw_score BETWEEN 0.0 AND 1.0),
    items_presented INT NOT NULL CHECK (items_presented >= 1),
    items_correct INT NOT NULL CHECK (items_correct >= 0),
    completion_time_ms INT NOT NULL CHECK (completion_time_ms >= 0),
    hesitation_count INT NOT NULL DEFAULT 0,
    cue_assistance_count INT NOT NULL DEFAULT 0,
    environmental_factors JSONB,
    observed_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_observations_patient_domain ON cognitive_observations(patient_id, domain, observed_at);

-- 5. Real-Life Transfer Evaluations (Core USP: Baseline vs Verification)
CREATE TABLE IF NOT EXISTS transfer_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id VARCHAR(64) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    domain VARCHAR(32) NOT NULL,
    baseline_task_id VARCHAR(64) NOT NULL,
    verification_task_id VARCHAR(64) NOT NULL,
    baseline_score NUMERIC(5, 3) NOT NULL,
    verification_score NUMERIC(5, 3) NOT NULL,
    transfer_delta NUMERIC(5, 3) NOT NULL,
    percentage_change NUMERIC(6, 1) NOT NULL,
    training_interventions_count INT NOT NULL,
    contexts_traversed JSONB NOT NULL,
    confidence_score NUMERIC(4, 2) NOT NULL,
    transfer_category VARCHAR(32) NOT NULL,
    observed_report TEXT NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_transfer_patient ON transfer_evaluations(patient_id, evaluated_at);

-- 6. Structured Security Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(64) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    outcome VARCHAR(16) NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE')),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- 7. Persistent Authenticated Sessions (survives process restart)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

-- 8. Alert Reviews & Acknowledgements
CREATE TABLE IF NOT EXISTS alert_reviews (
    alert_id VARCHAR(128) PRIMARY KEY,
    status VARCHAR(32) NOT NULL CHECK (status IN ('PENDING_REVIEW', 'REVIEWED', 'ACKNOWLEDGED')),
    updated_by VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

