# SYSTEM ARCHITECTURE & DESIGN SPECIFICATION

**Project:** Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients in NER (SIH 26003)  
**Safety Classification:** NON-DIAGNOSTIC / COGNITIVE PERFORMANCE SUPPORT  
**Target Deadline:** 28 September 2026  
**Architecture Style:** Offline-First Modular Monorepo (TypeScript / Node.js)

---

## 1. High-Level System Topology

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               PATIENT APPLICATION (OFFLINE-FIRST)                      │
│                                                                                        │
│  ┌───────────────────────┐   ┌────────────────────────┐   ┌────────────────────────┐   │
│  │   Elderly-First UI    │   │  Cognitive Exercises   │   │  Real-Life Transfer    │   │
│  │  High contrast, ≥48px │   │   6 Cognitive Domains  │   │  Baseline & Verify     │   │
│  │  Voice + Touch Fallback│  │   Cross-Context Tasks  │   │  Observed Δ Engine     │   │
│  └───────────┬───────────┘   └───────────┬────────────┘   └───────────┬────────────┘   │
│              │                           │                            │                │
│              ▼                           ▼                            ▼                │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │              SHARED CORE ENGINE (@ner-mind/core - Deterministic)                 │   │
│  │  • Raw Observation Telemetry           • Multidimensional Cognitive Profile     │   │
│  │  • Bounded Adaptive Progression Engine • Cross-Context Transfer Analysis        │   │
│  │  • Personal Memory Profile             • Local Outbox & Idempotency Engine      │   │
│  └───────────────────────────────────────┬─────────────────────────────────────────┘   │
│                                          │                                             │
│              ┌───────────────────────────┴───────────────────────────┐                 │
│              ▼                                                       ▼                 │
│  ┌───────────────────────────────┐               ┌─────────────────────────────────┐   │
│  │   Local Storage (Encrypted)   │               │   Local AI & Voice Abstraction  │   │
│  │   IndexedDB / SQLite WASM     │               │   llama.cpp (controlled text)   │   │
│  │   SQLCipher compatible        │               │   whisper.cpp (voice input)     │   │
│  │   Outbox Event Queue          │               │   Piper / Web TTS (audio)       │   │
│  └───────────────┬───────────────┘               └─────────────────────────────────┘   │
└──────────────────┼─────────────────────────────────────────────────────────────────────┘
                   │
                   │ (When internet is available: TLS 1.3 / E2EE Encrypted Sync)
                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              CAREGIVER BACKEND & DASHBOARD                             │
│                                                                                        │
│  ┌───────────────────────────────┐               ┌─────────────────────────────────┐   │
│  │     Secure Sync Coordinator   │               │      Caregiver Portal API       │   │
│  │  • Idempotent replay handling │               │  • Non-diagnostic domain trends │   │
│  │  • Monotonic timestamp check  │               │  • Real-life transfer tracking  │   │
│  │  • Cryptographic verification │               │  • Repeated decline alerts      │   │
│  │  • Conflict resolution (LWW)  │               │  • Personal memory config       │   │
│  └───────────────┬───────────────┘               └────────────────┬────────────────┘   │
│                  │                                                │                    │
│                  ▼                                                ▼                    │
│  ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│  │                 SERVER REPOSITORY (PostgreSQL / SQLite + ASVS 5.0)              │   │
│  │  • Argon2id Password Hashing            • Role-Based Access Control (RBAC)      │   │
│  │  • Audit Logging (Immutable Events)     • Encrypted at Rest & in Transit        │   │
│  └─────────────────────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Strict Safety & Non-Diagnostic Invariants

1. **Non-Clinical Guarantee:**
   - The platform measures and reports **only observed task performance** (e.g., recall accuracy, reaction time, sequence adherence).
   - The software is **never** advertised or implemented as a diagnostic tool, staging instrument, medical treatment, or cure.
   - User-facing copy, caregiver alerts, and clinical worker summaries must never include words such as "dementia stage", "progression rate", "cured", or "worsened dementia".
