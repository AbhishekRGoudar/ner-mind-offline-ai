# PROJECT STATUS & ENGINEERING CONTROL DOCUMENT

**Project:** AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients in NER  
**SIH Problem Statement:** 26003  
**Target Completion:** 28 September 2026  
**Status:** In Active Development (Phase 0: Architecture & Foundation Initialized)  
**Safety Classification:** NON-DIAGNOSTIC / OBSERVED TASK PERFORMANCE ONLY

---

## 1. Safety & Compliance Constraints (NON-NEGOTIABLE)

1. **Non-Diagnostic Policy:**
   - Under no circumstances does this system diagnose dementia, determine clinical staging, predict progression rates, or suggest medical treatments/medications.
   - All reports and displays use strict observed-performance terminology: *"Observed change in selected task performance"*.
   - When thresholds are crossed across repeated observations, generate a neutral recommendation: *"Repeated decline observed in selected activity performance. Caregiver / health-worker review recommended."*
2. **AI Isolation:**
   - LLMs (`llama.cpp` / GGUF) provide controlled linguistic variation, conversational assistance, and cultural/regional (NER) localization only.
   - LLMs are **strictly prohibited** from scoring activities, setting adaptive difficulty, triggering safety alerts, or offering clinical advice.
   - Scoring, adaptive progression, and transfer metrics are 100% deterministic, explainable, and unit-tested TypeScript algorithms.
3. **Offline-First Patient Operation:**
   - All core cognitive activities, local scoring, personal memory profile lookups, and adaptive recommendations must execute without internet connectivity.
   - Synchronization to the caregiver portal uses an idempotent local outbox with conflict resolution and cryptographic verification.

---

## 2. System Architecture & Component Status

| Component | Directory | Description | Status |
| :--- | :--- | :--- | :--- |
| **Shared Core Engine** | `packages/core` | Deterministic cognitive engine, adaptive engine, transfer analysis, personal memory schema, sync outbox protocol | Proposed / Spec Ready |
| **Patient Application** | `packages/patient-app` | Elderly-first offline-first web/PWA interface (high contrast, large touch targets, voice fallback, local storage) | Proposed / Spec Ready |
| **Caregiver / Server API** | `packages/server` | Caregiver dashboard API, sync coordinator, RBAC (patient/caregiver/health-worker), audit logs, alerts | Proposed / Spec Ready |
| **Local AI Adapter** | `packages/core/ai` | Plug-and-play abstraction for `llama.cpp`, `whisper.cpp`, Piper TTS with strict structured output validation | Proposed / Spec Ready |

---

## 3. Cognitive Domain Matrix

| Cognitive Domain | Exemplar Activity | Context Variations | Metric Collected |
| :--- | :--- | :--- | :--- |
| **Memory** | Shopping Recall, Paired Associate | Market, Kitchen, Family Garden | Recall accuracy, latency, cue reliance |
| **Attention** | Target Cancellation, Sound-Object Match | Market Stall, Nature, Traditional Craft | Accuracy under distractor, response latency |
| **Recognition** | Household Objects, Regional Flora/Crafts | Living Room, Kitchen, Community | Correct identification, hesitation index |
| **Sequencing** | Daily Routine (Morning, Tea, Market) | Cooking Traditional Tea, Medication Routine | Step order accuracy, omission count |
| **Calculation** | Market Currency / Change Calculation | Local Market Stall, Utility Settlement | Exact math, rounding accuracy, duration |
| **Planning** | Day Planner, Route to Community Center | Daily Schedule, Social Gathering | Constraint satisfaction, plan validity |

---

## 4. Real-Life Transfer Protocol

```
[Real-Life Baseline Task] (e.g. Morning Tea Routine Sequencing)
       │
       ▼
[Cognitive Analysis] (Assess Sequencing & Attention baseline)
       │
       ▼
[Cross-Context Training] (Cooking → Market Trip → Household Chore)
       │
       ▼
[Real-Life Verification Task] (Post-training Tea Routine Verification)
       │
       ▼
[Transfer Analysis Engine] (Calculate Δ Performance, Sample Confidence)
       │
       ▼
[Caregiver Visibility] ("Observed improvement in selected task performance")
```

