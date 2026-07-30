"""Regenerate WinGo Lottery 2K/5K/10K chips from the 1K masters."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CHIPS = ROOT / "public/games/casino-table/chips"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


def clean_label(image: Image.Image, box: tuple[int, int, int, int]) -> None:
    """Paint over the old text using an interpolated sample of its background."""
    px = image.load()
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        left = px[x0 - 2, y]
        right = px[x1 + 1, y]
        width = max(1, x1 - x0 - 1)
        for x in range(x0, x1):
            t = (x - x0) / width
            px[x, y] = tuple(round(left[i] * (1 - t) + right[i] * t) for i in range(4))


def draw_centered(
    image: Image.Image,
    label: str,
    center: tuple[float, float],
    size: int,
    fill: tuple[int, int, int, int],
    stroke: int = 0,
    stroke_fill: tuple[int, int, int, int] = (0, 0, 0, 255),
) -> None:
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(FONT, size)
    draw.text(
        center,
        label,
        font=font,
        fill=fill,
        anchor="mm",
        stroke_width=stroke,
        stroke_fill=stroke_fill,
    )


def make_standard(source: Path, target: Path, label: str, kind: str) -> None:
    image = Image.open(source).convert("RGBA")
    if kind == "selector":
        clean_label(image, (34, 44, 77, 69))
        draw_centered(image, label, (55, 56), 23 if len(label) == 2 else 19, (174, 126, 48, 255))
    elif kind == "large":
        clean_label(image, (31, 48, 97, 82))
        draw_centered(image, label, (64, 64), 29 if len(label) == 2 else 24, (174, 126, 48, 255))
    else:
        clean_label(image, (13, 18, 35, 30))
        draw_centered(image, label, (24, 24), 10 if len(label) == 2 else 8, (154, 106, 35, 255))
    image.save(target, optimize=True)


def make_large_2x(source: Path, target: Path, label: str) -> None:
    image = Image.open(source).convert("RGBA")
    draw = ImageDraw.Draw(image)
    # This master has a dark center rather than the ivory center used elsewhere.
    draw.ellipse((108, 108, 204, 210), fill=(7, 8, 10, 255))
    draw_centered(
        image,
        label,
        (156, 159),
        66 if len(label) == 2 else 52,
        (255, 219, 76, 255),
        stroke=1,
        stroke_fill=(91, 65, 4, 255),
    )
    image.save(target, optimize=True)


def main() -> None:
    for tag in ("2k", "5k", "10k"):
        label = tag.upper()
        for suffix in ("selector", "large", "small-a", "small-b", "small-c", "small-d"):
            kind = "small" if suffix.startswith("small") else suffix
            make_standard(
                CHIPS / f"chip-1k-{suffix}.png",
                CHIPS / f"chip-{tag}-{suffix}.png",
                label,
                kind,
            )
        make_large_2x(
            CHIPS / "chip-1k-large@2x.png",
            CHIPS / f"chip-{tag}-large@2x.png",
            label,
        )


if __name__ == "__main__":
    main()
