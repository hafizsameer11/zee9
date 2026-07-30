#!/usr/bin/env python3
"""Major visual rebuild for Fortune Gems 2 — clean wheel, bright symbols, dense chrome."""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path("/var/www/zee9/public/games/fortune-gems-2")
RNG = random.Random(91)


def font(size: int) -> ImageFont.ImageFont:
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def mix(a, b, t):
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def save(im: Image.Image, rel: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True)
    print("wrote", rel, im.size)


def circular_alpha(im: Image.Image, pad=2) -> Image.Image:
    """Force perfect circular transparency — kills any white square/halo."""
    w, h = im.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    mask = Image.new("L", (w, h), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([pad, pad, w - 1 - pad, h - 1 - pad], fill=255)
    # soft edge
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))
    src = im.convert("RGBA")
    # zero near-white outside content while keeping circle
    px = src.load()
    for x in range(w):
        for y in range(h):
            r, g, b, a = px[x, y]
            if r > 245 and g > 245 and b > 245:
                px[x, y] = (0, 0, 0, 0)
    out.paste(src, (0, 0))
    # multiply with circle mask
    ra = out.split()[3]
    from PIL import ImageChops

    out.putalpha(ImageChops.multiply(ra, mask))
    return out


def gold_ring(d, cx, cy, r, width=12):
    for i in range(width):
        t = i / max(1, width - 1)
        c = mix((255, 235, 150), (150, 95, 30), t)
        d.ellipse([cx - r + i, cy - r + i, cx + r - i, cy + r - i], outline=(*c, 255))


