#!/usr/bin/env python3
"""Process generated AeroX assets: chroma-key, crop, resize, plus procedural UI."""
from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = Path("/root/.cursor/projects/var-www-zee9/assets")
OUT = ROOT / "public" / "games" / "aero-x"
LOBBY = ROOT / "public" / "games" / "aero-x.png"
SEED = 20260725


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
    for sub in ("character", "environment", "effects", "ui", "controls", "loading"):
        (OUT / sub).mkdir(parents=True, exist_ok=True)


def save(img: Image.Image, rel: str, also_webp: bool = False) -> None:
    path = OUT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    img = img.convert("RGBA")
    img.save(path, "PNG", optimize=True)
    if also_webp:
        img.save(path.with_suffix(".webp"), "WEBP", quality=88, method=6)
    print("wrote", rel, img.size)


def chroma_key(img: Image.Image, tol: int = 72, spill: float = 0.55) -> Image.Image:
    """Remove green-screen / near-green backgrounds; also handles light gray checkers poorly — prefer green."""
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # strong green dominance
            if g > r + 30 and g > b + 30 and g > 80:
                dist = min(g - r, g - b)
                if dist > 18:
                    alpha = max(0, 255 - int((dist / tol) * 255))
                    if alpha < 40:
                        px[x, y] = (0, 0, 0, 0)
                    else:
                        # despill
                        ng = int(g * (1 - spill) + ((r + b) / 2) * spill)
                        px[x, y] = (r, ng, b, alpha)
            # also nuke pure #00FF00-ish
            if r < 40 and g > 200 and b < 40:
                px[x, y] = (0, 0, 0, 0)
    return img


def crop_alpha(img: Image.Image, pad: int = 8) -> Image.Image:
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


def process_character(src_name: str, out_name: str, size: int = 256) -> None:
    p = SRC / src_name
    img = Image.open(p).convert("RGBA")
    # idle may have light gray / checker — try chroma then also remove near-white corners
    img = chroma_key(img)
    # remove residual light backgrounds near edges
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 8:
                continue
            # checker-ish light gray
            if r > 200 and g > 200 and b > 200 and abs(r - g) < 12 and abs(g - b) < 12:
                px[x, y] = (0, 0, 0, 0)
            # soft green leftovers
            if g > 160 and r < 120 and b < 120:
                px[x, y] = (0, 0, 0, 0)
    img = crop_alpha(img, 12)
    img = fit(img, size, size)
    # slight sharpen
    img = img.filter(ImageFilter.UnsharpMask(radius=1.2, percent=80, threshold=2))
    save(img, f"character/{out_name}.png", also_webp=True)


def process_logo() -> None:
    img = chroma_key(Image.open(SRC / "aerox-logo.png"))
    # remove green remnants + crop
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if g > 180 and r < 100 and b < 100:
                px[x, y] = (0, 0, 0, 0)
    img = crop_alpha(img, 10)
    # target header logo ~220x56
    h = 56
    w = max(160, int(img.width * (h / img.height)))
    img = img.resize((w, h), Image.Resampling.LANCZOS)
    save(img, "ui/logo.png", also_webp=True)


def process_bg() -> None:
    img = Image.open(SRC / "aerox-bg.png").convert("RGBA")
    img = img.resize((1280, 720), Image.Resampling.LANCZOS)
    # deepen + subtle blue center
    dark = ImageEnhance.Brightness(img).enhance(0.72)
    dark = ImageEnhance.Color(dark).enhance(0.85)
    overlay = Image.new("RGBA", dark.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(overlay)
    cx, cy = dark.width // 2, dark.height // 2
    for i, alpha in enumerate((40, 28, 16, 8)):
        r = 180 + i * 90
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(20, 40, 90, alpha))
    overlay = overlay.filter(ImageFilter.GaussianBlur(60))
    out = Image.alpha_composite(dark, overlay)
    # grain
    rnd = rng()
    grain = Image.new("RGBA", out.size, (0, 0, 0, 0))
    gp = grain.load()
    for _ in range(12000):
        x = rnd.randint(0, out.width - 1)
        y = rnd.randint(0, out.height - 1)
        v = rnd.randint(0, 40)
        gp[x, y] = (v, v, v + 5, 28)
    grain = grain.filter(ImageFilter.GaussianBlur(0.6))
    out = Image.alpha_composite(out, grain)
    save(out, "environment/bg.png", also_webp=True)


def process_clouds() -> None:
    img = chroma_key(Image.open(SRC / "aerox-clouds.png"), tol=90)
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if g > 160 and r < 120 and b < 120:
                px[x, y] = (0, 0, 0, 0)
    # Split into columns roughly
    w, h = img.size
    cols = 5
    cw = w // cols
    for i in range(cols):
        piece = img.crop((i * cw, 0, (i + 1) * cw if i < cols - 1 else w, h))
        piece = crop_alpha(piece, 6)
        if piece.getbbox() is None:
            continue
        # normalize height
        th = 96
        tw = max(64, int(piece.width * (th / max(1, piece.height))))
        piece = piece.resize((tw, th), Image.Resampling.LANCZOS)
        # soft edge
        piece = ImageEnhance.Brightness(piece).enhance(1.1)
        save(piece, f"environment/cloud-{i + 1}.png", also_webp=True)

    # Also make clean procedural outline clouds as backup premium set
    for i in range(4):
        make_outline_cloud(i)


