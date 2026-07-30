#!/usr/bin/env python3
"""Generate original premium Fortune Gems 2 temple-casino assets (Pillow)."""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path("/var/www/zee9/public/games/fortune-gems-2")
RNG = random.Random(77)


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ]
    for p in cands:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    return tuple(clamp(lerp(c1[i], c2[i], t)) for i in range(len(c1)))


def save(im: Image.Image, rel: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im.save(path, "PNG", optimize=True)
    print("wrote", rel, im.size)


def noise(im: Image.Image, amount=12):
    px = im.load()
    w, h = im.size
    for _ in range(w * h // 40):
        x, y = RNG.randint(0, w - 1), RNG.randint(0, h - 1)
        r, g, b, a = px[x, y]
        if a < 8:
            continue
        d = RNG.randint(-amount, amount)
        px[x, y] = (clamp(r + d), clamp(g + d), clamp(b + d), a)
    return im


def stone_bg(w, h, base=(92, 68, 48), warm=True):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1)
        c = mix(base, (base[0] - 30, base[1] - 25, base[2] - 20), t * 0.55)
        if warm:
            c = mix(c, (140, 90, 45), 0.08)
        d.line([(0, y), (w, y)], fill=(*c, 255))
    # carved cracks / blocks
    for i in range(0, w, 48):
        d.line([(i, 0), (i, h)], fill=(40, 28, 18, 70), width=1)
    for j in range(0, h, 36):
        d.line([(0, j), (w, j)], fill=(40, 28, 18, 55), width=1)
    for _ in range(40):
        x0 = RNG.randint(0, w)
        y0 = RNG.randint(0, h)
        d.line([(x0, y0), (x0 + RNG.randint(-18, 18), y0 + RNG.randint(8, 40))], fill=(30, 20, 12, 90), width=1)
    # moss flecks
    for _ in range(90):
        x, y = RNG.randint(0, w - 1), RNG.randint(0, h - 1)
        d.ellipse([x, y, x + 2, y + 2], fill=(45, 70, 35, RNG.randint(40, 110)))
    return noise(im, 10)


def gold_grad(draw, box, light=(255, 220, 120), mid=(212, 160, 55), dark=(110, 70, 20)):
    x0, y0, x1, y1 = box
    for y in range(y0, y1 + 1):
        t = (y - y0) / max(1, y1 - y0)
        if t < 0.35:
            c = mix(light, mid, t / 0.35)
        else:
            c = mix(mid, dark, (t - 0.35) / 0.65)
        draw.line([(x0, y), (x1, y)], fill=(*c, 255))


def draw_gold_ring(d, cx, cy, r, width=10):
    for i in range(width):
        t = i / max(1, width - 1)
        c = mix((255, 230, 140), (140, 90, 30), t)
        d.ellipse([cx - r + i, cy - r + i, cx + r - i, cy + r - i], outline=(*c, 255))
    # highlight arc
    d.arc([cx - r + 2, cy - r + 2, cx + r - 2, cy + r - 2], 200, 320, fill=(255, 245, 200, 180), width=2)


def gem_shape(size, color_hi, color_mid, color_lo, facets=6):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    # gold bezel
    draw_gold_ring(d, cx, cy, size // 2 - 2, width=max(6, size // 14))
    # gem body as diamond / oval hybrid
    pts = []
    for i in range(facets):
        ang = -math.pi / 2 + i * 2 * math.pi / facets
        rr = size * 0.34 if i % 2 == 0 else size * 0.28
        pts.append((cx + rr * math.cos(ang), cy + rr * math.sin(ang)))
    d.polygon(pts, fill=(*color_mid, 255))
    # facets
    for i in range(facets):
        a0 = pts[i]
        a1 = pts[(i + 1) % facets]
        tri = [a0, a1, (cx, cy)]
        shade = mix(color_hi, color_lo, (i % 3) / 2)
        d.polygon(tri, fill=(*shade, 230))
    # highlight
    d.ellipse([cx - size * 0.12, cy - size * 0.18, cx - size * 0.02, cy - size * 0.06], fill=(255, 255, 255, 160))
    # under shadow
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([size * 0.2, size * 0.72, size * 0.8, size * 0.92], fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(3))
    out = Image.alpha_composite(sh, im)
    return out.filter(ImageFilter.SMOOTH_MORE)


def make_ruby():
    save(gem_shape(256, (255, 120, 130), (200, 30, 55), (90, 10, 25)), "symbols/ruby.png")


def make_sapphire():
    save(gem_shape(256, (140, 190, 255), (40, 90, 210), (15, 35, 110)), "symbols/sapphire.png")


def make_emerald():
    save(gem_shape(256, (140, 255, 180), (30, 170, 90), (10, 70, 40)), "symbols/emerald.png")


def letter_symbol(letter: str, fill_hi, fill_lo, accent):
    size = 256
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # stone plate
    d.rounded_rectangle([18, 18, size - 18, size - 18], radius=28, fill=(55, 40, 28, 255))
    gold_grad(d, (28, 28, size - 28, size - 28))
    d.rounded_rectangle([28, 28, size - 28, size - 28], radius=22, outline=(90, 55, 18, 255), width=3)
    # jewel interior
    inset = [46, 46, size - 46, size - 46]
    for y in range(inset[1], inset[3]):
        t = (y - inset[1]) / max(1, inset[3] - inset[1])
        c = mix(fill_hi, fill_lo, t)
        d.line([(inset[0], y), (inset[2], y)], fill=(*c, 255))
    d.rounded_rectangle(inset, radius=16, outline=(*accent, 220), width=2)
    # carved letter
    f = font(118)
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3), (-2, -2), (2, 2)]:
        d.text((size // 2 + ox, size // 2 + oy - 4), letter, font=f, fill=(40, 22, 8, 220), anchor="mm")
    d.text((size // 2, size // 2 - 4), letter, font=f, fill=(255, 240, 190, 255), anchor="mm")
    # gem sparkle
    d.ellipse([62, 58, 78, 72], fill=(255, 255, 255, 140))
    # corner ornaments
    for cx, cy in [(48, 48), (size - 48, 48), (48, size - 48), (size - 48, size - 48)]:
        d.ellipse([cx - 6, cy - 6, cx + 6, cy + 6], fill=(180, 30, 40, 255))
        d.ellipse([cx - 3, cy - 3, cx + 2, cy + 2], fill=(255, 160, 160, 180))
    return im.filter(ImageFilter.SMOOTH)


def make_letters():
    save(letter_symbol("A", (255, 120, 90), (150, 40, 30), (255, 200, 120)), "symbols/A.png")
    save(letter_symbol("K", (255, 200, 90), (160, 100, 20), (255, 230, 150)), "symbols/K.png")
    save(letter_symbol("Q", (160, 140, 255), (70, 50, 160), (220, 200, 255)), "symbols/Q.png")
    save(letter_symbol("J", (120, 220, 180), (30, 110, 80), (180, 255, 210)), "symbols/J.png")


def make_wild():
    size = 320
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    # outer gold medallion
    draw_gold_ring(d, cx, cy, size // 2 - 4, width=16)
    d.ellipse([cx - 118, cy - 118, cx + 118, cy + 118], fill=(55, 35, 18, 255))
    gold_grad(d, (cx - 110, cy - 110, cx + 110, cy + 110))
    # face plate
    d.ellipse([cx - 95, cy - 95, cx + 95, cy + 95], fill=(190, 140, 50, 255))
    # crown / temple crest
    crest = [(cx, cy - 108), (cx + 42, cy - 70), (cx + 28, cy - 55), (cx, cy - 72), (cx - 28, cy - 55), (cx - 42, cy - 70)]
    d.polygon(crest, fill=(230, 180, 70, 255))
    d.ellipse([cx - 10, cy - 100, cx + 10, cy - 80], fill=(200, 30, 45, 255))
    # brows / eyes
    d.arc([cx - 70, cy - 50, cx - 10, cy - 5], 200, 340, fill=(80, 40, 15, 255), width=5)
    d.arc([cx + 10, cy - 50, cx + 70, cy - 5], 200, 340, fill=(80, 40, 15, 255), width=5)
    for ex in (-40, 40):
        d.ellipse([cx + ex - 14, cy - 28, cx + ex + 14, cy], fill=(30, 15, 8, 255))
        d.ellipse([cx + ex - 8, cy - 24, cx + ex + 6, cy - 8], fill=(220, 40, 50, 255))
        d.ellipse([cx + ex - 4, cy - 20, cx + ex, cy - 14], fill=(255, 200, 200, 200))
    # nose / mouth
    d.polygon([(cx, cy - 8), (cx + 12, cy + 22), (cx - 12, cy + 22)], fill=(150, 100, 40, 255))
    d.arc([cx - 36, cy + 18, cx + 36, cy + 58], 20, 160, fill=(90, 40, 20, 255), width=4)
    d.ellipse([cx - 8, cy + 32, cx + 8, cy + 44], fill=(160, 30, 40, 220))
    # cheek ornaments
    for sx in (-70, 70):
        d.ellipse([cx + sx - 10, cy + 8, cx + sx + 10, cy + 28], fill=(200, 40, 50, 255))
    # WILD ribbon
    d.rounded_rectangle([cx - 70, cy + 72, cx + 70, cy + 108], radius=10, fill=(120, 25, 30, 255))
    d.rounded_rectangle([cx - 66, cy + 76, cx + 66, cy + 104], radius=8, outline=(255, 210, 120, 255), width=2)
    d.text((cx, cy + 90), "WILD", font=font(28), fill=(255, 235, 170), anchor="mm")
    # glow soft
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([cx - 130, cy - 130, cx + 130, cy + 130], fill=(255, 180, 60, 50))
    glow = glow.filter(ImageFilter.GaussianBlur(18))
    out = Image.alpha_composite(glow, im)
    save(out.filter(ImageFilter.SMOOTH_MORE), "symbols/wild.png")


def make_wheel_symbol(color_name, hi, mid, lo):
    size = 220
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    draw_gold_ring(d, cx, cy, size // 2 - 4, width=12)
    d.ellipse([cx - 78, cy - 78, cx + 78, cy + 78], fill=(*mid, 255))
    # mini wheel wedges
    cols = [hi, mid, lo, mix(hi, (255, 220, 100), 0.4)]
    for i in range(8):
        a0 = i * 45
        a1 = a0 + 45
        d.pieslice([cx - 70, cy - 70, cx + 70, cy + 70], a0, a1, fill=(*cols[i % 4], 255))
    d.ellipse([cx - 22, cy - 22, cx + 22, cy + 22], fill=(230, 180, 60, 255))
    d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], fill=(180, 30, 40, 255))
    d.text((cx, cy + 58), "WHEEL", font=font(18), fill=(255, 240, 200), anchor="mm")
    save(im, f"symbols/wheel-{color_name}.png")


def make_lucky_wheel():
    size = 900
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    rewards = [3, 5, 8, 10, 15, 20, 30, 50, 100, 200, 500, 1000]
    colors = [
        (40, 110, 200), (180, 40, 50), (30, 150, 80), (200, 150, 30),
        (120, 50, 170), (30, 140, 160), (200, 80, 30), (50, 90, 180),
        (160, 40, 90), (40, 160, 100), (190, 130, 20), (70, 60, 160),
    ]
    n = len(rewards)
    # outer gold rim layers
    for r, w in [(size // 2 - 2, 22), (size // 2 - 26, 10), (size // 2 - 40, 6)]:
        draw_gold_ring(d, cx, cy, r, width=w)
    # wedges
    for i, (val, col) in enumerate(zip(rewards, colors)):
        a0 = -90 + i * (360 / n)
        a1 = a0 + 360 / n
        hi = mix(col, (255, 255, 255), 0.25)
        lo = mix(col, (0, 0, 0), 0.35)
        # gradient-ish by two pies
        mid_a = (a0 + a1) / 2
        d.pieslice([cx - 380, cy - 380, cx + 380, cy + 380], a0, mid_a, fill=(*hi, 255))
        d.pieslice([cx - 380, cy - 380, cx + 380, cy + 380], mid_a, a1, fill=(*lo, 255))
        # separator
        rad = math.radians(a0)
        d.line(
            [cx + 60 * math.cos(rad), cy + 60 * math.sin(rad), cx + 380 * math.cos(rad), cy + 380 * math.sin(rad)],
            fill=(230, 190, 80, 255),
            width=4,
        )
        # label
        mid = math.radians((a0 + a1) / 2)
        tx = cx + 250 * math.cos(mid)
        ty = cy + 250 * math.sin(mid)
        label = str(val)
        f = font(42 if val < 100 else 34)
        for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            d.text((tx + ox, ty + oy), label, font=f, fill=(20, 10, 5, 220), anchor="mm")
        d.text((tx, ty), label, font=f, fill=(255, 245, 210), anchor="mm")
    # inner ring
    draw_gold_ring(d, cx, cy, 95, width=14)
    d.ellipse([cx - 78, cy - 78, cx + 78, cy + 78], fill=(70, 45, 22, 255))
    # center medallion face (simplified guardian)
    gold_grad(d, (cx - 70, cy - 70, cx + 70, cy + 70))
    d.ellipse([cx - 55, cy - 55, cx + 55, cy + 55], fill=(200, 150, 55, 255))
    for ex in (-22, 22):
        d.ellipse([cx + ex - 10, cy - 18, cx + ex + 10, cy + 2], fill=(30, 15, 8, 255))
        d.ellipse([cx + ex - 5, cy - 14, cx + ex + 4, cy - 4], fill=(220, 40, 50, 255))
    d.polygon([(cx, cy - 2), (cx + 8, cy + 16), (cx - 8, cy + 16)], fill=(140, 90, 35))
    d.arc([cx - 24, cy + 10, cx + 24, cy + 40], 20, 160, fill=(80, 35, 15), width=3)
    # ruby studs on rim
    for i in range(12):
        ang = math.radians(-90 + i * 30)
        rx = cx + 420 * math.cos(ang)
        ry = cy + 420 * math.sin(ang)
        d.ellipse([rx - 10, ry - 10, rx + 10, ry + 10], fill=(190, 30, 45, 255))
        d.ellipse([rx - 4, ry - 5, rx + 3, ry + 2], fill=(255, 160, 160, 180))
    # soft shadow under
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sh)
    sd.ellipse([80, size - 90, size - 80, size - 20], fill=(0, 0, 0, 100))
    sh = sh.filter(ImageFilter.GaussianBlur(20))
    out = Image.alpha_composite(sh, im)
    save(out, "wheel/lucky-wheel.png")
    # pointer
    ptr = Image.new("RGBA", (120, 160), (0, 0, 0, 0))
    pd = ImageDraw.Draw(ptr)
    pd.polygon([(60, 150), (20, 40), (100, 40)], fill=(230, 180, 60, 255))
    pd.polygon([(60, 150), (35, 55), (85, 55)], fill=(180, 120, 40, 255))
    pd.ellipse([35, 10, 85, 60], fill=(200, 40, 55, 255))
    pd.ellipse([48, 22, 72, 46], fill=(255, 160, 160, 200))
    save(ptr, "wheel/pointer.png")


def make_multiplier_token(value: str, gem_hi, gem_mid, gem_lo):
    size = 220
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    draw_gold_ring(d, cx, cy, size // 2 - 4, width=14)
    # gem face
    for y in range(cx - 78, cx + 78):
        t = (y - (cy - 78)) / 156
        c = mix(gem_hi, gem_lo, t)
        # circle clip via chord approx
        dy = abs(y - cy)
        if dy >= 78:
            continue
        half = int(math.sqrt(78 * 78 - dy * dy))
        d.line([(cx - half, y), (cx + half, y)], fill=(*c, 255))
    d.ellipse([cx - 78, cy - 78, cx + 78, cy + 78], outline=(*gem_mid, 255), width=2)
    d.ellipse([cx - 50, cy - 55, cx - 20, cy - 30], fill=(255, 255, 255, 90))
    f = font(64)
    for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
        d.text((cx + ox, cy + oy), value, font=f, fill=(20, 10, 5, 230), anchor="mm")
    d.text((cx, cy), value, font=f, fill=(255, 245, 210), anchor="mm")
    save(im, f"multipliers/mult-{value.lower()}.png")


def make_controls():
    # spin button
    size = 220
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    draw_gold_ring(d, cx, cy, size // 2 - 2, width=16)
    d.ellipse([cx - 78, cy - 78, cx + 78, cy + 78], fill=(40, 28, 16, 255))
    for y in range(cy - 70, cy + 70):
        t = (y - (cy - 70)) / 140
        c = mix((255, 200, 80), (180, 90, 20), t)
        dy = abs(y - cy)
        if dy >= 70:
            continue
        half = int(math.sqrt(70 * 70 - dy * dy))
        d.line([(cx - half, y), (cx + half, y)], fill=(*c, 255))
    # spin arrows
    d.arc([cx - 42, cy - 42, cx + 42, cy + 42], 40, 280, fill=(80, 40, 10, 255), width=10)
    d.polygon([(cx + 38, cy - 28), (cx + 58, cy - 8), (cx + 28, cy - 4)], fill=(80, 40, 10, 255))
    d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], fill=(220, 40, 50, 255))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([10, 10, size - 10, size - 10], fill=(255, 180, 60, 55))
    glow = glow.filter(ImageFilter.GaussianBlur(12))
    save(Image.alpha_composite(glow, im), "controls/spin.png")

    def round_btn(name, icon_fn, active=False):
        s = 128
        b = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        bd = ImageDraw.Draw(b)
        draw_gold_ring(bd, s // 2, s // 2, s // 2 - 2, width=8)
        fill = (90, 45, 20, 255) if active else (45, 30, 18, 255)
        bd.ellipse([18, 18, s - 18, s - 18], fill=fill)
        icon_fn(bd, s)
        save(b, f"controls/{name}.png")

    def turbo_icon(bd, s):
        bd.polygon([(40, 70), (68, 30), (62, 58), (88, 50), (58, 98), (64, 68)], fill=(255, 140, 40, 255))

    def auto_icon(bd, s):
        bd.arc([34, 34, s - 34, s - 34], 40, 300, fill=(255, 220, 140, 255), width=6)
        bd.polygon([(s - 40, 42), (s - 28, 58), (s - 50, 56)], fill=(255, 220, 140, 255))

    def plus_icon(bd, s):
        bd.rectangle([s // 2 - 6, 36, s // 2 + 6, s - 36], fill=(255, 230, 160))
        bd.rectangle([36, s // 2 - 6, s - 36, s // 2 + 6], fill=(255, 230, 160))

    def minus_icon(bd, s):
        bd.rectangle([36, s // 2 - 6, s - 36, s // 2 + 6], fill=(255, 230, 160))

    def sound_icon(bd, s):
        bd.polygon([(40, 48), (58, 48), (78, 34), (78, s - 34), (58, s - 48), (40, s - 48)], fill=(255, 220, 140))
        bd.arc([70, 40, 98, s - 40], -50, 50, fill=(255, 220, 140), width=4)

    def info_icon(bd, s):
        bd.ellipse([s // 2 - 8, 34, s // 2 + 8, 50], fill=(255, 220, 140))
        bd.rectangle([s // 2 - 6, 56, s // 2 + 6, s - 34], fill=(255, 220, 140))

    def settings_icon(bd, s):
        bd.ellipse([s // 2 - 16, s // 2 - 16, s // 2 + 16, s // 2 + 16], outline=(255, 220, 140), width=5)
        for i in range(6):
            ang = i * math.pi / 3
            x = s // 2 + 28 * math.cos(ang)
            y = s // 2 + 28 * math.sin(ang)
            bd.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(255, 220, 140))

    round_btn("turbo", turbo_icon)
    round_btn("turbo-on", turbo_icon, True)
    round_btn("auto", auto_icon)
    round_btn("auto-on", auto_icon, True)
    round_btn("plus", plus_icon)
    round_btn("minus", minus_icon)
    round_btn("sound", sound_icon)
    round_btn("sound-off", sound_icon)
    round_btn("info", info_icon)
    round_btn("settings", settings_icon)

    # continue button
    w, h = 360, 90
    c = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cd = ImageDraw.Draw(c)
    cd.rounded_rectangle([0, 0, w - 1, h - 1], radius=16, fill=(20, 120, 55, 255))
    cd.rounded_rectangle([4, 4, w - 5, h - 5], radius=14, outline=(180, 255, 160, 200), width=2)
    cd.rounded_rectangle([8, 8, w - 9, h // 2], radius=10, fill=(60, 190, 100, 120))
    cd.text((w // 2, h // 2), "Continue", font=font(36), fill=(255, 255, 255), anchor="mm")
    save(c, "ui/btn-continue.png")


def make_frames():
    # cabinet frame for reels area
    w, h = 520, 420
    im = stone_bg(w, h, base=(78, 56, 38))
    d = ImageDraw.Draw(im)
    # outer gold
    d.rounded_rectangle([8, 8, w - 8, h - 8], radius=18, outline=(220, 170, 60, 255), width=8)
    d.rounded_rectangle([18, 18, w - 18, h - 18], radius=14, outline=(110, 70, 25, 255), width=3)
    # inner dark recess
    d.rounded_rectangle([30, 36, w - 30, h - 50], radius=10, fill=(18, 12, 8, 240))
    # ruby corners
    for x, y in [(28, 28), (w - 28, 28), (28, h - 40), (w - 28, h - 40)]:
        d.ellipse([x - 9, y - 9, x + 9, y + 9], fill=(190, 35, 45, 255))
    # top message beam
    d.rounded_rectangle([70, 10, w - 70, 42], radius=8, fill=(40, 28, 16, 255))
    d.rounded_rectangle([70, 10, w - 70, 42], radius=8, outline=(220, 170, 60, 220), width=2)
    save(im, "frames/cabinet.png")

    # message banner
    bw, bh = 420, 56
    ban = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    bd = ImageDraw.Draw(ban)
    bd.rounded_rectangle([0, 0, bw - 1, bh - 1], radius=10, fill=(42, 28, 16, 245))
    bd.rounded_rectangle([2, 2, bw - 3, bh - 3], radius=9, outline=(220, 170, 60, 255), width=3)
    for x in (18, bw - 18):
        bd.ellipse([x - 6, bh // 2 - 6, x + 6, bh // 2 + 6], fill=(190, 35, 45))
    save(ban, "frames/banner.png")

    # selection frame for mult
    sf = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sf)
    sd.rounded_rectangle([8, 8, 151, 151], radius=16, outline=(255, 210, 90, 255), width=6)
    sd.rounded_rectangle([16, 16, 143, 143], radius=12, outline=(160, 100, 30, 200), width=2)
    for x, y in [(20, 20), (140, 20), (20, 140), (140, 140)]:
        sd.ellipse([x - 7, y - 7, x + 7, y + 7], fill=(200, 40, 50))
    glow = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.rounded_rectangle([4, 4, 155, 155], radius=18, outline=(255, 200, 80, 100), width=8)
    glow = glow.filter(ImageFilter.GaussianBlur(4))
    save(Image.alpha_composite(glow, sf), "frames/mult-select.png")

    # special panel housing
    pw, ph = 160, 400
    panel = stone_bg(pw, ph, base=(70, 48, 32))
    pd = ImageDraw.Draw(panel)
    pd.rounded_rectangle([6, 6, pw - 6, ph - 6], radius=14, outline=(220, 170, 60, 255), width=6)
    pd.rounded_rectangle([18, 48, pw - 18, ph - 24], radius=10, fill=(20, 12, 8, 230))
    pd.rounded_rectangle([20, 12, pw - 20, 42], radius=6, fill=(140, 35, 40, 255))
    pd.text((pw // 2, 27), "SPECIAL", font=font(14), fill=(255, 230, 160), anchor="mm")
    save(panel, "frames/special-panel.png")

    # control deck
    dw, dh = 960, 88
    deck = Image.new("RGBA", (dw, dh), (0, 0, 0, 0))
    dd = ImageDraw.Draw(deck)
    for y in range(dh):
        t = y / dh
        c = mix((55, 35, 20), (25, 15, 8), t)
        dd.line([(0, y), (dw, y)], fill=(*c, 250))
    dd.rectangle([0, 0, dw, 4], fill=(220, 170, 60, 220))
    for x in (200, 380, 560, 740):
        dd.line([(x, 12), (x, dh - 12)], fill=(180, 130, 50, 160), width=2)
    save(noise(deck, 8), "frames/control-bar.png")


def make_background():
    w, h = 1280, 576
    im = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    # sky gradient
    for y in range(h):
        t = y / h
        if t < 0.35:
            c = mix((70, 40, 90), (255, 160, 90), t / 0.35)
        elif t < 0.55:
            c = mix((255, 160, 90), (255, 200, 120), (t - 0.35) / 0.2)
        else:
            c = mix((255, 200, 120), (90, 55, 35), (t - 0.55) / 0.45)
        d.line([(0, y), (w, y)], fill=(*c, 255))
    # sun glow
    sun = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sun)
    sd.ellipse([w // 2 - 160, 80, w // 2 + 160, 340], fill=(255, 230, 160, 90))
    sun = sun.filter(ImageFilter.GaussianBlur(40))
    im = Image.alpha_composite(im, sun)
    d = ImageDraw.Draw(im)
    # distant mountains
    d.polygon([(0, 360), (180, 280), (320, 340), (500, 250), (700, 320), (900, 240), (1100, 310), (1280, 270), (1280, 420), (0, 420)], fill=(70, 45, 55, 180))
    # temple silhouettes
    def temple(x, base_y, scale=1.0, alpha=200):
        tw = int(90 * scale)
        th = int(160 * scale)
        # body
        d.rectangle([x - tw // 2, base_y - th // 2, x + tw // 2, base_y], fill=(55, 40, 30, alpha))
        # tiers
        for i in range(4):
            yy = base_y - th // 2 - i * int(22 * scale)
            ww = tw // 2 - i * 8
            d.polygon([(x - ww, yy), (x, yy - int(28 * scale)), (x + ww, yy)], fill=(48, 35, 26, alpha))
        # door
        d.rectangle([x - int(12 * scale), base_y - int(40 * scale), x + int(12 * scale), base_y], fill=(20, 12, 8, alpha))

    temple(w // 2, 400, 1.6, 230)
    temple(260, 390, 1.0, 180)
    temple(1020, 395, 1.1, 180)
    temple(160, 410, 0.7, 140)
    temple(1120, 415, 0.75, 140)
    # mid stone platform
    d.polygon([(80, 460), (200, 430), (1080, 430), (1200, 460), (1180, 520), (100, 520)], fill=(75, 55, 38, 230))
    for i in range(12):
        x = 140 + i * 85
        d.rectangle([x, 435, x + 18, 500], fill=(65, 48, 32, 220))
        d.ellipse([x - 4, 428, x + 22, 448], fill=(70, 52, 36, 220))
    # foreground foliage
    def leaf_clump(x, y, scale=1.0):
        for _ in range(18):
            lx = x + RNG.randint(-40, 40) * scale
            ly = y + RNG.randint(-30, 40) * scale
            lw = RNG.randint(30, 55) * scale
            lh = RNG.randint(50, 90) * scale
            ang_col = (20 + RNG.randint(0, 30), 70 + RNG.randint(0, 40), 30 + RNG.randint(0, 20), 230)
            d.ellipse([lx, ly, lx + lw, ly + lh], fill=ang_col)
        # flowers
        for _ in range(5):
            fx = x + RNG.randint(-30, 30)
            fy = y + RNG.randint(-10, 30)
            d.ellipse([fx, fy, fx + 10, fy + 10], fill=(200, 40, 50, 230))

    leaf_clump(60, 480, 1.2)
    leaf_clump(1210, 475, 1.2)
    leaf_clump(140, 520, 0.9)
    leaf_clump(1140, 525, 0.9)
    # light rays
    rays = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rays)
    for i in range(7):
        ang = -30 + i * 10
        rad = math.radians(ang)
        x2 = w // 2 + math.sin(rad) * 700
        y2 = 200 + math.cos(rad) * 500
        rd.polygon([(w // 2, 200), (x2 - 18, y2), (x2 + 18, y2)], fill=(255, 230, 160, 18))
    rays = rays.filter(ImageFilter.GaussianBlur(8))
    im = Image.alpha_composite(im, rays)
    # vignette
    vig = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vig)
    vd.rectangle([0, 0, w, h], fill=(0, 0, 0, 0))
    for i in range(80):
        a = int(i * 1.6)
        vd.rectangle([i, i, w - i, h - i], outline=(0, 0, 0, a))
    im = Image.alpha_composite(im, vig.filter(ImageFilter.GaussianBlur(2)))
    # birds
    d = ImageDraw.Draw(im)
    for bx, by in [(300, 160), (340, 175), (900, 150), (940, 165), (980, 155)]:
        d.arc([bx, by, bx + 14, by + 8], 200, 340, fill=(40, 25, 30, 180), width=2)
        d.arc([bx + 10, by, bx + 24, by + 8], 200, 340, fill=(40, 25, 30, 180), width=2)
    save(im, "backgrounds/temple.jpg".replace(".jpg", ".png"))
    # also smaller play bg
    play = im.resize((960, 432), Image.Resampling.LANCZOS)
    save(play, "backgrounds/bg-play.png")
    # loading bg (same)
    save(im.resize((1280, 576), Image.Resampling.LANCZOS), "backgrounds/bg-loading.png")
    # leaf overlays
    leaf = Image.new("RGBA", (280, 320), (0, 0, 0, 0))
    ld = ImageDraw.Draw(leaf)
    for _ in range(25):
        lx, ly = RNG.randint(0, 200), RNG.randint(0, 250)
        ld.ellipse([lx, ly, lx + RNG.randint(40, 80), ly + RNG.randint(60, 120)], fill=(25, 80, 35, 210))
    save(leaf, "backgrounds/leaves-left.png")
    save(leaf.transpose(Image.Transpose.FLIP_LEFT_RIGHT), "backgrounds/leaves-right.png")


def make_logo():
    w, h = 640, 140
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    f1, f2 = font(48), font(56)
    # Fortune
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3), (-2, 2), (2, -2)]:
        d.text((210 + ox, 55 + oy), "FORTUNE", font=f1, fill=(80, 40, 10, 255), anchor="mm")
    d.text((210, 55), "FORTUNE", font=f1, fill=(255, 220, 120), anchor="mm")
    # Gems
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
        d.text((430 + ox, 55 + oy), "GEMS", font=f1, fill=(80, 40, 10, 255), anchor="mm")
    d.text((430, 55), "GEMS", font=f1, fill=(255, 230, 140), anchor="mm")
    # gem in G
    d.ellipse([368, 38, 392, 62], fill=(50, 140, 220, 255))
    d.ellipse([372, 42, 380, 50], fill=(200, 230, 255, 180))
    # red 2
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
        d.text((545 + ox, 58 + oy), "2", font=f2, fill=(255, 255, 255, 255), anchor="mm")
    d.text((545, 58), "2", font=f2, fill=(220, 40, 55), anchor="mm")
    save(im, "ui/logo.png")


def make_loading_and_cards():
    # loading bar track/fill
    track = Image.new("RGBA", (480, 18), (0, 0, 0, 0))
    td = ImageDraw.Draw(track)
    td.rounded_rectangle([0, 0, 479, 17], radius=9, fill=(20, 20, 25, 200))
    td.rounded_rectangle([0, 0, 479, 17], radius=9, outline=(100, 100, 120, 160), width=1)
    save(track, "loading/bar-track.png")
    fill = Image.new("RGBA", (480, 18), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fill)
    for x in range(480):
        t = x / 480
        c = mix((40, 200, 255), (80, 255, 200), t)
        fd.line([(x, 2), (x, 15)], fill=(*c, 255))
    save(fill, "loading/bar-fill.png")

    # feature cards
    texts = [
        ("Lucky Wheel", "Land WHEEL on Special Reel\nto spin the Lucky Wheel."),
        ("Special Multiplier", "Center token multiplies\nyour winning payout."),
        ("Wild Guardian", "Wild substitutes for all\nsymbols on paylines."),
        ("Full Board", "Fill the board for a\nmassive temple reward."),
    ]
    for i, (title, body) in enumerate(texts):
        w, h = 520, 300
        card = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        # dark plate on stone
        base = stone_bg(w, h, base=(50, 36, 26))
        d = ImageDraw.Draw(base)
        d.rounded_rectangle([10, 10, w - 10, h - 10], radius=16, outline=(220, 170, 60, 255), width=6)
        d.rounded_rectangle([24, 24, w - 24, h - 24], radius=12, fill=(18, 12, 8, 210))
        d.text((w // 2, 70), title, font=font(32), fill=(255, 220, 130), anchor="mm")
        for j, line in enumerate(body.split("\n")):
            d.text((w // 2, 140 + j * 36), line, font=font(20), fill=(240, 230, 210), anchor="mm")
        save(base, f"loading/feature-{i + 1}.png")

    # chili icons for volatility
    chili = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chili)
    cd.ellipse([12, 8, 36, 40], fill=(210, 40, 40, 255))
    cd.polygon([(24, 6), (30, 14), (18, 14)], fill=(40, 140, 50, 255))
    save(chili, "ui/chili-on.png")
    chili2 = chili.copy()
    chili2 = ImageEnhance.Brightness(chili2).enhance(0.35)
    save(chili2, "ui/chili-off.png")


def make_effects():
    # particle spark
    s = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    d = ImageDraw.Draw(s)
    d.ellipse([20, 20, 44, 44], fill=(255, 220, 100, 220))
    d.ellipse([26, 24, 34, 32], fill=(255, 255, 255, 180))
    save(s.filter(ImageFilter.GaussianBlur(1)), "particles/spark.png")
    # coin
    c = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    cd = ImageDraw.Draw(c)
    draw_gold_ring(cd, 32, 32, 28, width=6)
    cd.ellipse([12, 12, 52, 52], fill=(230, 180, 60, 255))
    cd.text((32, 32), "$", font=font(28), fill=(120, 70, 20), anchor="mm")
    save(c, "particles/coin.png")
    # light flash
    flash = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    fd = ImageDraw.Draw(flash)
    fd.ellipse([40, 40, 216, 216], fill=(255, 240, 180, 100))
    save(flash.filter(ImageFilter.GaussianBlur(20)), "effects/flash.png")
    # gold trail
    trail = Image.new("RGBA", (128, 32), (0, 0, 0, 0))
    td = ImageDraw.Draw(trail)
    for x in range(128):
        a = int(200 * (1 - x / 128))
        td.ellipse([x, 10, x + 10, 22], fill=(255, 200, 80, a))
    save(trail.filter(ImageFilter.GaussianBlur(2)), "effects/gold-trail.png")
    # win banner
    wb = Image.new("RGBA", (520, 120), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wb)
    wd.rounded_rectangle([10, 20, 510, 100], radius=14, fill=(50, 30, 15, 240))
    wd.rounded_rectangle([10, 20, 510, 100], radius=14, outline=(255, 200, 80, 255), width=4)
    wd.text((260, 60), "BIG WIN", font=font(42), fill=(255, 220, 120), anchor="mm")
    save(wb, "ui/win-banner.png")
    # bonus banner
    bb = Image.new("RGBA", (520, 120), (0, 0, 0, 0))
    bd = ImageDraw.Draw(bb)
    bd.rounded_rectangle([10, 20, 510, 100], radius=14, fill=(80, 25, 30, 240))
    bd.rounded_rectangle([10, 20, 510, 100], radius=14, outline=(255, 200, 80, 255), width=4)
    bd.text((260, 60), "LUCKY WHEEL", font=font(36), fill=(255, 220, 130), anchor="mm")
    save(bb, "ui/bonus-banner.png")


def make_lobby_thumb():
    w, h = 360, 240
    bg = Image.open(ROOT / "backgrounds/bg-play.png").resize((w, h), Image.Resampling.LANCZOS)
    wild = Image.open(ROOT / "symbols/wild.png").resize((140, 140), Image.Resampling.LANCZOS)
    wheel = Image.open(ROOT / "wheel/lucky-wheel.png").resize((120, 120), Image.Resampling.LANCZOS)
    bg.alpha_composite(wheel, (20, 60))
    bg.alpha_composite(wild, (200, 40))
    d = ImageDraw.Draw(bg)
    d.text((w // 2, h - 28), "Fortune Gems 2", font=font(22), fill=(255, 230, 140), anchor="mm")
    save(bg, "../fortune-gems-2.png")


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    print("Generating Fortune Gems 2 assets…")
    make_background()
    make_logo()
    make_wild()
    make_ruby()
    make_sapphire()
    make_emerald()
    make_letters()
    make_wheel_symbol("green", (140, 255, 180), (30, 170, 90), (10, 70, 40))
    make_wheel_symbol("red", (255, 140, 140), (200, 40, 50), (90, 15, 25))
    make_lucky_wheel()
    for val, cols in [
        ("2x", ((140, 255, 180), (40, 170, 90), (10, 70, 40))),
        ("3x", ((160, 210, 255), (50, 120, 210), (15, 40, 110))),
        ("5x", ((255, 200, 100), (220, 140, 30), (120, 70, 15))),
        ("10x", ((255, 150, 200), (200, 50, 120), (90, 20, 50))),
        ("15x", ((255, 220, 100), (230, 160, 40), (130, 80, 20))),
    ]:
        make_multiplier_token(val, *cols)
    make_controls()
    make_frames()
    make_loading_and_cards()
    make_effects()
    make_lobby_thumb()
    print("Done.")


if __name__ == "__main__":
    main()
