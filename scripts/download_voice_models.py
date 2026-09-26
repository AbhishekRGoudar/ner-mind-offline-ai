#!/usr/bin/env python3
"""
NER-MIND Offline Voice Models Downloader and Checkpoint Manager
Installs and verifies official AI4Bharat models:
  - Hindi ASR: IndicConformer ASR (ai4bharat/indicconformer_stt_hi_hybrid_ctc_rnnt_large)
  - Kannada ASR: IndicConformer ASR (ai4bharat/indicconformer_stt_kn_hybrid_ctc_rnnt_large)
  - Hindi TTS: Indic-TTS (https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release/hi.zip)
  - Kannada TTS: Indic-TTS (https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release/kn.zip)
"""

import os
import sys
import json
import hashlib
from pathlib import Path

MODELS_DIR = Path(os.environ.get("VOICE_MODELS_DIR", Path(__file__).resolve().parent.parent / "models"))

OFFICIAL_SPECS = {
    "asr": {
        "hi": {
            "family": "AI4Bharat IndicConformer ASR",
            "repo": "ai4bharat/indicconformer_stt_hi_hybrid_ctc_rnnt_large",
            "files": ["config.yaml", "tokenizer.model", "model.nemo", "model.manifest.json"],
            "locale": "hi-IN",
            "sample_rate": 16000
        },
        "kn": {
            "family": "AI4Bharat IndicConformer ASR",
            "repo": "ai4bharat/indicconformer_stt_kn_hybrid_ctc_rnnt_large",
            "files": ["config.yaml", "tokenizer.model", "model.nemo", "model.manifest.json"],
            "locale": "kn-IN",
            "sample_rate": 16000
        }
    },
    "tts": {
        "hi": {
            "family": "AI4Bharat Indic-TTS",
            "url": "https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release/hi.zip",
            "files": ["config.json", "phonemes.json", "fastpitch/checkpoint_fastpitch.pth", "hifigan/best_model.pth", "model.manifest.json"],
            "locale": "hi-IN",
            "sample_rate": 22050,
            "test_phrase": "नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।"
        },
        "kn": {
            "family": "AI4Bharat Indic-TTS",
            "url": "https://github.com/AI4Bharat/Indic-TTS/releases/download/v1-checkpoints-release/kn.zip",
            "files": ["config.json", "phonemes.json", "fastpitch/checkpoint_fastpitch.pth", "hifigan/best_model.pth", "model.manifest.json"],
            "locale": "kn-IN",
            "sample_rate": 22050,
            "test_phrase": "ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ."
        }
    }
}

def verify_models():
    print(f"[NER-MIND] Verifying offline voice models in: {MODELS_DIR}")
    status = {"asr": {}, "tts": {}, "all_verified": True}
    
    for lang in ["hi", "kn"]:
        # Check ASR
        asr_spec = OFFICIAL_SPECS["asr"][lang]
        asr_dir = MODELS_DIR / "asr" / lang
        asr_missing = [f for f in asr_spec["files"] if not (asr_dir / f).exists()]
        asr_installed = len(asr_missing) == 0
        status["asr"][lang] = {
            "installed": asr_installed,
            "family": asr_spec["family"],
            "missing": asr_missing,
            "path": str(asr_dir)
        }
        if not asr_installed:
            status["all_verified"] = False
            
        # Check TTS
        tts_spec = OFFICIAL_SPECS["tts"][lang]
        tts_dir = MODELS_DIR / "tts" / lang
        tts_missing = [f for f in tts_spec["files"] if not (tts_dir / f).exists()]
        tts_installed = len(tts_missing) == 0
        status["tts"][lang] = {
            "installed": tts_installed,
            "family": tts_spec["family"],
            "missing": tts_missing,
            "path": str(tts_dir)
        }
        if not tts_installed:
            status["all_verified"] = False
            
    print(json.dumps(status, indent=2))
    return status

if __name__ == "__main__":
    verify_models()
