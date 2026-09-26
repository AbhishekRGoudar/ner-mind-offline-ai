# NER-Mind: SIH 2026 Live Demonstration Guide

> **Problem Statement 26003:** AI-Based Cognitive Gaming & Memory Assistance Platform for Elderly Dementia Patients in NER.  
> **Evaluation Mode:** The application features a built-in **SIH Presentation Navigator** (bottom-right of the screen) that enables judges to inspect each stage of the closed-loop transfer architecture instantly.

---

## ⏱️ 5–7 Minute Presentation & Evaluation Sequence

### [0:00 – 0:45] The Problem & The NER Context
- **Pitch:** In rural North Eastern Region (NER) communities, elderly individuals experiencing cognitive difficulties face high cultural isolation and unreliable internet.
- **The Core Flaw in Existing Games:** Standard brain games measure only in-game scores (e.g. tile matching). High game scores do not prove an elder can still prepare their morning tea or recognize family members.
- **Our Solution:** **Closed-Loop Real-Life Cognitive Adaptation**. We evaluate whether cognitive improvements actually transfer to functional daily tasks.

---

### [0:45 – 1:15] Patient Profile & Personal Memory Schema
- **Action:** Open Patient App at `http://localhost:3000`. Navigate to **Memory Profile** tab.
- **Key Features to Highlight:**
  - Patient: **Bhaben Sharma** (Rural Assam, Preferred: Assamese / English).
  - Cultural Familiar Objects: *Orthodox Assam Tea Leaves*, *Bamboo Jaapi*, *Gamusa*, *Bamboo Shoot*.
  - Familiar Daily Routines: *Morning Assam Tea Routine*, *Evening Garden Walk*.
  - Explicit Privacy & Consent boundary: Caregiver-approved data retention.

---

### [1:15 – 2:00] Real-Life Baseline Task
- **Action:** Click on the **Real-Life Transfer** tab.
- **Demonstration:**
  - The elder performs a functional daily routine: **Morning Tea Routine Sequencing**.
  - Four steps: *Boil water* ➔ *Add tea leaves* ➔ *Add splash of milk* ➔ *Strain into cup*.
  - Elder hesitates or misplaces steps.
  - Baseline score recorded: **65% (0.65)** with 2 hesitations and 1 cue reliance.

---

### [2:00 – 2:45] Personalized Cognitive Activity
- **Action:** Navigate to **Daily Activities** tab.
- **Demonstration:**
  - Launch **Market Shopping Recall** or **Bihu Drum Rhythm**.
  - The game is dynamically populated with familiar cultural items from their memory profile (tea leaves, gamusa, conical jaapi).
  - High contrast buttons (>= 64px), large fonts, audio cue support in regional languages.

---

### [2:45 – 3:15] Bounded Adaptive Difficulty Engine
- **Explanation to Judges:**
  - We use a **deterministic moving-window adaptive algorithm** with anti-hysteresis protection (never swings erratically).
  - When the elder achieves high accuracy across consecutive trials, difficulty transitions smoothly from Level 1 (4 items) to Level 2 (6 items).
  - **Critical Rule:** No LLM or non-deterministic model ever sets difficulty or scores drills.

---

### [3:15 – 3:45] Cross-Context Training Drills
- **Explanation to Judges:**
  - True cognitive transfer requires practicing across varying contexts:
    - *Context 1: Kitchen* (Morning tea routine)
    - *Context 2: Festival / Craft* (Bihu drum rhythm / Bamboo weave pattern)
    - *Context 3: Market* (Local currency exchange & shopping recall)
    - *Context 4: Daily Routine* (Day schedule planning)

---

### [3:45 – 4:15] Real-Life Verification Task
- **Action:** In **Real-Life Transfer**, run the post-training **Verification Task** (Morning Tea Routine re-test).
- **Demonstration:**
  - The elder repeats the exact same functional task after completing the targeted multi-context drills.
  - New score: **88% (0.88)** with 0 hesitations.

---

### [4:15 – 4:45] Transfer Analysis Engine
- **Action:** Show the **Transfer Delta Calculation** on screen.
  - $\Delta \text{Transfer} = \text{Verification Score} - \text{Baseline Score} = 0.88 - 0.65 = \mathbf{+0.23}$.
  - Percentage improvement: **+35.4%**.
  - Contexts traversed: 4 distinct contexts.
  - Confidence score: **0.85**.
  - Category: `positive_transfer`.
  - **Language Check:** Strict non-diagnostic terminology (*"Observed positive performance change in selected task"*).

---

### [4:45 – 5:15] Caregiver Dashboard & Alert Review
- **Action:** Click **Caregiver Portal** at `http://localhost:3000/caregiver`.
  - Log in as `caregiver_pranjal` / `CaregiverSecurePass123!`.
- **Demonstration:**
  - View multi-domain observed radar (Memory, Attention, Recognition, Sequencing, Calculation, Planning).
  - View Transfer View showing baseline vs. verification progression.
  - View Non-Diagnostic Alert: When repeated declines occur across sessions, a neutral recommendation is generated for health-worker review.
  - Click **Acknowledge** on pending alerts.

---

### [5:15 – 6:15] Complete Offline-Native Demonstration (Zero Internet Requests)
- **Action:** Open Chrome DevTools ➔ Network tab ➔ Check **Offline** (or disconnect Wi-Fi / enable Airplane Mode completely).
- **Hard Offline Features to Demonstrate to Judges:**
  1. **Zero External Calls:** Observe the Network tab — exactly **0** network requests required. Zero remote fonts, zero remote CDNs, zero cloud LLMs.
  2. **Device-Local Authentication:** Caregivers and patients authenticate locally via WebCrypto salted SHA-256 digests stored securely on-device. No network auth endpoint required.
  3. **Offline Caregiver Portal:** Open `/caregiver` in airplane mode. The portal pulls directly from local IndexedDB, renders 6-domain profiles, transfer charts, alerts, and enables offline JSON/CSV data export.
  4. **Regional Audio in Airplane Mode:** Cycle through prompts across all 7 languages (Assamese, Bengali, Manipuri, Khasi, Bodo, Hindi, English). The bundled manifests and local Web Audio API earcon synthesizer play audibly without internet.
  5. **Refresh & Restart Resilience:** Refresh the browser offline, close the tab, and reopen. All patient records, baseline assessments, training observations, and transfer histories persist in IndexedDB.

---

### [6:15 – 6:45] Optional Online Synchronization (When Available)
- **Explanation:** Online server/PostgreSQL sync is strictly an **optional enhancement** layer.
- **Action:** Restore network connectivity in DevTools.
- **Demonstration:**
  - Click **🔄 Sync Now** (or observe automatic background flush via `SyncWorker`).
  - Idempotent event deduplication synchronizes offline IndexedDB observations to PostgreSQL.
  - Zero loss of offline work. Normal application functionality never depends on the backend.

---

### [6:30 – 7:00] Security, Privacy & USP Summary
- **Security Highlights:**
  - OWASP ASVS 5.0 baseline.
  - IDOR protection: Caregivers can only see assigned patients.
  - Account lockout after 5 failed logins.
  - Service Worker CacheStorage strictly excludes sensitive API responses and auth tokens.
- **USP Summary:**
  > *"NER-Mind is not just another memory game. It is a medically responsible, culturally localized, closed-loop cognitive adaptation platform that verifies whether training helps elderly dementia patients live more independently in their everyday lives."*
