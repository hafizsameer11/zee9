#!/usr/bin/env python3
"""Process generated premium Jhandi Munda assets into runtime sizes."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/root/.cursor/projects/var-www-zee9/assets")
OUT = ROOT / "public" / "games" / "jhandi-munda" / "v2"


def save(img: Image.Image, rel: str) -> None:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, optimize=True)
    print(f"  {rel}  {img.size[0]}x{img.size[1]}")


def load(name: str) -> Image.Image:
    p = SRC / name
    if not p.exists():
        raise FileNotFoundError(p)
    return Image.open(p).convert("RGBA")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # Environment
    bg = load("jhandi-room-bg.png")
    save(bg.resize((1792, 828), Image.LANCZOS), "ui/room-bg.png")

    table = load("jhandi-table.png")
    save(table.resize((1474, 779), Image.LANCZOS), "ui/table.png")

    dealer = load("jhandi-dealer.png")
    # Crop to dealer figure, resize for stage
    save(dealer.resize((320, 400), Image.LANCZOS), "dealer/idle.png")

    cup = load("jhandi-cup.png")
    save(cup.resize((256, 280), Image.LANCZOS), "dice/cup.png")

    save(load("jhandi-banner-place.png").resize((720, 120), Image.LANCZOS), "banners/place-bets.png")
    save(load("jhandi-banner-stop.png").resize((720, 120), Image.LANCZOS), "banners/stop-betting.png")

    symbols = ["club", "crown", "spade", "diamond", "flag", "heart"]
    for sym in symbols:
        face = load(f"jhandi-face-{sym}.png")
        save(face.resize((256, 256), Image.LANCZOS), f"dice/face-{sym}.png")
        save(face.resize((128, 128), Image.LANCZOS), f"dice/face-{sym}-sm.png")
        save(face.resize((256, 256), Image.LANCZOS), f"symbols/{sym}-panel.png")
        save(face.resize((128, 128), Image.LANCZOS), f"symbols/{sym}-sm.png")
        # Gold variant - warm tint
        gold = Image.new("RGBA", face.size, (255, 220, 140, 40))
        g = Image.alpha_composite(face.convert("RGBA"), gold)
        save(g.resize((256, 256), Image.LANCZOS), f"symbols/{sym}-gold.png")

    # Copy back button if exists
    back = ROOT / "public/games/7up-down/hud/back.png"
    if back.exists():
        shutil.copy(back, OUT / "ui/btn-back.png")

    # Logo from table title area - extract or use text
    logo = Image.new("RGBA", (640, 80), (0, 0, 0, 0))
    from PIL import ImageDraw, ImageFont
    try:
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf", 48)
    except OSError:
        f = ImageFont.load_default()
    d = ImageDraw.Draw(logo)
    d.text((20, 10), "JHANDI MUNDA", font=f, fill=(255, 220, 140, 255))
    save(logo, "ui/logo.png")

    print("Done processing premium assets")


if __name__ == "__main__":
    main()
