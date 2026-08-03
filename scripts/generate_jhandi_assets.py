#!/usr/bin/env python3
"""Generate premium Jhandi Munda casino assets.

Run: python3 scripts/generate_jhandi_assets.py
Output: public/games/jhandi-munda/v2/
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "games" / "jhandi-munda" / "v2"
SS = 4
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"

SYMBOLS = ["club", "crown", "spade", "diamond", "flag", "heart"]
SYMBOL_LABELS = {
    "club": "CLUB",
    "crown": "CROWN",
    "spade": "SPADE",
    "diamond": "DIAMOND",
    "flag": "FLAG",
    "heart": "HEART",
}
SYMBOL_COLORS = {
    "club": ((16, 110, 72), (8, 68, 44), (212, 178, 72)),
    "crown": ((212, 168, 48), (148, 108, 24), (255, 228, 148)),
    "spade": ((24, 32, 56), (12, 18, 36), (212, 178, 72)),
    "diamond": ((168, 28, 52), (108, 16, 36), (255, 196, 120)),
    "flag": ((128, 28, 48), (88, 16, 32), (212, 178, 72)),
    "heart": ((148, 24, 48), (96, 12, 32), (255, 196, 160)),
}

CHIP_ORDER = [10, 20, 50, 100, 200, 500, 1000]
CHIP_SPECS = {
    10: ("10", (188, 194, 205), (248, 250, 252), (46, 58, 78), (238, 242, 247), (28, 38, 56)),
    20: ("20", (32, 128, 72), (96, 196, 128), (250, 250, 252), (24, 108, 64), (232, 255, 240)),
    50: ("50", (30, 88, 168), (88, 148, 228), (250, 250, 252), (20, 72, 148), (238, 246, 255)),
    100: ("100", (18, 62, 140), (66, 138, 236), (250, 250, 252), (30, 88, 190), (238, 246, 255)),
    200: ("200", (150, 62, 8), (255, 148, 56), (250, 244, 238), (220, 104, 24), (255, 240, 226)),
    500: ("500", (150, 104, 12), (255, 216, 96), (72, 44, 6), (232, 178, 44), (60, 36, 4)),
    1000: ("1K", (14, 16, 22), (68, 74, 88), (226, 182, 72), (30, 34, 44), (255, 224, 138)),
}


def font(size: int, path: str = FONT_BOLD) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def save(img: Image.Image, rel: str) -> None:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, optimize=True)
    print(f"  {rel}  {img.size[0]}x{img.size[1]}")


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_w: int, start: int, path: str = FONT_BOLD):
    size = start
    while size > 6:
        f = font(size, path)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(6, path)


def centered(draw, xy, text, f, fill, stroke=0, stroke_fill=None):
    x, y = xy
    box = draw.textbbox((0, 0), text, font=f, stroke_width=stroke)
    draw.text(
        (x - (box[0] + box[2]) / 2, y - (box[1] + box[3]) / 2),
        text, font=f, fill=fill, stroke_width=stroke, stroke_fill=stroke_fill,
    )


def disc_mask(size: int, radius: float, cx=None, cy=None, feather: float = 1.4) -> np.ndarray:
    c = (size - 1) / 2.0
    cx = c if cx is None else cx
    cy = c if cy is None else cy
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    return np.clip((radius - d) / feather + 0.5, 0.0, 1.0)


def ring_mask(size: int, r_out: float, r_in: float, feather: float = 1.4) -> np.ndarray:
    return np.clip(disc_mask(size, r_out, feather=feather) - disc_mask(size, r_in, feather=feather), 0, 1)


def radial_disc(size: int, inner: tuple, outer: tuple, cx: float = 0.36, cy: float = 0.30) -> np.ndarray:
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    n = size - 1.0
    dx, dy = xx / n - cx, yy / n - cy
    d = np.sqrt(dx * dx + dy * dy) / 0.95
    t = np.clip(d, 0.0, 1.0)[..., None]
    return np.array(inner, np.float32) * (1 - t) + np.array(outer, np.float32) * t


def draw_symbol(draw: ImageDraw.ImageDraw, sym: str, cx: float, cy: float, r: float, gold=False):
    dark, mid, gold_c = SYMBOL_COLORS[sym]
    fill = gold_c if gold else mid
    edge = gold_c
    if sym == "club":
        for ox in (-r * 0.38, 0, r * 0.38):
            draw.ellipse([cx + ox - r * 0.28, cy - r * 0.52, cx + ox + r * 0.28, cy - r * 0.04], fill=fill)
        draw.rectangle([cx - r * 0.12, cy - r * 0.2, cx + r * 0.12, cy + r * 0.55], fill=fill)
    elif sym == "crown":
        pts = [(cx - r * 0.7, cy + r * 0.3), (cx - r * 0.5, cy - r * 0.4), (cx - r * 0.25, cy + r * 0.05),
               (cx, cy - r * 0.55), (cx + r * 0.25, cy + r * 0.05), (cx + r * 0.5, cy - r * 0.4),
               (cx + r * 0.7, cy + r * 0.3)]
        draw.polygon(pts, fill=fill)
        draw.rectangle([cx - r * 0.65, cy + r * 0.25, cx + r * 0.65, cy + r * 0.45], fill=fill)
    elif sym == "spade":
        draw.polygon([(cx, cy - r * 0.55), (cx - r * 0.55, cy + r * 0.05), (cx, cy + r * 0.15)], fill=fill)
        draw.polygon([(cx, cy - r * 0.55), (cx + r * 0.55, cy + r * 0.05), (cx, cy + r * 0.15)], fill=fill)
        draw.rectangle([cx - r * 0.15, cy + r * 0.1, cx + r * 0.15, cy + r * 0.5], fill=fill)
    elif sym == "diamond":
        draw.polygon([(cx, cy - r * 0.6), (cx + r * 0.5, cy), (cx, cy + r * 0.6), (cx - r * 0.5, cy)], fill=fill)
    elif sym == "flag":
        draw.rectangle([cx - r * 0.55, cy - r * 0.55, cx - r * 0.4, cy + r * 0.55], fill=edge)
        draw.polygon([(cx - r * 0.4, cy - r * 0.5), (cx + r * 0.55, cy - r * 0.15), (cx - r * 0.4, cy + r * 0.2)], fill=fill)
    elif sym == "heart":
        draw.ellipse([cx - r * 0.5, cy - r * 0.45, cx, cy + r * 0.05], fill=fill)
        draw.ellipse([cx, cy - r * 0.45, cx + r * 0.5, cy + r * 0.05], fill=fill)
        draw.polygon([(cx - r * 0.5, cy), (cx, cy + r * 0.55), (cx + r * 0.5, cy)], fill=fill)


def make_symbol_icon(sym: str, px: int, gold=False) -> Image.Image:
    S = px * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    draw_symbol(d, sym, S / 2, S / 2, S * 0.38, gold=gold)
    return img.resize((px, px), Image.LANCZOS)


def make_chip(value: int, px: int) -> Image.Image:
    label, dark, light, spot, inlay, textc = CHIP_SPECS[value]
    S = px * SS
    r = S / 2.0 - 2 * SS
    c = (S - 1) / 2.0
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    nx, ny = (xx - c) / r, (yy - c) / r
    dist = np.clip(np.sqrt(nx * nx + ny * ny), 0, 1.4)
    alpha = disc_mask(S, r)
    body = np.zeros((S, S, 3), np.float32)
    body[:] = np.array(dark, np.float32)
    lift = np.clip(1.0 - dist * 0.72, 0, 1)[..., None]
    body = body * (1 - lift * 0.55) + np.array(light, np.float32) * lift * 0.55
    tilt = np.clip(0.5 - (nx * 0.52 + ny * 0.60) * 0.5, 0, 1)
    body *= (0.80 + 0.42 * tilt)[..., None]
    inl = disc_mask(S, r * 0.660)
    inlay_rgb = np.zeros((S, S, 3), np.float32)
    inlay_rgb[:] = np.array(inlay, np.float32)
    inlay_rgb *= (0.86 + 0.30 * tilt)[..., None]
    body = body * (1 - inl[..., None]) + inlay_rgb * inl[..., None]
    lip = ring_mask(S, r, r * 0.945)
    body = np.clip(body + lip[..., None] * (60 + 90 * tilt)[..., None], 0, 255)
    chip = Image.fromarray(np.dstack([body.astype(np.uint8), (alpha * 255).astype(np.uint8)]), "RGBA")
    d = ImageDraw.Draw(chip)
    f = fit_text(d, label, int(r * 1.02), int(r * 0.86))
    centered(d, (S / 2, S / 2), label, f, textc + (255,), stroke=max(1, int(S * 0.008)), stroke_fill=(0, 0, 0, 70))
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    pad = S / 2.0 - r
    ImageDraw.Draw(sh).ellipse([pad + S * 0.02, pad + S * 0.05, S - pad + S * 0.02, S - pad + S * 0.05], fill=(0, 0, 0, 130))
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.02)))
    out.alpha_composite(chip)
    return out.resize((px, px), Image.LANCZOS)


def build_chips():
    print("chips")
    for v in CHIP_ORDER:
        save(make_chip(v, 192), f"chips/chip-{v}.png")
        save(make_chip(v, 96), f"chips/chip-{v}-sm.png")


def build_symbols():
    print("symbols")
    for sym in SYMBOLS:
        save(make_symbol_icon(sym, 256), f"symbols/{sym}-panel.png")
        save(make_symbol_icon(sym, 128), f"symbols/{sym}-sm.png")
        save(make_symbol_icon(sym, 256, gold=True), f"symbols/{sym}-gold.png")
        save(make_symbol_icon(sym, 64), f"symbols/{sym}-hist.png")


def make_die_face(sym: str, px: int) -> Image.Image:
    S = px * SS
    r = S * 0.42
    body = radial_disc(S, (248, 238, 218), (212, 188, 148))
    alpha = disc_mask(S, r)
    rim = ring_mask(S, r, r * 0.88)
    body = body * (1 - rim[..., None]) + np.array((212, 168, 72), np.float32) * rim[..., None]
    img = Image.fromarray(np.dstack([body.astype(np.uint8), (alpha * 255).astype(np.uint8)]), "RGBA")
    sym_img = make_symbol_icon(sym, int(S * 0.55))
    img.alpha_composite(sym_img, ((S - sym_img.width) // 2, (S - sym_img.height) // 2))
    return img.resize((px, px), Image.LANCZOS)


def build_dice():
    print("dice")
    for sym in SYMBOLS:
        save(make_die_face(sym, 128), f"dice/face-{sym}.png")
        save(make_die_face(sym, 96), f"dice/face-{sym}-sm.png")
    # Cup
    S = 512
    cup = Image.new("RGBA", (S, int(S * 1.1)), (0, 0, 0, 0))
    d = ImageDraw.Draw(cup)
    d.polygon([(S * 0.15, S * 0.05), (S * 0.85, S * 0.05), (S * 0.78, S * 0.95), (S * 0.22, S * 0.95)], fill=(18, 14, 20, 255))
    d.polygon([(S * 0.18, S * 0.08), (S * 0.82, S * 0.08), (S * 0.75, S * 0.12), (S * 0.25, S * 0.12)], fill=(32, 28, 36, 255))
    d.rectangle([S * 0.2, S * 0.88, S * 0.8, S * 0.96], fill=(212, 168, 72, 255))
    save(cup, "dice/cup.png")


def make_panel(sym: str, glow: bool) -> Image.Image:
    W, H = 640, 480
    felt_top, felt_bot = (12, 68, 48), (6, 38, 28)
    ramp = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    body = np.array(felt_top, np.float32) * (1 - ramp) + np.array(felt_bot, np.float32) * ramp
    body = np.repeat(body, W, axis=1)
    plate = Image.fromarray(body.astype(np.uint8), "RGB").convert("RGBA")
    d = ImageDraw.Draw(plate)
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=18, outline=(212, 168, 72), width=6)
    d.rounded_rectangle([12, 12, W - 13, 52], radius=8, fill=(18, 48, 36))
    if glow:
        glow_layer = plate.filter(ImageFilter.GaussianBlur(8))
        out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        out.alpha_composite(glow_layer)
        out.alpha_composite(plate)
        plate = out
    sym_img = make_symbol_icon(sym, 200, gold=glow)
    plate.alpha_composite(sym_img, ((W - sym_img.width) // 2, (H - sym_img.height) // 2 + 20))
    return plate


def build_zones():
    print("zones")
    geom = {}
    cols, rows = 3, 2
    order = ["club", "crown", "spade", "diamond", "flag", "heart"]
    for i, sym in enumerate(order):
        col, row = i % cols, i // cols
        geom[sym] = {
            "left": round(col * 33.33 + 0.5, 2),
            "top": round(row * 50 + 2, 2),
            "width": 32.5,
            "height": 47,
            "headPct": 11.5,
        }
        save(make_panel(sym, False), f"zones/{sym}.png")
        save(make_panel(sym, True), f"zones/{sym}-win.png")
    return geom


def build_table():
    print("table")
    W, H = 1474, 779
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([20, 20, W - 20, H - 20], radius=28, fill=(48, 28, 16))
    d.rounded_rectangle([36, 36, W - 36, H - 36], radius=22, outline=(212, 168, 72), width=8)
    d.rounded_rectangle([52, 52, W - 52, H - 52], radius=18, fill=(10, 52, 38))
    # Title plate
    d.rounded_rectangle([W // 2 - 180, 58, W // 2 + 180, 108], radius=12, fill=(48, 28, 16))
    d.rounded_rectangle([W // 2 - 176, 62, W // 2 + 176, 104], radius=10, outline=(212, 168, 72), width=4)
    txt = Image.new("RGBA", (360, 48), (0, 0, 0, 0))
    td = ImageDraw.Draw(txt)
    f = fit_text(td, "JHANDI MUNDA", 340, 36, FONT_SERIF)
    centered(td, (180, 24), "JHANDI MUNDA", f, (255, 228, 148, 255), stroke=2, stroke_fill=(60, 36, 8, 200))
    img.alpha_composite(txt, (W // 2 - 180, 62))
    save(img, "ui/table.png")


def build_room_bg():
    print("room bg")
    W, H = 1792, 828
    a = np.zeros((H, W, 3), np.float32)
    for y in range(H):
        t = y / H
        a[y, :] = np.array([8 + t * 12, 6 + t * 8, 14 + t * 18])
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    spot = np.exp(-(((xx - W / 2) / (W * 0.35)) ** 2 + ((yy - H * 0.38) / (H * 0.4)) ** 2)) * 48
    a = np.clip(a + spot[..., None] * np.array([1.0, 0.86, 0.65]), 0, 255)
    vig = 1 - np.clip(((xx - W / 2) / (W * 0.65)) ** 2 + ((yy - H * 0.5) / (H * 0.75)) ** 2, 0, 1) * 0.6
    a *= vig[..., None]
    save(Image.fromarray(a.astype(np.uint8), "RGB").convert("RGBA"), "ui/room-bg.png")


def build_dealer():
    print("dealer")
    W, H = 400, 520
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Silhouette-style dealer with red uniform
    d.ellipse([W * 0.28, H * 0.02, W * 0.72, H * 0.22], fill=(220, 180, 140, 255))
    d.polygon([(W * 0.22, H * 0.18), (W * 0.78, H * 0.18), (W * 0.82, H * 0.72), (W * 0.18, H * 0.72)], fill=(148, 24, 36, 255))
    d.rectangle([W * 0.3, H * 0.2, W * 0.7, H * 0.28], fill=(212, 168, 72, 255))
    d.ellipse([W * 0.12, H * 0.35, W * 0.32, H * 0.55], fill=(220, 180, 140, 255))
    d.ellipse([W * 0.68, H * 0.35, W * 0.88, H * 0.55], fill=(220, 180, 140, 255))
    save(img, "dealer/idle.png")


def build_banners():
    print("banners")
    for text, name, bg in [
        ("PLACE YOUR BETS", "place-bets", (12, 68, 48)),
        ("BETTING CLOSED", "stop-betting", (128, 28, 48)),
    ]:
        W, H = 720, 120
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([4, 4, W - 4, H - 4], radius=16, fill=bg + (240,))
        d.rounded_rectangle([8, 8, W - 8, H - 8], radius=12, outline=(212, 168, 72), width=4)
        f = fit_text(d, text, W - 40, 48, FONT_SERIF)
        centered(d, (W / 2, H / 2), text, f, (255, 236, 200, 255), stroke=2, stroke_fill=(40, 24, 8, 180))
        save(img, f"banners/{name}.png")


def build_history_markers():
    print("history")
    for n in range(7):
        px = 64
        S = px * SS
        r = S / 2 - 2 * SS
        if n == 0:
            base, edge = (80, 84, 92), (140, 144, 152)
        elif n >= 4:
            base, edge = (168, 48, 24), (255, 180, 100)
        else:
            base, edge = (148, 32, 48), (255, 140, 120)
        body = radial_disc(S, tuple(min(255, c + 60) for c in base), base)
        alpha = disc_mask(S, r)
        img = Image.fromarray(np.dstack([body.astype(np.uint8), (alpha * 255).astype(np.uint8)]), "RGBA")
        d = ImageDraw.Draw(img)
        label = "×" if n == 0 else str(n)
        f = fit_text(d, label, int(r * 1.2), int(r * 1.0))
        centered(d, (S / 2, S / 2), label, f, (255, 255, 255, 255), stroke=int(S * 0.012), stroke_fill=(0, 0, 0, 120))
        save(img.resize((px, px), Image.LANCZOS), f"history/count-{n}.png")


def build_logo():
    print("logo")
    W, H = 720, 200
    txt = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(txt)
    f = fit_text(d, "JHANDI MUNDA", int(W * 0.9), 100, FONT_SERIF)
    centered(d, (W / 2, H / 2), "JHANDI MUNDA", f, 255)
    grad = np.zeros((H, W, 3), np.uint8)
    for y in range(H):
        t = y / max(1, H - 1)
        grad[y, :] = np.array([int(120 + t * 80), int(78 + t * 50), int(16 + t * 12)])
    face = Image.fromarray(np.dstack([grad, np.array(txt)]), "RGBA")
    save(face.crop(face.getbbox()), "ui/logo.png")


def build_avatars():
    print("avatars")
    names = ["Aria", "Vikram", "Meera", "Raj", "Sana", "Lucky"]
    colors = [(148, 72, 96), (72, 108, 148), (96, 148, 88), (148, 108, 72), (108, 72, 148), (168, 88, 48)]
    for i, (name, col) in enumerate(zip(names, colors)):
        S = 128
        img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.ellipse([4, 4, S - 4, S - 4], fill=col + (255,))
        d.ellipse([8, 8, S - 8, S - 8], outline=(212, 168, 72), width=4)
        d.ellipse([S * 0.32, S * 0.28, S * 0.68, S * 0.62], fill=(220, 190, 160, 255))
        save(img, f"avatars/player-{i}.png")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    build_chips()
    build_symbols()
    build_dice()
    geom = build_zones()
    build_table()
    build_room_bg()
    build_dealer()
    build_banners()
    build_history_markers()
    build_logo()
    build_avatars()
    (OUT / "zones" / "geometry.json").write_text(json.dumps(geom, indent=2))
    print("\nDone — assets at", OUT)


if __name__ == "__main__":
    main()
