#!/usr/bin/env python3
"""Generate reference-style table frame + dealer cutout for Jhandi Munda."""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "games" / "jhandi-munda" / "v2"
REF_FRAME = Path("/var/www/zee9/games_videos/new-game.mp4")
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


def save(img: Image.Image, rel: str, q: int = 82) -> None:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    out = p.with_suffix(".webp")
    img.save(out, "WEBP", quality=q, method=6)
    print(f"  {out.relative_to(ROOT)} {img.size[0]}x{img.size[1]}")


def felt_texture(w: int, h: int) -> Image.Image:
    rng = np.random.default_rng(42)
    base = np.zeros((h, w, 3), dtype=np.float32)
    for y in range(h):
        t = y / max(h - 1, 1)
        base[y, :, 0] = 18 + t * 8
        base[y, :, 1] = 72 - t * 18
        base[y, :, 2] = 58 - t * 14
    noise = rng.normal(0, 6, (h, w))
    base += noise[:, :, None]
    img = Image.fromarray(base.clip(0, 255).astype(np.uint8))
    # subtle radial highlight
    cx, cy = w * 0.5, h * 0.35
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    for r in range(int(max(w, h)), 0, -4):
        a = int(28 * (1 - r / max(w, h)))
        od.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 240, 200, max(0, a)))
    felt = Image.alpha_composite(img.convert("RGBA"), overlay)
    return felt


def make_table_frame(w: int = 370, h: int = 577) -> Image.Image:
    img = felt_texture(w, h)
    d = ImageDraw.Draw(img)
    # outer gold rim
    for t in range(6):
        a = 220 - t * 20
        d.rounded_rectangle([t, t, w - 1 - t, h - 1 - t], radius=14, outline=(212, 168, 48, a), width=1)
    d.rounded_rectangle([8, 8, w - 9, h - 9], radius=12, outline=(255, 220, 140, 180), width=2)
    d.rounded_rectangle([10, 10, w - 11, h - 11], radius=11, outline=(120, 90, 28, 200), width=1)
    return img


def chroma_dealer(src: Image.Image) -> Image.Image:
    img = src.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # dark navy / charcoal bg from reference
            if r < 55 and g < 60 and b < 75:
                px[x, y] = (r, g, b, 0)
            elif abs(r - g) < 15 and abs(g - b) < 20 and r < 90:
                px[x, y] = (r, g, b, 0)
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)
    return img


def extract_ref_dealer() -> Image.Image | None:
    try:
        import subprocess
        tmp = Path("/tmp/jhandi-dealer-frame.png")
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-i",
                str(REF_FRAME),
                "-frames:v",
                "1",
                str(tmp),
            ],
            check=True,
            capture_output=True,
        )
        frame = Image.open(tmp)
        # torso only — title band stays on table frame
        crop = frame.crop((108, 0, 372, 108))
        dealer = chroma_dealer(crop)
        return dealer.resize((200, int(200 * dealer.height / dealer.width)), Image.LANCZOS)
    except Exception as e:
        print(f"  dealer extract failed: {e}")
        return None


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    print("table frame")
    save(make_table_frame(), "ui/table-frame.png", q=80)
    print("dealer")
    dealer = extract_ref_dealer()
    if dealer:
        save(dealer, "dealer/idle.png", q=88)
    print("done")


if __name__ == "__main__":
    main()
