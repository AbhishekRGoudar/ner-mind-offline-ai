# DEVELOPMENT & CONTRIBUTING GUIDE

**Project:** AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients in NER  
**SIH Problem Statement:** 26003  
**Target Deadline:** 28 September 2026

---

## 1. Prerequisites & Environment Setup

- **Node.js:** v20.x or v24.x (v24.15.0 verified)
- **Package Manager:** npm v10+ (v11.12.1 verified)
- **Python (Optional for local AI helpers / Presidio):** Python 3.10+ (3.12.10 verified)
- **Git:** Git 2.40+ (2.54 verified)
- **Operating System:** Windows 10/11, Linux, or macOS

---

## 2. Monorepo Layout

```
SIH/
├── PROJECT_STATUS.md         # Engineering control and source of truth
├── ARCHITECTURE.md           # System design & mathematical models
├── DEVELOPMENT.md            # Developer setup & guidelines
├── package.json              # Root workspace orchestrator
├── packages/
│   ├── core/                 # @ner-mind/core: Deterministic domain logic
│   │   ├── src/
│   │   │   ├── cognitive/    # 6 domain calculators, raw observation models
│   │   │   ├── adaptive/     # Bounded adaptive progression engine
│   │   │   ├── transfer/     # Real-life transfer delta calculation
│   │   │   ├── memory/       # Personal memory profile schemas & consent
│   │   │   ├── sync/         # Outbox queue & idempotency manager
│   │   │   └── ai/           # llama.cpp & whisper.cpp safe abstractions
│   │   └── tests/            # 100% deterministic test suites
│   ├── patient-app/          # Offline-first elderly patient web/PWA
│   │   ├── src/
│   │   │   ├── components/   # High-contrast, large-target UI controls
│   │   │   ├── games/        # 6 domain exercises & real-life tasks
│   │   │   ├── storage/      # Local storage & outbox persistence
│   │   │   └── audio/        # Offline speech-to-text & TTS fallback
│   │   └── tests/
│   └── server/               # Caregiver backend API & sync service
│       ├── src/
│       │   ├── auth/         # Argon2id, RBAC, session tokens
│       │   ├── sync/         # Idempotent batch sync handler
│       │   ├── caregiver/    # Non-diagnostic trend reporting & alerts
│       │   └── security/     # OWASP ASVS 5.0 security middlewares
│       └── tests/
```

---

## 3. Core Development Commands

Once initialized:

```bash
# Install all dependencies across workspace
npm install

# Run all unit and integration tests across packages
npm test

# Build all packages
npm run build

# Run lint and typecheck
npm run lint
npm run typecheck

# Start local patient app (development mode)
npm run dev --workspace=@ner-mind/patient-app

# Start caregiver server
npm run dev --workspace=@ner-mind/server
```

---

## 4. Engineering Standards & Strict Guidelines

### Non-Diagnostic Safety Invariant
- **Never** write user-facing strings or API fields containing "dementia stage", "cure", "progression index", or "diagnosis".
- Use strictly observed-performance nomenclature:
  - ✅ *"Observed recall accuracy: 78%"*
  - ✅ *"Observed positive transfer in morning tea sequencing"*
  - ✅ *"Repeated decline observed across 3 consecutive sessions. Caregiver review recommended."*
  - ❌ *"Dementia has improved"*
  - ❌ *"Patient is progressing to Stage 2"*

### Deterministic AI Separation
- Code in `packages/core/adaptive` and `packages/core/cognitive` must **never** import or await LLM inference.
- Adaptation decisions must be 100% reproducible with fixed mathematical test vectors.
- Any LLM output in `packages/core/ai` must pass Zod schema parsing before being returned.

### Elderly Accessibility (WCAG 2.1 AAA Baseline)
- Minimum touch target: **48x48 CSS pixels** (prefer 64px+).
- Minimum font size: **18px** for body, **24px** for instructions.
- Contrast ratio: Minimum **7:1** for standard text.
- Audio prompts must always accompany visual text, with touch fallback available.

---

## 5. Security & Verification Checklist (OWASP ASVS 5.0)

- [ ] All database queries use parameterized statements.
- [ ] Passwords hashed with Argon2id.
- [ ] Rate limiting enabled on authentication and sync endpoints.
- [ ] No hardcoded secrets; use `.env` validated by Zod at startup.
- [ ] Secure headers applied (CSP, HSTS, X-Frame-Options: DENY).
- [ ] Sync payload deduplication tested with replayed events.
