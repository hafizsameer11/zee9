#!/usr/bin/env python3
"""Generate Zoo Roulette art package into public/games/zoo-roulette."""
from __future__ import annotations

import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

SRC = Path("/var/www/zee9/assets-src/zoo")
OUT = Path("/var/www/zee9/public/games/zoo-roulette")

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_COND = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

ANIMALS = [
    "monkey", "rabbit", "lion", "panda",
    "swallow", "pigeon", "peacock", "eagle",
    "shark", "golden_frog",
]

CHIP_SPECS = {
    20: ("20", (188, 120, 130), (248, 210, 215), (80, 40, 50), (255, 245, 246)),
    100: ("100", (72, 26, 122), (152, 92, 220), (250, 246, 255), (244, 234, 255)),
    200: ("200", (120, 20, 90), (200, 60, 150), (255, 240, 250), (255, 230, 245)),
    1000: ("1K", (150, 104, 12), (255, 216, 96), (72, 44, 6), (60, 36, 4)),
    2000: ("2K", (18, 92, 58), (72, 194, 130), (250, 248, 240), (232, 255, 246)),
    10000: ("10K", (14, 16, 22), (68, 74, 88), (226, 182, 72), (255, 224, 138)),
}


def font(size: int, path: str = FONT_BOLD) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def save(im: Image.Image, rel: str, quality: int = 90) -> None:
    dst = OUT / rel
    dst.parent.mkdir(parents=True, exist_ok=True)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im.save(dst, "WEBP", quality=quality, method=6)
    print(f"  {rel:42s} {im.size[0]}x{im.size[1]}")


def fit(im: Image.Image, w: int | None = None, h: int | None = None) -> Image.Image:
    if w and h:
        return im.resize((w, h), Image.LANCZOS)
    if w:
        return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    assert h
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def crop_aspect(im: Image.Image, ratio: float, anchor: float = 0.5) -> Image.Image:
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio)
        x = int((w - nw) * 0.5)
        return im.crop((x, 0, x + nw, h))
    nh = int(w / ratio)
    y = int((h - nh) * anchor)
    return im.crop((0, y, w, y + nh))


def trim_alpha(im: Image.Image, pad: float = 0.04) -> Image.Image:
    if im.mode != "RGBA":
        return im
    bbox = im.split()[3].point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    px = int((x1 - x0) * pad)
    py = int((y1 - y0) * pad)
    return im.crop((max(0, x0 - px), max(0, y0 - py), min(im.width, x1 + px), min(im.height, y1 + py)))


def decontaminate(im: Image.Image) -> Image.Image:
    arr = np.asarray(im).astype(np.float32)
    rgb, a = arr[..., :3], arr[..., 3:4] / 255.0
    edge = (a > 0.02) & (a < 0.98)
    boost = np.where(edge, 1.0 / np.maximum(a, 0.25), 1.0)
    rgb = np.clip(rgb * boost, 0, 255)
    return Image.fromarray(np.concatenate([rgb, a * 255], axis=-1).astype(np.uint8), "RGBA")


def cutout_simple(path: Path, lo: int = 18, hi: int = 55) -> Image.Image:
    im = Image.open(path).convert("RGB")
    lum = np.asarray(im.convert("L")).astype(np.float32)
    a = np.clip((lum - lo) / max(1, hi - lo), 0, 1)
    # treat near-white as transparent
    white = np.minimum(lum, np.asarray(im)[:, :, 0]) > 240
    a = a * (~white)
    a = np.clip(a, 0, 1)
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    return decontaminate(trim_alpha(out))


def radial_disc(size: int, inner, outer, spot=None) -> Image.Image:
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cx = cy = size // 2
    for y in range(size):
        for x in range(size):
            dx, dy = x - cx, y - cy
            r = math.hypot(dx, dy) / (size * 0.46)
            if r > 1:
                continue
            t = r ** 0.85
            c = tuple(int(inner[i] + (outer[i] - inner[i]) * t) for i in range(3))
            if spot and 0.82 < r < 0.96 and (int(math.degrees(math.atan2(dy, dx)) / 18) % 2 == 0):
                c = spot
            im.putpixel((x, y), (*c, 255))
    return im


def build_chip(value: int) -> Image.Image:
    label, dark, light, spot, ink = CHIP_SPECS[value]
    size = 512
    base = radial_disc(size, dark, light, spot)
    d = ImageDraw.Draw(base)
    f = font(int(size * 0.28), FONT_COND)
    while d.textlength(label, font=f) > size * 0.52:
        f = font(max(12, int(f.size * 0.92)), FONT_COND)
    box = d.textbbox((0, 0), label, font=f, stroke_width=3)
    d.text(
        ((size - box[2] + box[0]) / 2 - box[0], (size - box[3] + box[1]) / 2 - box[1]),
        label,
        font=f,
        fill=ink,
        stroke_width=3,
        stroke_fill=(255, 255, 255, 80),
    )
    # edge ring
    ring = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(ring)
    rd.ellipse((8, 8, size - 8, size - 8), outline=(255, 255, 255, 60), width=6)
    rd.ellipse((18, 18, size - 18, size - 18), outline=(0, 0, 0, 40), width=3)
    return Image.alpha_composite(base, ring)