2. **Alert Guardrails:**
   - Alerts are triggered strictly when repeated performance drops occur across multiple sessions (preventing false alarms from a single bad day or fatigue):
     $$\text{Alert Triggered} \iff \sum_{i=1}^{N} \mathbb{I}(\text{performance}_i < \theta_{\text{threshold}}) \ge K_{\text{min\_failures}}$$
   - Wording is strictly neutral: *"Repeated decline observed in selected activity performance. Caregiver / health-worker review recommended."*
3. **AI Air-Gapping from Decision Logic:**
   - Large Language Models (`llama.cpp` / GGUF) have **zero authority** over scoring, difficulty progression, alert triggers, or clinical reasoning.
   - LLMs are utilized strictly for controlled linguistic variety in non-clinical activity descriptions (e.g. framing a market shopping list in Assamese, Bengali, or English) and must output structured, schema-validated JSON only.

---

## 3. Cognitive Performance Engine (6 Domains)

The cognitive profile is **multidimensional** and never collapsed into a single scalar "brain score":

$$\mathbf{C}(t) = \Big( M(t),\, A(t),\, R(t),\, S(t),\, C(t),\, P(t) \Big)$$

where:
- $M(t)$ = Memory score $\in [0.0, 1.0]$
- $A(t)$ = Attention score $\in [0.0, 1.0]$
- $R(t)$ = Recognition score $\in [0.0, 1.0]$
- $S(t)$ = Sequencing score $\in [0.0, 1.0]$
- $C(t)$ = Calculation score $\in [0.0, 1.0]$
- $P(t)$ = Planning score $\in [0.0, 1.0]$

### Raw Observation Schema

```typescript
export interface CognitiveObservation {
  id: string;                      // UUIDv4
  patientId: string;
  domain: 'memory' | 'attention' | 'recognition' | 'sequencing' | 'calculation' | 'planning';
  taskId: string;                  // e.g. "shopping_recall", "morning_tea_sequence"
  timestamp: string;               // ISO-8601 UTC
  difficulty: number;              // 1 to 5
  context: string;                 // e.g. "market", "kitchen", "routine"
  metrics: {
    rawScore: number;              // Normalized [0.0, 1.0]
    itemsPresented: number;
    itemsCorrect: number;
    completionTimeMs: number;
    hesitationCount: number;
    cueAssistanceCount: number;
  };
  environmentalFactors?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening';
    inputMethod: 'touch' | 'voice';
  };
}
```

### Profile Aggregation (Anti-Fluctuation Smoothing)
To avoid jitter from transient fatigue, each domain uses an Exponential Moving Average (EMA) with a bounded sliding window of the last $N=10$ observations:

$$\text{EMA}_t = \alpha \cdot \text{Score}_t + (1 - \alpha) \cdot \text{EMA}_{t-1}, \quad \alpha = 0.25$$

---

## 4. Adaptive Difficulty Engine (Deterministic & Explainable)

Difficulty levels are discrete integers from $1$ (Gentle) to $5$ (Challenging).

### Adaptation State Rules
1. **Never change difficulty on a single isolated mistake:**
   - Changing difficulty requires a minimum window of $W = 3$ consecutive sessions in that domain.
2. **Progression Criteria:**
   - If $\text{mean}(\text{Score}_{t-2 \dots t}) \ge 0.85$ and assistance cues $= 0$, increment difficulty by $+1$ (capped at $5$).
3. **Regression Criteria (Easing):**
   - If $\text{mean}(\text{Score}_{t-2 \dots t}) \le 0.45$ across $3$ sessions, decrease difficulty by $-1$ (floored at $1$).
4. **Maintenance Criteria:**
   - If $0.45 < \text{Score} < 0.85$, maintain current difficulty.
5. **Anti-Hysteresis Cooldown:**
   - After a difficulty change, lock difficulty for at least $2$ subsequent sessions to prevent oscillation.

---

## 5. Real-Life Transfer Engine (Core USP)

The primary objective is to verify whether training on abstract cognitive exercises translates to actual everyday functioning.

### Closed-Loop Sequence
1. **Baseline Assessment:** Measure patient performing a real-life task (e.g. *Morning Routine Sequencing*).
   $$\text{Baseline Score} = B_0$$
