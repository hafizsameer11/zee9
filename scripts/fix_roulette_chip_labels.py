#!/usr/bin/env python3
"""Render correct 2K/5K/10K centers into roulette chip assets."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CHIPS = ROOT / "public" / "games" / "roulette" / "chips"
FONT = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf")


def render(source: Path, destination: Path, label: str) -> None:
    image = Image.open(source).convert("RGBA")
    size = image.width
    draw = ImageDraw.Draw(image)

    center = (size / 2, size * 0.515)
    radius = size * (0.205 if size >= 100 else 0.215)
    fill = (255, 242, 199, 255)
    gold = (156, 104, 8, 255)
    outline = max(1, round(size * 0.018))
    draw.ellipse(
        (
            center[0] - radius,
            center[1] - radius,
            center[0] + radius,
            center[1] + radius,
        ),
        fill=fill,
        outline=gold,
        width=outline,
    )

    font_size = round(size * (0.18 if len(label) <= 2 else 0.145))
    font = ImageFont.truetype(str(FONT), font_size)
    draw.text(
        center,
        label,
        font=font,
        fill=gold,
        anchor="mm",
        stroke_width=max(0, round(size * 0.004)),
        stroke_fill=(255, 250, 225, 255),
    )
    image.save(destination)


for denomination, label in ((2000, "2K"), (5000, "5K"), (10000, "10K")):
    render(CHIPS / "chip-1000.png", CHIPS / f"chip-{denomination}.png", label)
    render(CHIPS / "chip-1000-sm.png", CHIPS / f"chip-{denomination}-sm.png", label)

