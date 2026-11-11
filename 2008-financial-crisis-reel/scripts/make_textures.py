#!/usr/bin/env python3
"""Procedurally generate the paper / print textures used throughout the film.

Everything here is synthetic (numpy + Pillow) so there is nothing to license:
  public/textures/newsprint_{a,b,c}.jpg   off-white newsprint sheets (fibres, mottling, fold creases)
  public/textures/paper_white.jpg         brighter stock for contracts / certificates
  public/textures/paper_macro.jpg         extreme close-up of paper fibres (zoom-through)
  public/textures/manila.jpg              manila folder stock
  public/textures/dust.png                transparent dust / scratches overlay
usage: python3 scripts/make_textures.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "textures")
os.makedirs(OUT, exist_ok=True)


def noise(rng, h, w, scale, blur=1.0):
    """Smooth value noise: random field at 1/scale resolution, blurred and upsampled."""
    sh, sw = max(2, h // scale), max(2, w // scale)
    n = ndimage.gaussian_filter(rng.normal(0, 1, (sh, sw)).astype(np.float32), blur)
    a = ndimage.zoom(n, (h / sh, w / sw), order=3)[:h, :w]
    if a.shape != (h, w):
        a = np.pad(a, ((0, h - a.shape[0]), (0, w - a.shape[1])), mode="edge")
    return (a - a.mean()) / (a.std() + 1e-6)


def fibres(rng, h, w, count, length=(8, 40), alpha=(10, 46), width=1):
    """Random short curved strokes – the visible pulp fibres in cheap paper."""
    layer = Image.new("L", (w, h), 128)
    d = ImageDraw.Draw(layer)
    for _ in range(count):
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        ang = rng.uniform(0, np.pi)
        ln = rng.uniform(*length)
        bend = rng.uniform(-0.6, 0.6)
        pts = []
        for i in range(6):
            t = i / 5
            a = ang + bend * (t - 0.5)
            pts.append((x + np.cos(a) * ln * t, y + np.sin(a) * ln * t))
        v = int(128 + rng.choice([-1, 1]) * rng.uniform(*alpha))
        d.line(pts, fill=max(0, min(255, v)), width=width)
    return (np.asarray(layer.filter(ImageFilter.GaussianBlur(0.6)), dtype=np.float32) - 128) / 128


def paper(w, h, base, seed, grain=2.4, mottle=5.0, fibre_n=2600, yellow_edges=0.5, folds=(), stains=0):
    rng = np.random.default_rng(seed)
    lum = (rng.normal(0, 1, (h, w)).astype(np.float32) * grain
           + noise(rng, h, w, 3, 0.8) * grain * 0.9
           + noise(rng, h, w, 24, 1.5) * mottle * 0.55
           + noise(rng, h, w, 120, 2.0) * mottle)
    lum += fibres(rng, h, w, fibre_n) * 16
    img = np.empty((h, w, 3), np.float32)
    for c in range(3):
        img[..., c] = base[c] + lum
    # age: edges go darker and yellower
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    edge = np.minimum.reduce([xx, w - 1 - xx, yy, h - 1 - yy]) / (0.16 * min(w, h))
    edge = 1 - np.clip(edge, 0, 1) ** 0.6
    edge *= 0.55 + 0.45 * (noise(rng, h, w, 60, 2.0) * 0.5 + 0.5)
    img[..., 0] -= edge * 14 * yellow_edges
    img[..., 1] -= edge * 20 * yellow_edges
    img[..., 2] -= edge * 38 * yellow_edges
    for _ in range(stains):
        cx, cy, r = rng.uniform(0, w), rng.uniform(0, h), rng.uniform(0.05, 0.18) * w
        blob = np.exp(-(((xx - cx) ** 2 + (yy - cy) ** 2) / (2 * r * r))) * (0.6 + 0.4 * noise(rng, h, w, 40, 2.0))
        img[..., 0] -= blob * 5; img[..., 1] -= blob * 8; img[..., 2] -= blob * 15
    # fold creases: a dark valley with a bright ridge beside it
    for orient, pos, strength in folds:
        coord = yy if orient == "h" else xx
        size = h if orient == "h" else w
        wobble = noise(rng, h, w, 200, 2.0) * 1.2
        dist = coord - pos * size + wobble
        crease = np.exp(-(dist ** 2) / 3.0) * 20 - np.exp(-((dist - 3.5) ** 2) / 8.0) * 9 + np.exp(-(dist ** 2) / 900.0) * 5
        img -= (crease * strength)[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))


def macro(w, h, seed):
    """Paper under a loupe: long tangled fibres, strong relief."""
    rng = np.random.default_rng(seed)
    base = np.array([232, 225, 209], np.float32)
    lum = noise(rng, h, w, 6, 1.2) * 7 + noise(rng, h, w, 60, 2.0) * 9 + noise(rng, h, w, 260, 2.0) * 10
    lum += fibres(rng, h, w, 5200, length=(60, 300), alpha=(18, 70), width=2) * 34
    lum += fibres(rng, h, w, 1400, length=(120, 520), alpha=(30, 90), width=4) * 26
    img = base[None, None, :] + lum[..., None]
    img[..., 2] -= 6
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.7))


def dust(w, h, seed):
    rng = np.random.default_rng(seed)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(170):
        x, y, r = rng.uniform(0, w), rng.uniform(0, h), rng.uniform(0.6, 2.4)
        v = int(rng.choice([18, 235])); a = int(rng.uniform(40, 150))
        d.ellipse([x - r, y - r, x + r, y + r], fill=(v, v, v, a))
    for _ in range(14):
        x, y = rng.uniform(0, w), rng.uniform(0, h)
        ln = rng.uniform(40, 260); ang = rng.normal(np.pi / 2, 0.12)
        d.line([(x, y), (x + np.cos(ang) * ln, y + np.sin(ang) * ln)], fill=(240, 240, 240, int(rng.uniform(30, 90))), width=1)
    return layer.filter(ImageFilter.GaussianBlur(0.5))


if __name__ == "__main__":
    paper(1000, 1500, (238, 232, 219), 11, folds=[("h", 0.5, 1.0)], stains=2).save(os.path.join(OUT, "newsprint_a.jpg"), quality=90)
    paper(1000, 1500, (233, 226, 210), 23, mottle=6.5, yellow_edges=0.8, folds=[("h", 0.5, 0.8), ("v", 0.5, 0.45)], stains=3).save(os.path.join(OUT, "newsprint_b.jpg"), quality=90)
    paper(1000, 1500, (241, 236, 226), 37, mottle=4.0, yellow_edges=0.35, folds=[("h", 0.5, 0.6)], stains=1).save(os.path.join(OUT, "newsprint_c.jpg"), quality=90)
    paper(1000, 1400, (247, 244, 237), 41, grain=1.6, mottle=2.6, fibre_n=900, yellow_edges=0.15).save(os.path.join(OUT, "paper_white.jpg"), quality=90)
    paper(1000, 1400, (214, 190, 142), 53, grain=2.8, mottle=6.0, fibre_n=3200, yellow_edges=0.4).save(os.path.join(OUT, "manila.jpg"), quality=90)
    macro(1296, 2304, 61).save(os.path.join(OUT, "paper_macro.jpg"), quality=88)
    dust(1080, 1920, 71).save(os.path.join(OUT, "dust.png"))
    print("textures written to", OUT)
