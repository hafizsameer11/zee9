#!/usr/bin/env python3
"""
Deterministic casino-table asset generator for WinGo Lottery (dev-time only).
Outputs PNG (+ WebP where useful) under public/games/casino-table/
"""
from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "games" / "casino-table"
SEED = 20260721


def rng(seed: int = SEED) -> random.Random:
    return random.Random(seed)


def ensure_dirs() -> None:
    for d in (
        "background",
        "navigation",
        "chips",
        "balls",
        "players",
        "badges",
        "panels",
        "controls",
        "machine",
        "banners",
        "effects",
    ):
        (OUT / d).mkdir(parents=True, exist_ok=True)


def save(img: Image.Image, rel: str, manifest: list[dict], also_webp: bool = False) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img = img.convert("RGBA")
    fmt = path.suffix.lower().lstrip(".")
    if fmt == "webp":
        img.save(path, "WEBP", quality=90, method=6)
        entry = {"file": rel.replace("\\", "/"), "w": img.width, "h": img.height, "format": "webp"}
    else:
        img.save(path, "PNG", optimize=True)
        entry = {"file": rel.replace("\\", "/"), "w": img.width, "h": img.height, "format": "png"}
        if also_webp:
            wp = path.with_suffix(".webp")
            img.save(wp, "WEBP", quality=90, method=6)
            entry["webp"] = str(Path(rel).with_suffix(".webp")).replace("\\", "/")
    manifest.append(entry)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    if not bold:
        candidates = [
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
            "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        ] + candidates
    for c in candidates:
        p = Path(c)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


def disk(size: int, color: tuple[int, int, int, int]) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((0, 0, size - 1, size - 1), fill=color)
    return im


def radial_sphere(
    size: int,
    base: tuple[int, int, int],
    highlight: tuple[int, int, int] = (255, 255, 255),
) -> Image.Image:
    """High-gloss billiard-style sphere with rim darkening + dual speculars."""
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx = cy = size / 2
    r = size / 2 - 1
    px = im.load()
    hx, hy = cx - r * 0.28, cy - r * 0.38
    hx2, hy2 = cx + r * 0.22, cy + r * 0.35
    for y in range(size):
        for x in range(size):
            dx, dy = x - cx, y - cy
            dist2 = dx * dx + dy * dy
            if dist2 > r * r:
                continue
            nx, ny = dx / r, dy / r
            nz = math.sqrt(max(0.0, 1 - nx * nx - ny * ny))
            light = max(0.0, nx * -0.28 + ny * -0.52 + nz * 0.95)
            rim = max(0.0, 1.0 - nz) ** 1.6
            shade = 0.28 + 0.72 * light - rim * 0.22
            sdx, sdy = x - hx, y - hy
            spec = math.exp(-(sdx * sdx + sdy * sdy) / (r * r * 0.055))
            sdx2, sdy2 = x - hx2, y - hy2
            spec2 = math.exp(-(sdx2 * sdx2 + sdy2 * sdy2) / (r * r * 0.12)) * 0.25
            rr = int(min(255, base[0] * shade + highlight[0] * (spec * 0.95 + spec2)))
            gg = int(min(255, base[1] * shade + highlight[1] * (spec * 0.95 + spec2)))
            bb = int(min(255, base[2] * shade + highlight[2] * (spec * 0.95 + spec2)))
            aa = 255
            dist = math.sqrt(dist2)
            if dist > r - 1.5:
                aa = int(255 * max(0, (r + 0.3 - dist) / 1.8))
            px[x, y] = (rr, gg, bb, aa)
    return im


def drop_shadow(img: Image.Image, blur: int = 6, opacity: int = 120, offset: tuple[int, int] = (3, 4)) -> Image.Image:
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    alpha = img.split()[-1]
    black = Image.new("RGBA", img.size, (0, 0, 0, opacity))
    black.putalpha(alpha)
    shadow = Image.alpha_composite(shadow, black)
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas = Image.new("RGBA", (img.width + abs(offset[0]) + blur * 2, img.height + abs(offset[1]) + blur * 2), (0, 0, 0, 0))
    ox, oy = blur + max(0, offset[0]), blur + max(0, offset[1])
    canvas.paste(shadow, (ox + offset[0], oy + offset[1]), shadow)
    canvas.paste(img, (ox, oy), img)
    return canvas


# ───────────────── CHIPS (match reference colour identities) ─────────────────
# Reference: 10 cream/green · 50 brown · 100 purple · 500 gold · 1K charcoal
CHIP_COLORS = {
    10: {
        "rim": (55, 160, 85),
        "body": (245, 245, 240),
        "edge_a": (245, 250, 245),
        "edge_b": (40, 120, 60),
        "text": (35, 100, 50),
    },
    50: {
        "rim": (140, 75, 40),
        "body": (185, 110, 55),
        "edge_a": (245, 220, 180),
        "edge_b": (90, 45, 20),
        "text": (255, 245, 230),
    },
    100: {
        "rim": (110, 55, 170),
        "body": (150, 80, 210),
        "edge_a": (230, 200, 255),
        "edge_b": (70, 30, 120),
        "text": (255, 245, 255),
    },
    500: {
        "rim": (200, 150, 35),
        "body": (235, 195, 55),
        "edge_a": (255, 250, 210),
        "edge_b": (150, 100, 20),
        "text": (70, 45, 5),
    },
    1000: {
        "rim": (45, 48, 55),
        "body": (70, 74, 82),
        "edge_a": (210, 215, 225),
        "edge_b": (25, 28, 32),
        "text": (255, 230, 120),
    },
}


def make_chip(denom: int, size: int = 256, rot: float = 0, perspective: float = 0.0) -> Image.Image:
    """Thick-rim casino chip with visible side depth (not a flat disc)."""
    cols = CHIP_COLORS[denom]
    # Extra canvas for side thickness + shadow
    side = max(6, int(size * 0.07))
    canvas_h = size + side + 10
    canvas_w = size + 10
    im = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    ox, oy = 5, 4
    # Side wall (cylinder thickness under the face)
    dark_rim = tuple(max(0, c - 55) for c in cols["rim"])
    d.ellipse((ox, oy + side, ox + size - 1, oy + size - 1 + side), fill=(*dark_rim, 255))
    # Alternating edge markings on the side
    cx = ox + size / 2
    cy_side = oy + size / 2 + side * 0.55
    for i in range(20):
        a0 = math.radians(i * 18)
        a1 = math.radians(i * 18 + 9)
        # only lower half of cylinder visible
        if math.sin((a0 + a1) / 2) < 0.15:
            continue
        col = cols["edge_a"] if i % 2 == 0 else cols["edge_b"]
        pts = [
            (cx + (size / 2 - 2) * math.cos(a0), cy_side + (size / 2 - side) * 0.35 * math.sin(a0)),
            (cx + (size / 2 - 2) * math.cos(a1), cy_side + (size / 2 - side) * 0.35 * math.sin(a1)),
            (cx + (size / 2 - 8) * math.cos(a1), oy + size * 0.92),
            (cx + (size / 2 - 8) * math.cos(a0), oy + size * 0.92),
        ]
        d.polygon(pts, fill=(*col, 220))

    # Top face
    pad = int(size * 0.04)
    face = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    fd = ImageDraw.Draw(face)
    fd.ellipse((pad, pad, size - pad - 1, size - pad - 1), fill=(*cols["rim"], 255))
    # Edge dash ring on face
    cx0 = cy0 = size / 2
    r_out = size / 2 - pad - 1
    r_in = r_out - size * 0.085
    for i in range(28):
        a0 = math.radians(i * (360 / 28) + 1)
        a1 = math.radians(i * (360 / 28) + 8)
        pts = []
        for a in (a0, a1):
            pts.append((cx0 + r_out * math.cos(a), cy0 + r_out * math.sin(a)))
        for a in (a1, a0):
            pts.append((cx0 + r_in * math.cos(a), cy0 + r_in * math.sin(a)))
        col = cols["edge_a"] if i % 2 == 0 else cols["edge_b"]
        fd.polygon(pts, fill=(*col, 255))
    # Body ring
    inset = pad + int(size * 0.11)
    fd.ellipse((inset, inset, size - inset - 1, size - inset - 1), fill=(*cols["body"], 255))
    # Inner bevel ring
    mid = inset + int(size * 0.04)
    fd.ellipse((mid, mid, size - mid - 1, size - mid - 1), outline=(*cols["rim"], 160), width=max(2, size // 50))
    # Centre disc (cream plate)
    cpad = pad + int(size * 0.27)
    fd.ellipse((cpad, cpad, size - cpad - 1, size - cpad - 1), fill=(252, 250, 245, 255))
    fd.ellipse(
        (cpad + 2, cpad + 2, size - cpad - 3, size - cpad - 3),
        outline=(*cols["rim"], 180),
        width=max(2, size // 55),
    )
    # Denomination
    label = "1K" if denom >= 1000 else str(denom)
    fsize = int(size * (0.24 if len(label) <= 2 else 0.19))
    f = font(fsize)
    bbox = fd.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    tx, ty = (size - tw) / 2, (size - th) / 2 - size * 0.02
    fd.text((tx + 1.5, ty + 1.5), label, font=f, fill=(0, 0, 0, 90))
    fd.text((tx, ty), label, font=f, fill=(*cols["text"], 255))
    # Top-left gloss
    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.ellipse((pad + 4, pad + 4, size * 0.58, size * 0.48), fill=(255, 255, 255, 55))
    gloss = gloss.filter(ImageFilter.GaussianBlur(max(4, size // 18)))
    face = Image.alpha_composite(face, gloss)
    # Soft radial shading on face
    shade = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sp = shade.load()
    for y in range(size):
        for x in range(size):
            dx, dy = x - size * 0.42, y - size * 0.38
            dist = math.sqrt(dx * dx + dy * dy) / (size * 0.55)
            if dist > 1:
                a = int(min(70, (dist - 1) * 90 + 25))
                sp[x, y] = (0, 0, 0, a)
    mask = disk(size, (255, 255, 255, 255))
    shade.putalpha(ImageChops.multiply(shade.split()[-1], mask.split()[-1]))
    face = Image.alpha_composite(face, shade)

    im.alpha_composite(face, (ox, oy))
    if rot:
        im = im.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
        im = _center_crop_square(im, size + side + 16)
    if perspective:
        # slight foreshortening via affine
        w, h = im.size
        im = im.transform(
            (w, h),
            Image.Transform.AFFINE,
            (1, 0, 0, perspective * 0.15, 1 - abs(perspective) * 0.08, abs(perspective) * h * 0.04),
            resample=Image.Resampling.BICUBIC,
        )
    return drop_shadow(im, blur=max(5, size // 32), opacity=140, offset=(2, 4))


def _center_crop_square(im: Image.Image, size: int) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - im.width) // 2
    y = (size - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas


def generate_chips(manifest: list[dict], r: random.Random) -> None:
    for denom in (10, 50, 100, 500, 1000):
        tag = "1k" if denom == 1000 else str(denom)
        large = make_chip(denom, 280, 0)
        save(large.resize((132, 132), Image.Resampling.LANCZOS), f"chips/chip-{tag}-large.png", manifest)
        save(large, f"chips/chip-{tag}-large@2x.png", manifest)
        for i, rot in enumerate((0, 12, -15)):
            sm = make_chip(denom, 180, rot)
            out = sm.resize((64, 64), Image.Resampling.LANCZOS)
            save(out, f"chips/chip-{tag}-small-{chr(ord('a') + i)}.png", manifest)
        # perspective / tilted board chip
        tilt = make_chip(denom, 180, r.uniform(-8, 8), perspective=0.35)
        save(tilt.resize((64, 64), Image.Resampling.LANCZOS), f"chips/chip-{tag}-small-d.png", manifest)
        sel = make_chip(denom, 240, r.uniform(-3, 3))
        save(sel.resize((110, 110), Image.Resampling.LANCZOS), f"chips/chip-{tag}-selector.png", manifest)


# ───────────────── BALLS ─────────────────
BALL_BASE = {
    "green": (18, 175, 72),
    "red": (220, 38, 48),
    "purple": (145, 48, 210),
    "gold": (230, 175, 35),
}


def number_color_family(n: int) -> str:
    if n in (0, 5):
        return "purple"
    return "green" if n % 2 == 1 else "red"


def make_ball(n: int, size: int = 128) -> Image.Image:
    fam = number_color_family(n)
    sphere = radial_sphere(size, BALL_BASE[fam])
    # gloss crescent
    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.ellipse((size * 0.18, size * 0.12, size * 0.55, size * 0.42), fill=(255, 255, 255, 70))
    gloss = gloss.filter(ImageFilter.GaussianBlur(max(2, size // 28)))
    mask = disk(size, (255, 255, 255, 255))
    gloss.putalpha(ImageChops.multiply(gloss.split()[-1], mask.split()[-1]))
    sphere = Image.alpha_composite(sphere, gloss)
    # white number disc
    d = ImageDraw.Draw(sphere)
    disc_r = int(size * 0.30)
    cx = cy = size // 2
    d.ellipse((cx - disc_r, cy - disc_r, cx + disc_r, cy + disc_r), fill=(250, 250, 252, 255))
    d.ellipse(
        (cx - disc_r, cy - disc_r, cx + disc_r, cy + disc_r),
        outline=(30, 30, 35, 110),
        width=max(1, size // 55),
    )
    f = font(int(size * 0.38))
    label = str(n)
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) / 2, (size - th) / 2 - size * 0.03), label, font=f, fill=(18, 18, 22, 255))
    # thin coloured rim
    d.ellipse((2, 2, size - 3, size - 3), outline=(*BALL_BASE[fam], 90), width=max(1, size // 64))
    return drop_shadow(sphere, blur=max(4, size // 24), opacity=120, offset=(2, 4))


def generate_balls(manifest: list[dict]) -> None:
    sizes = {"history": 56, "cell": 72, "machine": 96, "reveal": 140}
    for n in range(10):
        hi = make_ball(n, 256)
        for name, sz in sizes.items():
            save(hi.resize((sz, sz), Image.Resampling.LANCZOS), f"balls/ball-{n}-{name}.png", manifest)
        save(hi, f"balls/ball-{n}@2x.png", manifest)


# ───────────────── NAV / CONTROLS ─────────────────
def make_back_btn(size: int = 128) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = 6
    d.ellipse((pad, pad, size - pad, size - pad), fill=(160, 25, 35, 255))
    d.ellipse((pad, pad, size - pad, size - pad), outline=(240, 200, 80, 255), width=max(3, size // 28))
    # chevron
    cx, cy = size // 2, size // 2
    pts = [(cx + size * 0.12, cy - size * 0.22), (cx - size * 0.18, cy), (cx + size * 0.12, cy + size * 0.22)]
    d.line(pts[:2], fill=(255, 255, 255, 255), width=max(4, size // 18))
    d.line(pts[1:], fill=(255, 255, 255, 255), width=max(4, size // 18))
    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.arc((pad + 4, pad + 4, size - pad - 4, size - pad - 4), 200, 330, fill=(255, 255, 255, 70), width=3)
    im = Image.alpha_composite(im, hi)
    return drop_shadow(im, 5, 120, (2, 3))


def make_menu_btn(size: int = 112) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pad = 6
    d.ellipse((pad, pad, size - pad, size - pad), fill=(150, 20, 30, 255))
    d.ellipse((pad, pad, size - pad, size - pad), outline=(240, 200, 80, 255), width=max(3, size // 26))
    # four diamonds
    s = size * 0.1
    positions = [
        (size * 0.35, size * 0.35),
        (size * 0.65, size * 0.35),
        (size * 0.35, size * 0.65),
        (size * 0.65, size * 0.65),
    ]
    for x, y in positions:
        d.polygon([(x, y - s), (x + s, y), (x, y + s), (x - s, y)], fill=(255, 220, 100, 255))
    return drop_shadow(im, 5, 120, (2, 3))


def make_add_btn(w: int = 220, h: int = 80) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=h // 2, fill=(240, 170, 40, 255))
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=h // 2, outline=(255, 230, 140, 255), width=3)
    # cart blob
    d.ellipse((12, 14, 52, 54), fill=(200, 40, 50, 255))
    d.rectangle((20, 28, 44, 42), fill=(255, 220, 100, 255))
    f = font(int(h * 0.42))
    d.text((62, h * 0.22), "ADD", font=f, fill=(40, 20, 0, 255))
    hi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.rounded_rectangle((6, 6, w - 8, h * 0.45), radius=h // 3, fill=(255, 255, 255, 45))
    hi = hi.filter(ImageFilter.GaussianBlur(4))
    im = Image.alpha_composite(im, hi)
    return drop_shadow(im, 6, 110, (2, 3))


def make_play_badge(w: int = 240, h: int = 88) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 8, w - 4, h - 4), radius=18, fill=(120, 20, 28, 255))
    d.rounded_rectangle((4, 8, w - 4, h - 4), radius=18, outline=(240, 200, 80, 255), width=3)
    # orb
    orb = radial_sphere(56, (40, 140, 220))
    im.alpha_composite(orb, (10, 16))
    f1 = font(18)
    f2 = font(28)
    d.text((72, 14), "Play Game", font=f1, fill=(255, 230, 180, 255))
    d.text((72, 38), "Rs10", font=f2, fill=(255, 220, 80, 255))
    return drop_shadow(im, 5, 120, (2, 3))


def make_arrow(size: int = 64, direction: str = "left") -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 8, size - 4, size - 8), radius=8, fill=(40, 50, 60, 220))
    d.rounded_rectangle((4, 8, size - 4, size - 8), radius=8, outline=(160, 180, 200, 180), width=2)
    cx, cy = size // 2, size // 2
    if direction == "left":
        pts = [(cx + 8, cy - 12), (cx - 10, cy), (cx + 8, cy + 12)]
    else:
        pts = [(cx - 8, cy - 12), (cx + 10, cy), (cx - 8, cy + 12)]
    d.polygon(pts, fill=(200, 230, 240, 255))
    return drop_shadow(im, 3, 90, (1, 2))


def make_rebet(w: int = 280, h: int = 96, state: str = "normal") -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    base = (190, 195, 205) if state != "disabled" else (120, 125, 135)
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=h // 2, fill=(*base, 255))
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=h // 2, outline=(240, 240, 245, 255), width=3)
    # bevel
    hi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.rounded_rectangle((8, 8, w - 10, h * 0.45), radius=h // 3, fill=(255, 255, 255, 70 if state != "pressed" else 30))
    hi = hi.filter(ImageFilter.GaussianBlur(3))
    im = Image.alpha_composite(im, hi)
    d = ImageDraw.Draw(im)
    f = font(int(h * 0.38))
    label = "ReBet"
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    fill = (30, 35, 45, 255) if state != "disabled" else (80, 85, 95, 200)
    d.text(((w - tw) / 2, (h - th) / 2 - 2), label, font=f, fill=fill)
    return drop_shadow(im, 6, 100, (2, 3))


def generate_nav(manifest: list[dict]) -> None:
    save(make_back_btn(128).resize((96, 96), Image.Resampling.LANCZOS), "navigation/btn-back.png", manifest)
    save(make_menu_btn(112).resize((84, 84), Image.Resampling.LANCZOS), "navigation/btn-menu.png", manifest)
    save(make_add_btn().resize((160, 58), Image.Resampling.LANCZOS), "navigation/btn-add.png", manifest)
    save(make_play_badge().resize((168, 62), Image.Resampling.LANCZOS), "navigation/badge-play.png", manifest)
    # history arrow gold
    arr = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(arr)
    d.ellipse((4, 4, 68, 68), fill=(220, 160, 40, 255))
    d.ellipse((4, 4, 68, 68), outline=(255, 230, 140, 255), width=3)
    d.polygon([(28, 20), (50, 36), (28, 52)], fill=(60, 30, 0, 255))
    save(drop_shadow(arr, 4, 100).resize((40, 40), Image.Resampling.LANCZOS), "navigation/btn-history.png", manifest)
    # mini machine icon
    mm = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(mm)
    d.rounded_rectangle((20, 50, 76, 88), radius=6, fill=(160, 100, 40, 255))
    d.ellipse((18, 12, 78, 72), fill=(60, 90, 120, 255), outline=(220, 170, 60, 255), width=4)
    save(drop_shadow(mm, 4, 90).resize((48, 48), Image.Resampling.LANCZOS), "navigation/icon-machine.png", manifest)


def generate_controls(manifest: list[dict]) -> None:
    save(make_arrow(64, "left").resize((36, 40), Image.Resampling.LANCZOS), "controls/arrow-left.png", manifest)
    save(make_arrow(64, "right").resize((36, 40), Image.Resampling.LANCZOS), "controls/arrow-right.png", manifest)
    for st in ("normal", "pressed", "disabled"):
        save(make_rebet(state=st).resize((168, 58), Image.Resampling.LANCZOS), f"controls/btn-rebet-{st}.png", manifest)
    # group button
    g = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(g)
    d.ellipse((6, 6, 90, 90), fill=(180, 30, 40, 255), outline=(240, 200, 80, 255), width=4)
    for ox in (28, 48, 38):
        d.ellipse((ox, 28, ox + 22, 50), fill=(255, 220, 180, 255))
    d.ellipse((22, 48, 74, 72), fill=(255, 200, 160, 255))
    save(drop_shadow(g, 4, 100).resize((56, 56), Image.Resampling.LANCZOS), "controls/btn-group.png", manifest)
    # plus
    plus = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(plus)
    d.ellipse((6, 6, 90, 90), fill=(20, 80, 100, 180), outline=(80, 230, 255, 220), width=4)
    d.rectangle((42, 28, 54, 68), fill=(200, 240, 255, 255))
    d.rectangle((28, 42, 68, 54), fill=(200, 240, 255, 255))
    save(drop_shadow(plus, 4, 100).resize((48, 48), Image.Resampling.LANCZOS), "controls/btn-plus.png", manifest)
    # chip halo
    halo = Image.new("RGBA", (140, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(halo)
    d.ellipse((10, 10, 130, 130), outline=(255, 220, 80, 200), width=6)
    d.ellipse((18, 18, 122, 122), outline=(255, 240, 160, 120), width=3)
    halo = halo.filter(ImageFilter.GaussianBlur(1))
    save(halo.resize((110, 110), Image.Resampling.LANCZOS), "controls/chip-halo.png", manifest)


# ───────────────── BACKGROUND ─────────────────
def generate_background(manifest: list[dict], r: random.Random) -> None:
    """Smooth casino felt — soft radial teal, subtle diamond, dark curved rail."""
    w, h = 850, 480
    base = Image.new("RGBA", (w, h), (6, 48, 55, 255))
    px = base.load()
    for y in range(h):
        for x in range(w):
            dx = (x - w * 0.5) / (w * 0.52)
            dy = (y - h * 0.40) / (h * 0.55)
            dist = math.sqrt(dx * dx + dy * dy)
            t = max(0.0, 1.0 - dist * 0.95)
            # soft felt colour
            rr = int(4 + 18 * t)
            gg = int(42 + 78 * t)
            bb = int(48 + 62 * t)
            # very subtle diamond weave (not a loud checker)
            qx, qy = x // 14, y // 14
            if (qx + qy) % 2 == 0:
                rr = min(255, rr + 3)
                gg = min(255, gg + 5)
                bb = min(255, bb + 4)
            # darken outer sides
            side = abs(x - w / 2) / (w / 2)
            if side > 0.72:
                f = (side - 0.72) / 0.28
                rr = int(rr * (1 - 0.45 * f))
                gg = int(gg * (1 - 0.45 * f))
                bb = int(bb * (1 - 0.45 * f))
            px[x, y] = (rr, gg, bb, 255)

    d = ImageDraw.Draw(base)
    # lower curved rail (dark)
    d.ellipse((-120, int(h * 0.68), w + 120, h + 220), fill=(10, 8, 6, 255))
    # gold trim on rail
    rail = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rail)
    rd.arc((-100, int(h * 0.66), w + 100, h + 200), 200, 340, fill=(160, 120, 55, 200), width=4)
    base = Image.alpha_composite(base, rail)
    # cyan ambient centre glow
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((int(w * 0.18), int(h * 0.12), int(w * 0.82), int(h * 0.72)), fill=(50, 230, 255, 32))
    glow = glow.filter(ImageFilter.GaussianBlur(48))
    base = Image.alpha_composite(base, glow)
    # vignette
    vig = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    for i, a in enumerate((110, 80, 50, 28, 12)):
        vd.rectangle((i * 3, i * 3, w - 1 - i * 3, h - 1 - i * 3), outline=(0, 0, 0, a))
    vig = vig.filter(ImageFilter.GaussianBlur(10))
    base = Image.alpha_composite(base, vig)
    # warm lower corners
    d = ImageDraw.Draw(base)
    d.ellipse((-60, h - 130, 180, h + 60), fill=(100, 65, 30, 70))
    d.ellipse((w - 180, h - 130, w + 60, h + 60), fill=(100, 65, 30, 70))

    save(base, "background/table-base.png", manifest, also_webp=True)
    save(base.resize((1700, 960), Image.Resampling.LANCZOS), "background/table-base@2x.png", manifest)

    # soft texture layer (subtle, not loud checker)
    tex = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    tp = tex.load()
    for y in range(h):
        for x in range(w):
            if ((x // 16) + (y // 16)) % 2 == 0:
                tp[x, y] = (200, 240, 250, 8)
    save(tex, "background/table-texture.webp", manifest)
    save(vig, "background/table-vignette.png", manifest)
    corner = Image.new("RGBA", (200, 120), (0, 0, 0, 0))
    cd = ImageDraw.Draw(corner)
    for i in range(10):
        cd.arc((8 + i * 6, 20, 190, 140), 200, 340, fill=(170, 120, 55, 35), width=2)
    save(corner, "background/lower-corner-pattern.webp", manifest)
    hi = Image.new("RGBA", (850, 140), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.ellipse((80, -50, 770, 160), fill=(60, 230, 255, 40))
    hi = hi.filter(ImageFilter.GaussianBlur(28))
    save(hi, "background/table-highlight.png", manifest)


# ───────────────── PANELS ─────────────────
def make_panel_frame(w: int, h: int, header_rgb: tuple[int, int, int], header_h: int = 40) -> Image.Image:
    """Translucent teal body + glossy colour header + thick cyan frame."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # outer cyan glow frame
    d.rounded_rectangle((1, 1, w - 2, h - 2), radius=16, fill=(4, 32, 38, 175))
    d.rounded_rectangle((1, 1, w - 2, h - 2), radius=16, outline=(45, 230, 255, 230), width=4)
    d.rounded_rectangle((5, 5, w - 6, h - 6), radius=13, outline=(20, 120, 140, 120), width=2)
    # glossy header
    head = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(head)
    hd.rounded_rectangle((4, 4, w - 5, header_h + 6), radius=12, fill=(*header_rgb, 255))
    hd.rectangle((4, header_h - 2, w - 5, header_h + 8), fill=(*header_rgb, 255))
    # header gloss
    gloss = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.rounded_rectangle((6, 6, w - 7, header_h * 0.55), radius=8, fill=(255, 255, 255, 55))
    gloss = gloss.filter(ImageFilter.GaussianBlur(2))
    head = Image.alpha_composite(head, gloss)
    im = Image.alpha_composite(im, head)
    # body inner highlight
    body = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    bd = ImageDraw.Draw(body)
    bd.rounded_rectangle((8, header_h + 6, w - 9, h - 9), radius=10, outline=(80, 240, 255, 55), width=2)
    bd.ellipse((w * 0.15, header_h + 10, w * 0.85, h * 0.55), fill=(60, 220, 255, 18))
    body = body.filter(ImageFilter.GaussianBlur(1))
    im = Image.alpha_composite(im, body)
    return drop_shadow(im, 6, 100, (2, 4))


def generate_panels(manifest: list[dict]) -> None:
    # generate at 2x then downsample
    g = make_panel_frame(420, 240, (28, 175, 78), header_h=44)
    save(g.resize((210, 120), Image.Resampling.LANCZOS), "panels/panel-green.png", manifest)
    v = make_panel_frame(420, 240, (145, 55, 205), header_h=44)
    save(v.resize((210, 120), Image.Resampling.LANCZOS), "panels/panel-violet.png", manifest)
    r = make_panel_frame(420, 240, (215, 42, 55), header_h=44)
    save(r.resize((210, 120), Image.Resampling.LANCZOS), "panels/panel-red.png", manifest)
    cell = make_panel_frame(240, 200, (12, 40, 48), header_h=30)
    save(cell.resize((120, 100), Image.Resampling.LANCZOS), "panels/cell-small.png", manifest)
    for name, col in (("cyan", (40, 230, 255)), ("gold", (255, 210, 80))):
        g = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
        d = ImageDraw.Draw(g)
        d.rounded_rectangle((14, 14, 114, 114), radius=18, outline=(*col, 230), width=7)
        g = g.filter(ImageFilter.GaussianBlur(3))
        save(g, f"panels/glow-{name}.png", manifest)


# ───────────────── PLAYERS / BADGES ─────────────────
AVATAR_PALETTES = [
    ((80, 180, 220), (40, 80, 120), (240, 200, 160)),
    ((220, 120, 160), (120, 40, 80), (255, 210, 180)),
    ((100, 200, 120), (30, 90, 50), (250, 210, 170)),
    ((200, 160, 80), (100, 70, 20), (255, 220, 180)),
    ((160, 120, 220), (70, 40, 120), (245, 205, 175)),
    ((220, 90, 70), (100, 30, 20), (255, 215, 175)),
]


def make_avatar(idx: int, size: int = 160) -> Image.Image:
    shirt, hair, skin = AVATAR_PALETTES[idx % len(AVATAR_PALETTES)]
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # circle bg
    d.ellipse((4, 4, size - 5, size - 5), fill=(30, 50, 60, 255))
    # shoulders
    d.ellipse((-size * 0.1, size * 0.62, size * 1.1, size * 1.4), fill=(*shirt, 255))
    # head
    d.ellipse((size * 0.22, size * 0.18, size * 0.78, size * 0.72), fill=(*skin, 255))
    # hair
    d.ellipse((size * 0.2, size * 0.1, size * 0.8, size * 0.42), fill=(*hair, 255))
    # eyes
    d.ellipse((size * 0.34, size * 0.38, size * 0.44, size * 0.48), fill=(30, 30, 40, 255))
    d.ellipse((size * 0.56, size * 0.38, size * 0.66, size * 0.48), fill=(30, 30, 40, 255))
    # smile
    d.arc((size * 0.38, size * 0.48, size * 0.62, size * 0.66), 20, 160, fill=(120, 60, 60, 255), width=3)
    return drop_shadow(im, 4, 100, (2, 2))


def make_frame(size: int, kind: str = "normal") -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cols = {
        "normal": (50, 220, 255),
        "gold": (240, 190, 60),
        "winner": (255, 210, 70),
        "lucky": (255, 180, 40),
    }[kind]
    d.ellipse((4, 4, size - 5, size - 5), outline=(*cols, 255), width=max(4, size // 20))
    d.ellipse((10, 10, size - 11, size - 11), outline=(*cols, 100), width=2)
    return im


def generate_players(manifest: list[dict]) -> None:
    for i in range(6):
        av = make_avatar(i, 192)
        save(av.resize((96, 96), Image.Resampling.LANCZOS), f"players/player-{i + 1:02d}.webp", manifest)
        save(av.resize((96, 96), Image.Resampling.LANCZOS), f"players/player-{i + 1:02d}.png", manifest)
    for kind in ("normal", "gold", "winner", "lucky"):
        fr = make_frame(192, kind)
        save(fr.resize((104, 104), Image.Resampling.LANCZOS), f"players/frame-{kind}.png", manifest)
    # nameplate
    plate = Image.new("RGBA", (220, 70), (0, 0, 0, 0))
    d = ImageDraw.Draw(plate)
    d.rounded_rectangle((2, 2, 218, 68), radius=10, fill=(8, 36, 44, 230), outline=(50, 220, 255, 160), width=2)
    save(plate.resize((120, 38), Image.Resampling.LANCZOS), "players/nameplate.png", manifest)


def make_badge(text: str, w: int = 200, h: int = 64, style: str = "winner") -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 14, w - 4, h - 4), radius=10, fill=(180, 120, 20, 255), outline=(255, 230, 120, 255), width=3)
    # crown/star
    if style == "winner":
        d.polygon([(w / 2, 2), (w / 2 + 18, 22), (w / 2 - 18, 22)], fill=(255, 220, 80, 255))
    else:
        cx, cy = w / 2, 14
        pts = []
        for i in range(10):
            ang = math.radians(-90 + i * 36)
            rad = 12 if i % 2 == 0 else 5
            pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
        d.polygon(pts, fill=(255, 220, 80, 255))
    f = font(22)
    bbox = d.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((w - tw) / 2, h * 0.42), text, font=f, fill=(40, 20, 0, 255))
    return drop_shadow(im, 4, 100, (1, 2))


def make_banner(text: str, accent: tuple[int, int, int], w: int = 640, h: int = 160) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # ribbon
    d.polygon([(40, 30), (w - 40, 20), (w - 20, h - 30), (60, h - 20)], fill=(*accent, 245))
    d.polygon([(40, 30), (w - 40, 20), (w - 20, h - 30), (60, h - 20)], outline=(255, 230, 120, 255), width=4)
    # clock orb
    orb = radial_sphere(90, (220, 120, 40))
    im.alpha_composite(orb, (50, 35))
    f = font(44)
    bbox = d.textbbox((0, 0), text, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((160, (h - th) / 2 - 4), text, font=f, fill=(255, 245, 220, 255))
    return drop_shadow(im, 8, 120, (3, 4))


def generate_badges(manifest: list[dict]) -> None:
    save(make_badge("WINNER", style="winner").resize((110, 36), Image.Resampling.LANCZOS), "badges/badge-winner.png", manifest)
    save(make_badge("LUCKY", style="lucky").resize((100, 36), Image.Resampling.LANCZOS), "badges/badge-lucky.png", manifest)
    save(make_badge("VICTORY", style="winner").resize((120, 38), Image.Resampling.LANCZOS), "badges/badge-victory.png", manifest)
    # NEW
    nw = Image.new("RGBA", (80, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(nw)
    d.rounded_rectangle((2, 4, 78, 32), radius=8, fill=(40, 140, 255, 255))
    f = font(16)
    d.text((18, 8), "NEW", font=f, fill=(255, 255, 255, 255))
    save(drop_shadow(nw, 3, 90), "badges/badge-new.png", manifest)
    save(make_banner("Stop Betting", (180, 40, 50)).resize((360, 90), Image.Resampling.LANCZOS), "banners/banner-stop.png", manifest)
    save(make_banner("Start Betting", (40, 140, 80)).resize((360, 90), Image.Resampling.LANCZOS), "banners/banner-start.png", manifest)
    save(make_banner("You Win!", (200, 140, 30)).resize((340, 86), Image.Resampling.LANCZOS), "banners/banner-win.png", manifest)


# ───────────────── MACHINE ─────────────────
def generate_machine(manifest: list[dict]) -> None:
    w, h = 420, 520
    back = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(back)
    d.rounded_rectangle((40, 40, w - 40, h - 60), radius=24, fill=(120, 70, 30, 255))
    save(back.resize((210, 260), Image.Resampling.LANCZOS), "machine/machine-back.png", manifest)

    chamber = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(chamber)
    d.ellipse((70, 70, w - 70, 320), fill=(30, 50, 70, 230))
    save(chamber.resize((210, 260), Image.Resampling.LANCZOS), "machine/machine-chamber.png", manifest)

    glass = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(glass)
    d.ellipse((70, 70, w - 70, 320), outline=(220, 180, 80, 255), width=10)
    hi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.arc((90, 90, w - 110, 250), 200, 320, fill=(255, 255, 255, 90), width=8)
    glass = Image.alpha_composite(glass, hi)
    save(glass.resize((210, 260), Image.Resampling.LANCZOS), "machine/machine-glass.png", manifest)

    front = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(front)
    d.rounded_rectangle((90, 300, w - 90, 360), radius=10, fill=(20, 20, 25, 255), outline=(240, 200, 80, 255), width=4)
    d.rounded_rectangle((60, 380, w - 60, 480), radius=16, fill=(150, 90, 35, 255), outline=(240, 200, 80, 255), width=4)
    save(front.resize((210, 260), Image.Resampling.LANCZOS), "machine/machine-front.png", manifest)

    base = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    d.rounded_rectangle((50, 450, w - 50, 510), radius=10, fill=(80, 45, 15, 255))
    save(base.resize((210, 260), Image.Resampling.LANCZOS), "machine/machine-base.png", manifest)

    # composed preview
    composed = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for layer in (back, chamber, glass, front, base):
        composed = Image.alpha_composite(composed, layer)
    save(drop_shadow(composed, 8, 120).resize((210, 260), Image.Resampling.LANCZOS), "machine/machine-full.png", manifest)
    # mini
    save(composed.resize((56, 70), Image.Resampling.LANCZOS), "machine/machine-mini.png", manifest)

    # result channel / holder / highlight (layered animation pieces)
    ch = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ch)
    d.rounded_rectangle((150, 300, 270, 400), radius=20, fill=(15, 15, 20, 230), outline=(240, 200, 80, 255), width=4)
    save(ch.resize((210, 260), Image.Resampling.LANCZOS), "machine/result-channel.png", manifest)

    rh = Image.new("RGBA", (120, 120), (0, 0, 0, 0))
    d = ImageDraw.Draw(rh)
    d.ellipse((10, 10, 110, 110), outline=(255, 210, 80, 255), width=6)
    d.ellipse((20, 20, 100, 100), fill=(20, 20, 30, 180))
    save(rh, "machine/result-holder.png", manifest)

    hi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(hi)
    d.arc((80, 80, w - 80, 300), 200, 330, fill=(255, 255, 255, 100), width=8)
    hi = hi.filter(ImageFilter.GaussianBlur(2)).resize((210, 260), Image.Resampling.LANCZOS)
    save(hi, "machine/machine-highlight.png", manifest)


# ───────────────── EFFECTS ─────────────────
def generate_effects(manifest: list[dict]) -> None:
    for name, col in (("gold", (255, 210, 80)), ("cyan", (40, 230, 255)), ("reveal", (255, 240, 160))):
        g = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
        d = ImageDraw.Draw(g)
        d.ellipse((20, 20, 140, 140), fill=(*col, 60))
        g = g.filter(ImageFilter.GaussianBlur(16))
        save(g, f"effects/glow-{name}.png", manifest)
    # sparkle
    sp = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(sp)
    d.line((32, 4, 32, 60), fill=(255, 255, 220, 220), width=3)
    d.line((4, 32, 60, 32), fill=(255, 255, 220, 220), width=3)
    d.ellipse((24, 24, 40, 40), fill=(255, 255, 255, 230))
    save(sp, "effects/sparkle.png", manifest)
    # landing ring
    ring = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(ring)
    d.ellipse((8, 8, 88, 88), outline=(255, 220, 80, 200), width=5)
    save(ring.filter(ImageFilter.GaussianBlur(1)), "effects/chip-landing-ring.png", manifest)
    # payout trail
    trail = Image.new("RGBA", (160, 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(trail)
    for i in range(8):
        a = int(180 - i * 20)
        d.ellipse((10 + i * 16, 8, 34 + i * 16, 32), fill=(255, 220, 100, a))
    save(trail, "effects/payout-trail.png", manifest)
    # banner shine
    shine = Image.new("RGBA", (320, 80), (0, 0, 0, 0))
    d = ImageDraw.Draw(shine)
    d.ellipse((40, -10, 280, 90), fill=(255, 255, 255, 50))
    save(shine.filter(ImageFilter.GaussianBlur(12)), "effects/banner-shine.png", manifest)
    # result burst
    burst = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    d = ImageDraw.Draw(burst)
    for i in range(12):
        ang = math.radians(i * 30)
        x2 = 100 + 90 * math.cos(ang)
        y2 = 100 + 90 * math.sin(ang)
        d.line((100, 100, x2, y2), fill=(255, 230, 120, 180), width=3)
    save(burst.filter(ImageFilter.GaussianBlur(2)), "effects/result-burst.png", manifest)


def main() -> None:
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument("--seed", type=int, default=SEED)
    ap.add_argument("--out", type=str, default=str(OUT))
    args = ap.parse_args()
    OUT = Path(args.out)
    ensure_dirs()
    r = rng(args.seed)
    manifest: list[dict] = []
    print("Generating chips…")
    generate_chips(manifest, r)
    print("Generating balls…")
    generate_balls(manifest)
    print("Generating navigation…")
    generate_nav(manifest)
    print("Generating controls…")
    generate_controls(manifest)
    print("Generating background…")
    generate_background(manifest, r)
    print("Generating panels…")
    generate_panels(manifest)
    print("Generating players…")
    generate_players(manifest)
    print("Generating badges/banners…")
    generate_badges(manifest)
    print("Generating machine…")
    generate_machine(manifest)
    print("Generating effects…")
    generate_effects(manifest)
    man = {
        "seed": args.seed,
        "count": len(manifest),
        "assets": manifest,
    }
    (OUT / "generated-assets-manifest.json").write_text(json.dumps(man, indent=2))
    print(f"Done. {len(manifest)} assets → {OUT}")


if __name__ == "__main__":
    main()
