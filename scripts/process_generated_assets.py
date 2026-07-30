#!/usr/bin/env python3
"""Process Cursor GenerateImage raw assets into casino-table production PNGs."""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

RAW = Path("/root/.cursor/projects/var-www-zee9/assets")
OUT = Path("/var/www/zee9/public/games/casino-table")


def font(size: int):
    for p in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ):
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def remove_dark_bg(im: Image.Image, thresh: int = 38) -> Image.Image:
    """Make near-black / very dark pixels transparent."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if r <= thresh and g <= thresh and b <= thresh:
                px[x, y] = (r, g, b, 0)
            elif r + g + b < thresh * 4:
                # soft edge
                lum = (r + g + b) / 3
                na = int(max(0, min(255, (lum - thresh) * 8)))
                if na < a:
                    px[x, y] = (r, g, b, na)
    return im


def remove_teal_bg(im: Image.Image) -> Image.Image:
    """Remove dark teal studio backdrop used for avatars."""
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # dark teal / cyan-ish backdrop
            if g > r + 15 and b > r and g < 120 and r < 80 and (r + g + b) < 220:
                px[x, y] = (r, g, b, 0)
            elif r < 40 and g < 70 and b < 75:
                px[x, y] = (r, g, b, 0)
    return im


def circular_crop(im: Image.Image, size: int = 192) -> Image.Image:
    im = ImageOps.fit(im, (size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((1, 1, size - 2, size - 2), fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0))
    out.putalpha(mask)
    return out


def content_bbox(im: Image.Image, alpha_min: int = 20):
    a = im.split()[-1]
    return a.getbbox()


def trim_and_fit(im: Image.Image, box: tuple[int, int], pad: int = 4) -> Image.Image:
    bb = content_bbox(im)
    if not bb:
        return Image.new("RGBA", box, (0, 0, 0, 0))
    cropped = im.crop(bb)
    # fit inside box preserving aspect
    tw, th = box
    cropped.thumbnail((tw - pad * 2, th - pad * 2), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", box, (0, 0, 0, 0))
    canvas.paste(cropped, ((tw - cropped.width) // 2, (th - cropped.height) // 2), cropped)
    return canvas


def process_avatars():
    for i in range(1, 7):
        src = RAW / f"avatar-{i:02d}-raw.png"
        if not src.exists():
            print("missing", src)
            continue
        im = Image.open(src)
        im = remove_teal_bg(im)
        im = remove_dark_bg(im, 28)
        # tight crop on opaque content then circle
        bb = content_bbox(im)
        if bb:
            im = im.crop(bb)
        circ = circular_crop(im, 192)
        circ.resize((96, 96), Image.Resampling.LANCZOS).save(OUT / f"players/player-{i:02d}.png", optimize=True)
        circ.resize((96, 96), Image.Resampling.LANCZOS).save(OUT / f"players/player-{i:02d}.webp", quality=90)
        print("avatar", i)


def process_chips():
    mapping = {
        "10": "chip-10-raw.png",
        "50": "chip-50-raw.png",
        "100": "chip-100-raw.png",
        "500": "chip-500-raw.png",
        "1k": "chip-1k-raw.png",
    }
    for tag, name in mapping.items():
        src = RAW / name
        if not src.exists():
            print("missing chip", name)
            continue
        im = remove_dark_bg(Image.open(src), 42)
        base = trim_and_fit(im, (256, 256), 8)
        # selector / large
        base.resize((110, 110), Image.Resampling.LANCZOS).save(OUT / f"chips/chip-{tag}-selector.png", optimize=True)
        base.resize((128, 128), Image.Resampling.LANCZOS).save(OUT / f"chips/chip-{tag}-large.png", optimize=True)
        # small board variants with rotations
        for i, rot in enumerate((0, 18, -22, 8)):
            sm = base.rotate(rot, resample=Image.Resampling.BICUBIC, expand=True)
            sm = trim_and_fit(sm, (96, 96), 2)
            out = sm.resize((48, 48), Image.Resampling.LANCZOS)
            letter = chr(ord("a") + i)
            out.save(OUT / f"chips/chip-{tag}-small-{letter}.png", optimize=True)
        print("chip", tag)


def stamp_balls():
    """Use generated colour spheres as bases; stamp numbers 0-9."""
    families = {
        "green": RAW / "ball-green-raw.png",
        "red": RAW / "ball-red-raw.png",
        "purple": RAW / "ball-purple-raw.png",
    }
    bases = {}
    for fam, path in families.items():
        if not path.exists():
            print("missing ball", path)
            continue
        im = remove_dark_bg(Image.open(path), 40)
        bases[fam] = trim_and_fit(im, (256, 256), 6)

    def fam_for(n: int) -> str:
        if n in (0, 5):
            return "purple"
        return "green" if n % 2 == 1 else "red"

    sizes = {"history": 40, "cell": 44, "machine": 56, "reveal": 96}
    for n in range(10):
        fam = fam_for(n)
        if fam not in bases:
            continue
        ball = bases[fam].copy()
        # cover old number disc with fresh white + our digit
        d = ImageDraw.Draw(ball)
        cx = cy = 128
        r = 46
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(250, 250, 252, 255))
        f = font(72)
        label = str(n)
        bbox = d.textbbox((0, 0), label, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((256 - tw) / 2, (256 - th) / 2 - 6), label, font=f, fill=(20, 20, 24, 255))
        for name, sz in sizes.items():
            ball.resize((sz, sz), Image.Resampling.LANCZOS).save(
                OUT / f"balls/ball-{n}-{name}.png", optimize=True
            )
        print("ball", n)


def process_add():
    src = RAW / "btn-add-raw.png"
    if not src.exists():
        return
    im = remove_dark_bg(Image.open(src), 35)
    # also kill dark navy studio backdrop
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and r < 50 and g < 55 and b < 80 and b >= g:
                px[x, y] = (r, g, b, 0)
    out = trim_and_fit(im, (320, 120), 4)
    out.resize((168, 58), Image.Resampling.LANCZOS).save(OUT / "navigation/btn-add.png", optimize=True)
    print("add button")


def process_footer():
    src = RAW / "footer-console-raw.png"
    if not src.exists():
        return
    im = remove_dark_bg(Image.open(src), 18)
    # keep dark glass — only remove pure black canvas
    out = trim_and_fit(im, (900, 200), 2)
    # force width
    out = out.resize((850, 160), Image.Resampling.LANCZOS)
    # boost alpha on dark pixels that are part of console (re-darken soft edges)
    out.save(OUT / "controls/footer-console.png", optimize=True)
    out.save(OUT / "controls/footer-console.webp", quality=90)
    print("footer")


def brighter_table():
    """Brighten existing table-base toward reference turquoise."""
    p = OUT / "background/table-base.png"
    im = Image.open(p).convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # lift mid teal
            g2 = min(255, int(g * 1.18 + 12))
            b2 = min(255, int(b * 1.12 + 8))
            r2 = min(255, int(r * 1.05 + 4))
            # centre boost
            dx = (x - w / 2) / (w * 0.45)
            dy = (y - h * 0.38) / (h * 0.5)
            t = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy))
            g2 = min(255, int(g2 + 35 * t))
            b2 = min(255, int(b2 + 28 * t))
            r2 = min(255, int(r2 + 8 * t))
            px[x, y] = (r2, g2, b2, a)
    im.save(p, optimize=True)
    im.save(OUT / "background/table-base.webp", quality=90)
    print("table brightened")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    process_avatars()
    process_chips()
    stamp_balls()
    process_add()
    process_footer()
    brighter_table()
    print("done")


if __name__ == "__main__":
    main()