---

## 5. Engineering Phase Roadmap

- [x] **Phase 0: Inspection, Governance & Architecture**
  - [x] Inspect workspace and local toolchain (Node v24, Python 3.12, Git 2.54).
  - [x] Create engineering control document (`PROJECT_STATUS.md`).
  - [x] Author comprehensive architectural blueprint (`ARCHITECTURE.md`).
  - [x] Author developer setup & guidelines (`DEVELOPMENT.md`).
- [x] **Phase 1: Shared Core Engine (`@ner-mind/core`)**
  - [x] TypeScript build and package setup with zero runtime bloat.
  - [x] Raw observation telemetry models (6 cognitive domains).
  - [x] Deterministic multi-dimensional cognitive skill profile calculator.
  - [x] Bounded adaptive difficulty engine (moving window, anti-hysteresis).
  - [x] Real-life transfer delta calculation engine.
  - [x] Personal memory profile schema with privacy consent boundaries.
  - [x] Offline sync event models and outbox queue manager.
  - [x] 100% unit test coverage for core algorithms (22/22 tests passing).
- [x] **Phase 2: Local AI & Voice Abstraction (`packages/core/ai`)**
  - [x] Core safe abstraction interface & offline deterministic fallbacks (Assamese, Bengali, Manipuri, Khasi, Bodo, Hindi, English).
  - [x] Local llama.cpp HTTP runner adapter interface.
  - [x] Local whisper.cpp / Web Speech audio adapter with touch fallback.
  - [x] Web Speech TTS guidance player with elderly speech pacing.
- [x] **Phase 3: Elderly-First Patient Application (`packages/patient-app`)**
  - [x] Offline-first UI shell (accessible typography, high contrast, >= 56px touch controls).
  - [x] Local storage engine (IndexedDB / localStorage with outbox persistence).
  - [x] 6 Interactive cognitive exercises with cross-context variation (Memory, Attention, Recognition, Sequencing, Calculation, Planning).
  - [x] Closed-loop Real-Life Transfer Protocol flow (Baseline ➡️ Cross-Context Drills ➡️ Verification ➡️ Δ Transfer).
  - [x] Personal memory personalization module with NER objects, routines, and consent.
  - [x] Offline outbox queue integration and network status monitor.
- [x] **Phase 4: Caregiver Backend & Sync Service (`packages/server`)**
  - [x] Node.js / TypeScript service with OWASP ASVS 5.0 security baseline.
  - [x] High-cost cryptographic password hashing & RBAC (Patient, Caregiver, Health Worker).
  - [x] PostgreSQL relational schema (`schema.sql`) and connection pool with fallback.
  - [x] Durable idempotent sync (`POST /api/v1/sync`) surviving server restarts.
  - [x] Caregiver dashboard API (domain trends, transfer delta views, non-diagnostic alerts).
  - [x] Security test suite (ASVS checks: Helmet headers, rate limiting, credential redaction, auth bypass).
  - [x] **Phase 2.1 & 2.2: IDOR Hardening, Session Management & Security Audit:**
    - [x] Server-side IDOR remediation on `/api/v1/caregiver/patient/:id/*` via `requirePatientAccess()`.
    - [x] Authenticated and authorized sync protocol with event ownership validation.
    - [x] Persistent session store with SHA-256 token hashing (`sessions` table).
    - [x] Scrypt password authentication against `users` table with timing attack mitigation.
    - [x] Account lockout (5 consecutive failed attempts -> 15-minute lockout, HTTP 423).
    - [x] Session revocation on logout (`POST /api/v1/auth/logout`).
    - [x] Docker Compose development environment for PostgreSQL 16.
    - [x] Automated database migration runner (`npm run migrate --workspace=@ner-mind/server`).