# ─── CLEAN LUCKY WHEEL (no white ever) ───────────────────────────────────────
def make_wheel():
    size = 1024
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    rewards = [3, 5, 8, 10, 15, 20, 30, 50, 100, 200, 500, 1000]
    colors = [
        (55, 140, 230),
        (220, 45, 55),
        (40, 185, 95),
        (230, 175, 35),
        (150, 70, 200),
        (35, 175, 185),
        (230, 95, 40),
        (70, 110, 210),
        (200, 50, 110),
        (50, 190, 120),
        (220, 150, 25),
        (95, 75, 190),
    ]
    n = len(rewards)
    outer = size // 2 - 8

    # Drop shadow (behind, still inside circle later)
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([40, 55, size - 40, size - 25], fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(22))

    # Outer gold rim layers
    gold_ring(d, cx, cy, outer, width=28)
    gold_ring(d, cx, cy, outer - 30, width=10)
    gold_ring(d, cx, cy, outer - 44, width=6)

    # Wedges
    wedge_r = outer - 50
    for i, (val, col) in enumerate(zip(rewards, colors)):
        a0 = -90 + i * (360 / n)
        a1 = a0 + 360 / n
        mid_a = (a0 + a1) / 2
        hi = mix(col, (255, 255, 255), 0.28)
        lo = mix(col, (0, 0, 0), 0.28)
        d.pieslice([cx - wedge_r, cy - wedge_r, cx + wedge_r, cy + wedge_r], a0, mid_a, fill=(*hi, 255))
        d.pieslice([cx - wedge_r, cy - wedge_r, cx + wedge_r, cy + wedge_r], mid_a, a1, fill=(*lo, 255))
        rad = math.radians(a0)
        d.line(
            [
                cx + 70 * math.cos(rad),
                cy + 70 * math.sin(rad),
                cx + wedge_r * math.cos(rad),
                cy + wedge_r * math.sin(rad),
            ],
            fill=(255, 215, 110, 255),
            width=5,
        )
        mid = math.radians((a0 + a1) / 2)
        tx = cx + 265 * math.cos(mid)
        ty = cy + 265 * math.sin(mid)
        label = str(val)
        f = font(52 if val < 100 else 40)
        for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
            d.text((tx + ox, ty + oy), label, font=f, fill=(15, 8, 0, 255), anchor="mm")
        d.text((tx, ty), label, font=f, fill=(255, 250, 230, 255), anchor="mm")

    # Inner rings + medallion
    gold_ring(d, cx, cy, 110, width=16)
    d.ellipse([cx - 92, cy - 92, cx + 92, cy + 92], fill=(70, 42, 18, 255))
    # gold face plate
    for y in range(cy - 80, cy + 80):
        t = (y - (cy - 80)) / 160
        c = mix((255, 220, 120), (180, 120, 40), t)
        dy = abs(y - cy)
        if dy >= 80:
            continue
        half = int(math.sqrt(80 * 80 - dy * dy))
        d.line([(cx - half, y), (cx + half, y)], fill=(*c, 255))
    # face
    for ex in (-28, 28):
        d.ellipse([cx + ex - 14, cy - 22, cx + ex + 14, cy + 4], fill=(30, 12, 6, 255))
        d.ellipse([cx + ex - 8, cy - 18, cx + ex + 7, cy - 2], fill=(240, 45, 55, 255))
        d.ellipse([cx + ex - 4, cy - 14, cx + ex + 1, cy - 8], fill=(255, 200, 200, 220))
    d.polygon([(cx, cy - 4), (cx + 10, cy + 20), (cx - 10, cy + 20)], fill=(150, 95, 35))
    d.arc([cx - 30, cy + 12, cx + 30, cy + 48], 20, 160, fill=(90, 40, 15), width=4)
    # crown tip ruby
    d.ellipse([cx - 12, cy - 78, cx + 12, cy - 54], fill=(220, 40, 50, 255))

    # rim rubies
    for i in range(16):
        ang = math.radians(-90 + i * 22.5)
        rx = cx + (outer - 14) * math.cos(ang)
        ry = cy + (outer - 14) * math.sin(ang)
        d.ellipse([rx - 11, ry - 11, rx + 11, ry + 11], fill=(210, 35, 45, 255))
        d.ellipse([rx - 5, ry - 6, rx + 3, ry + 1], fill=(255, 170, 170, 200))

    wheel = Image.alpha_composite(sh, im)
    wheel = circular_alpha(wheel, pad=4)
    # assert no white opaque outside
    save(wheel, "wheel/lucky-wheel.png")

    # pointer
    ptr = Image.new("RGBA", (140, 180), (0, 0, 0, 0))
    pd = ImageDraw.Draw(ptr)
    pd.polygon([(70, 170), (18, 40), (122, 40)], fill=(240, 190, 70, 255))
    pd.polygon([(70, 170), (38, 58), (102, 58)], fill=(190, 125, 40, 255))
    pd.ellipse([40, 8, 100, 68], fill=(220, 40, 55, 255))
    pd.ellipse([55, 22, 85, 50], fill=(255, 170, 170, 210))
    gold_ring(pd, 70, 38, 32, width=6)
    save(ptr, "wheel/pointer.png")

    # stone bridge connecting wheel to cabinet
    br = Image.new("RGBA", (80, 280), (0, 0, 0, 0))
    bd = ImageDraw.Draw(br)
    for y in range(280):
        t = y / 280
        c = mix((120, 85, 55), (70, 48, 30), t)
        bd.line([(10, y), (70, y)], fill=(*c, 255))
    bd.rectangle([8, 0, 72, 279], outline=(220, 170, 60, 230), width=4)
    for yy in (40, 140, 240):
        bd.ellipse([28, yy, 52, yy + 24], fill=(200, 40, 50, 255))
    save(br, "frames/wheel-bridge.png")


