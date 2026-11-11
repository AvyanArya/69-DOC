#!/usr/bin/env python3
"""Turn the raw archival downloads (assets_src/raw) into render-ready assets (public/img).

For every photograph this script:
  * crops / resizes and applies one consistent documentary grade,
  * estimates a depth map with Depth-Anything-V2 (ONNX, Apache-2.0) and writes the
    displacement maps that <ParallaxPhoto> uses for depth-based camera moves,
  * optionally splits the picture into a foreground cut-out + in-painted background
    ("layers" mode) for true multi-plane parallax,
  * writes newsprint-halftone versions for the newspaper recreations.

usage: python3 scripts/prepare_assets.py [--depth-model PATH] [--only KEY ...]
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets_src", "raw")
OUT = os.path.join(ROOT, "public", "img")
FULL_W, FULL_H = 1296, 2304           # 1.2x overscan of the 1080x1920 frame
PAPER = np.array([236, 230, 216], np.float32)
INK = np.array([24, 23, 22], np.float32)

# key: source file, crop centre (fractions), aspect (w/h), mode, grade overrides
FULL = {
    "wall_street":      dict(src="wall_street_0916.jpg", cx=0.50, cy=0.50, mode="layers", sat=0.74),
    "lehman_night":     dict(src="lehman_hq_0915_portrait.jpg", cx=0.56, cy=0.52, mode="warp", sat=0.80, lift=0.0, contrast=1.08, gain=1.18),
    "lehman_crews":     dict(src="lehman_hq_0915_wide.jpg", cx=0.63, cy=0.50, mode="warp", sat=0.70),
    "lehman_day":       dict(src="lehman_times_sq.jpg", cx=0.56, cy=0.50, mode="warp", sat=0.55),
    "nyse_night":       dict(src="nyse_dec2008.jpg", cx=0.50, cy=0.50, mode="warp", sat=0.80),
    "nyse_floor":       dict(src="nyse_floor2.jpg", cx=0.50, cy=0.50, mode="warp", sat=0.62),
    "suburb_aerial":    dict(src="suburb_aerial_wa.jpg", cx=0.56, cy=0.50, mode="warp", sat=0.66, warm=0.035),
    "suburb_street":    dict(src="suburb_street_ut.jpg", cx=0.24, cy=0.50, mode="warp", sat=0.66, warm=0.03),
    "suburb_bw":        dict(src="suburb_houses_bw.jpg", cx=0.40, cy=0.50, mode="warp", sat=0.0),
    "foreclosure_house": dict(src="foreclosure_house.jpg", cx=0.47, cy=0.50, mode="warp", sat=0.50),
    "foreclosure_sign": dict(src="foreclosure_sign.jpg", cx=0.33, cy=0.50, mode="warp", sat=0.72),
    "empty_office":     dict(src="empty_office.jpg", cx=0.50, cy=0.50, mode="warp", sat=0.35),
    "job_fair":         dict(src="job_fair_2009.jpg", cx=0.50, cy=0.50, mode="warp", sat=0.50),
}
# landscape "photo prints": native aspect, used inside frames / on paper
PRINTS = {
    "p_foreclosure_sign": dict(src="foreclosure_sign.jpg", w=1400, sat=0.78),
    "p_northern_rock":    dict(src="northern_rock_queue.jpg", w=1400, sat=0.45),
    "p_lehman_crews":     dict(src="lehman_hq_0915_wide.jpg", w=1400, sat=0.70),
    "p_lehman_london":    dict(src="lehman_london_0916.jpg", w=819, sat=0.35),
    "p_nypd":             dict(src="nyse_nypd_oct2008.jpg", w=1400, sat=0.45),
    "p_bush":             dict(src="bush_0919.jpg", w=500, sat=0.55),
    "p_suburb_az":        dict(src="suburb_house_az.jpg", w=1400, sat=0.70, warm=0.03),
    "p_suburb_aerial2":   dict(src="suburb_aerial_oh.jpg", w=1400, sat=0.62, warm=0.03),
    "p_nyse_flag":        dict(src="nyse_sep2008.jpg", w=1400, sat=0.62),
    "p_job_fair":         dict(src="job_fair_2009.jpg", w=1000, sat=0.45),
    "p_foreclosure_house": dict(src="foreclosure_house.jpg", w=1400, sat=0.5),
}
# black-and-white newsprint halftones for the recreated front pages: key -> (source, crop box fractions, width)
NEWS = {
    "n_lehman_night": ("lehman_hq_0915_portrait.jpg", (0.10, 0.30, 1.00, 0.86), 900),
    "n_wall_street":  ("wall_street_0916.jpg", (0.0, 0.18, 1.0, 0.74), 760),
    "n_lehman_day":   ("lehman_times_sq.jpg", (0.0, 0.30, 1.0, 0.92), 760),
    "n_nyse_flag":    ("nyse_sep2008.jpg", (0.42, 0.0, 1.0, 1.0), 760),
    "n_crews":        ("lehman_hq_0915_wide.jpg", (0.18, 0.05, 0.95, 0.98), 760),
    "n_floor":        ("nyse_floor2.jpg", (0.0, 0.42, 1.0, 1.0), 760),
    "n_london":       ("lehman_london_0916.jpg", (0.0, 0.05, 1.0, 0.80), 620),
    "n_bush":         ("bush_0919.jpg", (0.0, 0.0, 1.0, 1.0), 500),
}


def grade(img, sat=0.7, contrast=1.12, warm=0.02, lift=0.012, gain=1.0):
    """Documentary grade: pulled saturation, gentle S-curve, charcoal blacks, paper-warm highlights."""
    a = np.asarray(img, np.float32) / 255.0
    a = a * gain
    lum = (a * [0.2126, 0.7152, 0.0722]).sum(-1, keepdims=True)
    a = lum + (a - lum) * sat
    a = np.clip(a, 0, 1)
    a = 0.5 + (a - 0.5) * contrast                       # contrast around mid grey
    a = np.clip(a, 0, 1)
    a = a * a * (3 - 2 * a) * 0.35 + a * 0.65            # soft S-curve
    hi = np.clip((lum - 0.55) / 0.45, 0, 1)              # warm the highlights, cool the shadows slightly
    a[..., 0] += warm * hi[..., 0] * 1.6; a[..., 2] -= warm * hi[..., 0] * 2.2
    sh = np.clip((0.35 - lum) / 0.35, 0, 1)
    a[..., 2] += 0.012 * sh[..., 0]
    a = lift + a * (1 - lift)
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def crop_to(img, aspect, cx, cy):
    W, H = img.size
    if W / H > aspect:
        cw, ch = int(round(H * aspect)), H
    else:
        cw, ch = W, int(round(W / aspect))
    x0 = int(round(min(max(cx * W - cw / 2, 0), W - cw)))
    y0 = int(round(min(max(cy * H - ch / 2, 0), H - ch)))
    return img.crop((x0, y0, x0 + cw, y0 + ch))


class Depth:
    def __init__(self, path):
        import onnxruntime as ort
        self.sess = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        self.name = self.sess.get_inputs()[0].name

    def __call__(self, img, long_side=1022):
        W, H = img.size
        s = long_side / max(W, H)
        w, h = max(14, int(round(W * s / 14)) * 14), max(14, int(round(H * s / 14)) * 14)
        x = np.asarray(img.convert("RGB").resize((w, h), Image.BICUBIC), np.float32) / 255.0
        x = ((x - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]).transpose(2, 0, 1)[None].astype(np.float32)
        d = self.sess.run(None, {self.name: x})[0][0]
        lo, hi = np.percentile(d, 1), np.percentile(d, 99)
        return np.clip((d - lo) / (hi - lo + 1e-6), 0, 1)      # 1 = near, 0 = far


def write_maps(depth, base, size=(432, 768)):
    """map1: R = depth (lateral truck).  map2: R,G = radial field * depth (dolly / push-in)."""
    d = np.asarray(Image.fromarray((depth * 255).astype(np.uint8)).resize(size, Image.BICUBIC), np.float32) / 255.0
    d = ndimage.maximum_filter(d, 5)          # grow near surfaces so stretching happens behind edges
    d = ndimage.gaussian_filter(d, 2.2)
    h, w = d.shape
    half = np.full_like(d, 128.0)
    Image.fromarray(np.stack([d * 255, half, half], -1).astype(np.uint8)).save(base + "_map1.png", optimize=True)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    rx, ry = (xx / (w - 1) - 0.5) * 2, (yy / (h - 1) - 0.5) * 2
    m2 = np.stack([(0.5 + 0.5 * d * rx) * 255, (0.5 + 0.5 * d * ry) * 255, half], -1)
    Image.fromarray(np.clip(m2, 0, 255).astype(np.uint8)).save(base + "_map2.png", optimize=True)


def otsu(d):
    hist, edges = np.histogram(d, bins=128, range=(0, 1))
    p = hist / hist.sum(); w = np.cumsum(p); mu = np.cumsum(p * (edges[:-1] + edges[1:]) / 2)
    var = (mu[-1] * w - mu) ** 2 / (w * (1 - w) + 1e-9)
    return edges[np.argmax(var)]


def layers(img, depth, base):
    """Foreground cut-out (RGBA webp) + background with the foreground painted out."""
    import cv2
    W, H = img.size
    d_full = np.asarray(Image.fromarray((depth * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255.0
    th = otsu(depth)
    alpha = np.clip((d_full - (th - 0.035)) / 0.07, 0, 1)
    alpha = ndimage.gaussian_filter(ndimage.grey_erosion(alpha, size=(3, 3)), 1.1)
    rgb = np.asarray(img, np.uint8)
    Image.fromarray(np.dstack([rgb, (alpha * 255).astype(np.uint8)])).save(base + "_fg.webp", quality=92, method=4)
    # background: fill the hole left by the foreground by mirroring the picture across the hole's edge.
    # Only a thin rim is ever revealed by the camera move, and mirrored texture (windows, masonry)
    # reads as a natural continuation where a blurred in-paint would look like a smear.
    s = 4
    hole = cv2.dilate((alpha > 0.03).astype(np.uint8), np.ones((15, 15), np.uint8)).astype(bool)
    bg = rgb.copy()
    for y in range(H):
        row = hole[y]
        if not row.any(): continue
        edges = np.flatnonzero(np.diff(np.concatenate([[0], row.view(np.int8), [0]])))
        for a0, b0 in zip(edges[::2], edges[1::2]):
            L = b0 - a0
            if b0 + L <= W or b0 + L - W < a0 - L * 0 and W - b0 >= a0:      # enough picture on the right
                src = np.clip(2 * b0 - 1 - np.arange(a0, b0), b0, W - 1)
            else:                                                             # otherwise mirror from the left
                src = np.clip(2 * a0 - 1 - np.arange(a0, b0), 0, max(a0 - 1, 0))
            bg[y, a0:b0] = rgb[y, src]
    soft = cv2.GaussianBlur(bg, (0, 0), 2.2)
    m = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 3)[..., None]
    bg = (bg * (1 - m) + soft * m).astype(np.uint8)
    Image.fromarray(bg).save(base + "_bg.jpg", quality=88)
    mask = cv2.resize(hole.astype(np.uint8) * 255, (W // s, H // s))
    # depth of the background alone (foreground hole filled with surrounding depth)
    dsm = cv2.resize(depth.astype(np.float32), (W // s, H // s))
    dbg = cv2.inpaint((dsm * 255).astype(np.uint8), mask, 9, cv2.INPAINT_TELEA).astype(np.float32) / 255.0
    dbg = dbg / max(th, 1e-3)
    write_maps(np.clip(dbg, 0, 1), base + "_bg")
    ys, xs = np.nonzero(alpha > 0.5)
    return {"fgBox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())], "threshold": float(th)}


def halftone(img, pitch=6.0, angle=45.0, paper=PAPER, ink=INK, gamma=1.0, ss=2):
    """Classic AM halftone screen: round dots on a rotated grid, dot area tracks darkness."""
    g = np.asarray(img.convert("L"), np.float32) / 255.0
    g = np.clip(g, 0, 1) ** gamma
    h, w = g.shape
    H, Wd = h * ss, w * ss
    yy, xx = np.mgrid[0:H, 0:Wd].astype(np.float32) / ss
    a = np.deg2rad(angle)
    u = (xx * np.cos(a) + yy * np.sin(a)) / pitch
    v = (-xx * np.sin(a) + yy * np.cos(a)) / pitch
    du, dv = u - np.round(u), v - np.round(v)
    r = np.sqrt(du * du + dv * dv)                               # 0 at dot centre … 0.707 at cell corner
    dark = 1 - np.asarray(Image.fromarray((g * 255).astype(np.uint8)).resize((Wd, H), Image.BILINEAR), np.float32) / 255.0
    rad = np.sqrt(dark / np.pi) * 1.25                           # dot radius so that area ~ darkness
    cov = np.clip((rad - r) * pitch * ss * 0.9 + 0.5, 0, 1)      # anti-aliased coverage
    cov = cov.reshape(h, ss, w, ss).mean((1, 3))
    out = paper[None, None, :] * (1 - cov[..., None]) + ink[None, None, :] * cov[..., None]
    return Image.fromarray(out.astype(np.uint8))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--depth-model", default=os.environ.get("DEPTH_MODEL", os.path.join(ROOT, ".cache", "depth_anything_v2_small.onnx")))
    ap.add_argument("--only", nargs="*")
    args = ap.parse_args()
    os.makedirs(OUT, exist_ok=True)
    depth_model = Depth(args.depth_model)
    meta_path = os.path.join(ROOT, "src", "data", "photos.json")
    meta = json.load(open(meta_path)) if os.path.exists(meta_path) else {}

    for key, c in FULL.items():
        if args.only and key not in args.only: continue
        src = os.path.join(RAW, c["src"])
        if not os.path.exists(src):
            print(f"  (skip {key}: {c['src']} not downloaded yet)"); continue
        img = Image.open(src).convert("RGB")
        img = crop_to(img, 9 / 16, c["cx"], c["cy"]).resize((FULL_W, FULL_H), Image.LANCZOS)
        img = grade(img, **{k: v for k, v in c.items() if k in ("sat", "contrast", "warm", "lift", "gain")})
        base = os.path.join(OUT, key)
        img.save(base + ".jpg", quality=88)
        d = depth_model(img)
        info = {"mode": c["mode"], "w": FULL_W, "h": FULL_H}
        write_maps(d, base)
        if c["mode"] == "layers":
            info.update(layers(img, d, base))
        meta[key] = info
        print(f"  full   {key:20s} {c['mode']}")

    for key, c in PRINTS.items():
        if args.only and key not in args.only: continue
        src = os.path.join(RAW, c["src"])
        if not os.path.exists(src):
            print(f"  (skip {key}: {c['src']} not downloaded yet)"); continue
        img = Image.open(src).convert("RGB")
        w = min(c["w"], img.size[0]); h = int(round(img.size[1] * w / img.size[0]))
        img = grade(img.resize((w, h), Image.LANCZOS), sat=c.get("sat", 0.6), warm=c.get("warm", 0.02))
        img.save(os.path.join(OUT, key + ".jpg"), quality=88)
        meta[key] = {"mode": "print", "w": w, "h": h}
        print(f"  print  {key:20s} {w}x{h}")

    for key, (srcname, box, w) in NEWS.items():
        if args.only and key not in args.only: continue
        src = os.path.join(RAW, srcname)
        if not os.path.exists(src):
            print(f"  (skip {key}: {srcname} not downloaded yet)"); continue
        img = Image.open(src).convert("RGB")
        W, H = img.size
        img = img.crop((int(box[0] * W), int(box[1] * H), int(box[2] * W), int(box[3] * H)))
        h = int(round(img.size[1] * w / img.size[0]))
        img = grade(img.resize((w, h), Image.LANCZOS), sat=0.0, contrast=1.25, lift=0.0, gain=1.15)
        halftone(img, pitch=4.2, gamma=0.9).save(os.path.join(OUT, key + ".jpg"), quality=90)
        meta[key] = {"mode": "news", "w": w, "h": h}
        print(f"  news   {key:20s} {w}x{h}")

    # coarse halftone of the Wall Street frame: the paper "becomes" the photograph in the zoom-through
    if (not args.only or "wall_street_halftone" in args.only) and os.path.exists(os.path.join(OUT, "wall_street.jpg")):
        img = Image.open(os.path.join(OUT, "wall_street.jpg"))
        halftone(img, pitch=15.0, gamma=0.85, ss=2).save(os.path.join(OUT, "wall_street_halftone.jpg"), quality=86)
        halftone(img, pitch=7.0, gamma=0.9, ss=2).save(os.path.join(OUT, "wall_street_halftone_fine.jpg"), quality=86)
        print("  halftone wall_street")

    json.dump(meta, open(meta_path, "w"), indent=1)


if __name__ == "__main__":
    main()
