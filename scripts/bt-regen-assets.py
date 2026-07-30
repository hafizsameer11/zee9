#!/usr/bin/env python3
"""Regenerate Bounty Trail gameplay chrome + dense symbols (Pillow)."""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path("/var/www/zee9/public/games/bounty-trail")
RNG = random.Random(42)


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf",
    ]
    for p in candidates:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def wood_fill(draw: ImageDraw.ImageDraw, box, base=(92, 52, 22), grain=True):
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0)
        c = (
            int(base[0] * (1.15 - t * 0.35)),
            int(base[1] * (1.1 - t * 0.3)),
            int(base[2] * (1.05 - t * 0.25)),
        )
        draw.line([(x0, y), (x1, y)], fill=c)
    if grain:
        for _ in range(max(8, (x1 - x0) // 8)):
            x = RNG.randint(x0, x1)
            draw.line(
                [(x, y0 + 2), (x + RNG.randint(-6, 6), y1 - 2)],
                fill=(40, 22, 10, 55),
                width=1,
            )


def brass_ring(draw, cx, cy, r, fill=(210, 160, 55), edge=(90, 55, 18)):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill, outline=edge, width=2)
    draw.ellipse(
        [cx - r + 3, cy - r + 3, cx + r - 3, cy + r - 3],
        outline=(255, 220, 140, 160),
        width=1,
    )


def save(im: Image.Image, rel: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, "PNG", optimize=True)
    print("wrote", path, im.size)


def make_logo():
    W, H = 720, 220
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # wood plaque with pointed ends
    pts = [
        (40, 40),
        (80, 18),
        (W - 80, 18),
        (W - 40, 40),
        (W - 40, H - 40),
        (W - 80, H - 18),
        (80, H - 18),
        (40, H - 40),
    ]
    d.polygon(pts, fill=(70, 38, 14, 255))
    # inner gold trim
    inset = [(p[0] + 10 if i in (0, 7) else p[0] - 10 if i in (3, 4) else p[0],
              p[1] + 8 if i in (1, 2) else p[1] - 8 if i in (5, 6) else p[1]) for i, p in enumerate(pts)]
    # simpler inset rectangle
    d.rounded_rectangle([55, 32, W - 55, H - 32], radius=18, outline=(220, 170, 60, 255), width=5)
    d.rounded_rectangle([62, 39, W - 62, H - 39], radius=14, outline=(120, 75, 25, 200), width=2)
    # badge
    brass_ring(d, 110, H // 2, 28, fill=(230, 185, 70))
    d.polygon(
        [(110, H // 2 - 16), (120, H // 2 - 4), (110, H // 2 + 16), (100, H // 2 - 4)],
        fill=(90, 50, 15),
    )
    # revolver hint
    d.ellipse([W - 140, H // 2 - 10, W - 100, H // 2 + 10], fill=(180, 180, 190))
    d.rectangle([W - 100, H // 2 - 4, W - 70, H // 2 + 4], fill=(140, 100, 50))
    f1, f2 = font(28), font(54)
    d.text((W // 2, 70), "BOUNTY TRAIL", font=f1, fill=(255, 220, 140), anchor="mm")
    # gold outline fake for HIGH NOON
    for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-1, -1), (1, 1)]:
        d.text((W // 2 + ox, 130 + oy), "HIGH NOON", font=f2, fill=(90, 45, 10), anchor="mm")
    d.text((W // 2, 130), "HIGH NOON", font=f2, fill=(255, 230, 150), anchor="mm")
    # rivets
    for x in (70, W - 70):
        brass_ring(d, x, 50, 7)
        brass_ring(d, x, H - 50, 7)
    im = im.filter(ImageFilter.SMOOTH_MORE)
    save(im, "ui/logo.png")


def make_multiplier_board():
    W, H = 900, 200
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # hanging chains
    for x in (120, W // 2, W - 120):
        for y in range(0, 28, 6):
            d.ellipse([x - 5, y, x + 5, y + 8], outline=(160, 150, 130), width=2)
    # curved wooden sign (trapezoid + arc top)
    body = [(40, 48), (W - 40, 48), (W - 70, H - 18), (70, H - 18)]
    d.polygon(body, fill=(86, 48, 18, 255))
    # wood grain overlay
    wood = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wood)
    wood_fill(wd, (50, 50, W - 50, H - 22), base=(110, 62, 26))
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).polygon(body, fill=200)
    im = Image.composite(wood, im, mask)
    d = ImageDraw.Draw(im)
    d.polygon(body, outline=(210, 160, 55), width=6)
    d.line([(80, 62), (W - 80, 62)], fill=(255, 210, 120, 120), width=2)
    # metal plates for multiplier seats
    seats = [W // 2 + dx for dx in (-280, -140, 0, 140, 280)]
    for i, cx in enumerate(seats):
        cy = 118
        r = 48 if i == 2 else 40
        d.ellipse([cx - r - 4, cy - r - 4, cx + r + 4, cy + r + 4], fill=(40, 22, 10))
        brass_ring(d, cx, cy, r, fill=(55, 32, 14) if i != 2 else (180, 90, 25))
        if i == 2:
            d.ellipse([cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6], outline=(255, 210, 100), width=3)
    # corner ornaments
    for x, y in [(90, 70), (W - 90, 70), (100, H - 40), (W - 100, H - 40)]:
        brass_ring(d, x, y, 8)
    save(im, "frames/multiplier-board.png")


def make_reel_frame(mw=716, mh=834):
    """Illustrated carved wood frame matching MACHINE size ×2."""
    im = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # outer wood
    d.rounded_rectangle([0, 0, mw - 1, mh - 1], radius=36, fill=(78, 44, 18, 255))
    wood_fill(d, (0, 0, mw, mh), base=(95, 55, 22))
    # carved bevel
    d.rounded_rectangle([8, 8, mw - 9, mh - 9], radius=30, outline=(45, 24, 10), width=6)
    d.rounded_rectangle([16, 16, mw - 17, mh - 17], radius=26, outline=(210, 160, 55), width=5)
    d.rounded_rectangle([22, 22, mw - 23, mh - 23], radius=22, outline=(255, 220, 140, 160), width=2)
    # cut out center (transparent window)
    inset = 22
    clear = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
    cd = ImageDraw.Draw(clear)
    cd.rounded_rectangle([inset, inset, mw - inset - 1, mh - inset - 1], radius=16, fill=(0, 0, 0, 255))
    # keep only frame ring
    alpha = im.split()[-1]
    mask = clear.split()[0]
    # punch hole
    out = im.copy()
    px = out.load()
    m = mask.load()
    for y in range(mh):
        for x in range(mw):
            if m[x, y] > 128:
                # inner window transparent
                if inset + 2 < x < mw - inset - 2 and inset + 2 < y < mh - inset - 2:
                    px[x, y] = (0, 0, 0, 0)
    d = ImageDraw.Draw(out)
    # brass corners
    for cx, cy in [(40, 40), (mw - 40, 40), (40, mh - 40), (mw - 40, mh - 40)]:
        brass_ring(d, cx, cy, 14)
        brass_ring(d, cx, cy, 6, fill=(255, 230, 160))
    # side rivets
    for y in range(90, mh - 90, 70):
        brass_ring(d, 18, y, 5)
        brass_ring(d, mw - 18, y, 5)
    # light reflection streak
    streak = Image.new("RGBA", (mw, mh), (0, 0, 0, 0))
    sd = ImageDraw.Draw(streak)
    sd.arc([30, 20, mw - 30, 120], 200, 340, fill=(255, 230, 180, 90), width=4)
    out = Image.alpha_composite(out, streak)
    save(out, "frames/reel-frame.png")


def make_feature_buy():
    W, H = 220, 560
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # angled wood sign
    base = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(base)
    # parallelogram
    pts = [(30, 20), (W - 10, 50), (W - 30, H - 30), (10, H - 60)]
    d.polygon(pts, fill=(92, 48, 16, 255))
    d.line(pts + [pts[0]], fill=(220, 170, 55), width=6)
    # rivets along edge
    for t in (0.15, 0.35, 0.55, 0.75, 0.9):
        x = int(30 + (W - 40) * t)
        y = int(25 + 30 * t)
        brass_ring(d, x, y, 6)
        brass_ring(d, int(10 + (W - 40) * (1 - t)), int(H - 55 - 20 * t), 6)
    # cowboy silhouette badge
    d.ellipse([W // 2 - 36, 70, W // 2 + 36, 142], fill=(40, 20, 8), outline=(210, 160, 55), width=3)
    d.ellipse([W // 2 - 18, 85, W // 2 + 18, 115], fill=(200, 150, 80))  # hat brim-ish
    d.rectangle([W // 2 - 10, 100, W // 2 + 10, 130], fill=(60, 35, 20))
    f = font(26)
    # vertical-ish FEATURE BUY text drawn as stacked lines
    lines = ["FEATURE", "BUY"]
    y = 180
    for line in lines:
        for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2)]:
            d.text((W // 2 + ox, y + oy), line, font=f, fill=(60, 30, 8), anchor="mm")
        d.text((W // 2, y), line, font=f, fill=(255, 220, 120), anchor="mm")
        y += 40
    # glow tip
    d.ellipse([W // 2 - 20, H - 100, W // 2 + 20, H - 60], fill=(255, 160, 40, 80))
    # rotate
    im = base.rotate(-14, expand=True, resample=Image.BICUBIC)
    # crop transparent
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    save(im, "controls/feature-buy.png")


def make_status_board():
    W, H = 700, 90
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, W - 1, H - 1], radius=16, fill=(55, 30, 12, 240))
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=14, outline=(210, 160, 55), width=3)
    d.rounded_rectangle([10, 10, W - 11, H - 11], radius=10, outline=(255, 210, 120, 100), width=1)
    brass_ring(d, 28, H // 2, 8)
    brass_ring(d, W - 28, H // 2, 8)
    save(im, "frames/status-board.png")


def make_foreground():
    """Dense saloon table + props filling bottom third."""
    W, H = 780, 420
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # table top plane
    d.polygon([(0, 160), (W, 140), (W, H), (0, H)], fill=(62, 34, 14, 255))
    wood_fill(d, (0, 150, W, H), base=(78, 44, 18))
    # table edge highlight
    d.line([(0, 168), (W, 148)], fill=(180, 130, 60, 160), width=4)
    # control deck plate
    d.rounded_rectangle([40, 40, W - 40, 170], radius=28, fill=(48, 26, 10, 230))
    d.rounded_rectangle([40, 40, W - 40, 170], radius=28, outline=(200, 150, 55), width=4)
    # props: hat
    d.ellipse([60, 220, 220, 300], fill=(120, 40, 140, 255))
    d.ellipse([90, 200, 190, 250], fill=(90, 30, 110, 255))
    d.ellipse([100, 210, 180, 245], fill=(160, 70, 180, 255))
    # bullets
    for i, x in enumerate(range(250, 520, 38)):
        d.ellipse([x, 250, x + 22, 280], fill=(210, 170, 60))
        d.rectangle([x + 4, 260, x + 18, 310], fill=(180, 140, 45))
        d.ellipse([x + 2, 305, x + 20, 325], fill=(120, 90, 30))
    # revolver
    d.rounded_rectangle([560, 240, 700, 270], radius=8, fill=(170, 175, 185))
    d.ellipse([540, 235, 580, 275], fill=(140, 145, 155))
    d.polygon([(700, 245), (740, 230), (740, 280), (700, 265)], fill=(100, 60, 30))
    # papers / wanted
    d.rectangle([420, 300, 520, 390], fill=(210, 190, 150))
    d.rectangle([430, 310, 510, 380], outline=(90, 50, 20), width=2)
    d.text((470, 345), "WANTED", font=font(14), fill=(120, 30, 20), anchor="mm")
    # gold bars
    for i, x in enumerate((100, 145, 190)):
        d.rounded_rectangle([x, 320 + i * 4, x + 50, 360 + i * 4], radius=4, fill=(230, 185, 60))
        d.line([(x + 5, 335 + i * 4), (x + 45, 335 + i * 4)], fill=(255, 230, 140), width=2)
    # dust motes
    for _ in range(40):
        x, y = RNG.randint(0, W), RNG.randint(0, 200)
        r = RNG.randint(1, 3)
        d.ellipse([x, y, x + r, y + r], fill=(255, 220, 140, RNG.randint(40, 120)))
    save(im, "backgrounds/foreground.png")


def make_control_deck():
    W, H = 760, 200
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 20, W - 1, H - 1], radius=32, fill=(55, 30, 12, 245))
    wood_fill(d, (0, 20, W, H), base=(70, 40, 16))
    d.rounded_rectangle([6, 26, W - 7, H - 7], radius=28, outline=(210, 160, 55), width=4)
    d.rounded_rectangle([14, 34, W - 15, H - 15], radius=22, outline=(255, 210, 120, 90), width=2)
    for x in (40, W // 2, W - 40):
        brass_ring(d, x, 40, 7)
    save(im, "frames/control-deck.png")


def make_button(name: str, glyph: str, size=160, glow=False):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    m = size // 2
    r = size // 2 - 4
    # bronze disc
    d.ellipse([m - r, m - r, m + r, m + r], fill=(120, 75, 28))
    d.ellipse([m - r + 6, m - r + 6, m + r - 6, m + r - 6], fill=(70, 42, 16))
    d.ellipse([m - r, m - r, m + r, m + r], outline=(230, 180, 70), width=4)
    if glow:
        d.ellipse([m - r + 12, m - r + 12, m + r - 12, m + r - 12], outline=(180, 255, 80), width=3)
    d.text((m, m), glyph, font=font(size // 3), fill=(255, 230, 150), anchor="mm")
    save(im, f"controls/{name}.png")


def make_spin():
    size = 220
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    m = size // 2
    r = size // 2 - 2
    d.ellipse([m - r, m - r, m + r, m + r], fill=(160, 95, 30))
    d.ellipse([m - r + 8, m - r + 8, m + r - 8, m + r - 8], fill=(90, 48, 14))
    d.ellipse([m - r, m - r, m + r, m + r], outline=(255, 210, 90), width=6)
    d.ellipse([m - r + 14, m - r + 14, m + r - 14, m + r - 14], outline=(160, 255, 70), width=4)
    # circular arrow
    d.arc([m - 48, m - 48, m + 48, m + 48], 40, 300, fill=(255, 230, 140), width=10)
    d.polygon([(m + 40, m - 42), (m + 58, m - 18), (m + 28, m - 22)], fill=(255, 230, 140))
    save(im, "controls/spin.png")


def enhance_existing_symbols():
    """Boost color / contrast / crop empty padding on symbol & character PNGs."""
    folders = [ROOT / "symbols", ROOT / "characters"]
    for folder in folders:
        for path in folder.glob("*.png"):
            im = Image.open(path).convert("RGBA")
            # crop to content with small pad
            bbox = im.getbbox()
            if bbox:
                pad = 4
                x0 = max(0, bbox[0] - pad)
                y0 = max(0, bbox[1] - pad)
                x1 = min(im.width, bbox[2] + pad)
                y1 = min(im.height, bbox[3] + pad)
                im = im.crop((x0, y0, x1, y1))
            # scale up to fill square canvas tightly
            side = 256
            im.thumbnail((side - 8, side - 8), Image.LANCZOS)
            canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
            ox = (side - im.width) // 2
            oy = (side - im.height) // 2
            canvas.paste(im, (ox, oy), im)
            # enhance
            canvas = ImageEnhance.Color(canvas).enhance(1.35)
            canvas = ImageEnhance.Contrast(canvas).enhance(1.2)
            canvas = ImageEnhance.Brightness(canvas).enhance(1.08)
            # warm rim glow on opaque pixels
            alpha = canvas.split()[-1]
            glow = canvas.filter(ImageFilter.GaussianBlur(3))
            glow = ImageEnhance.Brightness(glow).enhance(1.4)
            out = Image.alpha_composite(
                Image.new("RGBA", (side, side), (0, 0, 0, 0)),
                glow,
            )
            out = Image.alpha_composite(out, canvas)
            out.save(path, "PNG", optimize=True)
            print("enhanced", path.name)


def make_letter(letter: str, color, fname: str):
    side = 256
    im = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # metallic medallion
    d.ellipse([18, 18, side - 18, side - 18], fill=(30, 18, 10, 240))
    d.ellipse([18, 18, side - 18, side - 18], outline=color, width=8)
    d.ellipse([32, 32, side - 32, side - 32], outline=(255, 220, 140), width=3)
    f = font(120)
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
        d.text((side // 2 + ox, side // 2 + oy), letter, font=f, fill=(20, 10, 5), anchor="mm")
    d.text((side // 2, side // 2), letter, font=f, fill=color, anchor="mm")
    save(im, f"symbols/{fname}")


def make_object_symbol(name: str, painter):
    side = 256
    im = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    painter(d, side)
    im = ImageEnhance.Color(im).enhance(1.25)
    save(im, f"symbols/{name}.png")


def paint_hat(d, s):
    d.ellipse([30, 120, s - 30, 190], fill=(150, 40, 180))
    d.ellipse([70, 70, s - 70, 150], fill=(110, 25, 140))
    d.ellipse([85, 85, s - 85, 140], fill=(190, 80, 220))
    d.arc([40, 100, s - 40, 170], 200, 340, fill=(255, 200, 80), width=4)


def paint_whiskey(d, s):
    d.rounded_rectangle([90, 40, s - 90, 70], radius=6, fill=(200, 200, 210))
    d.polygon([(80, 70), (s - 80, 70), (s - 70, 210), (70, 210)], fill=(180, 30, 40))
    d.ellipse([70, 195, s - 70, 230], fill=(140, 20, 30))
    d.rectangle([95, 100, s - 95, 130], fill=(255, 220, 120))


def paint_revolver(d, s):
    d.ellipse([40, 90, 120, 170], fill=(190, 195, 205))
    d.rounded_rectangle([100, 110, 210, 145], radius=8, fill=(170, 175, 185))
    d.polygon([(200, 115), (230, 95), (230, 160), (200, 140)], fill=(120, 70, 35))
    d.ellipse([55, 105, 105, 155], fill=(80, 85, 95))


def paint_badge(d, s):
    pts = []
    for i in range(8):
        ang = i * math.pi / 4 - math.pi / 2
        r = 95 if i % 2 == 0 else 55
        pts.append((s // 2 + r * math.cos(ang), s // 2 + r * math.sin(ang)))
    d.polygon(pts, fill=(230, 185, 60))
    d.ellipse([s // 2 - 35, s // 2 - 35, s // 2 + 35, s // 2 + 35], fill=(90, 50, 15))
    d.text((s // 2, s // 2), "★", font=font(40), fill=(255, 220, 120), anchor="mm")


def paint_belt(d, s):
    d.rounded_rectangle([30, 90, s - 30, 160], radius=16, fill=(90, 50, 25))
    for x in range(50, s - 50, 28):
        d.ellipse([x, 100, x + 20, 150], fill=(210, 170, 55))
        d.rectangle([x + 5, 115, x + 15, 145], fill=(170, 130, 40))
    d.rectangle([s // 2 - 25, 85, s // 2 + 25, 165], fill=(200, 160, 50))


def paint_pouch(d, s):
    d.ellipse([50, 80, s - 50, 210], fill=(200, 150, 40))
    d.ellipse([70, 60, s - 70, 110], fill=(160, 110, 30))
    for _ in range(12):
        x, y = RNG.randint(70, s - 70), RNG.randint(100, 180)
        d.ellipse([x, y, x + 14, y + 14], fill=(255, 210, 80))


def paint_wild(d, s):
    d.rounded_rectangle([20, 20, s - 20, s - 20], radius=24, fill=(40, 20, 8))
    d.rounded_rectangle([20, 20, s - 20, s - 20], outline=(230, 180, 60), width=8)
    d.ellipse([70, 50, s - 70, 140], fill=(60, 35, 20))  # hat
    d.ellipse([90, 100, s - 90, 180], fill=(210, 170, 130))  # face
    d.rectangle([100, 150, s - 100, 220], fill=(140, 30, 30))  # coat
    d.text((s // 2, s - 36), "WILD", font=font(28), fill=(255, 220, 100), anchor="mm")


def paint_scatter(d, s):
    for i, (dx, dy) in enumerate([(-30, 20), (0, 0), (30, 25)]):
        x, y = s // 2 + dx - 40, s // 2 + dy - 25
        d.rounded_rectangle([x, y, x + 80, y + 50], radius=6, fill=(230, 185, 55))
        d.line([(x + 8, y + 18), (x + 72, y + 18)], fill=(255, 230, 140), width=3)
    d.text((s // 2, 40), "SCATTER", font=font(22), fill=(255, 230, 140), anchor="mm")


def paint_bonus(d, s):
    d.rectangle([40, 30, s - 40, s - 30], fill=(210, 185, 140))
    d.rectangle([50, 40, s - 50, s - 40], outline=(90, 40, 20), width=4)
    d.text((s // 2, 80), "WANTED", font=font(28), fill=(140, 25, 20), anchor="mm")
    d.ellipse([s // 2 - 40, 110, s // 2 + 40, 190], fill=(60, 35, 20))
    d.text((s // 2, s - 55), "BONUS", font=font(24), fill=(180, 40, 30), anchor="mm")


def paint_boots(d, s):
    d.polygon([(70, 60), (120, 60), (140, 200), (50, 200)], fill=(120, 60, 30))
    d.polygon([(140, 70), (190, 70), (210, 210), (120, 210)], fill=(100, 50, 25))
    d.rectangle([50, 180, 140, 210], fill=(40, 25, 15))
    d.rectangle([120, 190, 210, 220], fill=(40, 25, 15))


def main():
    print("Regenerating Bounty Trail assets…")
    make_logo()
    make_multiplier_board()
    make_reel_frame()
    make_feature_buy()
    make_status_board()
    make_foreground()
    make_control_deck()
    make_spin()
    make_button("minus", "−")
    make_button("plus", "+")
    make_button("auto", "▶")
    make_button("turbo", "⚡", glow=True)
    make_button("menu", "☰")
    make_button("sound", "♪")

    make_letter("A", (80, 200, 255), "letter-a.png")
    make_letter("K", (255, 90, 70), "letter-k.png")
    make_letter("Q", (120, 220, 100), "letter-q.png")
    make_letter("J", (255, 170, 50), "letter-j.png")
    make_letter("10", (200, 140, 255), "letter-10.png")

    make_object_symbol("hat", paint_hat)
    make_object_symbol("whiskey", paint_whiskey)
    make_object_symbol("revolver", paint_revolver)
    make_object_symbol("badge", paint_badge)
    make_object_symbol("belt", paint_belt)
    make_object_symbol("pouch", paint_pouch)
    make_object_symbol("boots", paint_boots)
    make_object_symbol("wild", paint_wild)
    make_object_symbol("scatter", paint_scatter)
    make_object_symbol("bonus", paint_bonus)

    enhance_existing_symbols()
    # gold frame
    gf = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gf)
    gd.rounded_rectangle([6, 6, 249, 249], radius=18, outline=(255, 210, 80), width=8)
    gd.rounded_rectangle([14, 14, 241, 241], radius=14, outline=(180, 120, 30), width=3)
    save(gf, "frames/gold-frame.png")
    print("done")


if __name__ == "__main__":
    main()
