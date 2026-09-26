import os
import json
import subprocess
import sys
import imageio_ffmpeg

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()

def format_srt_time(seconds):
    millis = int(round((seconds - int(seconds)) * 1000))
    s = int(seconds) % 60
    m = (int(seconds) // 60) % 60
    h = int(seconds) // 3600
    return f"{h:02d}:{m:02d}:{s:02d},{millis:03d}"

def generate_subtitles(scenes, srt_path):
    print(f"Generating SRT subtitles at {srt_path}...")
    lines = []
    sub_idx = 1
    current_time = 0.0
    
    for s in scenes:
        dur = s["duration"]
        text = s["text"]
        # Split text into sentences for comfortable reading
        import re
        sentences = [sent.strip() for sent in re.split(r'(?<=[.!?])\s+', text) if sent.strip()]
        if not sentences:
            sentences = [text]
            
        time_per_sentence = dur / len(sentences)
        for sent in sentences:
            start_t = current_time
            end_t = current_time + time_per_sentence
            lines.append(f"{sub_idx}\n{format_srt_time(start_t)} --> {format_srt_time(end_t)}\n{sent}\n\n")
            sub_idx += 1
            current_time = end_t
            
    with open(srt_path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print(f"  ✓ Created {len(lines)} subtitle cues.")

def compose_all():
    os.makedirs("video_production/processed_scenes", exist_ok=True)
    with open("video_production/scenes_metadata.json", "r", encoding="utf-8") as f:
        scenes = json.load(f)
        
    concat_list = []
    total_duration = 0.0
    
    # 1. Process each scene
    for s in scenes:
        sid = s["id"]
        dur = s["duration"]
        total_duration += dur
        raw_clip = f"video_production/raw_clips/clip_{sid}.webm"
        audio_clip = f"video_production/audio/scene_{sid}.mp3"
        out_clip = f"video_production/processed_scenes/scene_{sid}.mp4"
        
        print(f"\n--- Encoding Scene {sid}: {s['title']} ({dur:.2f}s) ---")
        if not os.path.exists(raw_clip):
            print(f"Error: {raw_clip} does not exist!")
            continue
            
        # Merge audio + video:
        # Scale to 1920x1080, loop last frame if video is shorter than audio, trim to exact audio duration
        cmd = [
            FFMPEG, "-y",
            "-i", raw_clip,
            "-i", audio_clip,
            "-filter_complex",
            f"[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,tpad=stop_mode=clone:stop_duration=10[v]",
            "-map", "[v]",
            "-map", "1:a",
            "-c:v", "libx264",
            "-preset", "veryfast",
            "-crf", "20",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "192k",
            "-t", str(dur),
            out_clip
        ]
        res = subprocess.run(cmd, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            print(f"Error encoding scene {sid}:", res.stderr[-500:])
        else:
            print(f"  ✓ Encoded scene {sid} -> {out_clip}")
            concat_list.append(out_clip)

    # 2. Write concat file
    concat_file_path = "video_production/concat_list.txt"
    with open(concat_file_path, "w", encoding="utf-8") as f:
        for p in concat_list:
            # Absolute or forward slash path
            clean_p = os.path.abspath(p).replace("\\", "/")
            f.write(f"file '{clean_p}'\n")

    # 3. Concatenate all scenes into a master raw video
    master_raw = "video_production/master_raw.mp4"
    print(f"\nConcatenating all scenes into {master_raw}...")
    cmd_concat = [
        FFMPEG, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_file_path,
        "-c", "copy",
        master_raw
    ]
    subprocess.run(cmd_concat, check=True)
    print(f"  ✓ Master video stream concatenated.")

    # 4. Generate Subtitles
    srt_path = "NER-MIND_SIH_Subtitles.srt"
    generate_subtitles(scenes, srt_path)

    # 5. Generate full narration audio file
    full_audio_path = "NER-MIND_SIH_Narration_Full.mp3"
    print(f"\nCreating full narration audio track {full_audio_path}...")
    audio_concat_txt = "video_production/audio_concat.txt"
    with open(audio_concat_txt, "w", encoding="utf-8") as f:
        for s in scenes:
            ap = os.path.abspath(f"video_production/audio/scene_{s['id']}.mp3").replace("\\", "/")
            f.write(f"file '{ap}'\n")
    subprocess.run([FFMPEG, "-y", "-f", "concat", "-safe", "0", "-i", audio_concat_txt, "-c", "copy", full_audio_path], check=True)
    print(f"  ✓ Full voiceover track saved: {full_audio_path}")

    # 6. Generate subtle ambient background music (warm synth chords, 432Hz ambient drone)
    bgm_path = "video_production/bgm_ambient.mp3"
    print("Synthesizing gentle background music pad...")
    bgm_cmd = [
        FFMPEG, "-y",
        "-f", "lavfi",
        "-i", f"anoisesrc=d={int(total_duration)+10}:c=pink:r=44100:a=0.015",
        "-f", "lavfi",
        "-i", f"sine=frequency=216:sample_rate=44100:duration={int(total_duration)+10}",
        "-f", "lavfi",
        "-i", f"sine=frequency=324:sample_rate=44100:duration={int(total_duration)+10}",
        "-filter_complex",
        "[1:a]volume=0.03[s1];[2:a]volume=0.02[s2];[0:a][s1][s2]amix=inputs=3:dropout_transition=2,lowpass=f=800,volume=0.04[bgm]",
        "-map", "[bgm]",
        "-t", str(total_duration + 2),
        bgm_path
    ]
    subprocess.run(bgm_cmd, check=True)
    print("  ✓ Ambient background music track created.")

    # 7. Final Master Export with Subtitles and Mixed Audio
    final_output = "f:/SIH/NER-MIND_SIH_Final_Demo.mp4"
    print(f"\nMuxing final demo with subtitles and ambient mix into {final_output}...")
    
    # Subtitle filter: escape colon and backslashes for ffmpeg filter
    escaped_srt = os.path.abspath(srt_path).replace("\\", "/").replace(":", "\\:")
    
    cmd_final = [
        FFMPEG, "-y",
        "-i", master_raw,
        "-i", bgm_path,
        "-filter_complex",
        f"[0:v]subtitles='{escaped_srt}':force_style='Fontname=Arial,Fontsize=18,PrimaryColour=&HFFFFFF,BackColour=&H80000000,BorderStyle=4,Outline=1,Shadow=0,MarginV=30'[v];[0:a]volume=1.0[voice];[1:a]volume=0.4[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]",
        "-map", "[v]",
        "-map", "[a]",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "256k",
        "-t", str(total_duration),
        final_output
    ]
    res_final = subprocess.run(cmd_final, stderr=subprocess.PIPE, text=True)
    if res_final.returncode != 0:
        print("Subtitles filter warning, falling back to clean video without hardcoded subs:", res_final.stderr[-400:])
        # Fallback without subtitle filter
        cmd_fallback = [
            FFMPEG, "-y",
            "-i", master_raw,
            "-i", bgm_path,
            "-filter_complex",
            "[0:a]volume=1.0[voice];[1:a]volume=0.35[music];[voice][music]amix=inputs=2:duration=first:dropout_transition=2[a]",
            "-map", "0:v",
            "-map", "[a]",
            "-c:v", "libx264",
            "-preset", "medium",
            "-crf", "18",
            "-pix_fmt", "yuv420p",
            "-c:a", "aac",
            "-b:a", "256k",
            "-t", str(total_duration),
            final_output
        ]
        subprocess.run(cmd_fallback, check=True)

    print(f"\n=======================================================")
    print(f"🎉 FINAL SIH DEMO VIDEO COMPLETE: {final_output}")
    print(f"Total Duration: {total_duration:.2f}s ({total_duration/60:.2f} minutes)")
    print(f"=======================================================")

if __name__ == "__main__":
    compose_all()
