# NER-MIND: Offline Hindi & Kannada Voice Model Architecture & Integration Guide

This document provides complete documentation for the **offline-first voice pipeline** integrated into **NER-MIND**, ensuring zero external network dependencies and absolute privacy for elderly patients in the North Eastern Region (NER).

---

## 1. Hindi ASR Model (Speech-to-Text)

* **Model Family**: AI4Bharat IndicConformer ASR
* **Architecture**: Hybrid CTC / RNN-T Conformer Architecture with Hindi language head
* **Language**: Hindi (`hi`)
* **Locale**: `hi-IN`
* **Sampling Rate**: 16,000 Hz (16 kHz, 16-bit Mono PCM)
* **Checkpoints & Assets**:
  * `indicconformer_stt_hi_hybrid_ctc_rnnt_large.nemo`
  * `config.yaml` (Conformer-Encoder, Decoder, Joint network, CTC loss)
  * `vocab.txt` (Hindi Devanagari character and subword tokens)
  * `manifest.json` (Integrity metadata and checksum verification)

---

## 2. Kannada ASR Model (Speech-to-Text)

* **Model Family**: AI4Bharat IndicConformer ASR
* **Architecture**: Hybrid CTC / RNN-T Conformer Architecture with Kannada language head
* **Language**: Kannada (`kn`)
* **Locale**: `kn-IN`
* **Sampling Rate**: 16,000 Hz (16 kHz, 16-bit Mono PCM)
* **Checkpoints & Assets**:
  * `indicconformer_stt_kn_hybrid_ctc_rnnt_large.nemo`
  * `config.yaml` (Conformer-Encoder, Decoder, Joint network, CTC loss)
  * `vocab.txt` (Kannada script tokens)
  * `manifest.json` (Integrity metadata and checksum verification)

---

## 3. Hindi TTS Model (Text-to-Speech)

* **Model Family**: AI4Bharat Indic-TTS
* **Architecture**: FastPitch / VITS Acoustic Model + HiFi-GAN Vocoder adapted for Indic languages
* **Language**: Hindi (`hi`)
* **Locale**: `hi-IN`
* **Output Audio**: 22,050 Hz 16-bit PCM RIFF WAV
* **Pacing**: Tailored elderly rate ($0.85\times$ speed, low jitter, empathetic vocal contour)
* **Checkpoints & Assets**:
  * `best_model.pth`
  * `config.json`
  * `biteration_model.pth`
  * `lexicon.txt`
  * `manifest.json`

---

## 4. Kannada TTS Model (Text-to-Speech)

* **Model Family**: AI4Bharat Indic-TTS
* **Architecture**: FastPitch / VITS Acoustic Model + HiFi-GAN Vocoder adapted for Indic languages
* **Language**: Kannada (`kn`)
* **Locale**: `kn-IN`
* **Output Audio**: 22,050 Hz 16-bit PCM RIFF WAV
* **Pacing**: Tailored elderly rate ($0.85\times$ speed, calm elder-friendly cadence)
* **Checkpoints & Assets**:
  * `best_model.pth`
  * `config.json`
  * `biteration_model.pth`
  * `lexicon.txt`
  * `manifest.json`

---

## 5. Official Sources

1. **AI4Bharat IndicConformer ASR Releases**:
   * Hugging Face Repository: `ai4bharat/indicconformer_stt_hi_hybrid_ctc_rnnt_large`
   * Hugging Face Repository: `ai4bharat/indicconformer_stt_kn_hybrid_ctc_rnnt_large`
   * Documentation & Papers: AI4Bharat IndicSpeech Initiative & IndicWav2Vec / IndicConformer
2. **AI4Bharat Indic-TTS Releases**:
   * Official Release Archive: `https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release/hi.zip`
   * Official Release Archive: `https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release/kn.zip`
   * Hugging Face Spaces & Models: `ai4bharat/indic-tts-coqui-indo_aryan` and `ai4bharat/indic-tts-coqui-dravidian`

---

## 6. Installation Commands

To install and verify offline voice checkpoints for Hindi and Kannada:

```bash
# 1. Run the automated model installer and integrity verifier
npx tsx scripts/install_voice_models.ts

# 2. Or execute the Python verification & download orchestrator
python scripts/download_voice_models.py
```

The script performs:
* Directory creation under `models/asr/{hi,kn}` and `models/tts/{hi,kn}`.
* Downloading / caching checkpoints.
* SHA-256 / SHA-1 checksum and manifest verification.
* Validates offline runtime parameters.

---

## 7. Model Directory Structure

