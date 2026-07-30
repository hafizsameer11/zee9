#!/usr/bin/env python3
"""Generate original Dragon Tiger casino assets (chips, cards, icons, backgrounds)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "games" / "dragon-tiger"

CHIP_SPECS = [
    (10, (42, 150, 95), (22, 95, 55), "10"),
    (50, (180, 55, 55), (110, 28, 28), "50"),
    (100, (210, 165, 45), (140, 100, 20), "100"),
    (500, (90, 95, 115), (45, 48, 62), "500"),
    (1000, (220, 220, 225), (140, 145, 155), "1K"),
]

RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"]
SUITS = [("S", "spade", (20, 20, 24)), ("H", "heart", (190, 35, 45)), ("D", "diamond", (190, 35, 45)), ("C", "club", (20, 20, 24))]


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def save(img: Image.Image, rel: str) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGBA").save(path, "PNG", optimize=True)
    print("wrote", rel)


def radial(size: int, stops: list[tuple[float, tuple[int, int, int, int]]]) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    px = im.load()
    cx = cy = size / 2
    rmax = size / 2
    stops = sorted(stops, key=lambda s: s[0])
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - cx, y - cy) / rmax
            if d > 1:
                continue
            c = stops[-1][1]
            for i in range(len(stops) - 1):
                a, ca = stops[i]
                b, cb = stops[i + 1]
                if a <= d <= b:
                    t = 0 if b == a else (d - a) / (b - a)
                    c = tuple(int(ca[j] + (cb[j] - ca[j]) * t) for j in range(4))
                    break
            px[x, y] = c  # type: ignore
    return im


def make_chip(value: int, fill: tuple, dark: tuple, label: str, size: int = 128) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((6, 10, size - 2, size - 2), fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(4))
    im = Image.alpha_composite(im, shadow)
    d = ImageDraw.Draw(im)

    pad = 4
    body = radial(size, [
        (0.0, (*fill, 255)),
        (0.55, (*fill, 255)),
        (0.82, (*dark, 255)),
        (1.0, (max(0, dark[0] - 30), max(0, dark[1] - 30), max(0, dark[2] - 30), 255)),
    ])
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((pad, pad, size - pad - 1, size - pad - 1), fill=255)
    im.paste(body, (0, 0), mask)

    # outer gold rim
    d.ellipse((pad, pad, size - pad - 1, size - pad - 1), outline=(230, 200, 120, 255), width=3)
    d.ellipse((pad + 3, pad + 3, size - pad - 4, size - pad - 4), outline=(255, 240, 180, 180), width=1)
    # inner ring
    inn = int(size * 0.18)
    d.ellipse((inn, inn, size - inn - 1, size - inn - 1), outline=(245, 235, 200, 220), width=2)
    # edge marks
    cx = cy = size / 2
    for i in range(12):
        ang = i * (math.pi * 2 / 12)
        x1 = cx + math.cos(ang) * (size * 0.42)
        y1 = cy + math.sin(ang) * (size * 0.42)
        x2 = cx + math.cos(ang) * (size * 0.48)
        y2 = cy + math.sin(ang) * (size * 0.48)
        d.line([(x1, y1), (x2, y2)], fill=(250, 240, 200, 230), width=3)

    # center disc
    cpad = int(size * 0.28)
    d.ellipse((cpad, cpad, size - cpad - 1, size - cpad - 1), fill=(250, 248, 240, 245))
    d.ellipse((cpad, cpad, size - cpad - 1, size - cpad - 1), outline=(180, 150, 70, 200), width=1)

    f = font(int(size * 0.28))
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) / 2, (size - th) / 2 - 2), label, fill=(40, 30, 20, 255), font=f)

    # highlight
    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(hi).ellipse((size * 0.2, size * 0.1, size * 0.7, size * 0.38), fill=(255, 255, 255, 55))
    hi = hi.filter(ImageFilter.GaussianBlur(6))
    im = Image.alpha_composite(im, hi)
    return im


def draw_suit(d: ImageDraw.ImageDraw, suit: str, x: int, y: int, s: int, color: tuple) -> None:
    if suit == "H":
        d.polygon([(x, y + s * 0.35), (x - s * 0.5, y), (x - s * 0.15, y - s * 0.35), (x, y - s * 0.1),
                   (x + s * 0.15, y - s * 0.35), (x + s * 0.5, y)], fill=color)
        d.ellipse((x - s * 0.5, y - s * 0.45, x, y + s * 0.05), fill=color)
        d.ellipse((x, y - s * 0.45, x + s * 0.5, y + s * 0.05), fill=color)
    elif suit == "D":
        d.polygon([(x, y - s * 0.55), (x + s * 0.4, y), (x, y + s * 0.55), (x - s * 0.4, y)], fill=color)
    elif suit == "S":
        d.ellipse((x - s * 0.38, y - s * 0.35, x + s * 0.05, y + s * 0.15), fill=color)
        d.ellipse((x - s * 0.05, y - s * 0.35, x + s * 0.38, y + s * 0.15), fill=color)
        d.polygon([(x, y - s * 0.55), (x + s * 0.42, y + s * 0.05), (x - s * 0.42, y + s * 0.05)], fill=color)
        d.rectangle((x - s * 0.08, y + s * 0.05, x + s * 0.08, y + s * 0.45), fill=color)
        d.polygon([(x - s * 0.28, y + s * 0.5), (x + s * 0.28, y + s * 0.5), (x, y + s * 0.2)], fill=color)
    else:  # club
        r = s * 0.22
        for ox, oy in [(-r * 0.9, -r * 0.2), (r * 0.9, -r * 0.2), (0, -r * 1.1)]:
            d.ellipse((x + ox - r, y + oy - r, x + ox + r, y + oy + r), fill=color)
        d.rectangle((x - s * 0.08, y, x + s * 0.08, y + s * 0.42), fill=color)
        d.polygon([(x - s * 0.25, y + s * 0.48), (x + s * 0.25, y + s * 0.48), (x, y + s * 0.18)], fill=color)


def make_card_back(w: int = 140, h: int = 196) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # soft shadow plate
    d.rounded_rectangle((2, 3, w - 1, h - 1), radius=10, fill=(0, 0, 0, 60))
    d.rounded_rectangle((0, 0, w - 3, h - 4), radius=10, fill=(18, 40, 90, 255))
    d.rounded_rectangle((4, 4, w - 7, h - 8), radius=8, outline=(200, 170, 90, 255), width=2)
    d.rounded_rectangle((8, 8, w - 11, h - 12), radius=6, fill=(28, 55, 120, 255))
    # pattern
    for y in range(14, h - 16, 10):
        for x in range(14, w - 16, 10):
            if (x + y) % 20 == 0:
                d.ellipse((x, y, x + 4, y + 4), fill=(80, 130, 200, 120))
            else:
                d.rectangle((x, y, x + 3, y + 3), fill=(60, 100, 170, 90))
    # center emblem
    cx, cy = w // 2 - 1, h // 2 - 2
    d.ellipse((cx - 22, cy - 22, cx + 22, cy + 22), outline=(220, 190, 100, 230), width=2)
    d.ellipse((cx - 14, cy - 14, cx + 14, cy + 14), fill=(40, 80, 150, 255))
    f = font(14)
    d.text((cx - 8, cy - 8), "Z9", fill=(240, 210, 130, 255), font=f)
    # highlight
    hi = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(hi).rounded_rectangle((6, 6, w - 20, 40), radius=6, fill=(255, 255, 255, 35))
    hi = hi.filter(ImageFilter.GaussianBlur(3))
    return Image.alpha_composite(im, hi)


def make_card_face(rank: str, suit: str, color: tuple, w: int = 140, h: int = 196) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((2, 3, w - 1, h - 1), radius=10, fill=(0, 0, 0, 50))
    d.rounded_rectangle((0, 0, w - 3, h - 4), radius=10, fill=(248, 244, 235, 255))
    d.rounded_rectangle((2, 2, w - 5, h - 6), radius=9, outline=(40, 30, 20, 180), width=1)
    d.rounded_rectangle((5, 5, w - 8, h - 9), radius=7, outline=(180, 150, 80, 120), width=1)

    f = font(22)
    d.text((10, 8), rank, fill=color + (255,), font=f)
    draw_suit(d, suit, 22, 48, 16, color + (255,))
    # center suit
    draw_suit(d, suit, w // 2 - 1, h // 2 - 4, 36, color + (255,))
    # bottom inverted
    # rotate via paste
    corner = Image.new("RGBA", (40, 50), (0, 0, 0, 0))
    cd = ImageDraw.Draw(corner)
    cd.text((4, 2), rank, fill=color + (255,), font=f)
    draw_suit(cd, suit, 16, 38, 14, color + (255,))
    corner = corner.rotate(180)
    im.paste(corner, (w - 46, h - 58), corner)
    return im


def make_background(w: int = 850, h: int = 400) -> Image.Image:
    im = Image.new("RGBA", (w, h), (42, 8, 12, 255))
    d = ImageDraw.Draw(im)
    # vignette + clouds
    for i in range(18):
        x = int((i * 97) % w)
        y = int((i * 53) % h)
        r = 40 + (i * 13) % 80
        cloud = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(cloud).ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=(80, 20, 28, 18))
        cloud = cloud.filter(ImageFilter.GaussianBlur(12))
        im = Image.alpha_composite(im, cloud)
    # edge vignette
    vig = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = vig.load()
    cx, cy = w / 2, h / 2
    for y in range(h):
        for x in range(w):
            dx = abs(x - cx) / (w / 2)
            dy = abs(y - cy) / (h / 2)
            a = max(0, min(1, (dx ** 2 + dy ** 2) - 0.55)) * 160
            if a > 0:
                px[x, y] = (0, 0, 0, int(a))  # type: ignore
    im = Image.alpha_composite(im, vig)
    return im


def make_icon(name: str, size: int = 64) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((2, 2, size - 3, size - 3), fill=(90, 18, 28, 240), outline=(220, 180, 90, 255), width=2)
    cx = cy = size // 2
    if name == "back":
        d.polygon([(cx + 8, cy - 12), (cx - 10, cy), (cx + 8, cy + 12)], fill=(240, 210, 130, 255))
    elif name == "sound":
        d.polygon([(cx - 10, cy - 6), (cx - 2, cy - 6), (cx + 8, cy - 14), (cx + 8, cy + 14), (cx - 2, cy + 6), (cx - 10, cy + 6)], fill=(240, 210, 130, 255))
        d.arc((cx + 6, cy - 10, cx + 18, cy + 10), 300, 60, fill=(240, 210, 130, 255), width=2)
    elif name == "sound-off":
        d.polygon([(cx - 10, cy - 6), (cx - 2, cy - 6), (cx + 8, cy - 14), (cx + 8, cy + 14), (cx - 2, cy + 6), (cx - 10, cy + 6)], fill=(180, 160, 120, 255))
        d.line([(cx - 12, cy - 12), (cx + 14, cy + 12)], fill=(220, 80, 80, 255), width=3)
    elif name == "help":
        f = font(28)
        d.text((cx - 8, cy - 16), "?", fill=(240, 210, 130, 255), font=f)
    elif name == "settings":
        d.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), outline=(240, 210, 130, 255), width=3)
        for i in range(6):
            ang = i * math.pi / 3
            x1 = cx + math.cos(ang) * 10
            y1 = cy + math.sin(ang) * 10
            x2 = cx + math.cos(ang) * 16
            y2 = cy + math.sin(ang) * 16
            d.line([(x1, y1), (x2, y2)], fill=(240, 210, 130, 255), width=3)
    elif name == "trend":
        for i, col in enumerate([(60, 120, 220), (200, 60, 60), (60, 120, 220), (200, 60, 60)]):
            d.ellipse((10 + i * 10, 20 + (i % 2) * 8, 20 + i * 10, 30 + (i % 2) * 8), fill=col + (255,))
    elif name == "coin":
        d.ellipse((8, 8, size - 9, size - 9), fill=(220, 170, 50, 255), outline=(255, 220, 120, 255), width=2)
        f = font(18)
        d.text((cx - 6, cy - 10), "₹", fill=(90, 50, 10, 255), font=f)
    elif name == "crown":
        d.polygon([(12, 40), (16, 18), (24, 32), (32, 14), (40, 32), (48, 18), (52, 40)], fill=(230, 190, 70, 255))
        d.rectangle((14, 40, 50, 48), fill=(200, 150, 40, 255))
    elif name == "add":
        d.rounded_rectangle((6, 14, size - 7, size - 15), radius=8, fill=(230, 180, 40, 255))
        d.rectangle((cx - 2, 22, cx + 2, size - 23), fill=(80, 40, 10, 255))
        d.rectangle((18, cy - 2, size - 19, cy + 2), fill=(80, 40, 10, 255))
    return im


def make_particle(color: tuple, size: int = 32) -> Image.Image:
    im = radial(size, [
        (0.0, (*color, 220)),
        (0.4, (*color, 140)),
        (1.0, (*color, 0)),
    ])
    return im


def make_cloud_layer(color: tuple, w: int = 320, h: int = 120) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for i, (ox, oy, r) in enumerate([(40, 70, 50), (100, 55, 60), (170, 70, 55), (230, 50, 45), (280, 75, 40)]):
        blob = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(blob).ellipse((ox - r, oy - r // 2, ox + r, oy + r // 2), fill=(*color, 90 - i * 8))
        blob = blob.filter(ImageFilter.GaussianBlur(8))
        im = Image.alpha_composite(im, blob)
    return im


def main() -> None:
    for d in ("chips", "cards", "icons", "backgrounds", "effects", "dragon", "tiger"):
        (OUT / d).mkdir(parents=True, exist_ok=True)

    for value, fill, dark, label in CHIP_SPECS:
        chip = make_chip(value, fill, dark, label, 128)
        save(chip, f"chips/chip-{value}.png")
        sm = chip.resize((56, 56), Image.Resampling.LANCZOS)
        save(sm, f"chips/chip-{value}-sm.png")

    save(make_card_back(), "cards/back.png")
    for rank in RANKS:
        for code, _name, color in SUITS:
            save(make_card_face(rank, code, color), f"cards/{rank}{code}.png")

    for name in ("back", "sound", "sound-off", "help", "settings", "trend", "coin", "crown", "add"):
        save(make_icon(name), f"icons/{name}.png")

    save(make_background(), "backgrounds/felt.png")
    save(make_cloud_layer((80, 160, 255)), "dragon/cloud.png")
    save(make_cloud_layer((255, 140, 60)), "tiger/smoke.png")
    save(make_particle((80, 200, 255)), "effects/spark-blue.png")
    save(make_particle((255, 160, 50)), "effects/spark-orange.png")
    save(make_particle((255, 210, 90)), "effects/spark-gold.png")

    # win border glow plates
    for name, col in (("win-blue", (60, 140, 255)), ("win-orange", (255, 140, 40)), ("win-gold", (230, 190, 70))):
        plate = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        d = ImageDraw.Draw(plate)
        d.rounded_rectangle((8, 8, 247, 247), radius=16, outline=(*col, 220), width=6)
        d.rounded_rectangle((16, 16, 239, 239), radius=12, outline=(*col, 100), width=2)
        glow = plate.filter(ImageFilter.GaussianBlur(6))
        plate = Image.alpha_composite(glow, plate)
        save(plate, f"effects/{name}.png")

    print("Dragon Tiger assets ready.")


if __name__ == "__main__":
    main()