def make_outline_cloud(idx: int) -> None:
    rnd = random.Random(SEED + idx * 17)
    w, h = 160 + idx * 20, 70 + idx * 8
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    blobs = []
    base_y = h * 0.55
    x = 18
    while x < w - 24:
        rw = rnd.randint(28, 48)
        rh = rnd.randint(22, 36)
        cy = base_y + rnd.randint(-8, 6)
        blobs.append((x, cy - rh / 2, x + rw, cy + rh / 2))
        x += rw * 0.55
    # fill soft body
    for b in blobs:
        d.ellipse(b, fill=(210, 225, 245, 28))
    # outline
    outline = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    od = ImageDraw.Draw(outline)
    for b in blobs:
        od.ellipse(b, outline=(200, 220, 255, 160), width=2)
    outline = outline.filter(ImageFilter.GaussianBlur(0.4))
    img = Image.alpha_composite(img, outline)
    glow = img.filter(ImageFilter.GaussianBlur(3))
    glow = ImageEnhance.Brightness(glow).enhance(1.4)
    img = Image.alpha_composite(glow, img)
    save(img, f"environment/cloud-outline-{idx + 1}.png", also_webp=True)


def process_trail() -> None:
    img = chroma_key(Image.open(SRC / "aerox-trail.png"), tol=100)
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if g > 150 and r < 130 and b < 130:
                px[x, y] = (0, 0, 0, 0)
    img = crop_alpha(img, 8)
    img = fit(img, 256, 256)
    save(img, "effects/trail-sheet.png", also_webp=True)

    # procedural soft particles
    for i, (sz, blur) in enumerate([(48, 3), (32, 2), (24, 2), (64, 5), (40, 3)]):
        p = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        d = ImageDraw.Draw(p)
        d.ellipse((2, 2, sz - 3, sz - 3), fill=(255, 140, 40, 200))
        d.ellipse((sz * 0.25, sz * 0.25, sz * 0.75, sz * 0.75), fill=(255, 220, 140, 180))
        p = p.filter(ImageFilter.GaussianBlur(blur))
        save(p, f"effects/particle-{i + 1}.png")

    # smoke puff
    for i in range(3):
        sz = 80 + i * 20
        p = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
        d = ImageDraw.Draw(p)
        for _ in range(6):
            ox = random.Random(SEED + i * 9 + _).randint(8, sz - 24)
            oy = random.Random(SEED + i * 11 + _).randint(8, sz - 24)
            rr = random.Random(SEED + i * 13 + _).randint(14, 28)
            d.ellipse((ox, oy, ox + rr, oy + rr), fill=(255, 120, 40, 70))
        p = p.filter(ImageFilter.GaussianBlur(6))
        save(p, f"effects/smoke-{i + 1}.png")


def process_panel() -> None:
    img = Image.open(SRC / "aerox-panel-tex.png").convert("RGBA")
    img = img.resize((512, 512), Image.Resampling.LANCZOS)
    img = ImageEnhance.Brightness(img).enhance(0.55)
    img = ImageEnhance.Contrast(img).enhance(1.2)
    save(img, "ui/panel-texture.png", also_webp=True)


def process_icons() -> None:
    img = chroma_key(Image.open(SRC / "aerox-icons.png"), tol=90)
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if g > 150 and r < 120 and b < 120:
                px[x, y] = (0, 0, 0, 0)
    # Also generate clean procedural icons (more reliable at small sizes)
    make_icon_menu()
    make_icon_mute(False)
    make_icon_mute(True)
    make_icon_clock()
    make_icon_help()
    make_icon_plus_minus()


def round_btn(size: int, fill, icon_draw) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((1, 1, size - 2, size - 2), fill=fill)
    d.ellipse((1, 1, size - 2, size - 2), outline=(90, 95, 110, 220), width=1)
    icon_draw(d, size)
    return img


def make_icon_menu() -> None:
    def draw(d, s):
        m = s // 2
        for i, y in enumerate((-8, 0, 8)):
            d.rounded_rectangle((m - 9, m + y - 1, m + 9, m + y + 1), radius=1, fill=(240, 240, 245, 255))

    save(round_btn(48, (28, 30, 36, 255), draw), "controls/icon-menu.png")


