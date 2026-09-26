#!/usr/bin/env python3
"""
Offline Hindi & Kannada Voice Pack Builder for NER-MIND
Pre-renders high-fidelity offline neural voice files for all platform phrases.
Saves audio to models/tts/{hi,kn}/audio/ and packages/patient-app/public/audio/tts/{hi,kn}/
"""

import asyncio
import hashlib
import json
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

try:
    import edge_tts
except ImportError:
    print("Installing edge-tts...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "edge-tts"])
    import edge_tts

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(ROOT_DIR, "models", "tts")
PUBLIC_AUDIO_DIR = os.path.join(ROOT_DIR, "packages", "patient-app", "public", "audio", "tts")

# Exact spoken phrases used in NER-MIND
PHRASES = {
    "hi": {
        "voice": "hi-IN-SwaraNeural",
        "items": [
            # Test Voice & Official prompt
            "नमस्ते, मैं आपकी सहायता के लिए यहाँ हूँ।",
            "नमस्ते शर्मा जी। हिंदी में आवाज़ सहायता सक्रिय है।",
            "नमस्ते। हिंदी में आवाज़ सहायता सक्रिय है।",
            "नमस्ते भबेन शर्मा जी। आज हम आपका दैनिक अभ्यास शुरू करते हैं।",
            "नमस्ते। आज हम आपका दैनिक अभ्यास शुरू करते हैं।",

            # 6 Cognitive Domains
            "वस्तुओं को ध्यान से देखें और याद रखें। कुछ ही देर में आपको इन्हें चुनना होगा।",
            "स्क्रीन पर सही मेल खाने वाली वस्तु को पहचानें और स्पर्श करें।",
            "दैनिक कार्यों के चरणों को उनके सही क्रम में व्यवस्थित करें।",
            "बाज़ार की वस्तुओं की कुल राशि की गणना करें।",
            "सोचें कि इस दिनचर्या में सबसे पहले क्या करना चाहिए।",
            "अपने परिचित व्यक्ति या वस्तु को पहचानें और सही विकल्प चुनें।",
            "कृपया इस अभ्यास को पूरा करें।",

            # Missions
            "वास्तविक जीवन मिशन: Morning Tea Routine। वस्तुओं को याद करें और सूची पूर्ण करें।",
            "वास्तविक जीवन मिशन: Daily Routine। वस्तुओं को याद करें और सूची पूर्ण करें।",
            "वास्तविक जीवन मिशन: Local Market Shopping। वस्तुओं को याद करें और सूची पूर्ण करें।",

            # Feedback
            "बहुत बढ़िया! आपका उत्तर बिल्कुल सही है।",
            "अच्छा प्रयास। आइए अगला अभ्यास सावधानी से करें।",
            "सत्र पूर्ण हुआ! आपका प्रदर्शन बहुत अच्छा रहा।",

            # Mic Test Phrases & Confirmations
            "नमस्ते, मुझे सहायता चाहिए",
            "आज का अभ्यास शुरू करो",
            "मेरे स्मरणपत्र पढ़कर सुनाओ",
            "हाँ, बिल्कुल",
            "मैंने सुना आपकी आवाज़। आपकी आवाज़ बिल्कुल स्पष्ट सुनाई दे रही है।",

            # Short responses
            "सही उत्तर",
            "गलत उत्तर",
            "अगला प्रश्न",
            "अभ्यास समाप्त"
        ]
    },
    "kn": {
        "voice": "kn-IN-SapnaNeural",
        "items": [
            # Test Voice & Official prompt
            "ನಮಸ್ಕಾರ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ಇಲ್ಲಿದ್ದೇನೆ.",
            "ನಮಸ್ಕಾರ ಶರ್ಮಾ ಅವರೇ. ಕನ್ನಡದಲ್ಲಿ ಧ್ವನಿ ಸಹಾಯ ಸಕ್ರಿಯವಾಗಿದೆ.",
            "ನಮಸ್ಕಾರ. ಕನ್ನಡದಲ್ಲಿ ಧ್ವನಿ ಸಹಾಯ ಸಕ್ರಿಯವಾಗಿದೆ.",
            "ನಮಸ್ಕಾರ ಭಬೇನ್ ಶರ್ಮಾ ಅವರೇ. ಇಂದು ನಿಮ್ಮ ದೈನಂದಿನ ತರಬೇತಿಯನ್ನು ಪ್ರಾರಂಭಿಸೋಣ.",
            "ನಮಸ್ಕಾರ. ಇಂದು ನಿಮ್ಮ ದೈನಂದಿನ ತರಬೇತಿಯನ್ನು ಪ್ರಾರಂಭಿಸೋಣ.",

            # 6 Cognitive Domains
            "ಈ ವಸ್ತುಗಳನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ನೋಡಿ ಮತ್ತು ನೆನಪಿಟ್ಟುಕೊಳ್ಳಿ. ಸ್ವಲ್ಪ ಸಮಯದ ನಂತರ ನೀವು ಇವುಗಳನ್ನು ಗುರುತಿಸಬೇಕು.",
            "ಪರದೆಯ ಮೇಲೆ ಸರಿಯಾದ ಹೊಂದಾಣಿಕೆಯ ವಸ್ತುವನ್ನು ಗುರುತಿಸಿ ಸ್ಪರ್ಶಿಸಿ.",
            "ದೈನಂದಿನ ಕಾರ್ಯಗಳ ಹಂತಗಳನ್ನು ಸರಿಯಾದ ಅನುಕ್ರಮದಲ್ಲಿ ಜೋಡಿಸಿ.",
            "ಮಾರುಕಟ್ಟೆಯ ವಸ್ತುಗಳ ಒಟ್ಟು ಮೊತ್ತವನ್ನು ಲೆಕ್ಕಹಾಕಿ.",
            "ಈ ದಿನಚರಿಯಲ್ಲಿ ಮೊದಲು ಏನು ಮಾಡಬೇಕೆಂದು ಯೋಚಿಸಿ ಆಯ್ಕೆಮಾಡಿ.",
            "ನಿಮ್ಮ ಪರಿಚಿತ ವ್ಯಕ್ತಿ ಅಥವಾ ವಸ್ತುವನ್ನು ಗುರುತಿಸಿ ಸರಿಯಾದ ಆಯ್ಕೆ ಮಾಡಿ.",
            "ದಯವಿಟ್ಟು ನಿಗದಿಪಡಿಸಿದ ಚಟುವಟಿಕೆಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.",

            # Missions
            "ನೈಜ ಜೀವನದ ಕಾರ್ಯ: Morning Tea Routine. ವಸ್ತುಗಳನ್ನು ನೆನಪಿಸಿಕೊಂಡು ಪಟ್ಟಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.",
            "ನೈಜ ಜೀವನದ ಕಾರ್ಯ: Daily Routine. ವಸ್ತುಗಳನ್ನು ನೆನಪಿಸಿಕೊಂಡು ಪಟ್ಟಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.",
            "ನೈಜ ಜೀವನದ ಕಾರ್ಯ: Local Market Shopping. ವಸ್ತುಗಳನ್ನು ನೆನಪಿಸಿಕೊಂಡು ಪಟ್ಟಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ.",

            # Feedback
            "ತುಂಬಾ ಒಳ್ಳೆಯ ಕೆಲಸ! ನಿಮ್ಮ ಉತ್ತರ ಸರಿಯಾಗಿದೆ.",
            "ಉತ್ತಮ ಪ್ರಯತ್ನ. ಮುಂದಿನ ಪ್ರಶ್ನೆಯನ್ನು ಎಚ್ಚರಿಕೆಯಿಂದ ಮುಂದುವರಿಸೋಣ.",
            "ಅಭ್ಯಾಸ ಪೂರ್ಣಗೊಂಡಿದೆ! ನಿಮ್ಮ ಪ್ರಗತಿ ಉತ್ತಮವಾಗಿದೆ.",

            # Mic Test Phrases & Confirmations
            "ನಮಸ್ಕಾರ, ನನಗೆ ಸಹಾಯ ಬೇಕು",
            "ಇಂದಿನ ಆಟಗಳನ್ನು ಪ್ರಾರಂಭಿಸಿ",
            "ನನ್ನ ನೆನಪೋಲೆಗಳನ್ನು ಓದಿ",
            "ಹೌದು, ಸರಿ",
            "ನಾನು ನಿಮ್ಮ ಧ್ವನಿಯನ್ನು ಕೇಳಿಸಿಕೊಂಡೆ. ನಿಮ್ಮ ಧ್ವನಿ ಸ್ಪಷ್ಟವಾಗಿ ಕೇಳಿಸುತ್ತಿದೆ.",

            # Short responses
            "ಸರಿಯಾದ ಉತ್ತರ",
            "ತಪ್ಪಾದ ಉತ್ತರ",
            "ಮುಂದಿನ ಪ್ರಶ್ನೆ",
            "ತರಬೇತಿ ಮುಕ್ತಾಯ"
        ]
    }
}

def get_hash(text: str) -> str:
    cleaned = text.strip()
    return hashlib.md5(cleaned.encode("utf-8")).hexdigest()

import miniaudio

async def generate_phrase(text: str, voice: str, target_paths: list[str]):
    rate = "-10%" # Elder-friendly calm cadence
    tts = edge_tts.Communicate(text, voice, rate=rate)
    
    first_path = target_paths[0]
    os.makedirs(os.path.dirname(first_path), exist_ok=True)
    await tts.save(first_path)
    
    # Read binary and write to remaining target paths
    with open(first_path, "rb") as f:
        data = f.read()
    
    for other in target_paths[1:]:
        os.makedirs(os.path.dirname(other), exist_ok=True)
        with open(other, "wb") as f:
            f.write(data)

    # Also generate true 16-bit PCM RIFF WAV
    try:
        decoded = miniaudio.decode(data)
        for p in target_paths:
            wav_path = p.replace(".mp3", ".wav")
            miniaudio.wav_write_file(wav_path, decoded)
    except Exception as e:
        print(f"    WAV conversion note: {e}")

async def main():
    print("Building offline voice pack for NER-MIND...")
    
    for lang, config in PHRASES.items():
        voice = config["voice"]
        items = config["items"]
        print(f"\nProcessing {lang} ({voice}) - {len(items)} phrases...")
        
        manifest = {}
        models_audio_dir = os.path.join(MODELS_DIR, lang, "audio")
        public_audio_dir = os.path.join(PUBLIC_AUDIO_DIR, lang)
        
        os.makedirs(models_audio_dir, exist_ok=True)
        os.makedirs(public_audio_dir, exist_ok=True)
        
        for idx, text in enumerate(items):
            h = get_hash(text)
            filename = f"{h}.mp3"
            p1 = os.path.join(models_audio_dir, filename)
            p2 = os.path.join(public_audio_dir, filename)
            
            manifest[h] = {
                "text": text,
                "file": filename,
                "voice": voice,
                "lang": lang
            }
            
            wav1 = p1.replace(".mp3", ".wav")
            wav2 = p2.replace(".mp3", ".wav")
            if os.path.exists(p1) and os.path.getsize(p1) > 1000:
                if not os.path.exists(wav1) or os.path.getsize(wav1) < 1000:
                    try:
                        decoded = miniaudio.decode(open(p1, "rb").read())
                        miniaudio.wav_write_file(wav1, decoded)
                        miniaudio.wav_write_file(wav2, decoded)
                    except Exception as e:
                        pass
                print(f"  [{idx+1}/{len(items)}] Ready (mp3 & wav): {text[:25]}...")
                continue
                
            print(f"  [{idx+1}/{len(items)}] Synthesizing: {text[:30]}...")
            try:
                await generate_phrase(text, voice, [p1, p2])
            except Exception as e:
                print(f"    Error synthesizing '{text}': {e}")
                
        # Write manifest
        manifest_path1 = os.path.join(MODELS_DIR, lang, "audio", "manifest.json")
        manifest_path2 = os.path.join(PUBLIC_AUDIO_DIR, lang, "manifest.json")
        with open(manifest_path1, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
        with open(manifest_path2, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
            
        print(f"Completed {lang} voice pack! Saved {len(manifest)} audio files.")

    print("\nOffline voice pack generation complete!")

if __name__ == "__main__":
    asyncio.run(main())
