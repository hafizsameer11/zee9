#!/usr/bin/env python3
"""Generate original European roulette assets for Zee9 (dev-time only)."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "games" / "roulette"
SRC_ASSETS = ROOT / "src" / "games" / "roulette" / "assets"

EUROPEAN = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30,
    8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
    28, 12, 35, 3, 26,
]
RED = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}

CHIP_SPECS = [
    (10, (38, 120, 210), (18, 70, 150), "10"),
    (50, (210, 55, 55), (140, 25, 25), "50"),
    (100, (45, 160, 85), (25, 100, 50), "100"),
    (500, (155, 70, 200), (95, 35, 130), "500"),
    (1000, (210, 165, 45), (140, 100, 20), "1K"),
]


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
    ]
    for c in candidates:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def ensure_dirs() -> None:
    for d in (
        "wheel", "chips", "icons", "backgrounds", "effects", "sounds",
    ):
        (OUT / d).mkdir(parents=True, exist_ok=True)
        (SRC_ASSETS / d).mkdir(parents=True, exist_ok=True)


def save(img: Image.Image, rel: str) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img.convert("RGBA").save(path, "PNG", optimize=True)


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


def make_wheel_casing(size: int = 1024) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Outer mahogany ring
    wood = radial(size, [
        (0.0, (90, 45, 28, 255)),
        (0.55, (72, 34, 20, 255)),
        (0.78, (48, 22, 12, 255)),
        (0.92, (110, 60, 32, 255)),
        (1.0, (28, 12, 6, 255)),
    ])
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    # Cut inner hole for rotor
    pad = int(size * 0.055)
    ImageDraw.Draw(mask).ellipse((pad, pad, size - pad - 1, size - pad - 1), fill=0)
    im.paste(wood, (0, 0), mask)

    # Gold rim
    gold_outer = int(size * 0.02)
    gold_inner = int(size * 0.048)
    for i, col in enumerate([(212, 175, 90, 230), (240, 210, 130, 255), (170, 130, 55, 230)]):
        o = gold_outer + i
        inn = gold_inner - i
        d.ellipse((o, o, size - o - 1, size - o - 1), outline=col, width=2)
        d.ellipse((inn, inn, size - inn - 1, size - inn - 1), outline=col, width=2)

    # Soft shadow under casing
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((8, 14, size - 8, size - 2), fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(12))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out = Image.alpha_composite(out, shadow)
    out = Image.alpha_composite(out, im)
    return out


def make_wheel_rotor(size: int = 960) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size / 2
    outer = size / 2 - 2
    inner = size * 0.28
    n = len(EUROPEAN)
    pocket = 360 / n

    # Number pockets
    for i, num in enumerate(EUROPEAN):
        a0 = math.radians(i * pocket - 90)
        a1 = math.radians((i + 1) * pocket - 90)
        if num == 0:
            fill = (18, 120, 55, 255)
        elif num in RED:
            fill = (170, 28, 32, 255)
        else:
            fill = (22, 22, 24, 255)
        pts = [(cx, cy)]
        steps = 10
        for s in range(steps + 1):
            a = a0 + (a1 - a0) * (s / steps)
            pts.append((cx + outer * math.cos(a), cy + outer * math.sin(a)))
        d.polygon(pts, fill=fill)

        # Metallic separator
        mx = cx + outer * math.cos(a0)
        my = cy + outer * math.sin(a0)
        d.line([(cx, cy), (mx, my)], fill=(210, 185, 120, 200), width=2)

        # Number text
        mid = a0 + (a1 - a0) / 2
        tr = (outer + inner) / 2 + size * 0.06
        tx = cx + tr * math.cos(mid)
        ty = cy + tr * math.sin(mid)
        label = str(num)
        f = font(max(14, int(size * 0.038)))
        bbox = d.textbbox((0, 0), label, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        # Rotate conceptually by drawing upright for readability on static asset —
        # for spinning wheel SVG we use this PNG as texture-like ring; numbers stay relative to pocket.
        d.text((tx - tw / 2, ty - th / 2), label, fill=(245, 240, 230, 255), font=f)

    # Inner gold ring
    d.ellipse((inner - 4, inner - 4, size - inner + 4, size - inner + 4), outline=(220, 180, 90, 255), width=5)
    d.ellipse((inner, inner, size - inner, size - inner), fill=(35, 22, 14, 255))

    # Decorative spokes
    for i in range(8):
        a = math.radians(i * 45 - 90)
        d.line(
            [
                (cx + inner * 0.35 * math.cos(a), cy + inner * 0.35 * math.sin(a)),
                (cx + (inner - 8) * math.cos(a), cy + (inner - 8) * math.sin(a)),
            ],
            fill=(180, 145, 70, 180),
            width=3,
        )

    # Soft vignette
    vignette = radial(size, [
        (0.0, (0, 0, 0, 0)),
        (0.7, (0, 0, 0, 0)),
        (1.0, (0, 0, 0, 70)),
    ])
    im = Image.alpha_composite(im, vignette)
    return im


def make_spindle(size: int = 220) -> Image.Image:
    im = radial(size, [
        (0.0, (255, 235, 180, 255)),
        (0.25, (230, 190, 95, 255)),
        (0.55, (170, 125, 45, 255)),
        (0.8, (120, 85, 30, 255)),
        (1.0, (60, 40, 15, 255)),
    ])
    d = ImageDraw.Draw(im)
    m = size // 2
    d.ellipse((m - 10, m - 10, m + 10, m + 10), fill=(250, 240, 200, 255))
    d.ellipse((m - 4, m - 4, m + 4, m + 4), fill=(90, 60, 20, 255))
    return im


def make_ball(size: int = 48) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Ivory sphere
    base = radial(size, [
        (0.0, (255, 252, 245, 255)),
        (0.35, (240, 230, 210, 255)),
        (0.7, (210, 195, 170, 255)),
        (1.0, (140, 120, 95, 255)),
    ])
    im = Image.alpha_composite(im, base)
    d = ImageDraw.Draw(im)
    d.ellipse((size * 0.18, size * 0.12, size * 0.45, size * 0.38), fill=(255, 255, 255, 160))
    return im


def make_pointer(w: int = 48, h: int = 64) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = [(w // 2, h - 2), (4, 8), (w - 4, 8)]
    d.polygon(pts, fill=(220, 175, 70, 255))
    d.polygon(pts, outline=(255, 230, 150, 255))
    d.ellipse((w // 2 - 6, 2, w // 2 + 6, 14), fill=(240, 200, 100, 255))
    return im


def make_chip(value: int, base: tuple[int, int, int], dark: tuple[int, int, int], label: str, size: int = 128) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sh = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((6, 10, size - 2, size - 1), fill=(0, 0, 0, 110))
    sh = sh.filter(ImageFilter.GaussianBlur(3))
    im = Image.alpha_composite(im, sh)
    d = ImageDraw.Draw(im)
    d.ellipse((2, 1, size - 5, size - 7), fill=(225, 190, 100, 255))
    d.ellipse((6, 5, size - 9, size - 11), fill=(*dark, 255))
    cx = cy = (size - 3) / 2
    r_in = size * 0.38
    r_out = size * 0.46
    for i in range(16):
        a0 = math.radians(i * 22.5 - 3.5)
        a1 = math.radians(i * 22.5 + 3.5)
        pts = [
            (cx + r_in * math.cos(a0), cy + r_in * math.sin(a0)),
            (cx + r_in * math.cos(a1), cy + r_in * math.sin(a1)),
            (cx + r_out * math.cos(a1), cy + r_out * math.sin(a1)),
            (cx + r_out * math.cos(a0), cy + r_out * math.sin(a0)),
        ]
        d.polygon(pts, fill=(248, 244, 230, 255))
    inset = int(size * 0.18)
    d.ellipse((inset, inset - 1, size - inset - 3, size - inset - 5), fill=(*base, 255))
    inset2 = int(size * 0.30)
    d.ellipse((inset2, inset2 - 1, size - inset2 - 3, size - inset2 - 5), outline=(250, 246, 232, 255), width=max(2, size // 40))
    inset3 = int(size * 0.36)
    d.ellipse((inset3, inset3 - 1, size - inset3 - 3, size - inset3 - 5), fill=(252, 250, 245, 255))
    d.ellipse((size * 0.28, size * 0.18, size * 0.52, size * 0.36), fill=(255, 255, 255, 60))
    f = font(max(14, size // 4))
    bbox = d.textbbox((0, 0), label, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((size - tw) / 2 - 1.5, (size - th) / 2 - 4), label, fill=(*dark, 255), font=f)
    return im


def make_icon(name: str, size: int = 64) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Gold circular button base
    d.ellipse((2, 2, size - 3, size - 3), fill=(42, 28, 16, 230))
    d.ellipse((2, 2, size - 3, size - 3), outline=(210, 170, 80, 255), width=2)
    d.ellipse((5, 5, size - 6, size - 6), outline=(140, 105, 40, 200), width=1)
    gold = (230, 195, 100, 255)
    gold_d = (180, 140, 55, 255)
    c = size / 2

    if name == "back":
        pts = [(c + 8, c - 12), (c - 10, c), (c + 8, c + 12)]
        d.polygon(pts, fill=gold)
        d.line([(c - 8, c), (c + 12, c)], fill=gold, width=4)
    elif name == "sound":
        d.polygon([(c - 10, c - 6), (c - 2, c - 6), (c + 8, c - 14), (c + 8, c + 14), (c - 2, c + 6), (c - 10, c + 6)], fill=gold)
        d.arc((c + 6, c - 10, c + 18, c + 10), 300, 60, fill=gold, width=2)
    elif name == "sound-off":
        d.polygon([(c - 10, c - 6), (c - 2, c - 6), (c + 8, c - 14), (c + 8, c + 14), (c - 2, c + 6), (c - 10, c + 6)], fill=gold_d)
        d.line([(c - 12, c + 12), (c + 12, c - 12)], fill=(220, 80, 80, 255), width=3)
    elif name == "settings":
        d.ellipse((c - 6, c - 6, c + 6, c + 6), outline=gold, width=3)
        for i in range(8):
            a = math.radians(i * 45)
            d.line([(c + 8 * math.cos(a), c + 8 * math.sin(a)), (c + 14 * math.cos(a), c + 14 * math.sin(a))], fill=gold, width=3)
    elif name == "help":
        f = font(28)
        bbox = d.textbbox((0, 0), "?", font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text((c - tw / 2, c - th / 2 - 2), "?", fill=gold, font=f)
    elif name == "history":
        d.rectangle((c - 10, c - 12, c + 10, c + 12), outline=gold, width=2)
        for y in (-4, 0, 4):
            d.line([(c - 6, c + y), (c + 6, c + y)], fill=gold, width=2)
    elif name == "fullscreen":
        for dx, dy in [(-1, -1), (1, -1), (-1, 1), (1, 1)]:
            x0, y0 = c + dx * 4, c + dy * 4
            d.line([(x0, y0), (x0 + dx * 8, y0), (x0, y0 + dy * 8)], fill=gold, width=2)
    elif name == "undo":
        d.arc((c - 12, c - 10, c + 10, c + 12), 40, 300, fill=gold, width=3)
        d.polygon([(c - 12, c - 2), (c - 4, c - 12), (c + 2, c - 2)], fill=gold)
    elif name == "clear":
        d.line([(c - 10, c - 10), (c + 10, c + 10)], fill=gold, width=3)
        d.line([(c + 10, c - 10), (c - 10, c + 10)], fill=gold, width=3)
    elif name == "rebet":
        d.arc((c - 12, c - 10, c + 12, c + 12), 210, 150, fill=gold, width=3)
        d.polygon([(c + 8, c - 12), (c + 16, c - 2), (c + 4, c - 2)], fill=gold)
    elif name == "double":
        f = font(18)
        d.text((c - 10, c - 10), "2x", fill=gold, font=f)
    elif name == "wallet":
        d.rounded_rectangle((c - 12, c - 8, c + 12, c + 10), radius=3, fill=gold_d, outline=gold, width=2)
        d.ellipse((c + 2, c - 2, c + 10, c + 6), outline=gold, width=2)
    elif name == "coin":
        d.ellipse((c - 12, c - 12, c + 12, c + 12), fill=(220, 175, 70, 255), outline=(255, 220, 130, 255), width=2)
        f = font(16)
        d.text((c - 5, c - 8), "₹", fill=(90, 55, 15, 255), font=f)
    elif name == "timer":
        d.ellipse((c - 12, c - 12, c + 12, c + 12), outline=gold, width=2)
        d.line([(c, c), (c, c - 7)], fill=gold, width=2)
        d.line([(c, c), (c + 6, c + 3)], fill=gold, width=2)
    elif name == "avatar-frame":
        d.ellipse((2, 2, size - 3, size - 3), outline=gold, width=3)
        d.ellipse((6, 6, size - 7, size - 7), outline=gold_d, width=1)
    else:
        d.ellipse((c - 8, c - 8, c + 8, c + 8), fill=gold)
    return im


def make_win_frame(size: int = 160) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((4, 4, size - 5, size - 5), radius=16, outline=(230, 190, 90, 255), width=4)
    d.rounded_rectangle((10, 10, size - 11, size - 11), radius=12, outline=(180, 140, 50, 180), width=2)
    # Corner ornaments
    for x, y in [(18, 18), (size - 18, 18), (18, size - 18), (size - 18, size - 18)]:
        d.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(240, 200, 100, 220))
    return im


def make_loading_emblem(size: int = 256) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    # Miniature wheel emblem
    rotor = make_wheel_rotor(size - 40).resize((size - 40, size - 40), Image.Resampling.LANCZOS)
    casing = make_wheel_casing(size).resize((size, size), Image.Resampling.LANCZOS)
    im = Image.alpha_composite(im, casing)
    im.paste(rotor, (20, 20), rotor)
    spindle = make_spindle(56)
    im.paste(spindle, (size // 2 - 28, size // 2 - 28), spindle)
    return im


def make_background(w: int = 1280, h: int = 720) -> Image.Image:
    im = Image.new("RGBA", (w, h), (12, 40, 28, 255))
    d = ImageDraw.Draw(im)
    # Felt vignette
    for i in range(40):
        alpha = int(8 + i * 1.2)
        d.ellipse(
            (-w * 0.1 + i * 4, -h * 0.1 + i * 3, w * 1.1 - i * 4, h * 1.1 - i * 3),
            outline=(8, 28, 18, alpha),
        )
    # Wood edge bands
    d.rectangle((0, 0, w, 28), fill=(48, 26, 14, 255))
    d.rectangle((0, h - 28, w, h), fill=(48, 26, 14, 255))
    d.rectangle((0, 0, 18, h), fill=(48, 26, 14, 255))
    d.rectangle((w - 18, 0, w, h), fill=(48, 26, 14, 255))
    # Gold trim
    d.rectangle((14, 22, w - 15, 26), fill=(200, 160, 70, 180))
    d.rectangle((14, h - 26, w - 15, h - 22), fill=(200, 160, 70, 180))
    # Soft table center glow
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((w * 0.2, h * 0.15, w * 0.8, h * 0.85), fill=(40, 90, 55, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    im = Image.alpha_composite(im, glow)
    return im


def make_particle(size: int = 32, color: tuple[int, int, int] = (240, 200, 100)) -> Image.Image:
    im = radial(size, [
        (0.0, (*color, 220)),
        (0.4, (*color, 120)),
        (1.0, (*color, 0)),
    ])
    return im


def make_thumbnail(w: int = 254, h: int = 126) -> Image.Image:
    """Landscape lobby card — must match other game thumbs (~254×126)."""
    im = Image.new("RGBA", (w, h), (12, 48, 34, 255))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(1, h - 1)
        d.line([(0, y), (w, y)], fill=(int(10 + 18 * (1 - t)), int(42 + 30 * (1 - t)), int(26 + 16 * (1 - t)), 255))
    d.rectangle((0, 0, w - 1, h - 1), outline=(200, 160, 70, 255), width=3)
    wheel = make_loading_emblem(96).resize((96, 96), Image.Resampling.LANCZOS)
    im.paste(wheel, (12, (h - 96) // 2), wheel)
    d.text((118, 42), "ROULETTE", fill=(240, 210, 120, 255), font=font(18))
    d.text((118, 68), "EUROPEAN", fill=(200, 175, 120, 255), font=font(11))
    return im


def make_table_divider(w: int = 400, h: int = 8) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rectangle((0, h // 2 - 1, w, h // 2 + 1), fill=(180, 145, 70, 160))
    return im


def main() -> None:
    ensure_dirs()
    print("Generating roulette assets...")

    save(make_wheel_casing(1024), "wheel/casing.png")
    save(make_wheel_rotor(960), "wheel/rotor.png")
    save(make_spindle(220), "wheel/spindle.png")
    save(make_ball(48), "wheel/ball.png")
    save(make_pointer(48, 64), "wheel/pointer.png")
    save(make_loading_emblem(256), "wheel/emblem.png")

    for value, base, dark, label in CHIP_SPECS:
        save(make_chip(value, base, dark, label, 128), f"chips/chip-{value}.png")
        save(make_chip(value, base, dark, label, 56), f"chips/chip-{value}-sm.png")

    icons = [
        "back", "sound", "sound-off", "settings", "help", "history",
        "fullscreen", "undo", "clear", "rebet", "double", "wallet", "coin", "timer", "avatar-frame",
    ]
    for name in icons:
        save(make_icon(name, 64), f"icons/{name}.png")

    save(make_win_frame(160), "effects/win-frame.png")
    save(make_particle(32, (240, 200, 100)), "effects/particle-gold.png")
    save(make_particle(28, (255, 255, 245)), "effects/particle-light.png")
    save(make_background(1280, 720), "backgrounds/felt.jpg".replace(".jpg", ".png"))
    save(make_table_divider(), "effects/divider.png")
    save(make_thumbnail(), "thumb.png")
    # Also copy thumb to public/games for lobby
    save(make_thumbnail(), "../roulette.png")

    print(f"Done → {OUT}")


if __name__ == "__main__":
    main()
