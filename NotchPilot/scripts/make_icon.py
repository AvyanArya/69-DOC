#!/usr/bin/env python3
"""Renders NotchPilot's app icon and writes Resources/AppIcon.icns.

Requires Pillow. The .icns container is written directly (PNG-encoded
entries), so no macOS tools are needed.
"""
import io
import struct
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SIZE = 1024
SCALE = 2  # supersampling for smooth edges


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def star_points(cx, cy, r, k=0.12, steps=24):
    """A four-point sparkle (the SF Symbols "sparkle" shape) as a polygon."""
    a = r * k
    corners = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    controls = [(cx + a, cy - a), (cx + a, cy + a), (cx - a, cy + a), (cx - a, cy - a)]
    points = []
    for i in range(4):
        p0, p1, c = corners[i], corners[(i + 1) % 4], controls[i]
        for step in range(steps):
            t = step / steps
            points.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
                           (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1]))
    return points


def render(size=SIZE):
    s = size * SCALE
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    # macOS icon grid: an 824/1024 rounded-square body with a soft drop shadow.
    inset = int(s * 0.098)
    body = (inset, inset, s - inset, s - inset)
    bw = body[2] - body[0]
    radius = int(bw * 0.225)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle(body, radius=radius, fill=255)

    shadow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((body[0], body[1] + int(s * 0.012), body[2], body[3] + int(s * 0.012)), radius=radius, fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(s * 0.018))

    # Blue → violet vertical gradient with a soft highlight at the top.
    face = Image.new("RGBA", (s, s))
    fd = ImageDraw.Draw(face)
    top, bottom = (79, 141, 255, 255), (106, 61, 240, 255)
    for y in range(s):
        fd.line([(0, y), (s, y)], fill=lerp(top, bottom, max(0.0, min(1.0, (y - body[1]) / bw))))
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    gr = bw * 0.6
    gcx, gcy = s / 2, body[1]
    ImageDraw.Draw(glow).ellipse((gcx - gr, gcy - gr * 0.6, gcx + gr, gcy + gr * 0.6), fill=(255, 255, 255, 46))
    face.alpha_composite(glow.filter(ImageFilter.GaussianBlur(s * 0.12)))

    # The island: black, hanging from the top edge, with concave "ears" like the notch.
    island = Image.new("L", (s, s), 0)
    idraw = ImageDraw.Draw(island)
    x0, x1 = body[0] + bw * 0.256, body[0] + bw * 0.744
    y1 = body[1] + bw * 0.366
    r = bw * 0.134
    ear = bw * 0.061
    idraw.rounded_rectangle((x0, body[1] - r, x1, y1), radius=r, fill=255)
    idraw.rectangle((x0 - ear, body[1], x0, body[1] + ear), fill=255)
    idraw.ellipse((x0 - 2 * ear, body[1], x0, body[1] + 2 * ear), fill=0)
    idraw.rectangle((x1, body[1], x1 + ear, body[1] + ear), fill=255)
    idraw.ellipse((x1, body[1], x1 + 2 * ear, body[1] + 2 * ear), fill=0)
    face.paste((0, 0, 0, 255), (0, 0), island)

    # White sparkles inside the island.
    sd = ImageDraw.Draw(face)
    scx, scy = s / 2, body[1] + bw * 0.183
    sd.polygon(star_points(scx, scy, bw * 0.116), fill=(255, 255, 255, 255))
    sd.polygon(star_points(body[0] + bw * 0.605, body[1] + bw * 0.092, bw * 0.035), fill=(255, 255, 255, 160))

    # Hairline highlight around the body.
    ImageDraw.Draw(face).rounded_rectangle(body, radius=radius, outline=(255, 255, 255, 56), width=max(1, int(s * 0.004)))

    img.alpha_composite(shadow)
    clipped = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    clipped.paste(face, (0, 0), mask)
    img.alpha_composite(clipped)
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
