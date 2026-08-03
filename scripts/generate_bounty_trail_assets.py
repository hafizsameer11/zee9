#!/usr/bin/env python3
"""Generate premium Wild Bounty assets — frames, symbols, controls, particles."""
from __future__ import annotations

import math
import os
import shutil
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

OUT = Path("/var/www/zee9/public/games/bounty-trail")
SRC = Path("/root/.cursor/projects/var-www-zee9/assets")
W, H = 390, 844


def font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont:
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold
        else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def wood_tex(w: int, h: int, dark=(32, 18, 8), light=(98, 62, 30)) -> Image.Image:
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        t = y / max(1, h - 1)
        for x in range(w):
            g = math.sin(x * 0.12) * 0.04 + math.sin((x + y * 0.4) * 0.06) * 0.06
            r = int(lerp(dark[0], light[0], t + g))
            g2 = int(lerp(dark[1], light[1], t + g))
            b = int(lerp(dark[2], light[2], t + g))
            px[x, y] = (max(0, min(255, r)), max(0, min(255, g2)), max(0, min(255, b)))
    return img


def save(img: Image.Image, rel: str) -> None:
    dst = OUT / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    img.save(dst, optimize=True)
    print(f"  {rel:44s} {img.size[0]}x{img.size[1]}")


def trim_alpha(im: Image.Image, pad: int = 4) -> Image.Image:
    im = im.convert("RGBA")
    bbox = im.split()[3].point(lambda v: 255 if v > 12 else 0).getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    return im.crop((max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)))


def fit_symbol(src: Path, dst_rel: str, size: int = 256) -> None:
    if not src.exists():
        print(f"  skip missing {src}")
        return
    im = trim_alpha(Image.open(src))
    im = im.resize((size, size), Image.LANCZOS)
    save(im, dst_rel)


def process_generated_symbols() -> None:
    mapping = {
        "sym-outlaw-v2.png": "characters/outlaw.png",
        "sym-wild-v2.png": "symbols/wild.png",
        "sym-revolver-v2.png": "symbols/revolver.png",
        "sym-hat-v2.png": "symbols/hat.png",
        "sym-whiskey-v2.png": "symbols/whiskey.png",
        "sym-letter-a-v2.png": "symbols/letter-a.png",
        "sym-letter-k-v2.png": "symbols/letter-k.png",
        "sym-letter-q-v2.png": "symbols/letter-q.png",
        "sym-letter-j-v2.png": "symbols/letter-j.png",
    }
    for src_name, dst_rel in mapping.items():
        fit_symbol(SRC / src_name, dst_rel, 280)


def shield_points(fw: int, fh: int) -> list[tuple[int, int]]:
    cx = fw // 2
    return [
        (6, 22), (fw - 6, 22),
        (fw - 2, int(fh * 0.24)), (fw - 1, int(fh * 0.58)),
        (cx, fh - 4), (1, int(fh * 0.58)), (2, int(fh * 0.24)),
    ]


