#!/usr/bin/env python3
"""Generate original premium Royal Ace (Super Ace) casino card-slot assets."""
from __future__ import annotations

import math
import os
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

ROOT = Path("/var/www/zee9/public/games/super-ace")
AI = Path("/var/www/zee9/tmp/superace-ai")
RNG = random.Random(260726)


def font(size: int, bold: bool = True) -> ImageFont.ImageFont:
    cands = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ]
    for p in cands:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(v)))


def lerp(a, b, t):
    return a + (b - a) * t


def mix(c1, c2, t):
    n = min(len(c1), len(c2))
    return tuple(clamp(lerp(c1[i], c2[i], t)) for i in range(n)) + c1[n:]


def save(im: Image.Image, rel: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    if im.mode != "RGBA":
        im = im.convert("RGBA")
    im.save(path, "PNG", optimize=True)
    # also webp for heavy backgrounds
    if im.width * im.height > 180_000 and rel.endswith(".png"):
        wp = path.with_suffix(".webp")
        im.save(wp, "WEBP", quality=88, method=6)
    print("wrote", rel, im.size)


def noise(im: Image.Image, amount=10, density=40):
    arr = np.array(im.convert("RGBA"), dtype=np.int16)
    h, w = arr.shape[:2]
    n = max(1, w * h // density)
    xs = RNG.choices(range(w), k=n)
    ys = RNG.choices(range(h), k=n)
    for x, y in zip(xs, ys):
        if arr[y, x, 3] < 8:
            continue
        d = RNG.randint(-amount, amount)
        arr[y, x, 0] = clamp(int(arr[y, x, 0]) + d)
        arr[y, x, 1] = clamp(int(arr[y, x, 1]) + d)
        arr[y, x, 2] = clamp(int(arr[y, x, 2]) + d)
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def radial(w, h, cx, cy, inner, outer, power=1.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    maxd = math.hypot(max(cx, w - cx), max(cy, h - cy))
    t = np.clip((np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / maxd) ** power, 0, 1)
    inn = np.array(inner[:3], dtype=np.float32)
    out = np.array(outer[:3], dtype=np.float32)
    rgb = inn + (out - inn) * t[..., None]
    a_in = inner[3] if len(inner) > 3 else 255
    a_out = outer[3] if len(outer) > 3 else 255
    alpha = (a_in + (a_out - a_in) * t)[..., None]
    arr = np.concatenate([rgb, alpha], axis=2).astype(np.uint8)
    return Image.fromarray(arr, "RGBA")


# ─── background removal helpers ─────────────────────────────────────────────

def remove_bg_by_key(im: Image.Image, key=(245, 240, 230), tol=42, soft=18) -> Image.Image:
    """Knock out near-key background with soft edges (numpy)."""
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    kr, kg, kb = key
    dist = np.sqrt((arr[..., 0] - kr) ** 2 + (arr[..., 1] - kg) ** 2 + (arr[..., 2] - kb) ** 2)
    alpha = arr[..., 3]
    alpha = np.where(dist <= tol, 0, alpha)
    mid = (dist > tol) & (dist < tol + soft)
    alpha = np.where(mid, alpha * (dist - tol) / soft, alpha)
    arr[..., 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def remove_near_black(im: Image.Image, thresh=28, soft=20) -> Image.Image:
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    lum = (arr[..., 0] + arr[..., 1] + arr[..., 2]) / 3
    alpha = arr[..., 3]
    alpha = np.where(lum <= thresh, 0, alpha)
    mid = (lum > thresh) & (lum < thresh + soft)
    alpha = np.where(mid, alpha * (lum - thresh) / soft, alpha)
    arr[..., 3] = alpha
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def trim_alpha(im: Image.Image, pad=4) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


# ─── materials ───────────────────────────────────────────────────────────────

def make_felt(w=780, h=1688):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx, cy = w * 0.5, h * 0.42
    weave = (((xx.astype(np.int32) // 2) % 3 - 1) + ((yy.astype(np.int32) // 2) % 3 - 1)).astype(np.float32)
    dx = (xx - cx) / (w * 0.55)
    dy = (yy - cy) / (h * 0.55)
    vig = np.clip(np.sqrt(dx * dx + dy * dy) ** 1.15, 0, 1)
    wave = 0.35 + 0.2 * np.sin(xx * 0.04) * np.sin(yy * 0.03)
    mid = np.array([18, 110, 64], dtype=np.float32)
    base = np.array([12, 88, 52], dtype=np.float32)
    dark = np.array([6, 48, 28], dtype=np.float32)
    light = np.array([40, 140, 80], dtype=np.float32)
    c = mid + (base - mid) * wave[..., None]
    c = c + (dark - c) * (vig * 0.72)[..., None]
    c = c + weave[..., None] * np.array([3, 4, 2], dtype=np.float32)
    spot = np.exp(-((xx - cx) ** 2) / (2 * (w * 0.28) ** 2) - ((yy - cy) ** 2) / (2 * (h * 0.22) ** 2))
    c = c + (light - c) * (spot * 0.35)[..., None]
    c = np.clip(c, 0, 255)
    alpha = np.full((h, w, 1), 255, dtype=np.float32)
    arr = np.concatenate([c, alpha], axis=2).astype(np.uint8)
    im = Image.fromarray(arr, "RGBA")
    im = noise(im, 8, 28)
    im = im.filter(ImageFilter.GaussianBlur(0.4))
    save(im, "backgrounds/felt.png")
    return im


def wood_strip(w, h, curve_top=True):
    """Polished mahogany rail."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    px = im.load()
    for y in range(h):
        t = y / max(1, h - 1)
        # gloss band
        gloss = math.exp(-((t - 0.28) ** 2) / 0.012) * 0.55
        gloss2 = math.exp(-((t - 0.62) ** 2) / 0.04) * 0.18
        base = mix((72, 28, 14), (38, 14, 8), t)
        base = mix(base, (120, 62, 28), gloss)
        base = mix(base, (90, 40, 18), gloss2)
        base = mix(base, (18, 6, 4), max(0, t - 0.75) * 1.4)
        for x in range(w):
            grain = math.sin(x * 0.085 + t * 4) * 6 + math.sin(x * 0.31) * 3
            # curved profile fade at ends
            edge = min(x, w - 1 - x) / (w * 0.08)
            edge_a = min(1.0, edge)
            if curve_top:
                # slight arch: thinner at ends
                arch = abs(x - w / 2) / (w / 2)
                y_cut = int(h * 0.08 * arch * arch)
                if y < y_cut:
                    continue
            c = (clamp(base[0] + grain), clamp(base[1] + grain * 0.5), clamp(base[2]))
            a = clamp(255 * edge_a)
            px[x, y] = (*c, a)
    # gold inlay line
    d = ImageDraw.Draw(im)
    gy = int(h * 0.78)
    for i in range(3):
        col = (210, 170, 70, 160 - i * 40)
        d.line([(int(w * 0.06), gy + i), (int(w * 0.94), gy + i)], fill=col, width=1)
    noise(im, 6, 50)
    return im


def make_wood_rails():
    top = wood_strip(780, 120, True)
    save(top, "frames/wood-top.png")
    bot = wood_strip(780, 160, False)
    # flip gloss for bottom rail
    bot = ImageOps.flip(bot)
    save(bot, "frames/wood-bottom.png")


def make_board_frame(w=700, h=780):
    """Dark teal recessed board with silver/gold metallic border."""
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # outer gold
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=18, fill=(48, 32, 12, 255))
    d.rounded_rectangle([3, 3, w - 4, h - 4], radius=16, fill=(180, 140, 55, 255))
    d.rounded_rectangle([6, 6, w - 7, h - 7], radius=14, fill=(90, 70, 30, 255))
    # silver inner
    d.rounded_rectangle([9, 9, w - 10, h - 10], radius=12, fill=(160, 175, 185, 255))
    d.rounded_rectangle([12, 12, w - 13, h - 13], radius=10, fill=(40, 55, 62, 255))
    # recessed teal well
    well = Image.new("RGBA", (w - 28, h - 28), (0, 0, 0, 0))
    wp = well.load()
    ww, wh = well.size
    for y in range(wh):
        for x in range(ww):
            t = y / max(1, wh - 1)
            c = mix((18, 48, 55), (10, 28, 34), t)
            # inner shadow near edges
            edge = min(x, y, ww - 1 - x, wh - 1 - y)
            shade = max(0, 1 - edge / 18)
            c = mix(c, (4, 10, 12), shade * 0.55)
            wp[x, y] = (*c, 255)
    noise(well, 5, 60)
    im.paste(well, (14, 14), well)
    # top highlight on silver rim
    d.arc([9, 9, w - 10, 40], 200, 340, fill=(230, 240, 245, 180), width=2)
    save(im, "frames/board.png")
    return im


def make_multiplier_bar(w=520, h=72):
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=(90, 55, 18, 255))
    d.rounded_rectangle([3, 3, w - 4, h - 4], radius=h // 2 - 2, fill=(160, 110, 35, 255))
    d.rounded_rectangle([6, 6, w - 7, h - 7], radius=h // 2 - 4, fill=(55, 28, 12, 255))
    # segments
    vals = ["×1", "×2", "×3", "×5"]
    seg_w = (w - 20) / 4
    f = font(28)
    for i, v in enumerate(vals):
        x0 = 10 + i * seg_w
        # divider
        if i:
            d.line([(x0, 14), (x0, h - 14)], fill=(120, 80, 30, 160), width=2)
        # inactive gold text
        bbox = d.textbbox((0, 0), v, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx = x0 + (seg_w - tw) / 2
        ty = (h - th) / 2 - 2
        d.text((tx + 1, ty + 1), v, font=f, fill=(30, 12, 4, 200))
        d.text((tx, ty), v, font=f, fill=(170, 130, 55, 220))
    # gloss
    gloss = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.rounded_rectangle([8, 6, w - 9, h // 2], radius=20, fill=(255, 230, 150, 45))
    im = Image.alpha_composite(im, gloss)
    save(im, "ui/multiplier-bar.png")
    # active glow capsules
    for i, v in enumerate(vals):
        cap = Image.new("RGBA", (int(seg_w) + 8, h - 8), (0, 0, 0, 0))
        cd = ImageDraw.Draw(cap)
        cd.rounded_rectangle([0, 0, cap.width - 1, cap.height - 1], radius=cap.height // 2, fill=(255, 190, 40, 230))
        cd.rounded_rectangle([3, 3, cap.width - 4, cap.height - 4], radius=cap.height // 2 - 2, fill=(255, 220, 80, 255))
        bbox = cd.textbbox((0, 0), v, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        cd.text(((cap.width - tw) / 2, (cap.height - th) / 2 - 2), v, font=f, fill=(90, 40, 0, 255))
        # glow
        glow = cap.filter(ImageFilter.GaussianBlur(6))
        out = Image.new("RGBA", (cap.width + 16, cap.height + 16), (0, 0, 0, 0))
        out.paste(glow, (8, 8), glow)
        out.paste(cap, (8, 8), cap)
        save(out, f"ui/mult-active-{i}.png")
    return im


# ─── suit drawing ────────────────────────────────────────────────────────────

def draw_spade(d, cx, cy, s, fill, outline=None):
    # classic spade from arcs + stem
    pts_top = []
    for i in range(21):
        a = math.pi + i * math.pi / 20
        pts_top.append((cx + math.cos(a) * s * 0.55, cy - s * 0.15 + math.sin(a) * s * 0.35))
    # diamond tip
    tip = [(cx, cy - s * 0.95), (cx - s * 0.62, cy - s * 0.05), (cx, cy + s * 0.15), (cx + s * 0.62, cy - s * 0.05)]
    d.polygon(tip, fill=fill)
    d.ellipse([cx - s * 0.55, cy - s * 0.45, cx, cy + s * 0.15], fill=fill)
    d.ellipse([cx, cy - s * 0.45, cx + s * 0.55, cy + s * 0.15], fill=fill)
    # stem
    d.polygon([(cx - s * 0.12, cy + s * 0.05), (cx + s * 0.12, cy + s * 0.05), (cx + s * 0.28, cy + s * 0.85), (cx - s * 0.28, cy + s * 0.85)], fill=fill)
    if outline:
        d.line(tip + [tip[0]], fill=outline, width=max(1, s // 28))


def draw_heart(d, cx, cy, s, fill):
    d.ellipse([cx - s * 0.62, cy - s * 0.55, cx, cy + s * 0.15], fill=fill)
    d.ellipse([cx, cy - s * 0.55, cx + s * 0.62, cy + s * 0.15], fill=fill)
    d.polygon([(cx - s * 0.62, cy - s * 0.05), (cx + s * 0.62, cy - s * 0.05), (cx, cy + s * 0.85)], fill=fill)


def draw_diamond(d, cx, cy, s, fill):
    d.polygon([(cx, cy - s * 0.9), (cx + s * 0.58, cy), (cx, cy + s * 0.9), (cx - s * 0.58, cy)], fill=fill)


def draw_club(d, cx, cy, s, fill):
    r = s * 0.38
    for ox, oy in [(-r * 0.95, -r * 0.15), (r * 0.95, -r * 0.15), (0, -r * 1.15)]:
        d.ellipse([cx + ox - r, cy + oy - r, cx + ox + r, cy + oy + r], fill=fill)
    d.ellipse([cx - r * 0.7, cy - r * 0.35, cx + r * 0.7, cy + r * 0.95], fill=fill)
    d.polygon([(cx - s * 0.1, cy + s * 0.2), (cx + s * 0.1, cy + s * 0.2), (cx + s * 0.26, cy + s * 0.9), (cx - s * 0.26, cy + s * 0.9)], fill=fill)


def suit_with_sheen(draw_fn, size, color, sheen=(255, 255, 255)):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    cx = cy = size // 2
    s = size * 0.38
    # shadow
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    draw_fn(sd, cx + 2, cy + 3, s, (*color[:3], 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2))
    im = Image.alpha_composite(im, shadow)
    d = ImageDraw.Draw(im)
    draw_fn(d, cx, cy, s, color)
    # bevel highlight mask
    highlight = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(highlight)
    draw_fn(hd, cx - size * 0.04, cy - size * 0.06, s * 0.92, (*sheen, 70))
    im = Image.alpha_composite(im, highlight)
    return im


def make_suit_icons():
    specs = [
        ("spade", draw_spade, (12, 16, 28, 255), (180, 200, 220)),
        ("heart", draw_heart, (190, 28, 45, 255), (255, 180, 180)),
        ("diamond", draw_diamond, (210, 70, 35, 255), (255, 200, 140)),
        ("club", draw_club, (25, 55, 140, 255), (160, 190, 255)),
    ]
    for name, fn, col, sheen in specs:
        icon = suit_with_sheen(fn, 256, col, sheen)
        save(icon, f"symbols/suit-{name}.png")


# ─── card construction ───────────────────────────────────────────────────────

CARD_W, CARD_H = 256, 360


def card_base(gold=False):
    im = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if gold:
        # golden card face
        for y in range(8, CARD_H - 8):
            t = (y - 8) / (CARD_H - 16)
            c = mix((255, 230, 120), (210, 160, 40), t)
            d.line([(8, y), (CARD_W - 9, y)], fill=(*c, 255))
        d.rounded_rectangle([4, 4, CARD_W - 5, CARD_H - 5], radius=14, outline=(255, 210, 80, 255), width=5)
        d.rounded_rectangle([8, 8, CARD_W - 9, CARD_H - 9], radius=11, outline=(160, 100, 20, 200), width=2)
    else:
        for y in range(8, CARD_H - 8):
            t = (y - 8) / (CARD_H - 16)
            c = mix((252, 248, 238), (236, 228, 210), t)
            # paper texture
            if y % 5 == 0:
                c = mix(c, (230, 220, 200), 0.08)
            d.line([(8, y), (CARD_W - 9, y)], fill=(*c, 255))
        d.rounded_rectangle([4, 4, CARD_W - 5, CARD_H - 5], radius=14, outline=(55, 70, 80, 230), width=3)
        d.rounded_rectangle([7, 7, CARD_W - 8, CARD_H - 8], radius=12, outline=(200, 205, 210, 120), width=1)
        # top edge reflection
        d.arc([10, 8, CARD_W - 11, 50], 200, 340, fill=(255, 255, 255, 90), width=2)
    # soft contact shadow baked lightly at bottom
    return im


def corner_index(im, letter, suit_fn, color, gold=False):
    d = ImageDraw.Draw(im)
    f = font(36)
    col = (40, 30, 10, 255) if gold else color
    d.text((14, 10), letter, font=f, fill=col)
    # mini suit
    mini = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    md = ImageDraw.Draw(mini)
    suit_fn(md, 24, 24, 16, col)
    im.paste(mini, (12, 48), mini)
    # inverted bottom-right
    flipped = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    fd = ImageDraw.Draw(flipped)
    fd.text((CARD_W - 42, CARD_H - 52), letter, font=f, fill=col)
    flipped.paste(mini, (CARD_W - 52, CARD_H - 90), mini)
    flipped = flipped.rotate(180)
    im = Image.alpha_composite(im, flipped)
    return im


def make_suit_cards():
    suits = [
        ("spade", "A", draw_spade, (12, 16, 28, 255)),  # low spade uses A as placeholder? No - separate
    ]
    # Low suits: S H D C without letter - use suit letter style
    mapping = [
        ("spade", "♠", draw_spade, (12, 16, 28, 255), "S"),
        ("heart", "♥", draw_heart, (190, 28, 45, 255), "H"),
        ("diamond", "♦", draw_diamond, (210, 70, 35, 255), "D"),
        ("club", "♣", draw_club, (25, 55, 140, 255), "C"),
    ]
    for name, _uni, fn, col, letter in mapping:
        for gold in (False, True):
            card = card_base(gold=gold)
            # large center suit
            icon = suit_with_sheen(fn, 200, col if not gold else (80, 40, 10, 255), (255, 255, 255))
            card.paste(icon, ((CARD_W - 200) // 2, (CARD_H - 200) // 2 - 10), icon)
            card = corner_index(card, letter, fn, col, gold=gold)
            # contact shadow layer exported separately? bake soft bottom
            shadow = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
            sd = ImageDraw.Draw(shadow)
            sd.ellipse([20, CARD_H - 28, CARD_W - 20, CARD_H - 6], fill=(0, 0, 0, 50))
            shadow = shadow.filter(ImageFilter.GaussianBlur(4))
            out = Image.alpha_composite(shadow, card)
            suffix = "-gold" if gold else ""
            save(out, f"symbols/card-{name}{suffix}.png")


def paste_portrait(card: Image.Image, portrait: Image.Image, max_h=240):
    # scale portrait to fit
    p = portrait.copy()
    ratio = max_h / p.height
    nw, nh = int(p.width * ratio), int(max_h)
    p = p.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (CARD_W - nw) // 2
    y = 55
    card.paste(p, (x, y), p)
    return card


def process_portrait(path: Path, cream=True) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    # downscale for speed first if huge
    if im.width > 900:
        im = im.resize((900, int(im.height * 900 / im.width)), Image.Resampling.LANCZOS)
    if cream:
        im = remove_bg_by_key(im, (245, 240, 230), tol=48, soft=22)
        # also knock light greys near edges
        im = remove_bg_by_key(im, (255, 255, 255), tol=18, soft=10)
    else:
        im = remove_near_black(im, thresh=35, soft=22)
    im = trim_alpha(im, 6)
    # clean fringe
    im = im.filter(ImageFilter.SMOOTH)
    return im


def make_royal_cards():
    specs = [
        ("jack", AI / "sa-jack-raw.png", "J", draw_spade, (25, 55, 140, 255)),
        ("queen", AI / "sa-queen-raw.png", "Q", draw_heart, (190, 28, 45, 255)),
        ("king", AI / "sa-king-raw.png", "K", draw_club, (25, 55, 140, 255)),
    ]
    for name, path, letter, sfn, col in specs:
        if not path.exists():
            print("missing", path)
            continue
        portrait = process_portrait(path, cream=True)
        for gold in (False, True):
            card = card_base(gold=gold)
            card = paste_portrait(card, portrait, max_h=250)
            card = corner_index(card, letter, sfn, col, gold=gold)
            shadow = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
            sd = ImageDraw.Draw(shadow)
            sd.ellipse([20, CARD_H - 28, CARD_W - 20, CARD_H - 6], fill=(0, 0, 0, 50))
            shadow = shadow.filter(ImageFilter.GaussianBlur(4))
            out = Image.alpha_composite(shadow, card)
            suffix = "-gold" if gold else ""
            save(out, f"symbols/card-{name}{suffix}.png")


def make_ace_card():
    path = AI / "sa-ace-emblem-raw.png"
    emblem = process_portrait(path, cream=True) if path.exists() else None
    for gold in (False, True):
        card = card_base(gold=gold)
        if emblem:
            e = emblem.copy()
            # fit emblem
            eh = 210
            ratio = eh / e.height
            e = e.resize((int(e.width * ratio), eh), Image.Resampling.LANCZOS)
            card.paste(e, ((CARD_W - e.width) // 2, 70), e)
        else:
            # procedural ace
            d = ImageDraw.Draw(card)
            draw_spade(d, CARD_W // 2, CARD_H // 2 - 10, 110, (12, 16, 28, 255))
            f = font(42)
            d.text((CARD_W // 2 - 40, CARD_H // 2 - 20), "ACE", font=f, fill=(220, 175, 50, 255))
        card = corner_index(card, "A", draw_spade, (12, 16, 28, 255), gold=gold)
        shadow = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow)
        sd.ellipse([20, CARD_H - 28, CARD_W - 20, CARD_H - 6], fill=(0, 0, 0, 50))
        shadow = shadow.filter(ImageFilter.GaussianBlur(4))
        out = Image.alpha_composite(shadow, card)
        suffix = "-gold" if gold else ""
        save(out, f"symbols/card-ace{suffix}.png")


def make_wild_card():
    path = AI / "sa-wild-raw.png"
    char = process_portrait(path, cream=False) if path.exists() else None
    card = Image.new("RGBA", (CARD_W, CARD_H), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    # ornate gold frame fill
    for y in range(6, CARD_H - 6):
        t = (y - 6) / (CARD_H - 12)
        c = mix((40, 18, 50), (90, 25, 40), t * 0.5)
        c = mix(c, (30, 20, 60), 0.3)
        d.line([(6, y), (CARD_W - 7, y)], fill=(*c, 255))
    d.rounded_rectangle([2, 2, CARD_W - 3, CARD_H - 3], radius=16, outline=(255, 210, 70, 255), width=7)
    d.rounded_rectangle([10, 10, CARD_W - 11, CARD_H - 11], radius=12, outline=(200, 150, 40, 200), width=2)
    if char:
        c = char.copy()
        eh = 250
        ratio = eh / c.height
        c = c.resize((int(c.width * ratio), eh), Image.Resampling.LANCZOS)
        # if too wide crop
        if c.width > CARD_W - 24:
            left = (c.width - (CARD_W - 24)) // 2
            c = c.crop((left, 0, left + CARD_W - 24, eh))
        card.paste(c, ((CARD_W - c.width) // 2, 40), c)
    # WILD banner
    banner = Image.new("RGBA", (CARD_W - 30, 48), (0, 0, 0, 0))
    bd = ImageDraw.Draw(banner)
    bd.rounded_rectangle([0, 0, banner.width - 1, banner.height - 1], radius=8, fill=(180, 20, 30, 240))
    bd.rounded_rectangle([2, 2, banner.width - 3, banner.height - 3], radius=6, outline=(255, 210, 60, 255), width=2)
    f = font(28)
    text = "WILD"
    bbox = bd.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    bd.text(((banner.width - tw) / 2, 8), text, font=f, fill=(255, 230, 120, 255))
    card.paste(banner, (15, CARD_H - 70), banner)
    # glow ring
    glow = Image.new("RGBA", (CARD_W + 40, CARD_H + 40), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([10, 10, CARD_W + 28, CARD_H + 28], outline=(255, 200, 60, 90), width=10)
    glow = glow.filter(ImageFilter.GaussianBlur(8))
    out = Image.new("RGBA", (CARD_W + 40, CARD_H + 40), (0, 0, 0, 0))
    out = Image.alpha_composite(out, glow)
    out.paste(card, (20, 20), card)
    save(out, "symbols/card-wild.png")
    # also cropped tight version
    save(card, "symbols/card-wild-tight.png")


def make_scatter():
    path = AI / "sa-coin-front-raw.png"
    coin = Image.open(path).convert("RGBA") if path.exists() else None
    if coin:
        coin = remove_near_black(coin, thresh=30, soft=18)
        coin = trim_alpha(coin)
        # fit into card
        card = card_base(False)
        # darken center slightly for coin
        d = ImageDraw.Draw(card)
        d.ellipse([40, 70, CARD_W - 40, CARD_H - 90], fill=(30, 25, 15, 40))
        c = coin.copy()
        size = 200
        c = c.resize((size, size), Image.Resampling.LANCZOS)
        card.paste(c, ((CARD_W - size) // 2, 70), c)
        # SCATTER ribbon
        f = font(22)
        d.text((CARD_W // 2 - 55, 40), "SCATTER", font=f, fill=(180, 40, 30, 255))
        d.text((CARD_W // 2 - 54, 39), "SCATTER", font=f, fill=(255, 210, 80, 255))
        save(card, "symbols/card-scatter.png")
        # standalone coin variants
        for i, ang in enumerate([0, 25, 55, 90]):
            rot = coin.rotate(ang, expand=True, resample=Image.Resampling.BICUBIC)
            rot = trim_alpha(rot)
            rot = rot.resize((128, 128), Image.Resampling.LANCZOS)
            save(rot, f"particles/coin-{i}.png")
    else:
        # procedural coin
        for i in range(4):
            size = 128
            im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            d.ellipse([4, 4, size - 5, size - 5], fill=(180, 130, 30, 255))
            d.ellipse([10, 10, size - 11, size - 11], fill=(230, 185, 50, 255))
            d.ellipse([22, 22, size - 23, size - 23], fill=(200, 150, 35, 255))
            f = font(48)
            d.text((size // 2 - 16, size // 2 - 28), "S", font=f, fill=(255, 230, 120, 255))
            save(im, f"particles/coin-{i}.png")
        card = card_base(False)
        save(card, "symbols/card-scatter.png")


def knock_black_logo(path: Path) -> Image.Image:
    im = Image.open(path).convert("RGBA")
    if im.width > 1200:
        im = im.resize((1200, int(im.height * 1200 / im.width)), Image.Resampling.LANCZOS)
    im = remove_near_black(im, thresh=40, soft=25)
    return trim_alpha(im)


def make_ui_from_ai():
    # logo
    lp = AI / "sa-logo-raw.png"
    if lp.exists():
        logo = knock_black_logo(lp)
        # scale to header width
        target_w = 420
        ratio = target_w / logo.width
        logo = logo.resize((target_w, int(logo.height * ratio)), Image.Resampling.LANCZOS)
        save(logo, "ui/logo.png")
    # super win
    sp = AI / "sa-superwin-raw.png"
    if sp.exists():
        sw = knock_black_logo(sp)
        tw = 640
        sw = sw.resize((tw, int(sw.height * tw / sw.width)), Image.Resampling.LANCZOS)
        save(sw, "ui/super-win.png")
        # also big / mega variants as recolored
        for name, tint in [("big-win", (255, 200, 60)), ("mega-win", (255, 120, 40))]:
            t = sw.copy()
            # simple brightness
            t = ImageEnhance.Color(t).enhance(1.1)
            save(t, f"ui/{name}.png")
    # spin
    spin_p = AI / "sa-spin-raw.png"
    if spin_p.exists():
        spin = remove_near_black(Image.open(spin_p).convert("RGBA"), thresh=25, soft=18)
        spin = trim_alpha(spin)
        spin = spin.resize((256, 256), Image.Resampling.LANCZOS)
        save(spin, "controls/spin.png")
    # studio
    st = AI / "sa-studio-raw.png"
    if st.exists():
        studio = knock_black_logo(st)
        studio = studio.resize((320, int(studio.height * 320 / studio.width)), Image.Resampling.LANCZOS)
        save(studio, "loading/studio.png")


def make_controls():
    # buy bonus badge
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([8, 8, 151, 151], fill=(120, 20, 25, 255))
    d.ellipse([14, 14, 145, 145], fill=(200, 40, 45, 255))
    d.ellipse([20, 20, 139, 139], outline=(255, 210, 70, 255), width=5)
    d.ellipse([28, 28, 131, 131], outline=(255, 180, 50, 160), width=2)
    f = font(18)
    for i, line in enumerate(["BUY", "BONUS"]):
        bbox = d.textbbox((0, 0), line, font=f)
        tw = bbox[2] - bbox[0]
        d.text(((160 - tw) / 2, 55 + i * 24), line, font=f, fill=(255, 230, 140, 255))
    glow = im.filter(ImageFilter.GaussianBlur(6))
    out = Image.new("RGBA", (180, 180), (0, 0, 0, 0))
    out.paste(glow, (10, 10), ImageEnhance.Brightness(glow).enhance(0.5))
    out.paste(im, (10, 10), im)
    save(out, "controls/buy-bonus.png")

    # circular icon helper
    def circ_icon(name, draw_icon, size=96, bg=(90, 30, 35)):
        im = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse([2, 2, size - 3, size - 3], fill=(*bg, 255))
        d.ellipse([2, 2, size - 3, size - 3], outline=(210, 170, 60, 255), width=3)
        d.ellipse([6, 6, size - 7, size - 7], outline=(255, 220, 120, 100), width=1)
        draw_icon(d, size)
        save(im, f"controls/{name}.png")

    def gear(d, size):
        cx = cy = size // 2
        d.ellipse([cx - 10, cy - 10, cx + 10, cy + 10], outline=(255, 220, 140, 255), width=3)
        for a in range(0, 360, 45):
            rad = math.radians(a)
            x0 = cx + math.cos(rad) * 12
            y0 = cy + math.sin(rad) * 12
            x1 = cx + math.cos(rad) * 18
            y1 = cy + math.sin(rad) * 18
            d.line([(x0, y0), (x1, y1)], fill=(255, 220, 140, 255), width=4)

    def bolt(d, size):
        cx = cy = size // 2
        pts = [(cx + 4, cy - 18), (cx - 8, cy + 2), (cx + 2, cy + 2), (cx - 4, cy + 18), (cx + 10, cy - 2), (cx - 2, cy - 2)]
        d.polygon(pts, fill=(255, 220, 100, 255))

    def auto_arrows(d, size):
        cx = cy = size // 2
        d.arc([cx - 16, cy - 16, cx + 16, cy + 16], 40, 280, fill=(255, 220, 140, 255), width=4)
        d.polygon([(cx + 14, cy - 12), (cx + 22, cy - 2), (cx + 8, cy - 2)], fill=(255, 220, 140, 255))

    def info_i(d, size):
        f = font(36)
        d.text((size // 2 - 6, size // 2 - 22), "i", font=f, fill=(255, 220, 140, 255))

    def sound(d, size):
        cx = cy = size // 2
        d.polygon([(cx - 12, cy - 8), (cx - 4, cy - 8), (cx + 6, cy - 16), (cx + 6, cy + 16), (cx - 4, cy + 8), (cx - 12, cy + 8)], fill=(255, 220, 140, 255))
        d.arc([cx + 4, cy - 10, cx + 18, cy + 10], -60, 60, fill=(255, 220, 140, 255), width=2)

    def minus(d, size):
        d.rectangle([size // 2 - 14, size // 2 - 3, size // 2 + 14, size // 2 + 3], fill=(255, 220, 140, 255))

    def plus(d, size):
        minus(d, size)
        d.rectangle([size // 2 - 3, size // 2 - 14, size // 2 + 3, size // 2 + 14], fill=(255, 220, 140, 255))

    circ_icon("settings", gear)
    circ_icon("turbo", bolt, bg=(70, 40, 20))
    circ_icon("auto", auto_arrows)
    circ_icon("info", info_i)
    circ_icon("sound", sound)
    circ_icon("minus", minus, size=72, bg=(50, 40, 30))
    circ_icon("plus", plus, size=72, bg=(50, 40, 30))

    # menu hamburger / grid
    im = Image.new("RGBA", (72, 72), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse([2, 2, 69, 69], fill=(200, 110, 30, 230))
    for i in range(2):
        for j in range(2):
            x, y = 22 + j * 18, 22 + i * 18
            d.ellipse([x, y, x + 10, y + 10], fill=(255, 255, 255, 230))
    save(im, "controls/menu.png")


def make_loading_bg():
    w, h = 780, 1688
    im = radial(w, h, w // 2, h // 2, (255, 230, 80, 255), (10, 120, 45, 255), power=0.85)
    # sparkles
    d = ImageDraw.Draw(im)
    for _ in range(80):
        x, y = RNG.randint(0, w - 1), RNG.randint(0, h - 1)
        s = RNG.randint(1, 3)
        d.ellipse([x, y, x + s, y + s], fill=(255, 255, 200, RNG.randint(80, 200)))
    # place decorative coins around edges if available
    coin_path = ROOT / "particles/coin-0.png"
    if coin_path.exists():
        coin = Image.open(coin_path).convert("RGBA")
        for i in range(12):
            ang = i * math.pi / 6
            r = 280 + (i % 3) * 40
            x = int(w / 2 + math.cos(ang) * r - 64)
            y = int(h / 2 + math.sin(ang) * r * 1.4 - 64)
            c = coin.resize((RNG.randint(80, 140),) * 2, Image.Resampling.LANCZOS)
            c = c.rotate(RNG.randint(0, 360), expand=True)
            im.paste(c, (x, y), c)
    save(im, "loading/bg.png")


def make_win_numbers():
    """Gold embossed number sprites for common win displays — runtime also draws text."""
    for n in [10, 20, 50, 60, 100, 200, 500, 700]:
        im = Image.new("RGBA", (280, 140), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        f = font(72)
        text = str(n)
        bbox = d.textbbox((0, 0), text, font=f)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        x, y = (280 - tw) / 2, (140 - th) / 2 - 8
        for ox, oy in [(3, 3), (2, 2), (1, 1)]:
            d.text((x + ox, y + oy), text, font=f, fill=(80, 20, 10, 220))
        d.text((x, y), text, font=f, fill=(255, 210, 60, 255))
        d.text((x - 1, y - 1), text, font=f, fill=(255, 245, 180, 120))
        save(im, f"ui/win-num-{n}.png")


def make_play_button():
    im = Image.new("RGBA", (360, 110), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([4, 4, 355, 105], radius=20, fill=(120, 80, 20, 255))
    d.rounded_rectangle([8, 8, 351, 101], radius=18, fill=(230, 175, 45, 255))
    d.rounded_rectangle([14, 14, 345, 60], radius=14, fill=(255, 230, 120, 90))
    f = font(48)
    text = "PLAY"
    bbox = d.textbbox((0, 0), text, font=f)
    tw = bbox[2] - bbox[0]
    d.text(((360 - tw) / 2 + 1, 28), text, font=f, fill=(90, 40, 0, 255))
    d.text(((360 - tw) / 2, 26), text, font=f, fill=(255, 250, 220, 255))
    save(im, "ui/play-btn.png")


def make_particles():
    # gold spark
    for i in range(3):
        im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        d.ellipse([8, 8, 24, 24], fill=(255, 220, 80, 220))
        d.ellipse([12, 10, 18, 16], fill=(255, 255, 220, 200))
        im = im.filter(ImageFilter.GaussianBlur(1))
        save(im, f"particles/spark-{i}.png")
    # burn fragment
    for i in range(4):
        im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
        d = ImageDraw.Draw(im)
        pts = [(RNG.randint(5, 40), RNG.randint(5, 40)) for _ in range(5)]
        d.polygon(pts, fill=(255, 200, 60, 200))
        save(im, f"particles/burn-{i}.png")


def make_lobby_thumb():
    """Lobby thumbnail — original jester-hat style without copying brand."""
    w, h = 508, 252
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # green felt bg
    for y in range(h):
        c = mix((20, 130, 55), (10, 70, 35), y / h)
        d.line([(0, y), (w, y)], fill=(*c, 255))
    # paste wild if available
    wild = ROOT / "symbols/card-wild-tight.png"
    if wild.exists():
        card = Image.open(wild).convert("RGBA").resize((140, 196), Image.Resampling.LANCZOS)
        im.paste(card, (w // 2 - 70, 20), card)
    logo = ROOT / "ui/logo.png"
    if logo.exists():
        lg = Image.open(logo).convert("RGBA")
        lg = lg.resize((280, int(lg.height * 280 / lg.width)), Image.Resampling.LANCZOS)
        im.paste(lg, ((w - lg.width) // 2, h - lg.height - 8), lg)
    save(im, "ui/lobby-thumb.png")
    # also copy to public/games/super-ace.png
    im.convert("RGB").save(Path("/var/www/zee9/public/games/super-ace.png"), "PNG", optimize=True)
    print("wrote lobby thumb /games/super-ace.png")


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    print("=== Royal Ace asset generation ===")
    make_felt()
    make_wood_rails()
    make_board_frame()
    make_multiplier_bar()
    make_suit_icons()
    make_suit_cards()
    make_royal_cards()
    make_ace_card()
    make_wild_card()
    make_scatter()
    make_ui_from_ai()
    make_controls()
    make_loading_bg()
    make_win_numbers()
    make_play_button()
    make_particles()
    make_lobby_thumb()
    print("=== done ===")


if __name__ == "__main__":
    main()