- [x] **Phase 2.3: IndexedDB Integration, SyncWorker, Caregiver Portal & Alert Engine**
  - [x] Phase 2.3A: Complete patient client migration to asynchronous IndexedDB storage with clean startup sequence.
  - [x] Phase 2.3B: Reliable SyncWorker with exponential backoff, batch size limiting, mutex lock, and "Sync Now" UI.
  - [x] Phase 2.3C: Dedicated Caregiver Portal (`/caregiver`) with authenticated access, 6-domain observed performance visualization, transfer view, and training history.
  - [x] Phase 2.3D: Alert engine requiring repeated observations/trends and allowing review/acknowledgement.
  - [x] Phase 2.3E & 2.3F: End-to-end patient ↔ server ↔ caregiver integration and security isolation.
  - [x] Phase 2.3G: 14 automated verification tests across client storage, sync worker, and server integration.

- [x] **Phase 3: PWA Offline Installability, Regional Voice Architecture & Production Hardening**
  - [x] Phase 3A: Production-grade PWA Service Worker (`sw.js`) with static precaching, network-first SPA navigation, offline fallback, and strict exclusion of sensitive API responses, auth headers, and patient data.
  - [x] Phase 3B: True offline startup verified: application shell loads without network, patient UI remains operable, IndexedDB data loads, cognitive drills execute, outbox enqueues events offline, and SyncWorker syncs upon reconnection.
  - [x] Phase 3C: Chromium/iOS PWA installability verified: valid `manifest.webmanifest`, 192x192 & 512x512 maskable/any icons, standalone launch detection, update notification listener.
  - [x] Phase 3D: Production configuration audit: dynamic `CORS_ORIGIN`, Helmet CSP, HSTS, rate limiting, `.env.example` templates without committed secrets.
  - [x] Phase 3E: Real PostgreSQL deployment path (`POSTGRES_DEPLOYMENT.md`) detailing static Docker compose verification, schema DDL, migration runner, and start commands without false local host claims.
  - [x] Phase 3F: Security review: confirmed SW strictly excludes `/api/*`, `/auth/*`, `/sync`, `/caregiver`, non-GET methods, and `Authorization` headers; verified zero secrets leaked in client bundle.
  - [x] Phase 3G: Regional voice architecture: deterministic prompt manifests (`prompts.json`) across 7 NER languages (`as`, `bn`, `mni`, `kha`, `brx`, `hi`, `en`) supporting 7 key cues (`welcome`, `instructions`, `success`, `retry`, `encouragement`, `navigation`, `status`) with Web Speech API graceful fallback.
  - [x] Phase 3H: 11 new automated tests covering manifest validity, SW registration, offline shell loading, static asset caching, sensitive API exclusion, offline IndexedDB access, offline drill execution, outbox queueing, reconnect sync, standalone launch, production headers, and client bundle security scanning.