def make_reel_frame() -> None:
    fw, fh = 374, 448
    img = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))

    # drop shadow
    sh = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    ImageDraw.Draw(sh).polygon([(p[0] + 4, p[1] + 6) for p in shield_points(fw, fh)], fill=(0, 0, 0, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(6))
    img = Image.alpha_composite(img, sh)

    wood = wood_tex(fw, fh, (24, 14, 6), (88, 54, 26))
    mask = Image.new("L", (fw, fh), 0)
    ImageDraw.Draw(mask).polygon(shield_points(fw, fh), fill=255)
    img.paste(wood, (0, 0), mask)

    d = ImageDraw.Draw(img)
    pts = shield_points(fw, fh)
    d.polygon(pts, outline=(220, 175, 75, 255), width=5)
    inner = [(p[0] + (10 if i < 2 or i > 4 else 6), p[1] + (10 if i < 2 else 8)) for i, p in enumerate(pts)]
    d.polygon(inner, outline=(100, 65, 28, 200), width=2)

    # nail heads
    for nx, ny in ((20, 36), (fw - 20, 36), (14, fh - 28), (fw - 14, fh - 28)):
        d.ellipse((nx - 4, ny - 4, nx + 4, ny + 4), fill=(200, 160, 60, 255), outline=(80, 50, 20, 255))

    f = font(14)
    for ox in (16, fw - 56):
        d.text((ox, 48), "3600", fill=(235, 195, 95, 255), font=f)
        d.text((ox, 64), "WAYS", fill=(235, 195, 95, 255), font=f)

    # transparent reel window
    hole = Image.new("L", (fw, fh), 0)
    ImageDraw.Draw(hole).rounded_rectangle((20, 86, fw - 20, fh - 22), radius=8, fill=255)
    alpha = img.split()[3]
    alpha = Image.composite(Image.new("L", (fw, fh), 0), alpha, hole)
    img.putalpha(alpha)

    # inner shadow on window edge
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((20, 86, fw - 20, fh - 22), radius=8, outline=(0, 0, 0, 120), width=3)
    save(img, "frames/reel-frame.png")


def draw_chain(d: ImageDraw.ImageDraw, x: int, y0: int, n: int = 6) -> None:
    for i in range(n):
        y = y0 + i * 9
        d.ellipse((x - 4, y, x + 4, y + 7), outline=(155, 145, 125, 230), width=2)
        d.arc((x - 4, y, x + 4, y + 7), 0, 180, fill=(180, 170, 150, 200), width=1)


def make_multiplier_board() -> None:
    bw, bh = 368, 96
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for cx in (48, bw // 2, bw - 48):
        draw_chain(d, cx, 0, 5)

    wood = wood_tex(bw, bh - 12, (30, 16, 8), (82, 50, 24))
    mask = Image.new("L", (bw, bh - 12), 0)
    ImageDraw.Draw(mask).polygon([(10, 6), (bw - 10, 6), (bw - 26, bh - 22), (26, bh - 22)], fill=255)
    img.paste(wood, (0, 14), mask)

    d = ImageDraw.Draw(img)
    d.polygon([(10, 20), (bw - 10, 20), (bw - 26, bh - 6), (26, bh - 6)], outline=(225, 180, 70, 255), width=4)
    d.rounded_rectangle((32, 38, bw - 32, bh - 16), radius=20, fill=(8, 5, 2, 225), outline=(175, 135, 50, 220), width=2)

    for rx, ry in ((22, 28), (bw - 22, 28), (22, bh - 14), (bw - 22, bh - 14)):
        d.ellipse((rx - 5, ry - 5, rx + 5, ry + 5), fill=(215, 175, 65, 255), outline=(90, 60, 25, 255))

    save(img, "frames/multiplier-board.png")


def make_gold_frame() -> None:
    s = 128
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for w, c in ((8, (240, 195, 70, 255)), (5, (180, 130, 40, 200)), (2, (255, 230, 150, 180))):
        d.rounded_rectangle((4, 4, s - 5, s - 5), radius=10, outline=c, width=w)
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(glow).rounded_rectangle((0, 0, s - 1, s - 1), radius=12, outline=(255, 200, 80, 60), width=14)
    glow = glow.filter(ImageFilter.GaussianBlur(4))
    img = Image.alpha_composite(glow, img)
    save(img, "frames/gold-frame.png")


def make_win_panel() -> None:
    bw, bh = 310, 68
    img = Image.new("RGBA", (bw, bh), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, bw - 1, bh - 1), radius=14, fill=(16, 9, 4, 245), outline=(235, 190, 70, 255), width=4)
    d.rounded_rectangle((8, 8, bw - 9, bh - 9), radius=10, outline=(150, 110, 40, 100), width=1)
    # corner flourishes
    for cx, cy in ((14, 14), (bw - 14, 14), (14, bh - 14), (bw - 14, bh - 14)):
        d.ellipse((cx - 4, cy - 4, cx + 4, cy + 4), fill=(220, 175, 60, 200))
    save(img, "frames/win-panel.png")


def make_desert_bg() -> None:
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        t = y / H
        if t < 0.5:
            r = int(lerp(225, 175, t / 0.5))
            g = int(lerp(155, 105, t / 0.5))
            b = int(lerp(85, 58, t / 0.5))
        else:
            tt = (t - 0.5) / 0.5
            r = int(lerp(175, 95, tt))
            g = int(lerp(105, 62, tt))
            b = int(lerp(58, 35, tt))
        d.line([(0, y), (W, y)], fill=(r, g, b))

    mesa = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(mesa)
    md.polygon([(0, 340), (70, 270), (160, 310), (250, 230), (330, 280), (W, 250), (W, 400), (0, 400)], fill=(110, 65, 38, 170))
    md.polygon([(0, 400), (100, 350), (200, 380), (300, 320), (W, 350), (W, 500), (0, 500)], fill=(82, 48, 28, 200))
    img = Image.alpha_composite(img.convert("RGBA"), mesa).convert("RGB")

    sun = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ImageDraw.Draw(sun).ellipse((W // 2 - 80, 40, W // 2 + 80, 200), fill=(255, 230, 160, 45))
    sun = sun.filter(ImageFilter.GaussianBlur(20))
    img = Image.alpha_composite(img.convert("RGBA"), sun).convert("RGB")
    img.save(OUT / "backgrounds/saloon.png", optimize=True)
    img.save(OUT / "backgrounds/saloon.webp", "WEBP", quality=90)
    print(f"  backgrounds/saloon.png                       {W}x{H}")


def make_foreground() -> None:
    img = Image.new("RGBA", (W, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 100), (W, 70), (W, 300), (0, 300)], fill=(16, 52, 32, 245))
    felt = Image.new("RGBA", (W, 300), (0, 0, 0, 0))
    fd = ImageDraw.Draw(felt)
    for i in range(0, W, 7):
        fd.line([(i, 85), (i + 35, 300)], fill=(22, 68, 40, 35), width=1)
    img = Image.alpha_composite(img, felt)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((24, 200, 72, 268), radius=5, fill=(238, 225, 195, 210), outline=(175, 145, 95, 180), width=2)
    d.rounded_rectangle((44, 190, 92, 258), radius=5, fill=(232, 218, 188, 190), outline=(165, 135, 85, 160), width=2)
    d.ellipse((295, 215, 355, 275), fill=(55, 35, 20, 230), outline=(115, 85, 45, 200), width=3)
    # bullet casings
    for bx in (310, 325, 340):
        d.ellipse((bx, 250, bx + 8, 262), fill=(200, 170, 80, 220))
    save(img, "backgrounds/foreground.png")


def make_control_deck() -> None:
    img = Image.new("RGBA", (W, 150), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.polygon([(0, 35), (W, 12), (W, 150), (0, 150)], fill=(12, 44, 26, 250))
    for i in range(0, W, 9):
        d.line([(i, 40), (i + 45, 150)], fill=(18, 58, 34, 45), width=1)
    save(img, "frames/control-deck.png")


def circle_btn(size: int, fill: tuple, kind: str) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((3, 3, size - 4, size - 4), fill=fill, outline=(215, 175, 65, 255), width=3)
    d.ellipse((7, 7, size - 8, size - 8), outline=(70, 42, 18, 200), width=2)
    cx, cy = size // 2, size // 2
    if kind == "spin":
        r = size // 4
        d.arc((cx - r, cy - r - 6, cx + r, cy + r - 6), 40, 310, fill=(245, 225, 175, 255), width=max(3, size // 18))
        d.polygon([(cx + r, cy - 6), (cx + r + 12, cy - 14), (cx + r + 12, cy + 2)], fill=(245, 225, 175, 255))
        # bull skull
        d.ellipse((cx - 12, cy - 18, cx + 12, cy + 2), fill=(185, 145, 90, 230))
        d.ellipse((cx - 18, cy - 12, cx - 6, cy), fill=(205, 165, 105, 240))
        d.ellipse((cx + 6, cy - 12, cx + 18, cy), fill=(205, 165, 105, 240))
    elif kind == "minus":
        d.rectangle((size // 4, cy - 3, size * 3 // 4, cy + 3), fill=(245, 225, 175, 255))
    elif kind == "plus":
        d.rectangle((size // 4, cy - 3, size * 3 // 4, cy + 3), fill=(245, 225, 175, 255))
        d.rectangle((cx - 3, size // 4, cx + 3, size * 3 // 4), fill=(245, 225, 175, 255))
    elif kind == "auto":
        d.polygon([(size // 3, size // 3), (size // 3, size * 2 // 3), (size * 2 // 3, size // 2)], fill=(245, 225, 175, 255))
    elif kind == "turbo":
        d.polygon([(cx, size // 5), (size * 3 // 5, cy), (cx, size * 4 // 5), (size * 2 // 5, cy)], fill=(245, 225, 175, 255))
    return img


def make_controls() -> None:
    fill = (52, 30, 14, 255)
    for name in ("spin", "minus", "plus", "auto", "turbo"):
        sz = 92 if name == "spin" else 56
        save(circle_btn(sz, fill, name), f"controls/{name}.png")


def make_feature_buy() -> None:
    w, h = 84, 204
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    wood = wood_tex(w, h, (42, 22, 10), (92, 58, 28))
    mask = Image.new("L", (w, h), 0)
    ImageDraw.Draw(mask).rounded_rectangle((2, 2, w - 3, h - 3), radius=16, fill=255)
    img.paste(wood, (0, 0), mask)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((2, 2, w - 3, h - 3), radius=16, outline=(230, 185, 70, 255), width=3)
    f = font(15)
    d.text((w // 2, h // 2 - 10), "FEATURE", fill=(255, 235, 170, 255), font=f, anchor="mm")
    d.text((w // 2, h // 2 + 14), "BUY", fill=(255, 235, 170, 255), font=f, anchor="mm")
    save(img, "controls/feature-buy.png")


def make_particles() -> None:
    # coin
    s = 32
    coin = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(coin)
    d.ellipse((2, 2, s - 3, s - 3), fill=(240, 195, 60, 255), outline=(180, 130, 30, 255), width=2)
    d.ellipse((8, 6, s - 9, s - 11), outline=(255, 230, 150, 120), width=1)
    d.text((s // 2, s // 2), "₹", fill=(120, 80, 15, 255), font=font(14), anchor="mm")
    save(coin, "particles/coin.png")

    spark = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
    d = ImageDraw.Draw(spark)
    d.polygon([(12, 0), (14, 10), (24, 12), (14, 14), (12, 24), (10, 14), (0, 12), (10, 10)], fill=(255, 230, 150, 230))
    save(spark, "particles/spark.png")

    dust = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    ImageDraw.Draw(dust).ellipse((0, 0, 7, 7), fill=(255, 220, 140, 180))
    save(dust, "particles/dust.png")


def make_icons() -> None:
    def mk(color: tuple, letter: str) -> Image.Image:
        s = 52
        img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((2, 2, s - 3, s - 3), radius=11, fill=(42, 24, 10, 255), outline=(210, 170, 65, 255), width=2)
        d.ellipse((9, 9, s - 10, s - 10), fill=color)
        d.text((s // 2, s // 2), letter, fill=(255, 245, 210, 255), font=font(17), anchor="mm")
        return img

    save(mk((210, 170, 45, 255), "₹"), "ui/icon-wallet.png")
    save(mk((185, 125, 48, 255), "B"), "ui/icon-bet.png")
    save(mk((205, 85, 38, 255), "W"), "ui/icon-win.png")


def main() -> None:
    print("Generating premium Bounty Trail assets…")
    process_generated_symbols()
    make_desert_bg()
    make_foreground()
    make_reel_frame()
    make_multiplier_board()
    make_gold_frame()
    make_win_panel()
    make_control_deck()
    make_controls()
    make_feature_buy()
    make_particles()
    make_icons()
    print("Done.")


if __name__ == "__main__":
    main()
