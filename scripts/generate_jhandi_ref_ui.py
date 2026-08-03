#!/usr/bin/env python3
"""Generate reference-aligned Jhandi Munda UI assets (teal panels, timer, cup)."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "games" / "jhandi-munda" / "v2"

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


def font(size: int, path: str = FONT_BOLD):
    return ImageFont.truetype(path, size)


def save(img: Image.Image, rel: str, q: int = 82) -> None:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p.with_suffix(".webp"), "WEBP", quality=q, method=6)
    print(f"  {rel}.webp {img.size[0]}x{img.size[1]}")


def draw_symbol(d: ImageDraw.ImageDraw, sym: str, cx: float, cy: float, r: float, alpha: int = 90):
    colors = {
        "club": (120, 200, 160, alpha),
        "crown": (220, 190, 100, alpha),
        "spade": (100, 120, 140, alpha),
        "diamond": (200, 100, 110, alpha),
        "flag": (180, 90, 100, alpha),
        "heart": (200, 90, 100, alpha),
    }
    fill = colors.get(sym, (180, 180, 180, alpha))
    if sym == "club":
        for ox in (-r * 0.35, 0, r * 0.35):
            d.ellipse([cx + ox - r * 0.25, cy - r * 0.45, cx + ox + r * 0.25, cy - r * 0.05], fill=fill)
        d.rectangle([cx - r * 0.1, cy - r * 0.15, cx + r * 0.1, cy + r * 0.45], fill=fill)
    elif sym == "crown":
        pts = [(cx - r * 0.65, cy + r * 0.25), (cx - r * 0.45, cy - r * 0.35), (cx, cy - r * 0.5),
               (cx + r * 0.45, cy - r * 0.35), (cx + r * 0.65, cy + r * 0.25)]
        d.polygon(pts, fill=fill)
        d.rectangle([cx - r * 0.6, cy + r * 0.2, cx + r * 0.6, cy + r * 0.35], fill=fill)
    elif sym == "spade":
        d.polygon([(cx, cy - r * 0.5), (cx - r * 0.5, cy + r * 0.05), (cx, cy + r * 0.12)], fill=fill)
        d.polygon([(cx, cy - r * 0.5), (cx + r * 0.5, cy + r * 0.05), (cx, cy + r * 0.12)], fill=fill)
        d.rectangle([cx - r * 0.12, cy + r * 0.08, cx + r * 0.12, cy + r * 0.45], fill=fill)
    elif sym == "diamond":
        d.polygon([(cx, cy - r * 0.55), (cx + r * 0.48, cy), (cx, cy + r * 0.55), (cx - r * 0.48, cy)], fill=fill)
    elif sym == "flag":
        d.rectangle([cx - r * 0.5, cy - r * 0.5, cx - r * 0.38, cy + r * 0.5], fill=fill)
        d.polygon([(cx - r * 0.38, cy - r * 0.45), (cx + r * 0.5, cy - r * 0.12), (cx - r * 0.38, cy + r * 0.15)], fill=fill)
    elif sym == "heart":
        d.ellipse([cx - r * 0.48, cy - r * 0.4, cx, cy + r * 0.05], fill=fill)
        d.ellipse([cx, cy - r * 0.4, cx + r * 0.48, cy + r * 0.05], fill=fill)
        d.polygon([(cx - r * 0.48, cy), (cx, cy + r * 0.5), (cx + r * 0.48, cy)], fill=fill)


def make_panel(sym: str) -> Image.Image:
    W, H = 118, 132
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # panel body
    for y in range(H):
        t = y / H
        c = int(28 + t * 18)
        g = int(118 - t * 25)
        b = int(98 - t * 18)
        d.line([(2, y), (W - 3, y)], fill=(c, g, b, 235))
    d.rounded_rectangle([1, 1, W - 2, H - 2], radius=10, outline=(212, 178, 72, 200), width=2)
    # header strip
    d.rounded_rectangle([4, 4, W - 5, 22], radius=6, fill=(0, 0, 0, 70))
    draw_symbol(d, sym, W / 2, H * 0.52, min(W, H) * 0.32, alpha=75)
    # history slots at bottom
    for i in range(5):
        x = 10 + i * 20
        d.ellipse([x, H - 22, x + 16, H - 6], fill=(60, 60, 60, 180), outline=(120, 120, 120, 120))
    return img


def make_timer() -> Image.Image:
    S = 128
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([8, 8, S - 8, S - 8], fill=(212, 168, 48, 255), outline=(140, 100, 20, 255), width=3)
    d.ellipse([18, 18, S - 18, S - 18], fill=(248, 240, 220, 255))
    # bells
    d.ellipse([28, 4, 44, 16], fill=(212, 168, 48, 255))
    d.ellipse([S - 44, 4, S - 28, 16], fill=(212, 168, 48, 255))
    d.rectangle([S // 2 - 4, 2, S // 2 + 4, 14], fill=(140, 100, 20, 255))
    return img


def make_cup() -> Image.Image:
    W, H = 96, 110
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(W * 0.2, H * 0.08), (W * 0.8, H * 0.08), (W * 0.72, H * 0.88), (W * 0.28, H * 0.88)], fill=(22, 18, 24, 255))
    d.rectangle([W * 0.25, H * 0.82, W * 0.75, H * 0.92], fill=(212, 168, 48, 255))
    d.ellipse([W * 0.22, H * 0.05, W * 0.78, H * 0.18], fill=(40, 34, 42, 255))
    return img


def make_hist_marker(n: int) -> Image.Image:
    S = 32
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if n == 0:
        d.ellipse([2, 2, S - 3, S - 3], fill=(70, 74, 78, 220))
        f = font(14)
        d.text((S / 2 - 5, S / 2 - 8), "×", font=f, fill=(200, 200, 200, 255))
    else:
        d.ellipse([2, 2, S - 3, S - 3], fill=(180, 40, 40, 240))
        f = font(14)
        t = str(n)
        d.text((S / 2 - 6, S / 2 - 9), t, font=f, fill=(255, 240, 220, 255))
    return img


def clean_dealer() -> Image.Image:
    src = Path("/root/.cursor/projects/var-www-zee9/assets/jhandi-dealer-alpha.png")
    if not src.exists():
        src = Path("/root/.cursor/projects/var-www-zee9/assets/jhandi-dealer.png")
    img = Image.open(src).convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r > 235 and g > 235 and b > 235:
                px[x, y] = (r, g, b, 0)
            elif abs(r - g) < 12 and abs(g - b) < 12 and 150 <= r <= 215:
                px[x, y] = (r, g, b, 0)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img.resize((180, int(180 * img.height / img.width)), Image.LANCZOS)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("panels")
    for sym in ["club", "crown", "spade", "diamond", "flag", "heart"]:
        save(make_panel(sym), f"zones/{sym}-panel")
    print("timer cup dealer history")
    save(make_timer(), "ui/timer.png")
    save(make_cup(), "dice/cup-sm.png")
    save(clean_dealer(), "dealer/idle.png", q=88)
    for n in range(7):
        save(make_hist_marker(n), f"history/count-{n}.png")
    # bg gradient only (lightweight)
    bg = Image.new("RGB", (390, 844), (12, 18, 28))
    px = np.array(bg)
    yy = np.linspace(0, 1, 844)[:, None]
    px = px.astype(np.float32)
    px[:, :, 1] *= (0.85 + yy * 0.15)
    save(Image.fromarray(px.astype(np.uint8)), "ui/bg.png", q=78)
    print("done")


if __name__ == "__main__":
    main()
