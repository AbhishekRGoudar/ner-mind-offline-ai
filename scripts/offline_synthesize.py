#!/usr/bin/env python3
"""
Dynamic Offline Speech Synthesizer for NER-MIND
Synthesizes speech on demand and caches to models/tts/{lang}/audio/
"""

import argparse
import asyncio
import hashlib
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

import edge_tts
import miniaudio

VOICES = {
    "hi": "hi-IN-SwaraNeural",
    "kn": "kn-IN-SapnaNeural",
    "en": "en-IN-NeerjaNeural"
}

async def synthesize(text: str, lang: str, out_path: str):
    voice = VOICES.get(lang, "kn-IN-SapnaNeural" if lang == "kn" else "hi-IN-SwaraNeural")
    rate = "-10%"
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    await communicate.save(out_path)
    try:
        data = open(out_path, "rb").read()
        decoded = miniaudio.decode(data)
        wav_path = out_path.replace(".mp3", ".wav")
        miniaudio.wav_write_file(wav_path, decoded)
    except Exception:
        pass

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--lang", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    asyncio.run(synthesize(args.text, args.lang, args.out))

if __name__ == "__main__":
    main()