- [x] **Phase 4: SIH Demonstration Polish & Deployment Packaging (FINAL PHASE)**
  - [x] Phase 4.1: Complete one-command Docker deployment (`docker-compose.yml`, `packages/server/Dockerfile`, `packages/patient-app/Dockerfile`, `nginx.conf`) orchestrating PostgreSQL 16, Node/Express backend, and NGINX frontend with healthchecks and clean shutdown.
  - [x] Phase 4.2: Deterministic PostgreSQL verification script (`packages/server/scripts/verifyPostgresIntegration.ts` / `npm run verify:postgres`) testing live connection, schema migration, scrypt user accounts, session durability across restarts, patient records, observations, zero duplicate sync rows, transfer evaluations, and alert reviews.
  - [x] Phase 4.3: Self-contained offline field demo package with PWA cached shell, IndexedDB durability, 6 activities, and offline outbox.
  - [x] Phase 4.4: Synthetic 7-day demo seeder (`packages/patient-app/src/demo/demoSeeder.ts`) generating realistic baseline ➔ training ➔ verification ➔ transfer delta (+0.23 Δ) ➔ alert review marked strictly as `DEMO/SYNTHETIC`.
  - [x] Phase 4.5: Interactive SIH Presentation Navigator (`packages/patient-app/src/demo/SihDemoController.tsx`) guiding evaluators through the 9-stage closed-loop transfer architecture using actual components.
  - [x] Phase 4.6: Final UI polish: accessible high-contrast navigation, large touch targets (>= 64px), real-time sync badges (`🟢 Online` / `🟡 Offline Mode`), and caregiver portal observed trend views.
  - [x] Phase 4.7: Final security audit: IDOR protection, Scrypt hashing, SHA-256 session tokens, account lockout, sync authorization, Helmet CSP/HSTS/CORS, and zero bundle secrets.
  - [x] Phase 4.10: HARD OFFLINE-NATIVE CONVERSION:
    - Zero remote fonts, zero remote CDNs, zero runtime external assets (system font stack, self-contained assets).
    - Device-local authentication using salted SHA-256 password digests with WebCrypto, role separation, and zero server auth dependencies.
    - Local caregiver dashboard backed entirely by client-side IndexedDB, with local profile scoring, alert review, and local JSON/CSV/PDF exports.
    - Bundled 7-language prompts with offline Web Audio API earcon/chime synthesizer for airplane-mode audio feedback.
    - Comprehensive `tests/completeOfflineNativeMode.test.ts` acceptance test verifying complete closed-loop lifecycle with 0 network calls.

- [x] **Phase 5: On-Device Continual Personalization Layer (100% OFFLINE / ZERO-NETWORK)**
  - [x] On-Device Bayesian Beta-Binomial conjugate update with memory discounting ($\gamma = 0.95$).
  - [x] Welford algorithm for single-pass latency mean and variance tracking ($CV = \sigma/\mu$).
  - [x] Contextual UCB task selector balancing deficit remediation, uncertainty exploration, anti-fatigue diversity, and transfer bonus.
  - [x] Bounded adaptive difficulty with hysteresis cooldown preventing abrupt difficulty shifts from single-session outliers.
  - [x] Transfer learning association matrix linking training activities to real-life performance deltas.
  - [x] Raw observation replay invariant: deterministic model reconstruction via `rebuildPersonalModelFromObservations()`.
  - [x] IndexedDB store `personal_model` (schema v2) with automatic online updates upon `recordObservation()` and `recordTransferEvaluation()`.
  - [x] Patient App UI recommendation card with selection mode tags, difficulty, confidence %, and clinical rationale.
  - [x] Caregiver Portal dedicated `🧠 Continual Personalization` tab with 6-domain Bayesian beliefs, latency consistency, adaptation logs, and transfer associations.
  - [x] 17 new automated tests (10 in core, 7 in patient-app) verifying cold-start, outliers, bounded updates, UCB selection, transfer tracking, and zero network calls.

- [x] **Phase 6: Unlimited Dynamic Question Generation & Measurable Difficulty Complexity Layer (100% OFFLINE)**
  - [x] On-Device deterministic procedural `TaskGenerator` with Mulberry32 seeded PRNG for reproducible testability and debugging.
  - [x] Anti-repetition engine hashing domain, difficulty, context, and canonical payload signatures into 8-char FNV-1a fingerprints.
  - [x] IndexedDB store `recent_tasks` (schema v3) persisting recent task fingerprints across browser restarts and app reloads.
  - [x] Explicit `TaskComplexityProfile` quantifying domain-specific cognitive dimensions (itemCount, distractorCount, sequenceLength, ambiguityLevel, timePressure, reasoningSteps, cueLevel, memoryLoad, interferenceLevel, overallComplexity).
  - [x] Strict monotonic difficulty escalation ($L1 < L2 < L3 < L4 < L5$) and regression content reduction verified across all 6 cognitive domains.
  - [x] 1,000 tasks per domain (6,000 tasks total) benchmarked locally with 0 errors, 0 crashes, 0 network requests, and ~0.09ms avg latency.
  - [x] Updated all 6 patient app games (`MemoryShoppingRecall`, `AttentionCraftPattern`, `SequencingTeaRoutine`, `RecognitionHouseholdObjects`, `CalculationMarketChange`, `PlanningDaySchedule`) to render dynamic tasks and complexity badges.
  - [x] 48 new automated tests (23 generator tests + 11 escalation tests in core, 14 dynamic integration tests in patient-app).