def build_tile(state: str) -> Image.Image:
    w, h = 128, 96
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if state == "normal":
        body = (32, 22, 58)
        edge = (140, 110, 60)
        glow = 0
    elif state == "active":
        body = (58, 42, 18)
        edge = (255, 210, 80)
        glow = 90
    else:
        body = (90, 68, 12)
        edge = (255, 220, 100)
        glow = 120
    d.rounded_rectangle((4, 4, w - 4, h - 4), radius=10, fill=body)
    d.rounded_rectangle((4, 4, w - 4, h - 4), radius=10, outline=edge, width=3)
    if glow:
        glow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        gd = ImageDraw.Draw(glow_layer)
        gd.rounded_rectangle((0, 0, w, h), radius=12, fill=(255, 200, 60, glow))
        im = Image.alpha_composite(glow_layer.filter(ImageFilter.GaussianBlur(6)), im)
    return im


def build_fx(name: str) -> Image.Image:
    size = 512
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    if name == "rays":
        for i in range(16):
            ang = i * math.pi / 8
            x2 = cx + math.cos(ang) * 240
            y2 = cy + math.sin(ang) * 240
            d.line((cx, cy, x2, y2), fill=(255, 210, 80, 40), width=18)
    elif name == "shock":
        for r in (60, 120, 180):
            d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(255, 200, 60, 120), width=6)
    elif name == "sparks":
        for _ in range(40):
            ang = np.random.random() * math.tau
            dist = 40 + np.random.random() * 180
            x = cx + math.cos(ang) * dist
            y = cy + math.sin(ang) * dist
            d.ellipse((x - 3, y - 3, x + 3, y + 3), fill=(255, 220, 120, 200))
    else:
        d.ellipse((40, 40, size - 40, size - 40), fill=(255, 200, 60, 30))
    return im.filter(ImageFilter.GaussianBlur(2))


