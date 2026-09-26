# NER-Mind: Security Architecture & OWASP ASVS 5.0 Compliance

This document outlines the security architecture, threat model, and defense-in-depth measures implemented across the **NER-Mind** platform in accordance with the OWASP Application Security Verification Standard (ASVS 5.0).

---

## 1. Authentication & Session Management (ASVS V2 & V3)

| Control | Implementation Detail | Status |
| :--- | :--- | :--- |
| **Password Storage** | High-cost Scrypt key derivation function with random salt. Plaintext passwords are never stored or logged. | Enforced |
| **Timing Attack Mitigation** | Constant-time password comparison (`crypto.timingSafeEqual`) prevents timing oracle attacks. | Enforced |
| **Brute-Force & Lockout** | 5 consecutive failed login attempts trigger an automatic 15-minute account lockout (HTTP 423). | Enforced |
| **Session Token Hashing** | Session tokens are cryptographically hashed using SHA-256 before storage in PostgreSQL (`sessions` table). Token exposure in database dumps does not compromise active sessions. | Enforced |
| **Session Revocation** | Dedicated `POST /api/v1/auth/logout` endpoint immediately deletes active session tokens from PostgreSQL / in-memory store. | Enforced |
| **Role-Based Access Control** | Explicit roles (`PATIENT`, `CAREGIVER`, `HEALTH_WORKER`, `ADMIN`) validated server-side on every protected endpoint. | Enforced |

---

## 2. Insecure Direct Object Reference (IDOR) Defense (ASVS V4)

- **Caregiver Patient Scoping:**
  - Endpoint `/api/v1/caregiver/patient/:id/*` enforces server-side authorization via `requirePatientAccess()`.
  - Caregiver 1 can only access patients assigned to Caregiver 1.
  - Attempting to access an unassigned patient returns **HTTP 403 Forbidden**.
- **Sync Event Ownership Scoping:**
  - `POST /api/v1/sync` strictly verifies that:
    1. The authenticated patient only submits records for their own `patientId`.
    2. The authenticated caregiver is assigned to the `patientId` present in the batch.
    3. Every nested event's `patientId` strictly matches the batch's `patientId` (forged event rejection with HTTP 400).

---

## 3. Offline Service-Worker & CacheStorage Protection (ASVS V8)

To safeguard Protected Health Information (PHI) and PII on shared or public devices:
- **Strict Method Guard:** Non-`GET` requests are never intercepted or cached by the Service Worker.
- **Sensitive Path Filter:** All endpoints matching `SENSITIVE_API_PATTERNS` (`/api/`, `/auth/`, `/sync`, `/caregiver`, `/observations`, `/patients`) bypass CacheStorage and pass directly to network.
- **Authorization Header Filter:** Any request with an `Authorization` header is excluded from CacheStorage.
- **Zero Sensitive Data in Cache:** Only static HTML, CSS, JS bundles, and public regional audio prompt manifests are cached.

---

## 4. Network Security & Browser Defenses (ASVS V14)

```ts
// Helmet Security Headers (OWASP Baseline)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));
```

- **Content-Security-Policy (CSP):** Restricts script, image, and style sources to self, preventing Cross-Site Scripting (XSS).
- **Strict-Transport-Security (HSTS):** Enforces HTTPS for 1 year (31536000 seconds).
- **Cross-Origin Resource Sharing (CORS):** Dynamic whitelisting via `CORS_ORIGIN` environment variable.
- **Rate Limiting:** IP-based rate limiting (100 requests per minute per IP on `/api/`) mitigates denial-of-service and credential stuffing.
- **Request Size Limiting:** Strict 2 MB payload ceiling prevents JSON memory exhaustion attacks.

---

## 5. SQL Injection & Database Protection (ASVS V5)

- **Strict Parameterization:** 100% of PostgreSQL queries use parameterized arguments (`$1`, `$2`, `$3`). String concatenation in SQL statements is strictly prohibited.
- **Isolated User Roles:** PostgreSQL database runs under dedicated non-superuser role `ner_admin` with schema-bounded permissions.
- **Idempotent Unique Constraints:** Unique constraint on `sync_events.event_id` prevents duplicate insertions and replay attacks.

---

## 6. Secrets & CI/CD Security

- **Zero Hardcoded Secrets:** Production secrets, private keys, database URLs, and session secrets are prohibited from version control.
- **Automated Bundle Scanner:** Automated unit test (`tests/productionConfigAndSync.test.ts`) scans compiled frontend bundles in `dist/` before build approval to verify zero leaked database credentials, passwords, or keys.
- **Audit Logging:** Security-relevant events (failed logins, account lockouts, IDOR violations, session revocations) are recorded via `AuditLogger` with actor ID, IP address, timestamp, and sanitized metadata.
