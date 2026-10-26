#!/usr/bin/env python3
"""Renders NotchPilot's app icon and writes Resources/AppIcon.icns.

Requires Pillow. The .icns container is written directly (PNG-encoded
entries), so no macOS tools are needed.
"""
import io
import math
import struct
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SIZE = 1024
SCALE = 2  # supersampling for smooth edges


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def render(size=SIZE):
    s = size * SCALE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # Squircle-ish rounded square body with a charcoal vertical gradient.
    inset = int(s * 0.098)
    body = (inset, inset, s - inset, s - inset)
    radius = int((body[2] - body[0]) * 0.225)
    gradient = Image.new("RGBA", (s, s))
    gd = ImageDraw.Draw(gradient)
    top, bottom = (44, 46, 54, 255), (10, 10, 13, 255)
    for y in range(s):
        gd.line([(0, y), (s, y)], fill=lerp(top, bottom, y / s))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle(body, radius=radius, fill=255)

    # Soft drop shadow.
    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((body[0], body[1] + int(s * 0.012), body[2], body[3] + int(s * 0.012)), radius=radius, fill=(0, 0, 0, 120))
    shadow = shadow.filter(ImageFilter.GaussianBlur(s * 0.018))
    img.alpha_composite(shadow)
    img.paste(gradient, (0, 0), mask)

    # Subtle top highlight ring.
    ring = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(ring).rounded_rectangle(body, radius=radius, outline=(255, 255, 255, 34), width=int(s * 0.004))
    img.alpha_composite(ring)

    # The "notch": a black pill hanging from the top edge with concave shoulders.
    cx = s // 2
    notch_w, notch_h = int(s * 0.36), int(s * 0.115)
    nd = ImageDraw.Draw(img)
    nx0, nx1 = cx - notch_w // 2, cx + notch_w // 2
    ny0 = body[1]
    nd.rounded_rectangle((nx0, ny0 - notch_h, nx1, ny0 + notch_h), radius=int(notch_h * 0.62), fill=(0, 0, 0, 255))
    # Re-clip to the body so the notch never pokes outside the icon.
    clip = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    clip.paste(img, (0, 0), mask)
    img = Image.alpha_composite(Image.new("RGBA", (s, s), (0, 0, 0, 0)), shadow)
    img.alpha_composite(clip)

    # Glowing orb with an indigo → cyan → mint gradient (the assistant).
    orb_r = int(s * 0.19)
    ocx, ocy = cx, int(s * 0.565)
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((ocx - orb_r * 1.7, ocy - orb_r * 1.7, ocx + orb_r * 1.7, ocy + orb_r * 1.7), fill=(90, 120, 255, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(s * 0.05))
    img.alpha_composite(glow)

    orb = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    od = ImageDraw.Draw(orb)
    colors = [(122, 92, 255), (64, 156, 255), (72, 220, 200)]
    for i in range(orb_r, 0, -1):
        t = 1 - i / orb_r
        # Diagonal blend + radial brightening.
        c = lerp(colors[0], colors[1], min(1, t * 1.6)) if t < 0.6 else lerp(colors[1], colors[2], (t - 0.6) / 0.4)
        bright = 1 + 0.25 * t
        c = tuple(min(255, int(v * bright)) for v in c)
        od.ellipse((ocx - i, ocy - i, ocx + i, ocy + i), fill=c + (255,))
    img.alpha_composite(orb)

    # A four-point sparkle inside the orb.
    sp = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sp)
    arm, waist = orb_r * 0.62, orb_r * 0.16
    points = []
    for k in range(8):
        ang = math.pi / 4 * k - math.pi / 2
        r = arm if k % 2 == 0 else waist
        points.append((ocx + r * math.cos(ang), ocy + r * math.sin(ang)))
    sd.polygon(points, fill=(255, 255, 255, 240))
    img.alpha_composite(sp.filter(ImageFilter.GaussianBlur(s * 0.0015)))

    # Thin "island" line beneath the notch, echoing the expanded panel.
    nd = ImageDraw.Draw(img)
    line_w = int(s * 0.2)
    ly = ny0 + notch_h + int(s * 0.05)
    nd.rounded_rectangle((cx - line_w // 2, ly, cx + line_w // 2, ly + int(s * 0.012)), radius=int(s * 0.006), fill=(255, 255, 255, 46))

    return img.resize((size, size), Image.LANCZOS)


def png_bytes(image):
    out = io.BytesIO()
    image.save(out, format="PNG", optimize=True)
    return out.getvalue()


def write_icns(master, path):
    entries = [("icp4", 16), ("icp5", 32), ("icp6", 64), ("ic07", 128), ("ic08", 256), ("ic09", 512), ("ic10", 1024),
               ("ic11", 32), ("ic12", 64), ("ic13", 256), ("ic14", 512)]
    chunks = b""
    for code, px in entries:
        data = png_bytes(master.resize((px, px), Image.LANCZOS))
        chunks += code.encode("ascii") + struct.pack(">I", len(data) + 8) + data
    path.write_bytes(b"icns" + struct.pack(">I", len(chunks) + 8) + chunks)


def main():
    master = render()
    resources = ROOT / "Resources"
    resources.mkdir(exist_ok=True)
    master.save(resources / "AppIcon-1024.png")
    write_icns(master, resources / "AppIcon.icns")
    print("wrote", resources / "AppIcon.icns")


if __name__ == "__main__":
    sys.exit(main())