def build_ui_panel(name: str, w: int, h: int, hue: tuple) -> Image.Image:
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dark = tuple(max(0, c - 40) for c in hue)
    light = tuple(min(255, c + 30) for c in hue)
    for y in range(h):
        t = y / max(1, h - 1)
        row = tuple(int(dark[i] + (light[i] - dark[i]) * (1 - t * 0.5)) for i in range(3))
        d.line((0, y, w, y), fill=(*row, 255))
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=12, outline=(210, 170, 80, 200), width=3)
    d.rounded_rectangle((4, 4, w - 5, h - 5), radius=10, outline=(255, 255, 255, 30), width=1)
    if name == "beast":
        d.text((w // 2 - 30, h - 28), "BEAST", font=font(18), fill=(255, 230, 180))
    elif name == "bird":
        d.text((w // 2 - 22, h - 28), "BIRD", font=font(18), fill=(220, 230, 255))
    return im


def build_round_btn() -> Image.Image:
    size = 128
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((4, 4, size - 4, size - 4), fill=(40, 28, 70))
    d.ellipse((4, 4, size - 4, size - 4), outline=(180, 140, 70), width=4)
    return im


def build_timer_bezel() -> Image.Image:
    w, h = 200, 200
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((8, 8, w - 8, h - 8), fill=(28, 48, 32))
    d.ellipse((8, 8, w - 8, h - 8), outline=(220, 180, 70), width=8)
    d.ellipse((24, 24, w - 24, h - 24), outline=(120, 200, 120, 120), width=3)
    return im


def build_tower() -> Image.Image:
    w, h = 120, 400
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=14, fill=(24, 16, 42))
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=14, outline=(180, 140, 70), width=4)
    d.text((w // 2 - 28, 10), "RECORD", font=font(14), fill=(220, 200, 140))
    for i in range(6):
        y = 42 + i * 56
        d.rounded_rectangle((12, y, w - 12, y + 48), radius=8, fill=(38, 28, 58))
        d.rounded_rectangle((12, y, w - 12, y + 48), radius=8, outline=(160, 130, 70), width=2)
    return im


def build_deck() -> Image.Image:
    w, h = 896, 64
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(h):
        t = y / h
        c = int(18 + t * 12)
        d.line((0, y, w, y), fill=(c, c // 2 + 8, c // 3 + 4, 240))
    d.line((0, 0, w, 0), fill=(200, 160, 80, 180), width=2)
    return im


def build_animals() -> None:
    print("animals")
    for name in ANIMALS:
        src = SRC / f"zoo-animal-{name.replace('_', '-')}-source.png"
        if not src.exists():
            print(f"  skip missing {src}")
            continue
        cut = cutout_simple(src)
        save(fit(cut, w=256), f"animals/{name}-portrait.webp")
        save(fit(cut, w=128), f"animals/{name}-sm.webp")
        save(fit(cut, w=72), f"animals/{name}-track.webp")
        save(fit(cut, w=400), f"animals/{name}-winner.webp")


def build_background() -> None:
    print("background")
    src = SRC / "zoo-bg-source.png"
    if src.exists():
        im = Image.open(src).convert("RGB")
        im = crop_aspect(im, 896 / 414, anchor=0.32)
        save(fit(im, w=1792), "bg/jungle.webp", quality=88)
        lite = fit(im, w=96).filter(ImageFilter.GaussianBlur(2))
        save(fit(lite, w=640), "bg/jungle-lite.webp", quality=72)
    else:
        im = Image.new("RGB", (1792, 828), (8, 18, 14))
        save(im, "bg/jungle.webp")
        save(fit(im, w=640), "bg/jungle-lite.webp")


def build_board() -> None:
    print("board")
    src = SRC / "zoo-board-bezel-source.png"
    if src.exists():
        im = Image.open(src).convert("RGBA")
        save(fit(im, w=1400), "board/bezel.webp", quality=92)
    well = Image.new("RGBA", (1200, 600), (0, 0, 0, 0))
    d = ImageDraw.Draw(well)
    d.rounded_rectangle((0, 0, 1199, 599), radius=20, fill=(12, 28, 18))
    d.rounded_rectangle((4, 4, 1195, 595), radius=18, outline=(80, 140, 90, 120), width=2)
    save(well, "board/well.webp")
    realm = SRC / "zoo-central-realm-source.png"
    if realm.exists():
        save(fit(crop_aspect(Image.open(realm).convert("RGB"), 1.2), w=600), "board/realm.webp", quality=88)


def build_banners() -> None:
    print("banners")
    for kind in ("start", "stop"):
        src = SRC / f"zoo-banner-{kind}-source.png"
        if src.exists():
            save(fit(crop_aspect(Image.open(src).convert("RGBA"), 3.2), w=720), f"banners/{kind}.webp", quality=90)
    loading = SRC / "zoo-loading-source.png"
    if loading.exists():
        save(fit(crop_aspect(Image.open(loading).convert("RGB"), 896 / 414), w=896), "loading/hero.webp", quality=88)
    ribbon = SRC / "zoo-winner-ribbon-source.png"
    if ribbon.exists():
        save(fit(Image.open(ribbon).convert("RGBA"), w=420), "ui/ribbon.webp", quality=90)


def build_chips() -> None:
    print("chips")
    for value in CHIP_SPECS:
        chip = build_chip(value)
        save(fit(chip, w=192), f"chips/chip-{value}.webp")
        save(fit(chip, w=96), f"chips/chip-{value}-sm.webp")


def build_tiles() -> None:
    print("tiles")
    for state in ("normal", "active", "winner"):
        save(build_tile(state), f"tiles/{state}.webp", quality=95)


def build_fx_all() -> None:
    print("fx")
    for name in ("rays", "shock", "sparks", "glow"):
        save(build_fx(name), f"fx/{name}.webp")


def build_ui() -> None:
    print("ui")
    save(build_round_btn(), "ui/btn-round.webp")
    save(build_timer_bezel(), "ui/timer-bezel.webp")
    save(build_tower(), "ui/tower.webp")
    save(build_deck(), "ui/deck.webp")
    save(build_ui_panel("beast", 200, 80, (24, 72, 38)), "ui/panel-beast.webp")
    save(build_ui_panel("bird", 200, 80, (36, 42, 110)), "ui/panel-bird.webp")
    save(build_ui_panel("shark", 280, 90, (16, 52, 92)), "ui/panel-shark.webp")
    # simple icon placeholders
    for ico in ("back", "sound", "help", "rebet", "tri", "plus"):
        im = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse((4, 4, 60, 60), fill=(50, 40, 80, 200), outline=(200, 160, 80))
        save(im, f"ui/ico-{ico}.webp")
    avatar = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(avatar)
    d.ellipse((4, 4, 92, 92), outline=(220, 180, 80), width=6)
    d.ellipse((16, 16, 80, 80), fill=(60, 80, 120))
    save(avatar, "ui/avatar-frame.webp")


def main() -> None:
    print(f"Zoo Roulette assets → {OUT}")
    build_background()
    build_board()
    build_animals()
    build_chips()
    build_tiles()
    build_fx_all()
    build_banners()
    build_ui()
    print("done")


if __name__ == "__main__":
    main()
