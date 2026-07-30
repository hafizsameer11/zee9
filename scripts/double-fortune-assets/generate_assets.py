#!/usr/bin/env python3
"""Process AI art + generate Double Fortune UI chrome into public/games/double-fortune."""
from __future__ import annotations

import math
import os
import random
import shutil
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path("/var/www/zee9/public/games/double-fortune")
AI = Path("/var/www/zee9/tmp/df-ai")
ASSETS_CURSOR = Path("/root/.cursor/projects/var-www-zee9/assets")
RNG = random.Random(270726)


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf",
    ]
    for p in cands:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def save(im: Image.Image, rel: str, webp=False):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im.save(path, "PNG", optimize=True)
    if webp or (im.width * im.height > 200_000 and rel.endswith(".png")):
        im.save(path.with_suffix(".webp"), "WEBP", quality=88, method=6)
    print("wrote", rel, im.size)


def remove_bg_corners(im: Image.Image, tol=38, soft=22) -> Image.Image:
    """Knock out background using corner-sampled key color."""
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    h, w = arr.shape[:2]
    samples = [
        arr[2, 2, :3],
        arr[2, w - 3, :3],
        arr[h - 3, 2, :3],
        arr[h - 3, w - 3, :3],
        arr[h // 2, 2, :3],
        arr[h // 2, w - 3, :3],
    ]
    key = np.median(samples, axis=0)
    dist = np.sqrt(((arr[..., :3] - key) ** 2).sum(axis=2))
    alpha = arr[..., 3].copy()
    # Only punch if corners look like solid bg (not already transparent)
    if alpha[2, 2] < 10 and alpha[2, w - 3] < 10:
        return Image.fromarray(arr.astype(np.uint8), "RGBA")
    alpha = np.where(dist <= tol, 0, alpha)
    mid = (dist > tol) & (dist < tol + soft)
    fade = (dist - tol) / soft
    alpha = np.where(mid, alpha * fade, alpha)
    arr[..., 3] = alpha
    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    # Clean fringe
    out = out.filter(ImageFilter.MinFilter(3))
    a = out.split()[-1]
    a = a.filter(ImageFilter.GaussianBlur(0.6))
    out.putalpha(a)
    return out


def trim_alpha(im: Image.Image, pad=4) -> Image.Image:
    a = im.split()[-1]
    bbox = a.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(im.width, x1 + pad)
    y1 = min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def fit_square(im: Image.Image, size: int, fill=0.92) -> Image.Image:
    im = trim_alpha(im)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    tw = int(size * fill)
    th = int(size * fill)
    im = ImageOps.contain(im, (tw, th), Image.Resampling.LANCZOS)
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return canvas


def load_ai(name: str) -> Image.Image | None:
    for base in (AI, ASSETS_CURSOR):
        p = base / name
        if p.exists():
            return Image.open(p).convert("RGBA")
    return None


def process_ai_assets():
    # Sync latest from cursor assets
    if ASSETS_CURSOR.exists():
        for p in ASSETS_CURSOR.glob("df-*.png"):
            shutil.copy2(p, AI / p.name)

    mapping = {
        "df-couple-hero.png": ("characters/couple.png", (780, 900), False, 28),
        "df-loading-bg.png": ("loading/bg.png", (780, 1688), True, 0),
        "df-logo.png": ("ui/logo.png", (720, 320), False, 42),
        "df-lantern.png": ("environment/lantern.png", (280, 420), False, 36),
        "df-stage-bg.png": ("backgrounds/stage.png", (780, 1040), True, 0),
        "df-spin-btn.png": ("controls/spin.png", (256, 256), False, 40),
        "df-banner.png": ("frames/banner.png", (720, 120), False, 35),
        "df-x8.png": ("ui/x8.png", (220, 220), False, 38),
        "df-coin.png": ("particles/coin.png", (96, 96), False, 40),
        "df-get-started.png": ("ui/get-started.png", (560, 140), False, 40),
        "df-sym-wild.png": ("symbols/wild.png", (256, 256), False, 36),
        "df-sym-double-happiness.png": ("symbols/happiness.png", (256, 256), False, 36),
        "df-sym-rings.png": ("symbols/rings.png", (256, 256), False, 36),
        "df-sym-shoes.png": ("symbols/shoes.png", (256, 256), False, 36),
        "df-sym-envelopes.png": ("symbols/envelopes.png", (256, 256), False, 36),
        "df-sym-cakes.png": ("symbols/cakes.png", (256, 256), False, 36),
        "df-sym-a.png": ("symbols/letter-a.png", (256, 256), False, 38),
        "df-sym-q.png": ("symbols/letter-q.png", (256, 256), False, 38),
        "df-sym-j.png": ("symbols/letter-j.png", (256, 256), False, 38),
        "df-sym-scatter.png": ("symbols/scatter.png", (256, 256), False, 36),
    }

    for src, (dest, size, keep_bg, tol) in mapping.items():
        im = load_ai(src)
        if im is None:
            print("MISSING", src)
            continue
        if not keep_bg and tol > 0:
            im = remove_bg_corners(im, tol=tol)
            im = trim_alpha(im)
        if dest.startswith("symbols/") or dest in ("controls/spin.png", "particles/coin.png", "ui/x8.png"):
            im = fit_square(im, size[0], 0.94 if "spin" not in dest else 0.98)
        else:
            im = ImageOps.contain(im, size, Image.Resampling.LANCZOS)
            if dest == "ui/logo.png":
                im = trim_alpha(im)
            if dest == "characters/couple.png":
                # Soft vignette edges already handled; keep as-is sized
                canvas = Image.new("RGBA", size, (0, 0, 0, 0))
                im2 = ImageOps.contain(im, size, Image.Resampling.LANCZOS)
                canvas.paste(im2, ((size[0] - im2.width) // 2, size[1] - im2.height), im2)
                im = canvas
            if dest == "loading/bg.png" or dest == "backgrounds/stage.png":
                im = im.resize(size, Image.Resampling.LANCZOS)
        save(im, dest, webp=dest.endswith("bg.png") or "stage" in dest or "loading" in dest)


def gold_gradient_text(draw, xy, text, fnt, fill_top=(255, 240, 190), fill_bot=(200, 140, 40)):
    # Simple single-color gold with outline
    x, y = xy
    for ox, oy in [(-2, 0), (2, 0), (0, -2), (0, 2), (-2, -2), (2, 2)]:
        draw.text((x + ox, y + oy), text, font=fnt, fill=(90, 20, 20, 255))
    draw.text((x, y), text, font=fnt, fill=(*fill_top, 255))


def make_reel_frame():
    W, H = 720, 480
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Outer gold frame
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=18, outline=(210, 160, 55, 255), width=6)
    d.rounded_rectangle([10, 10, W - 11, H - 11], radius=14, outline=(255, 220, 140, 200), width=2)
    d.rounded_rectangle([14, 14, W - 15, H - 15], radius=12, outline=(120, 50, 20, 220), width=3)
    # Inner lacquer panel
    inner = Image.new("RGBA", (W - 36, H - 36), (0, 0, 0, 0))
    idr = ImageDraw.Draw(inner)
    for y in range(inner.height):
        t = y / max(1, inner.height - 1)
        # brighter centre
        c = (
            clamp(90 + 40 * (1 - abs(t - 0.5) * 2)),
            clamp(12 + 18 * (1 - abs(t - 0.5) * 2)),
            clamp(18 + 10 * (1 - abs(t - 0.5) * 2)),
            245,
        )
        idr.line([(0, y), (inner.width, y)], fill=c)
    # subtle pattern
    for x in range(0, inner.width, 28):
        for y in range(0, inner.height, 28):
            idr.ellipse([x + 8, y + 8, x + 18, y + 18], outline=(140, 40, 40, 35), width=1)
    im.paste(inner, (18, 18), inner)
    # Corner ornaments
    for cx, cy, sx, sy in [(36, 36, 1, 1), (W - 36, 36, -1, 1), (36, H - 36, 1, -1), (W - 36, H - 36, -1, -1)]:
        pts = [
            (cx, cy),
            (cx + 28 * sx, cy),
            (cx + 28 * sx, cy + 8 * sy),
            (cx + 8 * sx, cy + 8 * sy),
            (cx + 8 * sx, cy + 28 * sy),
            (cx, cy + 28 * sy),
        ]
        d.polygon(pts, fill=(230, 180, 70, 255))
        d.line(pts + [pts[0]], fill=(255, 230, 160, 200), width=1)
    save(im, "frames/reel-frame.png")


def make_banner_fallback():
    if (ROOT / "frames/banner.png").exists():
        return
    W, H = 720, 110
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # scroll ends
    d.ellipse([0, 10, 50, H - 10], fill=(200, 150, 50, 255))
    d.ellipse([W - 50, 10, W, H - 10], fill=(200, 150, 50, 255))
    d.rounded_rectangle([24, 8, W - 25, H - 9], radius=20, fill=(120, 18, 22, 255), outline=(220, 170, 60, 255), width=5)
    d.rounded_rectangle([32, 16, W - 33, H - 17], radius=14, outline=(255, 210, 120, 160), width=2)
    save(im, "frames/banner.png")


def make_control_btn(name: str, glyph: str, size=128):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    r = size // 2 - 4
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(70, 12, 18, 255), outline=(200, 150, 55, 255), width=4)
    d.ellipse([cx - r + 5, cy - r + 5, cx + r - 5, cy + r - 5], outline=(255, 210, 130, 120), width=2)
    # highlight
    d.arc([cx - r + 8, cy - r + 6, cx + r - 8, cy], 200, 340, fill=(255, 230, 180, 90), width=3)
    f = font(int(size * 0.42))
    bbox = d.textbbox((0, 0), glyph, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw // 2, cy - th // 2 - 4), glyph, font=f, fill=(255, 230, 170, 255))
    save(im, f"controls/{name}.png")


def make_icon_btns():
    make_control_btn("minus", "−")
    make_control_btn("plus", "+")
    # turbo
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([4, 4, 124, 124], fill=(70, 12, 18, 255), outline=(200, 150, 55, 255), width=4)
    # lightning
    pts = [(68, 22), (48, 62), (60, 62), (52, 106), (84, 58), (70, 58), (88, 22)]
    d.polygon(pts, fill=(255, 220, 120, 255))
    save(im, "controls/turbo.png")
    # auto
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([4, 4, 124, 124], fill=(70, 12, 18, 255), outline=(200, 150, 55, 255), width=4)
    d.arc([28, 28, 100, 100], 40, 300, fill=(255, 220, 140, 255), width=7)
    d.polygon([(92, 28), (108, 48), (82, 50)], fill=(255, 220, 140, 255))
    d.polygon([(54, 48), (78, 64), (54, 80)], fill=(255, 220, 140, 255))
    save(im, "controls/auto.png")
    # settings / tools
    im = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([2, 2, 94, 94], fill=(60, 10, 16, 230), outline=(190, 145, 50, 255), width=3)
    d.ellipse([34, 34, 62, 62], outline=(255, 220, 150, 255), width=4)
    for ang in range(0, 360, 45):
        rad = math.radians(ang)
        x0 = 48 + math.cos(rad) * 18
        y0 = 48 + math.sin(rad) * 18
        x1 = 48 + math.cos(rad) * 30
        y1 = 48 + math.sin(rad) * 30
        d.line([(x0, y0), (x1, y1)], fill=(255, 220, 150, 255), width=5)
    save(im, "controls/settings.png")
    # sound
    im = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([2, 2, 94, 94], fill=(60, 10, 16, 230), outline=(190, 145, 50, 255), width=3)
    d.polygon([(28, 40), (42, 40), (58, 28), (58, 68), (42, 56), (28, 56)], fill=(255, 220, 150, 255))
    d.arc([58, 34, 78, 62], -60, 60, fill=(255, 220, 150, 255), width=3)
    save(im, "controls/sound.png")
    # info
    im = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([2, 2, 94, 94], fill=(60, 10, 16, 230), outline=(190, 145, 50, 255), width=3)
    f = font(42)
    d.text((40, 22), "i", font=f, fill=(255, 220, 150, 255))
    save(im, "controls/info.png")
    # lobby home
    im = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([2, 2, 94, 94], fill=(20, 20, 24, 180), outline=(255, 255, 255, 160), width=2)
    d.polygon([(48, 26), (72, 48), (64, 48), (64, 70), (32, 70), (32, 48), (24, 48)], fill=(255, 255, 255, 230))
    save(im, "controls/lobby.png")


def make_get_started_fallback():
    if (ROOT / "ui/get-started.png").exists():
        return
    W, H = 560, 120
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([4, 4, W - 5, H - 5], radius=28, fill=(230, 180, 40, 255), outline=(160, 100, 20, 255), width=5)
    d.rounded_rectangle([12, 12, W - 13, H - 13], radius=22, outline=(255, 240, 180, 200), width=2)
    f = font(42)
    text = "GET STARTED"
    bbox = d.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((W - tw) // 2, 34), text, font=f, fill=(90, 30, 20, 255))
    save(im, "ui/get-started.png")


def make_x8_fallback():
    if (ROOT / "ui/x8.png").exists():
        return
    im = Image.new("RGBA", (220, 220), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([8, 8, 212, 212], fill=(130, 20, 28, 255), outline=(220, 170, 55, 255), width=8)
    d.ellipse([22, 22, 198, 198], outline=(255, 220, 140, 180), width=3)
    f = font(72)
    d.text((48, 62), "×8", font=f, fill=(255, 230, 150, 255))
    save(im, "ui/x8.png")


def make_win_banners():
    for label, fname in [("BIG WIN", "big-win.png"), ("MEGA WIN", "mega-win.png"), ("FREE SPINS", "free-spins.png")]:
        W, H = 640, 180
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([20, 30, W - 21, H - 31], radius=16, fill=(100, 15, 22, 230), outline=(230, 180, 60, 255), width=5)
        f = font(56)
        bbox = d.textbbox((0, 0), label, font=f)
        tw = bbox[2] - bbox[0]
        gold_gradient_text(d, ((W - tw) // 2, 58), label, f)
        save(im, f"ui/{fname}")


def make_control_deck():
    W, H = 780, 220
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H
        c = (clamp(90 - t * 50), clamp(10 - t * 5), clamp(18 - t * 8), 240)
        d.line([(0, y), (W, y)], fill=c)
    # gold separators
    d.line([(0, 8), (W, 8)], fill=(200, 150, 55, 120), width=2)
    # subtle pattern
    for x in range(0, W, 40):
        d.line([(x, 0), (x + 20, H)], fill=(140, 40, 40, 25), width=1)
    save(im, "frames/control-deck.png", webp=True)


def make_info_strip():
    W, H = 720, 64
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 4, W - 1, H - 5], radius=18, fill=(55, 10, 16, 220), outline=(160, 100, 40, 160), width=2)
    save(im, "frames/info-strip.png")


def make_particles():
    # spark
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([16, 16, 32, 32], fill=(255, 230, 140, 255))
    im = im.filter(ImageFilter.GaussianBlur(2))
    save(im, "particles/spark.png")
    # petal
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([10, 14, 38, 36], fill=(255, 140, 160, 200))
    d.ellipse([18, 10, 30, 40], fill=(255, 110, 140, 180))
    save(im, "particles/petal.png")
    # dust
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([4, 4, 12, 12], fill=(255, 210, 120, 180))
    save(im, "particles/dust.png")
    # coin variants if missing
    if not (ROOT / "particles/coin.png").exists():
        im = Image.new("RGBA", (96, 96), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse([8, 8, 88, 88], fill=(220, 170, 50, 255), outline=(140, 90, 20, 255), width=4)
        d.ellipse([20, 20, 76, 76], outline=(255, 230, 140, 200), width=3)
        f = font(28)
        d.text((32, 32), "囍", font=f, fill=(160, 40, 30, 255))
        save(im, "particles/coin.png")
    # angled coins
    base = Image.open(ROOT / "particles/coin.png").convert("RGBA")
    for i, ang in enumerate([15, -25, 40, -10, 55]):
        rot = base.rotate(ang, resample=Image.Resampling.BICUBIC, expand=True)
        save(rot, f"particles/coin-{i}.png")


def make_curtain_layers():
    # Left curtain strip
    W, H = 180, 900
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for x in range(W):
        fold = 0.55 + 0.45 * abs(math.sin(x / 18))
        for y in range(H):
            shade = 0.75 + 0.25 * math.sin(y / 40 + x / 30)
            r = clamp(140 * fold * shade)
            g = clamp(18 * fold * shade)
            b = clamp(28 * fold * shade)
            a = 255 if x < W - 20 else clamp(255 * (W - x) / 20)
            im.putpixel((x, y), (r, g, b, a))
    # gold trim
    d.line([(W - 22, 0), (W - 22, H)], fill=(200, 150, 55, 180), width=3)
    save(im, "environment/curtain-left.png", webp=True)
    save(ImageOps.mirror(im), "environment/curtain-right.png", webp=True)


def make_studio_intro():
    W, H = 512, 512
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    # Zee9-style geometric mark (original, not PG)
    cx, cy = W // 2, H // 2
    for i, col in enumerate([(80, 220, 255), (120, 255, 140), (255, 200, 80)]):
        off = (i - 1) * 18
        d.rectangle([cx - 60 + off, cy - 60 + off, cx - 20 + off, cy - 20 + off], outline=(*col, 255), width=3)
        d.rectangle([cx + 20 + off, cy - 60 + off, cx + 60 + off, cy - 20 + off], outline=(*col, 255), width=3)
        d.rectangle([cx - 60 + off, cy + 20 + off, cx - 20 + off, cy + 60 + off], outline=(*col, 255), width=3)
        d.rectangle([cx + 20 + off, cy + 20 + off, cx + 60 + off, cy + 60 + off], outline=(*col, 255), width=3)
    f = font(22)
    d.text((cx - 90, cy + 100), "DIFFERENCE MAKES", font=f, fill=(220, 220, 220, 255))
    d.text((cx - 80, cy + 128), "THE DIFFERENCE", font=f, fill=(220, 220, 220, 255))
    save(im, "loading/studio.png")


def make_letter_k():
    """Extra low symbol K for variety."""
    im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # gold plaque
    d.rounded_rectangle([28, 28, 228, 228], radius=24, fill=(180, 120, 35, 255), outline=(255, 220, 140, 255), width=6)
    d.rounded_rectangle([42, 42, 214, 214], radius=18, outline=(120, 40, 20, 200), width=3)
    f = font(120)
    for ox, oy in [(-3, 0), (3, 0), (0, -3), (0, 3)]:
        d.text((78 + ox, 55 + oy), "K", font=f, fill=(90, 20, 20, 255))
    d.text((78, 55), "K", font=f, fill=(255, 235, 170, 255))
    save(im, "symbols/letter-k.png")


def make_lobby_thumb():
    W, H = 480, 640
    bg = load_ai("df-loading-bg.png") or load_ai("df-stage-bg.png")
    if bg:
        im = bg.resize((W, H), Image.Resampling.LANCZOS).convert("RGBA")
    else:
        im = Image.new("RGBA", (W, H), (120, 20, 30, 255))
    logo = ROOT / "ui/logo.png"
    if logo.exists():
        lg = Image.open(logo).convert("RGBA")
        lg = ImageOps.contain(lg, (400, 160), Image.Resampling.LANCZOS)
        im.paste(lg, ((W - lg.width) // 2, 40), lg)
    couple = ROOT / "characters/couple.png"
    if couple.exists():
        cp = Image.open(couple).convert("RGBA")
        cp = ImageOps.contain(cp, (360, 400), Image.Resampling.LANCZOS)
        im.paste(cp, ((W - cp.width) // 2, H - cp.height - 20), cp)
    save(im, "lobby-thumb.png")
    # also root lobby thumb
    out = Path("/var/www/zee9/public/games/double-fortune.png")
    im.convert("RGB").save(out, "PNG", optimize=True)
    im.save(out.with_suffix(".webp"), "WEBP", quality=85)
    print("wrote lobby thumb", out)


def make_sfx():
    sfx = ROOT / "sfx"
    sfx.mkdir(parents=True, exist_ok=True)
    specs = {
        "button": ("sine", 880, 0.06),
        "spin": ("sawtooth", 120, 0.35),
        "reelstop": ("sine", 440, 0.08),
        "win": ("sine", 660, 0.25),
        "bigwin": ("sawtooth", 220, 0.55),
        "scatter": ("triangle", 520, 0.22),
        "wild": ("sine", 390, 0.18),
        "freespin": ("sine", 300, 0.45),
        "bet": ("sine", 500, 0.05),
        "turbo": ("square", 700, 0.1),
        "coin": ("sine", 980, 0.12),
        "ambience": ("sine", 110, 2.0),
        "chime": ("sine", 1040, 0.2),
        "curtain": ("sawtooth", 80, 0.4),
    }
    for name, (wave, freq, dur) in specs.items():
        out = sfx / f"{name}.mp3"
        # generate wav then mp3 via ffmpeg
        cmd = [
            "ffmpeg", "-y", "-f", "lavfi",
            "-i", f"aevalsrc='0.15*sin(2*PI*{freq}*t)':s=44100:d={dur}",
            "-af", "afade=t=out:st={}:d=0.05".format(max(0.01, dur - 0.05)),
            str(out),
        ]
        # richer sounds for key events
        if name == "bigwin":
            cmd = [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", f"aevalsrc='0.12*(sin(2*PI*330*t)+sin(2*PI*440*t)+sin(2*PI*550*t))':s=44100:d={dur}",
                str(out),
            ]
        elif name == "ambience":
            cmd = [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "anoisesrc=color=pink:amplitude=0.03:d=4",
                "-af", "lowpass=f=400",
                str(out),
            ]
        elif name == "spin":
            cmd = [
                "ffmpeg", "-y", "-f", "lavfi",
                "-i", "anoisesrc=color=brown:amplitude=0.08:d=0.4",
                "-af", "bandpass=f=200:width_type=h:w=150",
                str(out),
            ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            print("sfx", name)
        except Exception as e:
            print("sfx fail", name, e)


def ensure_fallbacks():
    # If any symbol missing, create gold plaque placeholder
    needed = [
        "wild", "happiness", "rings", "shoes", "envelopes", "cakes",
        "letter-a", "letter-q", "letter-j", "scatter",
    ]
    for n in needed:
        p = ROOT / "symbols" / f"{n}.png"
        if p.exists():
            continue
        im = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.rounded_rectangle([20, 20, 236, 236], radius=28, fill=(160, 30, 40, 255), outline=(220, 170, 55, 255), width=6)
        f = font(36)
        d.text((60, 100), n[:6].upper(), font=f, fill=(255, 220, 140, 255))
        save(im, f"symbols/{n}.png")


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    AI.mkdir(parents=True, exist_ok=True)
    process_ai_assets()
    make_reel_frame()
    make_banner_fallback()
    make_icon_btns()
    make_get_started_fallback()
    make_x8_fallback()
    make_win_banners()
    make_control_deck()
    make_info_strip()
    make_particles()
    make_curtain_layers()
    make_studio_intro()
    make_letter_k()
    ensure_fallbacks()
    make_lobby_thumb()
    make_sfx()
    print("DONE", ROOT)


if __name__ == "__main__":
    main()
