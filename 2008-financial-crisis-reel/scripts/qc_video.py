#!/usr/bin/env python3
"""Inspect a rendered video from beginning to end.

 * container / stream facts (resolution, frame rate, codecs, duration, frame count)
 * black-frame and frozen-frame detection, with the intentional ones named
 * audio: loudness (EBU R128), true peak, clipping, silences
 * contact sheets: one frame every `--step` seconds, tiled, so every part of the film can be looked at
usage: python3 scripts/qc_video.py VIDEO [--step 0.5] [--name final]
"""
import argparse, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, "src", "data", "timeline.json")))


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--step", type=float, default=0.5)
    ap.add_argument("--name", default="final")
    ap.add_argument("--cols", type=int, default=10)
    ap.add_argument("--thumb", type=int, default=216)
    args = ap.parse_args()
    out = os.path.join(ROOT, "out", "qc")
    os.makedirs(out, exist_ok=True)

    info = json.loads(run(["ffprobe", "-v", "error", "-count_frames", "-show_entries",
                           "stream=codec_name,codec_type,width,height,r_frame_rate,avg_frame_rate,pix_fmt,nb_read_frames,sample_rate,channels,bit_rate,profile:format=duration,size,bit_rate",
                           "-of", "json", args.video]).stdout)
    print("── container ──")
    for s in info["streams"]:
        if s["codec_type"] == "video":
            print(f"  video  {s['codec_name']} ({s.get('profile')}) {s['width']}x{s['height']} {s['pix_fmt']}  fps {s['r_frame_rate']} (avg {s['avg_frame_rate']})  frames {s.get('nb_read_frames')}")
        else:
            print(f"  audio  {s['codec_name']} {s.get('sample_rate')} Hz  {s.get('channels')} ch  {int(s.get('bit_rate', 0)) // 1000} kb/s")
    dur = float(info["format"]["duration"])
    print(f"  duration {dur:.3f} s   size {int(info['format']['size']) / 1e6:.1f} MB   overall {int(info['format']['bit_rate']) / 1e6:.2f} Mb/s")
    print(f"  timeline expects {TL['duration']:.3f} s / {TL['durationInFrames']} frames")

    has_audio = any(s["codec_type"] == "audio" for s in info["streams"])
    print("── picture ──")
    r = run(["ffmpeg", "-v", "info", "-i", args.video, "-vf", "blackdetect=d=0.12:pix_th=0.06,freezedetect=n=-55dB:d=0.7", "-an", "-f", "null", "-"]).stderr
    blacks = re.findall(r"black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)", r)
    c = TL["cues"]
    expected = [(0.0, c["s1.explosion"] + 0.15, "opening black"),
                (TL["scenes"]["s4"]["end"] - 0.3, TL["scenes"]["s5"]["start"] + 0.6, "cut to black before 'On September 15'"),
                (TL["scenes"]["s6"]["end"] - 0.4, TL["scenes"]["s7"]["start"] + 1.2, "fade into the final scene"),
                (c["s7.silence"], c["s7.wrong"] + 0.05, "the pause before 'THEY WERE WRONG.'"),
                (c["s7.fadeOut"], dur + 0.1, "closing fade")]
    for a, b, d in blacks:
        a, b = float(a), float(b)
        why = next((n for x, y, n in expected if a >= x - 0.1 and b <= y + 0.1), None)
        print(f"  black {a:6.2f} – {b:6.2f} s ({float(d):.2f} s)  {'OK: ' + why if why else '!! UNEXPECTED'}")
    if not blacks:
        print("  no black segments")
    freezes = re.findall(r"freeze_start: ([\d.]+)[\s\S]*?freeze_duration: ([\d.]+)", r)
    for a, d in freezes:
        a = float(a)
        ok = any(a >= x - 0.2 and a + float(d) <= y + 0.3 for x, y, _ in expected)
        print(f"  frozen picture from {a:.2f} s for {float(d):.2f} s  {'(inside an intentional black)' if ok else '!! check'}")
    if not freezes:
        print("  no frozen segments ≥ 0.7 s")

    if has_audio:
        print("── sound ──")
        r = run(["ffmpeg", "-v", "info", "-i", args.video, "-af", "ebur128=peak=true,astats=metadata=0", "-vn", "-f", "null", "-"]).stderr
        summ = r[r.rfind("Summary:"):]
        g = lambda pat: (re.search(pat, summ) or [None, "?"])[1]
        i_, lra, pk = g(r"I:\s+(-?[\d.]+) LUFS"), g(r"LRA:\s+([\d.]+) LU"), g(r"Peak:\s+(-?[\d.]+) dBFS")
        print(f"  integrated {i_} LUFS   loudness range {lra} LU   true peak {pk} dBTP")
        ov = re.search(r"Overall[\s\S]*?Peak level dB: (-?[\d.]+)[\s\S]*?Number of samples: (\d+)", r)
        flat = re.findall(r"Flat factor: ([\d.]+)", r)
        print(f"  sample peak {ov[1] if ov else '?'} dBFS   flat factor (clipping indicator, 0 = none) {max(map(float, flat)) if flat else '?'}")
        r = run(["ffmpeg", "-v", "info", "-i", args.video, "-af", "silencedetect=n=-55dB:d=0.25", "-vn", "-f", "null", "-"]).stderr
        for a, b in re.findall(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)", r):
            print(f"  silence {float(a):6.2f} – {float(b):6.2f} s")

    print("── contact sheets ──")
    from PIL import Image, ImageDraw
    tmp = os.path.join(out, f"_{args.name}_frames")
    os.makedirs(tmp, exist_ok=True)
    for f in os.listdir(tmp):
        os.remove(os.path.join(tmp, f))
    th = args.thumb
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", args.video, "-vf", f"fps={1 / args.step},scale={th}:-2", "-q:v", "3", os.path.join(tmp, "f_%04d.jpg")], check=True)
    files = sorted(os.listdir(tmp))
    per = args.cols * 4
    for s in range(0, len(files), per):
        chunk = files[s:s + per]
        ims = [Image.open(os.path.join(tmp, f)) for f in chunk]
        w, h = ims[0].size
        rows = (len(ims) + args.cols - 1) // args.cols
        sheet = Image.new("RGB", (args.cols * (w + 4), rows * (h + 22)), (40, 0, 40))
        d = ImageDraw.Draw(sheet)
        for i, im in enumerate(ims):
            x, y = (i % args.cols) * (w + 4), (i // args.cols) * (h + 22)
            sheet.paste(im, (x, y + 20))
            d.text((x + 4, y + 4), f"{(s + i) * args.step:6.2f}s", fill=(255, 255, 0))
        path = os.path.join(out, f"{args.name}_sheet_{s // per + 1:02d}.jpg")
        sheet.save(path, quality=84)
        print("  ", os.path.relpath(path, ROOT), f"({chunk and (s * args.step):.1f}–{(s + len(chunk)) * args.step:.1f} s)")


if __name__ == "__main__":
    main()
