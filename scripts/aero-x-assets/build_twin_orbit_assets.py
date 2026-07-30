#!/usr/bin/env python3
"""Build Twin Orbit (double-crash) premium space assets from generated sources + procedural UI."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SRC = Path("/root/.cursor/projects/var-www-zee9/assets")
OUT = ROOT / "public" / "games" / "aero-x"
LOBBY = ROOT / "public" / "games" / "aero-x.png"
SEED = 20260726


def rng() -> random.Random:
    return random.Random(SEED)


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for c in cands:
        if Path(c).exists():
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def ensure() -> None:
    for sub in (
        "rocket",
        "environment",
        "effects",
        "ui",
        "controls",
        "loading",
        "avatars",
        "modals",
    ):
        (OUT / sub).mkdir(parents=True, exist_ok=True)


def save(img: Image.Image, rel: str, also_webp: bool = True) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img = img.convert("RGBA")
    img.save(path, "PNG", optimize=True)
    if also_webp:
        img.save(path.with_suffix(".webp"), "WEBP", quality=90, method=6)
    print("wrote", rel, img.size)


def dark_corner_key(img: Image.Image, thr: int = 38) -> Image.Image:
    """Make near-black / solid dark corners transparent for sprites on dark backdrops."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    # sample corners
    samples = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    avg = [0, 0, 0]
    for x, y in samples:
        r, g, b, _ = px[x, y]
        avg[0] += r
        avg[1] += g
        avg[2] += b
    avg = [c // 4 for c in avg]
    # only if corners are dark
    if sum(avg) / 3 > 55:
        return img
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if max(r, g, b) < thr and abs(r - g) < 18 and abs(g - b) < 18:
                px[x, y] = (r, g, b, 0)
            elif max(r, g, b) < thr + 25:
                fade = int(255 * (max(r, g, b) - thr) / 25)
                px[x, y] = (r, g, b, min(a, max(0, fade)))
    return img


def crop_alpha(img: Image.Image, pad: int = 6) -> Image.Image:
    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(img.width, r + pad)
    b = min(img.height, b + pad)
    return img.crop((l, t, r, b))


def fit(img: Image.Image, tw: int, th: int) -> Image.Image:
    img = img.convert("RGBA")
    img.thumbnail((tw, th), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (tw, th), (0, 0, 0, 0))
    x = (tw - img.width) // 2
    y = (th - img.height) // 2
    canvas.paste(img, (x, y), img)
    return canvas


def process_rocket(name: str, src_name: str, size: tuple[int, int] = (220, 140)) -> None:
    p = SRC / src_name
    if not p.exists():
        print("MISSING", p)
        return
    img = Image.open(p).convert("RGBA")
    img = dark_corner_key(img, thr=42)
    img = crop_alpha(img, 10)
    # trim any leftover letterbox bars
    img = ImageOps.contain(img, size, Image.Resampling.LANCZOS)
    out = Image.new("RGBA", size, (0, 0, 0, 0))
    out.paste(img, ((size[0] - img.width) // 2, (size[1] - img.height) // 2), img)
    save(out, f"rocket/{name}.png")


def process_planet(name: str, src_name: str, size: int = 220) -> None:
    p = SRC / src_name
    if not p.exists():
        print("MISSING", p)
        return
    img = Image.open(p).convert("RGBA")
    img = dark_corner_key(img, thr=28)
    img = crop_alpha(img, 4)
    img = fit(img, size, size)
    save(img, f"environment/{name}.png")


def process_simple(src_name: str, rel: str, size: tuple[int, int], thr: int = 40) -> None:
    p = SRC / src_name
    if not p.exists():
        print("MISSING", p)
        return
    img = Image.open(p).convert("RGBA")
    img = dark_corner_key(img, thr=thr)
    img = crop_alpha(img, 4)
    img = fit(img, size[0], size[1])
    save(img, rel)


def make_space_bg() -> None:
    p = SRC / "space-bg.png"
    if p.exists():
        img = Image.open(p).convert("RGBA")
        img = img.resize((1280, 720), Image.Resampling.LANCZOS)
        # darken slightly for UI readability
        img = ImageEnhance.Brightness(img).enhance(0.72)
        img = ImageEnhance.Color(img).enhance(1.15)
        save(img, "environment/bg.png", also_webp=True)
    else:
        # procedural fallback
        w, h = 1280, 720
        im = Image.new("RGBA", (w, h), (6, 8, 28, 255))
        d = ImageDraw.Draw(im)
        for y in range(h):
            t = y / h
            r = int(6 + 18 * t)
            g = int(8 + 12 * t)
            b = int(28 + 40 * t)
            d.line([(0, y), (w, y)], fill=(r, g, b, 255))
        rnd = rng()
        px = im.load()
        for _ in range(900):
            x, y = rnd.randint(0, w - 1), rnd.randint(0, h - 1)
            c = rnd.randint(160, 255)
            a = rnd.randint(120, 255)
            px[x, y] = (c, c, min(255, c + 20), a)
        save(im, "environment/bg.png")


def make_nebula(idx: int, color: tuple[int, int, int], size: tuple[int, int] = (420, 280)) -> None:
    rnd = rng()
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    overlay = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    for _ in range(18):
        cx = rnd.randint(-40, size[0] + 40)
        cy = rnd.randint(-40, size[1] + 40)
        rw = rnd.randint(60, 180)
        rh = rnd.randint(40, 140)
        a = rnd.randint(18, 55)
        d.ellipse((cx - rw, cy - rh, cx + rw, cy + rh), fill=(*color, a))
    overlay = overlay.filter(ImageFilter.GaussianBlur(28))
    im = Image.alpha_composite(im, overlay)
    save(im, f"environment/nebula-{idx}.png")


def make_starfield_layer(idx: int, density: int, size: tuple[int, int] = (896, 280)) -> None:
    rnd = random.Random(SEED + idx * 17)
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    px = im.load()
    for _ in range(density):
        x, y = rnd.randint(0, size[0] - 1), rnd.randint(0, size[1] - 1)
        bright = rnd.randint(140, 255)
        a = rnd.randint(90, 230)
        px[x, y] = (bright, bright, min(255, bright + 30), a)
        if rnd.random() < 0.08:
            for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < size[0] and 0 <= ny < size[1]:
                    px[nx, ny] = (bright, bright, 255, a // 2)
    save(im, f"environment/stars-{idx}.png")


def make_flame_sheet() -> None:
    """Horizontal sprite sheet of engine flames."""
    frames = 8
    fw, fh = 96, 64
    sheet = Image.new("RGBA", (fw * frames, fh), (0, 0, 0, 0))
    rnd = rng()
    for i in range(frames):
        frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
        d = ImageDraw.Draw(frame)
        # core
        stretch = 0.7 + (i % 4) * 0.12 + rnd.random() * 0.08
        tip = int(fw * stretch)
        # outer magenta
        d.polygon(
            [(8, fh // 2), (tip, fh // 2 - 18 - i % 3), (tip + 10, fh // 2), (tip, fh // 2 + 18 + i % 3)],
            fill=(255, 80, 180, 90),
        )
        # mid orange
        d.polygon(
            [(10, fh // 2), (int(tip * 0.92), fh // 2 - 12), (int(tip * 0.95), fh // 2), (int(tip * 0.92), fh // 2 + 12)],
            fill=(255, 160, 40, 200),
        )
        # core yellow
        d.polygon(
            [(12, fh // 2), (int(tip * 0.7), fh // 2 - 6), (int(tip * 0.75), fh // 2), (int(tip * 0.7), fh // 2 + 6)],
            fill=(255, 250, 200, 255),
        )
        frame = frame.filter(ImageFilter.GaussianBlur(1.2))
        sheet.paste(frame, (i * fw, 0), frame)
    save(sheet, "effects/flame-sheet.png")


def make_particles() -> None:
    colors = [
        (255, 220, 80),
        (255, 140, 40),
        (255, 80, 180),
        (80, 220, 255),
        (255, 255, 255),
    ]
    for i, col in enumerate(colors, 1):
        im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse((8, 8, 24, 24), fill=(*col, 220))
        glow = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse((2, 2, 30, 30), fill=(*col, 70))
        glow = glow.filter(ImageFilter.GaussianBlur(4))
        im = Image.alpha_composite(glow, im)
        save(im, f"effects/particle-{i}.png", also_webp=False)


def make_smoke() -> None:
    for i in range(1, 4):
        im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        for j in range(5):
            x = 12 + j * 6 + i * 2
            y = 20 + (j % 3) * 8
            r = 14 + i * 2 + j
            d.ellipse((x - r, y - r, x + r, y + r), fill=(180, 190, 210, 35 + i * 8))
        im = im.filter(ImageFilter.GaussianBlur(3))
        save(im, f"effects/smoke-{i}.png", also_webp=False)


def make_trail_glow() -> None:
    im = Image.new("RGBA", (256, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(24):
        a = int(200 * (1 - i / 24))
        y0 = 24 - (12 - i // 2)
        y1 = 24 + (12 - i // 2)
        d.rectangle((i * 10, y0, i * 10 + 12, y1), fill=(255, 210, 60, a))
    im = im.filter(ImageFilter.GaussianBlur(2))
    save(im, "effects/trail-glow.png")


def make_ui_chrome() -> None:
    # header metal strip
    h = Image.new("RGBA", (896, 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(h)
    for y in range(40):
        t = y / 39
        r = int(12 + 8 * (1 - abs(t - 0.35)))
        g = int(16 + 10 * (1 - abs(t - 0.35)))
        b = int(36 + 28 * (1 - abs(t - 0.35)))
        d.line([(0, y), (895, y)], fill=(r, g, b, 245))
    d.line([(0, 0), (895, 0)], fill=(80, 120, 200, 90))
    d.line([(0, 39), (895, 39)], fill=(0, 0, 0, 120))
    save(h, "ui/header-metal.png", also_webp=False)

    # bet panel texture
    p = Image.new("RGBA", (420, 140), (10, 14, 36, 255))
    d = ImageDraw.Draw(p)
    for y in range(140):
        t = y / 139
        col = (
            int(10 + 6 * math.sin(t * 3)),
            int(14 + 8 * t),
            int(36 + 20 * t),
            255,
        )
        d.line([(0, y), (419, y)], fill=col)
    noise = rng()
    px = p.load()
    for _ in range(1200):
        x, y = noise.randint(0, 419), noise.randint(0, 139)
        r, g, b, a = px[x, y]
        px[x, y] = (min(255, r + 8), min(255, g + 8), min(255, b + 12), a)
    d.rounded_rectangle((1, 1, 418, 138), radius=10, outline=(60, 100, 200, 140), width=1)
    d.rounded_rectangle((2, 2, 417, 40), radius=8, outline=(100, 80, 200, 50), width=1)
    save(p, "ui/panel-texture.png")

    # history pills
    for name, fill, edge in (
        ("pink", (220, 60, 140), (255, 120, 180)),
        ("cyan", (30, 180, 220), (80, 230, 255)),
        ("violet", (140, 70, 220), (190, 130, 255)),
        ("gold", (220, 170, 40), (255, 220, 100)),
    ):
        im = Image.new("RGBA", (72, 28), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, 71, 27), radius=8, fill=(*fill, 210), outline=(*edge, 255), width=1)
        save(im, f"ui/pill-{name}.png", also_webp=False)

    # logo from generated
    process_simple("logo-twin-orbit.png", "ui/logo.png", (200, 56), thr=35)
    # also clean wordmark for loading
    logo = OUT / "ui" / "logo.png"
    if logo.exists():
        lm = Image.open(logo).convert("RGBA")
        save(lm.resize((280, 78), Image.Resampling.LANCZOS), "loading/wordmark.png", also_webp=False)

    # bankroll frame
    br = Image.new("RGBA", (200, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(br)
    d.rounded_rectangle((0, 0, 199, 35), radius=8, fill=(8, 18, 48, 220), outline=(40, 220, 255, 200), width=2)
    save(br, "ui/bankroll-frame.png", also_webp=False)

    # add button
    ab = Image.new("RGBA", (88, 36), (0, 0, 0, 0))
    d = ImageDraw.Draw(ab)
    d.rounded_rectangle((0, 0, 87, 35), radius=8, fill=(200, 150, 30, 255), outline=(255, 220, 100, 255), width=1)
    for y in range(1, 17):
        a = int(60 * (1 - y / 17))
        d.line([(4, y), (83, y)], fill=(255, 240, 160, a))
    d.text((28, 8), "ADD", font=font(14), fill=(255, 255, 255, 255))
    save(ab, "ui/btn-add.png", also_webp=False)


def make_controls() -> None:
    specs = [
        ("icon-back", lambda d, s: d.polygon([(22, 16), (10, 24), (22, 32)], fill=(240, 200, 80, 255))),
        ("icon-sound", lambda d, s: (
            d.ellipse((10, 14, 20, 34), fill=(200, 220, 255, 255)),
            d.arc((18, 10, 34, 38), 300, 60, fill=(200, 220, 255, 255), width=3),
        )),
        ("icon-mute", lambda d, s: (
            d.ellipse((10, 14, 20, 34), fill=(160, 170, 190, 255)),
            d.line((26, 14, 36, 34), fill=(255, 80, 80, 255), width=3),
        )),
        ("icon-settings", lambda d, s: (
            d.ellipse((14, 14, 34, 34), outline=(230, 200, 100, 255), width=3),
            d.ellipse((20, 20, 28, 28), fill=(230, 200, 100, 255)),
        )),
        ("icon-help", lambda d, s: (
            d.ellipse((10, 10, 38, 38), outline=(180, 200, 255, 220), width=2),
            d.text((18, 12), "?", font=font(18), fill=(200, 220, 255, 255)),
        )),
        ("icon-history", lambda d, s: (
            d.ellipse((10, 10, 38, 38), outline=(160, 200, 255, 220), width=2),
            d.arc((14, 14, 34, 34), 40, 300, fill=(160, 200, 255, 255), width=3),
            d.line((24, 18, 24, 26), fill=(160, 200, 255, 255), width=2),
            d.line((24, 26, 30, 26), fill=(160, 200, 255, 255), width=2),
        )),
        ("icon-rules", lambda d, s: (
            d.rounded_rectangle((12, 10, 36, 38), radius=3, outline=(255, 210, 100, 255), width=2),
            d.line((16, 18, 32, 18), fill=(255, 210, 100, 200), width=2),
            d.line((16, 24, 30, 24), fill=(255, 210, 100, 200), width=2),
            d.line((16, 30, 28, 30), fill=(255, 210, 100, 200), width=2),
        )),
        ("icon-quest", lambda d, s: (
            d.polygon([(24, 8), (36, 16), (32, 34), (16, 34), (12, 16)], fill=(180, 80, 220, 230), outline=(255, 200, 80, 255)),
            d.text((19, 14), "!", font=font(16), fill=(255, 230, 100, 255)),
        )),
        ("icon-music", lambda d, s: (
            d.ellipse((12, 26, 22, 36), fill=(200, 160, 255, 255)),
            d.ellipse((26, 22, 36, 32), fill=(200, 160, 255, 255)),
            d.line((21, 12, 21, 30), fill=(200, 160, 255, 255), width=3),
            d.line((35, 8, 35, 26), fill=(200, 160, 255, 255), width=3),
            d.line((21, 12, 35, 8), fill=(200, 160, 255, 255), width=3),
        )),
        ("icon-vibrate", lambda d, s: (
            d.rounded_rectangle((16, 10, 32, 38), radius=4, outline=(120, 220, 255, 255), width=2),
            d.line((10, 16, 10, 32), fill=(120, 220, 255, 180), width=2),
            d.line((38, 16, 38, 32), fill=(120, 220, 255, 180), width=2),
        )),
        ("plus", lambda d, s: (
            d.ellipse((4, 4, 44, 44), fill=(30, 50, 100, 230), outline=(80, 160, 255, 255), width=2),
            d.line((16, 24, 32, 24), fill=(255, 255, 255, 255), width=3),
            d.line((24, 16, 24, 32), fill=(255, 255, 255, 255), width=3),
        )),
        ("minus", lambda d, s: (
            d.ellipse((4, 4, 44, 44), fill=(30, 50, 100, 230), outline=(80, 160, 255, 255), width=2),
            d.line((16, 24, 32, 24), fill=(255, 255, 255, 255), width=3),
        )),
    ]
    for name, drawer in specs:
        im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse((2, 2, 45, 45), fill=(12, 18, 42, 210), outline=(70, 110, 180, 160), width=1)
        drawer(d, im)
        save(im, f"controls/{name}.png", also_webp=False)

    # trend / menu / cart / chip from generated
    process_simple("icon-trend.png", "controls/icon-trend.png", (40, 40), thr=50)
    process_simple("icon-menu-diamond.png", "controls/icon-menu.png", (40, 40), thr=45)
    process_simple("icon-add-cart.png", "controls/icon-cart.png", (36, 36), thr=40)
    process_simple("icon-chip.png", "controls/icon-chip.png", (32, 32), thr=40)

    # bet button textures
    for name, top, bot in (
        ("btn-bet", (40, 200, 70), (20, 130, 40)),
        ("btn-cashout", (80, 220, 60), (40, 160, 30)),
        ("btn-cancel", (180, 60, 70), (120, 30, 40)),
    ):
        im = Image.new("RGBA", (160, 72), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle((0, 0, 159, 71), radius=10, fill=(*bot, 255))
        for y in range(1, 28):
            t = 1 - y / 28
            col = tuple(int(bot[i] + (top[i] - bot[i]) * t) for i in range(3))
            d.line([(6, y), (153, y)], fill=(*col, 255))
        d.rounded_rectangle((0, 0, 159, 71), radius=10, outline=(220, 255, 200, 120), width=1)
        save(im, f"controls/{name}.png", also_webp=False)


def split_avatars() -> None:
    p = SRC / "avatars-sheet.png"
    if not p.exists():
        # procedural fallbacks
        colors = [
            (80, 140, 220),
            (220, 100, 140),
            (100, 200, 140),
            (200, 160, 60),
            (160, 100, 220),
            (220, 120, 80),
            (80, 180, 200),
            (190, 90, 110),
        ]
        for i, c in enumerate(colors, 1):
            im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            d.ellipse((2, 2, 61, 61), fill=(*c, 255))
            d.ellipse((18, 16, 46, 44), fill=(255, 220, 190, 255))
            d.ellipse((12, 40, 52, 70), fill=(*[max(0, x - 40) for x in c], 255))
            save(im, f"avatars/av-{i:02d}.png", also_webp=False)
        return

    sheet = Image.open(p).convert("RGBA")
    # 2x4 grid
    cols, rows = 4, 2
    cw, ch = sheet.width // cols, sheet.height // rows
    idx = 1
    for row in range(rows):
        for col in range(cols):
            cell = sheet.crop((col * cw, row * ch, (col + 1) * cw, (row + 1) * ch))
            cell = dark_corner_key(cell, thr=60)
            # circular mask
            cell = fit(crop_alpha(cell, 2), 72, 72)
            mask = Image.new("L", (72, 72), 0)
            ImageDraw.Draw(mask).ellipse((1, 1, 70, 70), fill=255)
            out = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
            out.paste(cell, (0, 0), mask)
            # ring
            ImageDraw.Draw(out).ellipse((1, 1, 70, 70), outline=(100, 160, 255, 180), width=2)
            save(out, f"avatars/av-{idx:02d}.png", also_webp=False)
            idx += 1


def make_quest_assets() -> None:
    process_simple("quest-chest.png", "modals/quest-chest.png", (160, 160), thr=35)
    # modal frame
    im = Image.new("RGBA", (520, 300), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 519, 299), radius=16, fill=(40, 12, 60, 245), outline=(180, 80, 220, 255), width=3)
    save(im, "modals/quest-frame.png", also_webp=False)

    # trend modal frame
    im = Image.new("RGBA", (420, 260), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, 419, 259), radius=12, fill=(60, 16, 36, 245), outline=(180, 60, 80, 220), width=2)
    save(im, "modals/trend-frame.png", also_webp=False)


def make_lobby_thumb() -> None:
    w, h = 360, 480
    im = Image.new("RGBA", (w, h), (8, 10, 32, 255))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        d.line([(0, y), (w, y)], fill=(int(8 + 20 * t), int(10 + 10 * t), int(32 + 50 * t), 255))
    # planets
    for rel, pos, sc in (
        ("environment/planet-ringed.webp", (40, 80), 140),
        ("environment/planet-volcanic.webp", (200, 280), 120),
    ):
        p = OUT / rel
        if not p.exists():
            p = OUT / rel.replace(".webp", ".png")
        if p.exists():
            pl = Image.open(p).convert("RGBA").resize((sc, sc), Image.Resampling.LANCZOS)
            im.paste(pl, pos, pl)
    # rocket
    rp = OUT / "rocket" / "fly.webp"
    if not rp.exists():
        rp = OUT / "rocket" / "fly.png"
    if rp.exists():
        rk = Image.open(rp).convert("RGBA").resize((200, 120), Image.Resampling.LANCZOS)
        rk = rk.rotate(18, expand=True, resample=Image.Resampling.BICUBIC)
        im.paste(rk, (70, 160), rk)
    # title bar
    d.rounded_rectangle((20, 400, 340, 450), radius=10, fill=(10, 14, 40, 220))
    d.text((70, 412), "TWIN ORBIT", font=font(22), fill=(80, 230, 255, 255))
    im.save(LOBBY, "PNG", optimize=True)
    print("wrote lobby", LOBBY)


def make_away_rocket() -> None:
    """Derive fly-away from accel with motion streak."""
    p = OUT / "rocket" / "accel.png"
    if not p.exists():
        return
    base = Image.open(p).convert("RGBA")
    canvas = Image.new("RGBA", (280, 140), (0, 0, 0, 0))
    # streak
    streak = Image.new("RGBA", (280, 140), (0, 0, 0, 0))
    d = ImageDraw.Draw(streak)
    for i in range(12):
        a = int(100 * (1 - i / 12))
        d.ellipse((20 + i * 8, 50 + i, 100 + i * 14, 90 - i), fill=(255, 200, 80, a))
    streak = streak.filter(ImageFilter.GaussianBlur(3))
    canvas = Image.alpha_composite(canvas, streak)
    canvas.paste(base, (60, 0), base)
    save(canvas, "rocket/away.png")


def main() -> None:
    ensure()
    print("=== Twin Orbit assets ===")
    make_space_bg()
    process_rocket("idle", "rocket-idle.png")
    process_rocket("ignition", "rocket-ignition.png")
    process_rocket("fly", "rocket-fly.png")
    process_rocket("accel", "rocket-accel.png")
    make_away_rocket()
    # if away missing, copy accel
    if not (OUT / "rocket" / "away.png").exists() and (OUT / "rocket" / "accel.png").exists():
        Image.open(OUT / "rocket" / "accel.png").save(OUT / "rocket" / "away.png")

    process_planet("planet-ringed", "planet-ringed.png", 240)
    process_planet("planet-volcanic", "planet-volcanic.png", 200)
    process_planet("planet-ice", "planet-ice.png", 160)
    process_planet("moon-grey", "moon-grey.png", 100)

    for i, col in enumerate(
        [(120, 40, 180), (40, 80, 180), (180, 40, 120)],
        1,
    ):
        make_nebula(i, col)
    make_starfield_layer(1, 420)
    make_starfield_layer(2, 220)
    make_flame_sheet()
    make_particles()
    make_smoke()
    make_trail_glow()
    make_ui_chrome()
    make_controls()
    split_avatars()
    make_quest_assets()
    make_lobby_thumb()
    print("DONE")


if __name__ == "__main__":
    main()