---

## 6. Audit & Test Log

*Last Updated:* 2026-09-23T20:50:00+05:30  
*Active Milestone:* Unlimited Dynamic Question Generation & Difficulty Content Certified (142/142 tests passing, 100% pass rate, zero regressions, full workspace build verified)  
- `@ner-mind/core`: 66/66 tests pass
  - `tests/cognitive.test.ts` (4/4)
  - `tests/adaptive.test.ts` (8/8)
  - `tests/transfer.test.ts` (3/3)
  - `tests/sync.test.ts` (3/3)
  - `tests/ai.test.ts` (4/4)
  - `tests/personalization.test.ts` (10/10) - Bayesian Beta-Binomial, Welford latency, outlier resistance, UCB selection, transfer learning, rebuild from observations
  - `tests/taskGenerator.test.ts` (23/23) - PRNG reproducibility, 1K task generation benchmark per domain, content safety, mathematical exactness, anti-repetition window
  - `tests/taskComplexityEscalation.test.ts` (11/11) - Full L1 -> L5 escalation & regression, best/avg/worst case, outlier resilience, noise anti-oscillation
- `@ner-mind/patient-app`: 40/40 tests pass
  - `tests/demoSeeder.test.ts` (1/1) - Synthetic 7-day closed-loop transfer data generation & compliance
  - `tests/indexedDbAndSyncWorker.test.ts` (9/9) - IndexedDB persistence, reload, migration, outbox, SyncWorker
  - `tests/pwaOfflineAndAudio.test.ts` (8/8) - Manifest validity, SW registration, offline shell, static caching, sensitive API exclusion, offline IndexedDB, standalone detection, regional audio manifests & fallback
  - `tests/completeOfflineNativeMode.test.ts` (1/1) - Complete offline native acceptance test (Zero Internet Requests)
  - `tests/continualPersonalization.test.ts` (7/7) - Zero network calls, incremental Bayesian update, UCB diversity, outlier resilience, transfer association, corrupt recovery, restart durability
  - `tests/dynamicTaskIntegration.test.ts` (14/14) - Zero network calls, restart fingerprint persistence, complexity scaling, complete offline gameplay loop
- `@ner-mind/server`: 36/36 tests pass
  - `tests/phase4DeploymentAndDemo.test.ts` (4/4) - Docker compose specification, Dockerfiles, NGINX configuration, PostgreSQL verification script mode, environment security
  - `tests/caregiverAndE2E.test.ts` (5/5) - Assigned patient filtering, dashboard API, repeated alerts, alert ack, E2E flow
  - `tests/idorAndAuth.test.ts` (9/9) - IDOR, auth hardening, account lockout, logout revocation
  - `tests/postgresDurableSync.test.ts` (1/1) - Idempotent sync persistence
  - `tests/auth.test.ts` (5/5) - Scrypt verification, RBAC, constant-time checks
  - `tests/sync.test.ts` (3/3) - Authenticated sync processing, idempotency, validation
  - `tests/caregiver.test.ts` (3/3) - Assigned patient access, non-diagnostic profile, transfer history
  - `tests/security.test.ts` (3/3) - ASVS headers, rate limiting, credential masking
  - `tests/productionConfigAndSync.test.ts` (3/3) - Reconnect synchronization & deduplication, CSP/HSTS/CORS production headers, client bundle secret scanner
- `npm run build`: Clean Exit Code 0 across all packages (`@ner-mind/core`, `@ner-mind/patient-app`, `@ner-mind/server`).
- Test Suite Success Rate: 100% (142 passed, 0 failed across 23 test suites).
- Network Requests Required for Core Operation: 0 (100% Offline-Native Certified).
