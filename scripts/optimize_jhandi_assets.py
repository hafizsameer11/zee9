#!/usr/bin/env python3
"""Optimize Jhandi Munda assets: webp, resize, transparent cutouts."""
from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = Path("/root/.cursor/projects/var-www-zee9/assets")
OUT = ROOT / "public" / "games" / "jhandi-munda" / "v2"
PUBLIC = ROOT / "public" / "games"


def whiten_to_alpha(img: Image.Image, thresh: int = 245) -> Image.Image:
    img = img.convert("RGBA")
    data = img.getdata()
    new = []
    for r, g, b, a in data:
        if r > thresh and g > thresh and b > thresh:
            new.append((r, g, b, 0))
        else:
            new.append((r, g, b, a))
    img.putdata(new)
    return img


def save_webp(img: Image.Image, rel: str, quality: int = 82) -> None:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.save(p.with_suffix(".webp"), "WEBP", quality=quality, method=6)
    # tiny png fallback
    img.save(p, optimize=True)
    w, h = img.size
    wp = p.with_suffix(".webp")
    print(f"  {rel} -> webp {wp.stat().st_size//1024}KB png {p.stat().st_size//1024}KB ({w}x{h})")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    # Portrait scene — single boot image
    scene = Image.open(SRC / "jhandi-scene-portrait.png").convert("RGBA")
    scene = scene.resize((390, 844), Image.LANCZOS)
    save_webp(scene, "ui/scene-portrait.png", quality=85)

    # Dealer cutout
    dealer = whiten_to_alpha(Image.open(SRC / "jhandi-dealer-alpha.png"))
    dealer = dealer.resize((280, 360), Image.LANCZOS)
    save_webp(dealer, "dealer/idle.png", quality=88)

    # Cup cutout
    cup = whiten_to_alpha(Image.open(SRC / "jhandi-cup-alpha.png"))
    cup = cup.resize((120, 132), Image.LANCZOS)
    save_webp(cup, "dice/cup.png", quality=88)

    # Legacy paths — lightweight webp versions
    old_room = OUT / "ui/room-bg.png"
    if old_room.exists():
        bg = Image.open(old_room).resize((780, 360), Image.LANCZOS)
        save_webp(bg, "ui/room-bg.png", quality=78)

    old_table = OUT / "ui/table.png"
    if old_table.exists():
        tbl = Image.open(old_table).resize((780, 420), Image.LANCZOS)
        save_webp(tbl, "ui/table.png", quality=82)

    symbols = ["club", "crown", "spade", "diamond", "flag", "heart"]
    for sym in symbols:
        face = OUT / f"dice/face-{sym}.png"
        if face.exists():
            im = Image.open(face).resize((128, 128), Image.LANCZOS)
            save_webp(im, f"dice/face-{sym}.png", quality=85)
            sm = im.resize((64, 64), Image.LANCZOS)
            save_webp(sm, f"dice/face-{sym}-sm.png", quality=82)

    for sym in symbols:
        panel = OUT / f"symbols/{sym}-panel.png"
        if panel.exists():
            im = Image.open(panel).resize((128, 128), Image.LANCZOS)
            save_webp(im, f"symbols/{sym}-panel.png", quality=82)

    for folder, max_px in [("chips", 192), ("banners", 720), ("history", 64), ("avatars", 64)]:
        d = OUT / folder
        if not d.exists():
            continue
        for f in d.glob("*.png"):
            if f.name.endswith(".webp"):
                continue
            im = Image.open(f)
            if max(im.size) > max_px:
                ratio = max_px / max(im.size)
                im = im.resize((int(im.width * ratio), int(im.height * ratio)), Image.LANCZOS)
            save_webp(im, f.relative_to(OUT).as_posix(), quality=80)

    # Lobby thumb
    thumb = Image.open(OUT / "ui/scene-portrait.png").resize((480, 360), Image.LANCZOS)
    thumb.save(PUBLIC / "jhandi-munda.webp", "WEBP", quality=85)
    thumb.save(PUBLIC / "jhandi-munda.png", optimize=True)
    print("lobby thumb done")

    print("Optimization complete")


if __name__ == "__main__":
    main()