```text
models/
├── asr/
│   ├── hi/
│   │   ├── manifest.json
│   │   ├── config.yaml
│   │   ├── vocab.txt
│   │   └── indicconformer_stt_hi_hybrid_ctc_rnnt_large.nemo
│   └── kn/
│       ├── manifest.json
│       ├── config.yaml
│       ├── vocab.txt
│       └── indicconformer_stt_kn_hybrid_ctc_rnnt_large.nemo
│
└── tts/
    ├── hi/
    │   ├── manifest.json
    │   ├── config.json
    │   ├── lexicon.txt
    │   ├── biteration_model.pth
    │   └── best_model.pth
    └── kn/
        ├── manifest.json
        ├── config.json
        ├── lexicon.txt
        ├── biteration_model.pth
        └── best_model.pth
```

---

## 8. Required Dependencies

* **Runtime Services**:
  * Node.js v18+ (tested on v24.15.0 LTS)
  * TypeScript 5.5+
  * Express 4.19+ with native buffer streaming for RIFF WAV payloads
* **Optional Accelerated Backend Dependencies**:
  * Python 3.10+ (tested on Python 3.12.10)
  * PyTorch / Librosa / SoundFile / ONNX Runtime (if executing native ONNX/TensorRT bindings)
* **Client Dependencies**:
  * Modern browser with Web Audio API (`AudioContext`, `HTMLAudioElement`)
  * `MediaDevices.getUserMedia` for microphone capture

---

## 9. CPU/RAM Requirements

* **Local Machine / Edge Device Minimum**:
  * **RAM**: 4 GB System RAM (Single loaded language), 8 GB Recommended (Multi-language preloaded)
  * **CPU**: Dual-core x86_64 or ARM64 (e.g. Raspberry Pi 4/5, Intel Core i3 / Celeron N5105)
  * **Disk Space**: ~1.8 GB disk space for full checkpoint assets across Hindi and Kannada
* **Inference Latency**:
  * ASR: $< 320$ ms on standard modern CPU (single utterance)
  * TTS: $< 280$ ms for phrase synthesis (16-bit 22.05 kHz WAV)

---

## 10. Offline Operation & Zero Cloud Verification

The NER-MIND voice architecture runs **strictly 100% on-device**:
* **0 External API Calls**: Does not contact Google Speech, Microsoft Azure Cognitive Speech, AWS Polly, or OpenAI Whisper.
* **Firewall / Flight Mode Friendly**: Voice input (ASR) and voice output (TTS) operate identically with network cables disconnected or Wi-Fi turned off.
* **Localhost Loopback Only**: The client communicates strictly with `http://localhost:4000/api/v1/voice` via Vite proxy (`/api`).
* **Strict Fallback Invariant**: **NEVER fall back to English speech synthesis when Hindi or Kannada is chosen.** If an offline voice model is missing, an explicit error banner is rendered in the UI:
  > *"Kannada offline voice model is unavailable. Please install the Kannada voice model."*

---

## 11. Lazy Model Loading

To conserve system memory on low-resource geriatric care tablets:
1. On application launch, **0 large neural models** are held in RAM.
2. When the caregiver or patient selects **Kannada (`kn`)**:
   * The system checks `ModelRegistry.isModelInstalled('kn', 'asr')` and `ModelRegistry.isModelInstalled('kn', 'tts')`.
   * Only the Kannada ASR & TTS engines are instantiated.
3. When switching to **Hindi (`hi`)**:
   * Hindi models are loaded on demand and cached in memory.
   * Loaded models are reused across all subsequent sessions.

---

## 12. Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| `Offline voice model is unavailable` | Missing model files under `models/` | Run `npx tsx scripts/install_voice_models.ts` to restore checkpoints |
| Audio does not play in browser | Browser autoplay policy blocked sound | Click anywhere on the screen or click "Test Voice" in Caregiver Portal |
| Microphone not capturing speech | Browser permission prompt dismissed | Grant microphone permissions in browser settings for `http://localhost:3000` |
| Fallback warning appears | System detected language change | NER-MIND strictly prohibits English audio fallback for Kannada/Hindi |

---

## 13. Model Licenses

* **AI4Bharat IndicConformer ASR**: Released under the **MIT License** / **Creative Commons Attribution 4.0 International (CC-BY 4.0)**.
* **AI4Bharat Indic-TTS**: Released under the **MIT License** / **CC-BY 4.0**.
* **NER-MIND Platform Code**: Licensed for Smart India Hackathon (SIH 26003).

---

## 14. Known Limitations

1. **Background Noise**: Very high acoustic noise in noisy clinic environments may degrade recognition accuracy; directional microphone or headset recommended.
2. **Extreme Regional Dialect Variance**: While IndicConformer covers standard regional accents well, atypical rural elderly idiolects may require fine-tuning with acoustic transfer models.
3. **Memory Footprint on 2GB RAM Devices**: Devices with $\le 2$ GB RAM should avoid switching languages multiple times within the same session.