def make_icon_mute(muted: bool) -> None:
    def draw(d, s):
        m = s // 2
        d.polygon([(m - 8, m - 4), (m - 2, m - 4), (m + 4, m - 9), (m + 4, m + 9), (m - 2, m + 4), (m - 8, m + 4)], fill=(240, 240, 245, 255))
        d.ellipse((m - 10, m - 3, m - 4, m + 3), fill=(240, 240, 245, 255))
        if muted:
            d.line((m - 10, m + 10, m + 10, m - 10), fill=(255, 90, 70, 255), width=2)

    name = "icon-mute.png" if muted else "icon-sound.png"
    save(round_btn(48, (28, 30, 36, 255), draw), f"controls/{name}")


def make_icon_clock() -> None:
    def draw(d, s):
        m = s // 2
        d.ellipse((m - 9, m - 9, m + 9, m + 9), outline=(240, 240, 245, 255), width=2)
        d.line((m, m, m, m - 5), fill=(240, 240, 245, 255), width=2)
        d.line((m, m, m + 4, m + 2), fill=(255, 140, 40, 255), width=2)

    save(round_btn(40, (22, 24, 30, 255), draw), "controls/icon-history.png")


def make_icon_help() -> None:
    def draw(d, s):
        m = s // 2
        d.ellipse((2, 2, s - 3, s - 3), fill=(255, 140, 30, 255))
        f = font(22)
        d.text((m - 5, m - 12), "?", fill=(20, 20, 24, 255), font=f)

    save(round_btn(40, (255, 140, 30, 255), draw), "controls/icon-help.png")


def make_icon_plus_minus() -> None:
    for name, symbol in (("plus", "+"), ("minus", "−")):
        img = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((0, 0, 39, 39), radius=6, fill=(18, 20, 26, 255), outline=(70, 74, 88, 255), width=1)
        f = font(22)
        bbox = d.textbbox((0, 0), symbol, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text(((40 - tw) / 2, (40 - th) / 2 - 2), symbol, fill=(230, 232, 240, 255), font=f)
        save(img, f"controls/{name}.png")


def make_history_pills() -> None:
    colors = {
        "cyan": (70, 190, 230),
        "violet": (170, 110, 230),
        "pink": (240, 90, 180),
        "accent": (255, 150, 80),
    }
    for name, col in colors.items():
        img = Image.new("RGBA", (72, 28), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((0, 0, 71, 27), radius=8, fill=(*col, 40), outline=(*col, 200), width=1)
        save(img, f"ui/pill-{name}.png")


def make_bet_btn() -> None:
    # green bet
    img = Image.new("RGBA", (220, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, 219, 95), radius=10, fill=(18, 170, 55, 255))
    # inner highlight
    hi = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.rounded_rectangle((3, 3, 216, 40), radius=8, fill=(255, 255, 255, 45))
    hi = hi.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, hi)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, 219, 95), radius=10, outline=(120, 255, 160, 120), width=1)
    save(img, "controls/btn-bet.png")

    # cashout orange
    img = Image.new("RGBA", (220, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, 219, 95), radius=10, fill=(230, 120, 20, 255))
    hi = Image.new("RGBA", img.size, (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.rounded_rectangle((3, 3, 216, 40), radius=8, fill=(255, 255, 255, 40))
    hi = hi.filter(ImageFilter.GaussianBlur(2))
    img = Image.alpha_composite(img, hi)
    save(img, "controls/btn-cashout.png")

    # cancel / waiting
    img = Image.new("RGBA", (220, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, 219, 95), radius=10, fill=(90, 40, 40, 255))
    save(img, "controls/btn-cancel.png")


def process_lobby() -> None:
    img = Image.open(SRC / "aerox-lobby.png").convert("RGBA")
    img = img.resize((512, 512), Image.Resampling.LANCZOS)
    img.save(LOBBY, "PNG", optimize=True)
    print("wrote lobby thumb", LOBBY)


def make_loading_mark() -> None:
    img = Image.new("RGBA", (320, 100), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    f1 = font(42)
    f2 = font(48)
    d.text((20, 24), "Aero", fill=(240, 242, 248, 255), font=f1)
    # measure Aero
    bbox = d.textbbox((20, 24), "Aero", font=f1)
    d.text((bbox[2] - 2, 18), "X", fill=(255, 130, 30, 255), font=f2)
    # orange slash under X
    d.line((bbox[2] + 4, 78, bbox[2] + 36, 70), fill=(255, 140, 40, 200), width=3)
    save(img, "loading/wordmark.png", also_webp=True)


def main() -> None:
    ensure()
    process_character("aerox-char-idle.png", "idle", 256)
    process_character("aerox-char-prep.png", "prep", 256)
    process_character("aerox-char-run.png", "run", 256)
    process_character("aerox-char-fly.png", "fly", 256)
    process_character("aerox-char-accel.png", "accel", 256)
    process_character("aerox-char-away.png", "away", 280)
    process_logo()
    process_bg()
    process_clouds()
    process_trail()
    process_panel()
    process_icons()
    make_history_pills()
    make_bet_btn()
    process_lobby()
    make_loading_mark()
    print("done")


if __name__ == "__main__":
    main()