def gem_symbol(size, hi, mid, lo, shape="round"):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    # gold mount fills most of cell
    gold_ring(d, cx, cy, size // 2 - 4, width=max(10, size // 12))
    # gem body large
    rr = int(size * 0.36)
    if shape == "diamond":
        pts = [(cx, cy - rr), (cx + rr * 0.85, cy), (cx, cy + rr), (cx - rr * 0.85, cy)]
        d.polygon(pts, fill=(*mid, 255))
        d.polygon([(cx, cy - rr), (cx + rr * 0.85, cy), (cx, cy)], fill=(*hi, 240))
        d.polygon([(cx, cy), (cx - rr * 0.85, cy), (cx, cy + rr)], fill=(*lo, 240))
    else:
        for y in range(cy - rr, cy + rr):
            t = (y - (cy - rr)) / (2 * rr)
            c = mix(hi, lo, t)
            dy = abs(y - cy)
            if dy >= rr:
                continue
            half = int(math.sqrt(rr * rr - dy * dy))
            d.line([(cx - half, y), (cx + half, y)], fill=(*c, 255))
        # facets
        d.polygon([(cx, cy - rr), (cx + rr * 0.5, cy - rr * 0.2), (cx, cy)], fill=(*mix(hi, (255, 255, 255), 0.35), 160))
    # specular
    d.ellipse([cx - rr * 0.45, cy - rr * 0.55, cx - rr * 0.05, cy - rr * 0.15], fill=(255, 255, 255, 190))
    # underside shadow
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([size * 0.18, size * 0.72, size * 0.82, size * 0.94], fill=(0, 0, 0, 100))
    sh = sh.filter(ImageFilter.GaussianBlur(4))
    out = Image.alpha_composite(sh, im)
    return ImageEnhance.Color(out).enhance(1.25)


def letter_symbol(letter, fill_hi, fill_lo):
    size = 320
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # large plate fills cell
    d.rounded_rectangle([8, 8, size - 8, size - 8], radius=36, fill=(55, 38, 22, 255))
    for y in range(20, size - 20):
        t = (y - 20) / (size - 40)
        c = mix((255, 225, 130), (170, 110, 35), t)
        d.line([(20, y), (size - 20, y)], fill=(*c, 255))
    d.rounded_rectangle([20, 20, size - 20, size - 20], radius=28, outline=(90, 55, 18, 255), width=4)
    # jewel fill
    inset = [44, 44, size - 44, size - 44]
    for y in range(inset[1], inset[3]):
        t = (y - inset[1]) / max(1, inset[3] - inset[1])
        c = mix(fill_hi, fill_lo, t)
        d.line([(inset[0], y), (inset[2], y)], fill=(*c, 255))
    d.rounded_rectangle(inset, radius=20, outline=(255, 230, 150, 200), width=3)
    f = font(150)
    for ox, oy in [(-4, 0), (4, 0), (0, -4), (0, 4)]:
        d.text((size // 2 + ox, size // 2 + oy - 6), letter, font=f, fill=(30, 15, 5, 255), anchor="mm")
    d.text((size // 2, size // 2 - 6), letter, font=f, fill=(255, 245, 200, 255), anchor="mm")
    # corner rubies
    for x, y in [(48, 48), (size - 48, 48), (48, size - 48), (size - 48, size - 48)]:
        d.ellipse([x - 12, y - 12, x + 12, y + 12], fill=(220, 40, 50, 255))
        d.ellipse([x - 5, y - 7, x + 3, y], fill=(255, 180, 180, 200))
    d.ellipse([70, 62, 95, 82], fill=(255, 255, 255, 140))
    return ImageEnhance.Color(im).enhance(1.15)


def make_wild():
    size = 360
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    gold_ring(d, cx, cy, size // 2 - 4, width=20)
    d.ellipse([cx - 140, cy - 140, cx + 140, cy + 140], fill=(60, 35, 16, 255))
    for y in range(cy - 130, cy + 130):
        t = (y - (cy - 130)) / 260
        c = mix((255, 225, 120), (190, 130, 40), t)
        dy = abs(y - cy)
        if dy >= 130:
            continue
        half = int(math.sqrt(130 * 130 - dy * dy))
        d.line([(cx - half, y), (cx + half, y)], fill=(*c, 255))
    # crown
    d.polygon(
        [(cx, cy - 145), (cx + 55, cy - 85), (cx + 30, cy - 70), (cx, cy - 95), (cx - 30, cy - 70), (cx - 55, cy - 85)],
        fill=(255, 210, 90, 255),
    )
    d.ellipse([cx - 14, cy - 138, cx + 14, cy - 110], fill=(240, 40, 50, 255))
    # brows / eyes large
    d.arc([cx - 85, cy - 55, cx - 15, cy], 200, 340, fill=(70, 35, 12, 255), width=7)
    d.arc([cx + 15, cy - 55, cx + 85, cy], 200, 340, fill=(70, 35, 12, 255), width=7)
    for ex in (-48, 48):
        d.ellipse([cx + ex - 18, cy - 32, cx + ex + 18, cy + 4], fill=(25, 10, 5, 255))
        d.ellipse([cx + ex - 11, cy - 26, cx + ex + 10, cy - 2], fill=(255, 50, 55, 255))
        d.ellipse([cx + ex - 5, cy - 20, cx + ex + 2, cy - 10], fill=(255, 220, 220, 230))
    d.polygon([(cx, cy - 5), (cx + 16, cy + 30), (cx - 16, cy + 30)], fill=(160, 105, 40))
    d.arc([cx - 42, cy + 22, cx + 42, cy + 70], 15, 165, fill=(80, 35, 12), width=5)
    d.ellipse([cx - 10, cy + 38, cx + 10, cy + 54], fill=(200, 35, 45, 230))
    for sx in (-85, 85):
        d.ellipse([cx + sx - 14, cy + 10, cx + sx + 14, cy + 38], fill=(230, 45, 55, 255))
    # WILD ribbon large
    d.rounded_rectangle([cx - 95, cy + 88, cx + 95, cy + 132], radius=12, fill=(150, 25, 35, 255))
    d.rounded_rectangle([cx - 90, cy + 92, cx + 90, cy + 128], radius=10, outline=(255, 215, 120, 255), width=3)
    d.text((cx, cy + 110), "WILD", font=font(36), fill=(255, 240, 180), anchor="mm")
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([20, 20, size - 20, size - 20], fill=(255, 190, 60, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(16))
    save(ImageEnhance.Color(Image.alpha_composite(glow, im)).enhance(1.1), "symbols/wild.png")


def make_symbols():
    """Prefer AI-generated premium gems if present; otherwise procedural fallback."""
    ai_dir = Path(__file__).resolve().parent / "ai-symbols"
    dest = ROOT / "symbols"
    dest.mkdir(parents=True, exist_ok=True)
    mapping = {
        "ruby.png": "gem-ruby-raw.png",
        "sapphire.png": "gem-sapphire-raw.png",
        "emerald.png": "gem-emerald-raw.png",
        "A.png": "sym-a-raw.png",
        "K.png": "sym-k-raw.png",
        "Q.png": "sym-q-raw.png",
        "J.png": "sym-j-raw.png",
        "wild.png": "sym-wild-raw.png",
    }
    # If final transparent symbols already exist and are large (AI), keep them
    keep_ai = True
    for name in mapping:
        p = dest / name
        if not p.exists() or p.stat().st_size < 40_000:
            keep_ai = False
            break
    if keep_ai:
        print("keeping existing premium AI symbols")
    else:
        print("falling back to procedural symbols")
        save(gem_symbol(320, (255, 140, 150), (230, 35, 55), (100, 10, 25)), "symbols/ruby.png")
        save(gem_symbol(320, (150, 200, 255), (45, 100, 230), (15, 40, 120)), "symbols/sapphire.png")
        save(gem_symbol(320, (150, 255, 190), (35, 190, 100), (10, 80, 40), "diamond"), "symbols/emerald.png")
        save(letter_symbol("A", (255, 110, 90), (160, 35, 30)), "symbols/A.png")
        save(letter_symbol("K", (255, 210, 90), (170, 110, 25)), "symbols/K.png")
        save(letter_symbol("Q", (180, 150, 255), (80, 50, 170)), "symbols/Q.png")
        save(letter_symbol("J", (120, 230, 180), (30, 120, 85)), "symbols/J.png")
        make_wild()

    # wheel tokens always procedural (small)
    for name, hi, mid, lo in [
        ("green", (140, 255, 180), (30, 170, 90), (10, 70, 40)),
        ("red", (255, 150, 150), (210, 40, 50), (100, 15, 25)),
    ]:
        size = 260
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        cx = cy = size // 2
        gold_ring(d, cx, cy, size // 2 - 3, width=14)
        for i in range(8):
            a0, a1 = i * 45, i * 45 + 45
            c = [hi, mid, lo, mix(hi, (255, 220, 100), 0.4)][i % 4]
            d.pieslice([cx - 90, cy - 90, cx + 90, cy + 90], a0, a1, fill=(*c, 255))
        d.ellipse([cx - 28, cy - 28, cx + 28, cy + 28], fill=(240, 190, 60, 255))
        d.text((cx, cy + 70), "WHEEL", font=font(22), fill=(255, 245, 210), anchor="mm")
        save(circular_alpha(im), f"symbols/wheel-{name}.png")


def make_multipliers():
    specs = [
        ("2x", (140, 255, 180), (40, 180, 95), (10, 80, 40)),
        ("3x", (160, 210, 255), (50, 130, 220), (15, 45, 120)),
        ("5x", (255, 210, 100), (230, 150, 30), (130, 80, 15)),
        ("10x", (255, 160, 210), (210, 55, 130), (100, 20, 55)),
        ("15x", (255, 230, 110), (240, 170, 40), (140, 90, 20)),
    ]
    for val, hi, mid, lo in specs:
        size = 280
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        cx = cy = size // 2
        gold_ring(d, cx, cy, size // 2 - 3, width=18)
        rr = 105
        for y in range(cy - rr, cy + rr):
            t = (y - (cy - rr)) / (2 * rr)
            c = mix(hi, lo, t)
            dy = abs(y - cy)
            if dy >= rr:
                continue
            half = int(math.sqrt(rr * rr - dy * dy))
            d.line([(cx - half, y), (cx + half, y)], fill=(*c, 255))
        d.ellipse([cx - 60, cy - 70, cx - 20, cy - 35], fill=(255, 255, 255, 110))
        f = font(78)
        for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
            d.text((cx + ox, cy + oy), val, font=f, fill=(20, 8, 0, 255), anchor="mm")
        d.text((cx, cy), val, font=f, fill=(255, 250, 220), anchor="mm")
        save(circular_alpha(im), f"multipliers/mult-{val.lower()}.png")


def make_cabinet_and_chrome():
    """Unified stone cabinet: left pillar (wheel tuck) + 3x3 + flush SPECIAL WHEEL bay."""
    w, h = 700, 400
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pillar_l = 78
    special_w = 118
    special_l = w - 52 - special_w
    reel_l, reel_t = pillar_l + 6, 54
    reel_r, reel_b = special_l - 8, h - 26
    special_t, special_b = 48, h - 26

    for y in range(h):
        c = mix((168, 128, 88), (92, 64, 42), y / h)
        d.line([(0, y), (w - 1, y)], fill=(*c, 255))
    px = im.load()
    for _ in range(9000):
        x, y = RNG.randint(0, w - 1), RNG.randint(0, h - 1)
        r, g, b, a = px[x, y]
        dlt = RNG.randint(-22, 22)
        px[x, y] = (clamp(r + dlt), clamp(g + dlt), clamp(b + dlt), 255)

    d.rounded_rectangle([2, 2, w - 3, h - 3], radius=18, outline=(255, 220, 120, 255), width=5)
    d.rounded_rectangle([8, 8, w - 9, h - 9], radius=14, outline=(140, 90, 35, 255), width=3)

    # Fully opaque left pillar (covers wheel edge)
    for x in range(0, pillar_l):
        for y in range(14, h - 14):
            shade = mix((110, 78, 48), (58, 38, 24), y / h)
            edge = abs(x - pillar_l / 2) / (pillar_l / 2)
            shade = mix(shade, (40, 26, 16), edge * 0.35)
            noise = RNG.randint(-12, 12)
            px[x, y] = (clamp(shade[0] + noise), clamp(shade[1] + noise), clamp(shade[2] + noise), 255)
    d.rectangle([pillar_l - 6, 16, pillar_l - 1, h - 16], fill=(230, 175, 70, 255))
    for y in range(40, h - 40, 42):
        cx = pillar_l // 2
        d.ellipse([cx - 9, y - 9, cx + 9, y + 9], fill=(210, 35, 45, 255))

    for x in range(w - 48, w):
        for y in range(14, h - 14):
            shade = mix((110, 78, 48), (58, 38, 24), y / h)
            noise = RNG.randint(-10, 10)
            px[x, y] = (clamp(shade[0] + noise), clamp(shade[1] + noise), clamp(shade[2] + noise), 255)

    for x, y in [(22, 22), (w - 22, 22), (22, h - 22), (w - 22, h - 22)]:
        d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=(220, 40, 50, 255))

    d.rounded_rectangle([reel_l, reel_t, reel_r, reel_b], radius=10, fill=(28, 16, 10, 255))
    d.rounded_rectangle([reel_l, reel_t, reel_r, reel_b], radius=10, outline=(200, 150, 55, 230), width=3)
    cw = (reel_r - reel_l) // 3
    ch = (reel_b - reel_t) // 3
    for col in range(3):
        for row in range(3):
            x0 = reel_l + col * cw
            y0 = reel_t + row * ch
            d.rounded_rectangle([x0 + 4, y0 + 4, x0 + cw - 4, y0 + ch - 4], radius=8, outline=(220, 170, 70, 200), width=2)

    ban_l, ban_r = reel_l + 40, reel_r - 40
    d.rounded_rectangle([ban_l, 14, ban_r, 48], radius=8, fill=(85, 24, 28, 255))
    d.rounded_rectangle([ban_l, 14, ban_r, 48], radius=8, outline=(255, 210, 100, 255), width=3)

    d.rounded_rectangle([special_l, special_t, special_l + special_w, special_b], radius=10, fill=(28, 16, 10, 255))
    d.rounded_rectangle([special_l, special_t, special_l + special_w, special_b], radius=10, outline=(210, 160, 55, 230), width=3)
    lab = [special_l + 4, 16, special_l + special_w - 4, 44]
    d.rounded_rectangle(lab, radius=6, fill=(110, 32, 36, 255))
    d.rounded_rectangle(lab, radius=6, outline=(255, 210, 100, 255), width=2)
    d.text(((lab[0] + lab[2]) // 2, (lab[1] + lab[3]) // 2), "SPECIAL WHEEL", font=font(11), fill=(255, 230, 160, 255), anchor="mm")

    mid = (reel_r + special_l) // 2
    d.rectangle([mid - 3, reel_t, mid + 3, reel_b], fill=(230, 175, 70, 255))
    save(im, "frames/cabinet.png")

    # Transparent special panel (bay lives on cabinet)
    panel = Image.new("RGBA", (160, 400), (0, 0, 0, 0))
    save(panel, "frames/special-panel.png")

    # mult select larger
    sf = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sf)
    sd.rounded_rectangle([8, 8, 191, 191], radius=20, outline=(255, 220, 100, 255), width=8)
    sd.rounded_rectangle([18, 18, 181, 181], radius=14, outline=(160, 100, 30, 200), width=3)
    for x, y in [(24, 24), (176, 24), (24, 176), (176, 176)]:
        sd.ellipse([x - 10, y - 10, x + 10, y + 10], fill=(220, 40, 50))
    glow = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle([2, 2, 197, 197], radius=22, outline=(255, 200, 80, 120), width=10)
    glow = glow.filter(ImageFilter.GaussianBlur(5))
    save(Image.alpha_composite(glow, sf), "frames/mult-select.png")

    # message banner wide
    bw, bh = 520, 64
    ban = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    bd = ImageDraw.Draw(ban)
    bd.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=12, fill=(95, 30, 34, 250))
    bd.rounded_rectangle([2, 2, bw - 3, bh - 3], radius=11, outline=(255, 215, 100, 255), width=4)
    for x in (22, bw - 22):
        bd.ellipse([x - 9, bh // 2 - 9, x + 9, bh // 2 + 9], fill=(220, 40, 50))
    save(ban, "frames/banner.png")

    # compact wood control bar
    dw, dh = 960, 70
    deck = Image.new("RGBA", (dw, dh), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deck)
    for y in range(dh):
        t = y / dh
        c = mix((95, 58, 32), (40, 24, 12), t)
        dd.line([(0, y), (dw, y)], fill=(*c, 255))
    # wood grain
    for _ in range(80):
        x = RNG.randint(0, dw)
        dd.line([(x, 2), (x + RNG.randint(-8, 8), dh - 2)], fill=(30, 16, 8, 50), width=1)
    dd.rectangle([0, 0, dw, 5], fill=(255, 210, 100, 230))
    dd.rectangle([0, dh - 3, dw, dh], fill=(20, 10, 5, 180))
    for x in (170, 340, 520, 700, 820):
        dd.line([(x, 10), (x, dh - 10)], fill=(210, 160, 60, 160), width=2)
    save(deck, "frames/control-bar.png")


def make_spin_and_controls():
    size = 280
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    gold_ring(d, cx, cy, size // 2 - 2, width=22)
    gold_ring(d, cx, cy, size // 2 - 26, width=8)
    for y in range(cy - 95, cy + 95):
        t = (y - (cy - 95)) / 190
        c = mix((255, 215, 100), (200, 110, 30), t)
        dy = abs(y - cy)
        if dy >= 95:
            continue
        half = int(math.sqrt(95 * 95 - dy * dy))
        d.line([(cx - half, y), (cx + half, y)], fill=(*c, 255))
    d.arc([cx - 52, cy - 52, cx + 52, cy + 52], 35, 290, fill=(90, 45, 12, 255), width=14)
    d.polygon([(cx + 48, cy - 38), (cx + 72, cy - 10), (cx + 36, cy - 6)], fill=(90, 45, 12, 255))
    d.ellipse([cx - 18, cy - 18, cx + 18, cy + 18], fill=(230, 40, 50, 255))
    d.ellipse([cx - 8, cy - 10, cx + 4, cy], fill=(255, 180, 180, 200))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([8, 8, size - 8, size - 8], fill=(255, 190, 60, 70))
    glow = glow.filter(ImageFilter.GaussianBlur(14))
    save(Image.alpha_composite(glow, im), "controls/spin.png")

    def round_btn(name, draw_icon, active=False):
        s = 140
        b = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        bd = ImageDraw.Draw(b)
        gold_ring(bd, s // 2, s // 2, s // 2 - 2, width=10)
        fill = (110, 55, 22, 255) if active else (50, 32, 18, 255)
        bd.ellipse([20, 20, s - 20, s - 20], fill=fill)
        draw_icon(bd, s)
        save(b, f"controls/{name}.png")

    round_btn("turbo", lambda bd, s: bd.polygon([(42, 78), (72, 30), (66, 62), (98, 52), (62, 110), (68, 74)], fill=(255, 150, 40)))
    round_btn("turbo-on", lambda bd, s: bd.polygon([(42, 78), (72, 30), (66, 62), (98, 52), (62, 110), (68, 74)], fill=(255, 150, 40)), True)
    round_btn(
        "auto",
        lambda bd, s: (
            bd.arc([36, 36, s - 36, s - 36], 40, 300, fill=(255, 225, 150), width=7),
            bd.polygon([(s - 42, 44), (s - 28, 62), (s - 54, 60)], fill=(255, 225, 150)),
        ),
    )
    round_btn(
        "auto-on",
        lambda bd, s: (
            bd.arc([36, 36, s - 36, s - 36], 40, 300, fill=(255, 225, 150), width=7),
            bd.polygon([(s - 42, 44), (s - 28, 62), (s - 54, 60)], fill=(255, 225, 150)),
        ),
        True,
    )
    round_btn(
        "plus",
        lambda bd, s: (
            bd.rectangle([s // 2 - 8, 38, s // 2 + 8, s - 38], fill=(255, 235, 170)),
            bd.rectangle([38, s // 2 - 8, s - 38, s // 2 + 8], fill=(255, 235, 170)),
        ),
    )
    round_btn("minus", lambda bd, s: bd.rectangle([38, s // 2 - 8, s - 38, s // 2 + 8], fill=(255, 235, 170)))
    round_btn(
        "sound",
        lambda bd, s: (
            bd.polygon([(42, 52), (62, 52), (84, 36), (84, s - 36), (62, s - 52), (42, s - 52)], fill=(255, 225, 150)),
            bd.arc([76, 42, 108, s - 42], -50, 50, fill=(255, 225, 150), width=5),
        ),
    )
    round_btn(
        "sound-off",
        lambda bd, s: (
            bd.polygon([(42, 52), (62, 52), (84, 36), (84, s - 36), (62, s - 52), (42, s - 52)], fill=(180, 150, 100)),
            bd.line([(38, 38), (s - 38, s - 38)], fill=(220, 60, 60), width=6),
        ),
    )
    round_btn(
        "info",
        lambda bd, s: (
            bd.ellipse([s // 2 - 10, 36, s // 2 + 10, 56], fill=(255, 225, 150)),
            bd.rectangle([s // 2 - 8, 64, s // 2 + 8, s - 36], fill=(255, 225, 150)),
        ),
    )
    round_btn(
        "settings",
        lambda bd, s: (
            bd.ellipse([s // 2 - 18, s // 2 - 18, s // 2 + 18, s // 2 + 18], outline=(255, 225, 150), width=6),
            *[
                bd.ellipse(
                    [
                        s // 2 + 32 * math.cos(i * math.pi / 3) - 6,
                        s // 2 + 32 * math.sin(i * math.pi / 3) - 6,
                        s // 2 + 32 * math.cos(i * math.pi / 3) + 6,
                        s // 2 + 32 * math.sin(i * math.pi / 3) + 6,
                    ],
                    fill=(255, 225, 150),
                )
                for i in range(6)
            ],
        ),
    )


def make_logo_and_bg_dim():
    # brighter logo
    w, h = 720, 150
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f1, f2 = font(56), font(68)
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
        d.text((230 + ox, 58 + oy), "FORTUNE", font=f1, fill=(70, 35, 8, 255), anchor="mm")
    d.text((230, 58), "FORTUNE", font=f1, fill=(255, 230, 130), anchor="mm")
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
        d.text((470 + ox, 58 + oy), "GEMS", font=f1, fill=(70, 35, 8, 255), anchor="mm")
    d.text((470, 58), "GEMS", font=f1, fill=(255, 240, 160), anchor="mm")
    d.ellipse([400, 38, 430, 68], fill=(50, 160, 240, 255))
    d.ellipse([406, 42, 416, 52], fill=(200, 240, 255, 200))
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
        d.text((600 + ox, 60 + oy), "2", font=f2, fill=(255, 255, 255, 255), anchor="mm")
    d.text((600, 60), "2", font=f2, fill=(235, 40, 55), anchor="mm")
    save(im, "ui/logo.png")

    # Dim existing play bg slightly in center for machine focus (if exists)
    bg_path = ROOT / "backgrounds/bg-play.png"
    if bg_path.exists():
        bg = Image.open(bg_path).convert("RGBA")
        # soft vignette already; brighten sky slightly
        bg = ImageEnhance.Brightness(bg).enhance(1.08)
        bg = ImageEnhance.Color(bg).enhance(1.12)
        # darken mid band where machine sits so symbols pop
        overlay = Image.new("RGBA", bg.size, (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rectangle([0, int(bg.height * 0.18), bg.width, int(bg.height * 0.82)], fill=(20, 10, 5, 45))
        bg = Image.alpha_composite(bg, overlay)
        save(bg, "backgrounds/bg-play.png")


def make_lobby_thumb():
    w, h = 400, 260
    bg = Image.open(ROOT / "backgrounds/bg-play.png").resize((w, h), Image.Resampling.LANCZOS).convert("RGBA")
    wheel = Image.open(ROOT / "wheel/lucky-wheel.png").resize((130, 130), Image.Resampling.LANCZOS)
    wild = Image.open(ROOT / "symbols/wild.png").resize((140, 140), Image.Resampling.LANCZOS)
    bg.alpha_composite(wheel, (12, 55))
    bg.alpha_composite(wild, (210, 30))
    d = ImageDraw.Draw(bg)
    d.text((w // 2, h - 26), "Fortune Gems 2", font=font(24), fill=(255, 230, 140), anchor="mm")
    out = Path("/var/www/zee9/public/games/fortune-gems-2.png")
    bg.save(out, "PNG")
    print("wrote lobby thumb", out)


def verify_wheel_clean():
    im = Image.open(ROOT / "wheel/lucky-wheel.png")
    px = im.load()
    w, h = im.size
    white = 0
    for x in range(0, w, 2):
        for y in range(0, h, 2):
            r, g, b, a = px[x, y]
            if a > 200 and r > 245 and g > 245 and b > 245:
                white += 1
    print("wheel near-white opaque samples:", white)
    assert white < 50, "wheel still has white background!"


def main():
    print("Visual rebuild…")
    make_wheel()
    verify_wheel_clean()
    make_symbols()
    make_multipliers()
    make_cabinet_and_chrome()
    make_spin_and_controls()
    make_logo_and_bg_dim()
    make_lobby_thumb()
    print("Visual rebuild done.")


if __name__ == "__main__":
    main()
