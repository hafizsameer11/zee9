#!/usr/bin/env python3
"""Build the Car Roulette art package into public/games/car-roulette."""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from cr_assets import (
    SRC,
    OUT,
    cutout,
    frame_cutout,
    decontaminate,
    trim,
    fit,
    save,
    crop_aspect,
)

BRANDS = ["zephyra", "kavaro", "nordheim", "ashlyne", "taurion", "regalis", "scudera", "vornik"]
FONT = "/tmp/crfont/SairaCondensed-Bold.ttf"

# Denomination -> source chip colourway
CHIPS = {10: "blue", 50: "green", 100: "red", 500: "purple", 1000: "gold"}
CHIP_LABEL = {10: "10", 50: "50", 100: "100", 500: "500", 1000: "1K"}
# Ink colour for the stamped value, tuned per colourway for contrast.
CHIP_INK = {
    "blue": (14, 30, 62),
    "green": (12, 44, 24),
    "red": (60, 12, 12),
    "purple": (44, 16, 62),
    "gold": (54, 34, 6),
}

FACE = dict(cx=516, cy=505, rx=252, ry=150)


def stamp_chip(colour, label):
    """Print the denomination onto the chip face, squashed to the face ellipse."""
    base = Image.open(os.path.join(SRC, f"cr-chip-{colour}.png")).convert("RGB")
    up = 3
    w = FACE["rx"] * 2 * up
    h = int(FACE["ry"] * 2 * up / 0.62)  # render upright, squash later
    layer = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(layer)
    size = int(h * 0.78)
    font = ImageFont.truetype(FONT, size)
    while d.textlength(label, font=font) > w * 0.86:
        size = int(size * 0.94)
        font = ImageFont.truetype(FONT, size)
    box = d.textbbox((0, 0), label, font=font)
    d.text(
        ((w - (box[2] - box[0])) / 2 - box[0], (h - (box[3] - box[1])) / 2 - box[1]),
        label,
        font=font,
        fill=255,
    )
    layer = layer.resize((FACE["rx"] * 2, FACE["ry"] * 2), Image.LANCZOS)

    ink = np.zeros((base.height, base.width), np.float32)
    x0, y0 = FACE["cx"] - FACE["rx"], FACE["cy"] - FACE["ry"]
    ink[y0 : y0 + layer.height, x0 : x0 + layer.width] = np.asarray(layer, np.float32) / 255.0

    arr = np.asarray(base, np.float32)
    col = np.array(CHIP_INK[colour], np.float32)
    # Soft bottom-edge highlight sells the deboss without a hard outline.
    lift = np.clip(np.roll(ink, 5, axis=0) - ink, 0, 1) * 0.55
    a = ink[..., None]
    arr = arr * (1 - a) + col * a
    arr = arr + lift[..., None] * np.array([235, 240, 255], np.float32) * 0.5
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))


def build_chips():
    print("chips")
    for value, colour in CHIPS.items():
        stamped = stamp_chip(colour, CHIP_LABEL[value])
        tmp = f"/tmp/cr_chip_{value}.png"
        stamped.save(tmp)
        im = trim(cutout(tmp))
        save(fit(im, w=192), f"chips/chip-{value}.webp")
        save(fit(im, w=96), f"chips/chip-{value}-sm.webp")


def build_background():
    print("background")
    im = Image.open(os.path.join(SRC, "cr-bg-showroom.png")).convert("RGB")
    im = crop_aspect(im, 896 / 414, anchor=0.30)
    save(fit(im, w=1792), "bg/showroom.webp", quality=88)
    blur = fit(im, w=96).filter(ImageFilter.GaussianBlur(2))
    save(fit(blur, w=640), "bg/showroom-lite.webp", quality=70)


def build_board():
    print("board")
    save(fit(trim(frame_cutout(os.path.join(SRC, "cr-board-chassis.png"))), w=1400), "board/chassis.webp")
    well = Image.open(os.path.join(SRC, "cr-inner-well.png")).convert("RGB")
    save(fit(crop_aspect(well, 2.0), w=1200), "board/well.webp", quality=88)


def build_tiles():
    print("tiles")
    for state in ["normal", "active", "winner"]:
        im = trim(cutout(os.path.join(SRC, f"cr-tile-{state}.png")))
        save(fit(im, w=192, h=192), f"tiles/{state}.webp")


def build_emblems():
    print("emblems")
    for b in BRANDS:
        im = trim(cutout(os.path.join(SRC, f"cr-emb-{b}.png")))
        side = max(im.size)
        pad = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        pad.alpha_composite(im, ((side - im.width) // 2, (side - im.height) // 2))
        save(fit(pad, w=256), f"emblems/{b}.webp")
        save(fit(pad, w=96), f"emblems/{b}-sm.webp")


def build_cars():
    print("cars")
    for b in BRANDS:
        im = trim(cutout(os.path.join(SRC, f"cr-car-{b}.png")))
        save(fit(im, w=1024), f"cars/{b}.webp", quality=94)


UI = {
    "cr-ui-btn-round.png": ("ui/btn-round.webp", 192),
    "cr-ui-avatar-frame.png": ("ui/avatar-frame.webp", 192),
    "cr-ui-panel.png": ("ui/panel.webp", 640),
    "cr-ui-tower.png": ("ui/tower.webp", 240),
    "cr-ui-dialog.png": ("ui/dialog.webp", 900),
    "cr-timer-bezel.png": ("ui/timer-bezel.webp", 320),
    "cr-ico-back.png": ("ui/ico-back.webp", 128),
    "cr-ico-settings.png": ("ui/ico-settings.webp", 128),
    "cr-ico-sound.png": ("ui/ico-sound.webp", 128),
    "cr-ico-plus.png": ("ui/ico-plus.webp", 128),
    "cr-ico-rebet.png": ("ui/ico-rebet.webp", 128),
    "cr-ico-tri.png": ("ui/ico-tri.webp", 128),
    "cr-ico-help.png": ("ui/ico-help.webp", 128),
}


def build_ui():
    print("ui")
    for src, (rel, w) in UI.items():
        save(fit(trim(cutout(os.path.join(SRC, src))), w=w), rel)


def build_banners():
    print("banners")
    for src, rel in [("cr-ban-start.png", "banners/start.webp"), ("cr-ban-stop.png", "banners/stop.webp")]:
        save(fit(trim(cutout(os.path.join(SRC, src))), w=900), rel)


def build_fx():
    """Additive sprites keep their black plate — they are composited with screen blend."""
    print("fx")
    for src, rel, w in [
        ("cr-fx-shock.png", "fx/shock.webp", 512),
        ("cr-fx-rays.png", "fx/rays.webp", 512),
        ("cr-fx-speed.png", "fx/speed.webp", 1024),
        ("cr-fx-sparks.png", "fx/sparks.webp", 768),
    ]:
        im = Image.open(os.path.join(SRC, src)).convert("RGB")
        save(fit(im, w=w), rel, quality=88)


if __name__ == "__main__":
    import sys

    steps = {
        "bg": build_background,
        "board": build_board,
        "tiles": build_tiles,
        "emblems": build_emblems,
        "cars": build_cars,
        "chips": build_chips,
        "ui": build_ui,
        "banners": build_banners,
        "fx": build_fx,
    }
    want = sys.argv[1:] or list(steps)
    for k in want:
        steps[k]()
    print("done")