2. **Cross-Context Cognitive Training:** Train the underlying cognitive domain across diverse contextual scenarios:
   $$\text{Context}_1 \text{ (Cooking)} \longrightarrow \text{Context}_2 \text{ (Shopping)} \longrightarrow \text{Context}_3 \text{ (Gardening)}$$
3. **Real-Life Verification Task:** Present an alternate everyday verification task in the same domain.
   $$\text{Post-Training Score} = V_1$$
4. **Transfer Delta Metric:**
   $$\Delta_{\text{transfer}} = V_1 - B_0$$
5. **Confidence Weighting:**
   $$\text{Confidence} = \min\left(1.0, \frac{\text{Observations Count}}{5}\right)$$
6. **Reporting Output:**
   - $\Delta > 0$: *"Observed positive transfer in selected real-life task."*
   - $\Delta \approx 0$: *"Observed stable performance in selected real-life task."*
   - $\Delta < 0$: *"Observed decline in selected real-life task performance; review recommended."*

---

## 6. Personal Memory Profile & Privacy Governance

Enables culturally and personally meaningful cues (especially tailored for North Eastern Region communities, languages, and familiar routines):
- **Cultural & Regional Customization:** Regional flora (e.g. orchids, bamboo), local cuisine (Assamese pitha, bamboo shoot curry), local markets, familiar music/sounds.
- **Personalized Attributes:**
  - Familiar faces/names (family members with explicit consent).
  - Daily routine preferences (prayer, morning tea, garden walk).
  - Preferred language: Assamese, Bengali, Manipuri, Khasi, Bodo, Hindi, English.
- **Consent Boundaries:**
  - Strict role-based permission required to add or edit personal photos and audio.
  - Zero cloud leakage: Personal photos and audio are stored locally with encrypted metadata unless patient/caregiver explicitly enables sync.

---

## 7. Offline-First & Resilient Sync Protocol

### Local Event Outbox Pattern
```
User Action → Local Database Commit → Write to Local Outbox Event Queue (Immutable)
                                                   │
                                                   ▼
                                       Network Status Monitor
                                                   │
                   ┌───────────────────────────────┴───────────────────────────────┐
                   ▼                                                               ▼
            [No Connection]                                                [Online Available]
             Keep in Outbox                                              POST /api/v1/sync/batch
             Retry on backoff                                                      │
                                                                                   ▼
                                                                       Server verifies idempotency key
                                                                       & commits transaction
                                                                                   │
                                                                                   ▼
                                                                       Mark events as SYNCED
```

### Sync Guarantees:
- **Idempotency:** Every sync event has a unique cryptographic hash ID (`event_id`). Re-sending an event is a no-op.
- **Monotonic Timestamps:** Client vector clocks prevent out-of-order state mutations.
- **Conflict Resolution:** Last-Write-Wins (LWW) with server-side audit trails for data reconciliation.

---

## 8. Security Architecture (OWASP ASVS 5.0 Baseline)

1. **Authentication & Password Storage:**
   - Caregiver/Staff accounts: Argon2id (Memory: 64MB, Iterations: 3, Parallelism: 1).
   - Ephemeral session tokens with secure, HTTP-only, SameSite=Strict cookies.
2. **Authorization (RBAC):**
   - Roles: `PATIENT` (local session), `CAREGIVER` (read/write patient profile & activities), `HEALTH_WORKER` (aggregate review).
3. **Data Protection:**
   - Local patient storage: Encrypted SQLite (SQLCipher) / Encrypted Web Storage keys.
   - Network transport: Strict TLS 1.3 only with HSTS.
4. **Input Sanitization & Parameterization:**
   - 100% Parameterized queries (Knex / SQLite / pg).
   - Strict Zod validation schemas on all API inputs and sync payloads.
5. **AI Safety & Prompt Injection Defense:**
   - LLM generation parameters restricted to temperature $\le 0.3$.
   - Output structured strictly as JSON matching a predefined schema.
   - Automated sanitization against XSS and control characters.
