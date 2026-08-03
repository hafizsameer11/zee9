#!/usr/bin/env python3
"""Generate original 7 Up Down table assets (chips, zone plates, dice, HUD).

Run: python3 scripts/generate_7updown_assets.py
Output: public/games/7up-down/v2/
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public" / "games" / "7up-down"
OUT = SRC / "v2"

SS = 4  # supersample factor

FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
FONT_SERIF = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"


def font(size: int, path: str = FONT_BOLD) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(path, size)


def save(img: Image.Image, rel: str) -> None:
    p = OUT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p, optimize=True)
    print(f"  {rel}  {img.size[0]}x{img.size[1]}")


def fit_text(draw: ImageDraw.ImageDraw, text: str, max_w: int, start: int, path: str = FONT_BOLD):
    """Largest font size whose rendered width fits max_w."""
    size = start
    while size > 6:
        f = font(size, path)
        if draw.textlength(text, font=f) <= max_w:
            return f
        size -= 2
    return font(6, path)


def centered(draw: ImageDraw.ImageDraw, xy, text, f, fill, stroke=0, stroke_fill=None):
    x, y = xy
    box = draw.textbbox((0, 0), text, font=f, stroke_width=stroke)
    draw.text(
        (x - (box[0] + box[2]) / 2, y - (box[1] + box[3]) / 2),
        text,
        font=f,
        fill=fill,
        stroke_width=stroke,
        stroke_fill=stroke_fill,
    )


# ──────────────────────────────────────────────────────────────────────
# Poker chips
# ──────────────────────────────────────────────────────────────────────

# value -> (body dark, body light, edge-spot colour, inlay colour, text colour)
CHIP_SPECS: dict[int, tuple[str, tuple, tuple, tuple, tuple, tuple]] = {
    #        label   dark            light            spot             inlay            text
    10:     ("10",  (188, 194, 205), (248, 250, 252), (46, 58, 78),    (238, 242, 247), (28, 38, 56)),
    50:     ("50",  (140, 22, 32),   (226, 68, 78),   (250, 246, 240), (198, 40, 50),   (255, 240, 230)),
    100:    ("100", (18, 62, 140),   (66, 138, 236),  (250, 250, 252), (30, 88, 190),   (238, 246, 255)),
    500:    ("500", (72, 26, 122),   (152, 92, 220),  (250, 246, 255), (104, 48, 168),  (244, 234, 255)),
    1000:   ("1K",  (150, 104, 12),  (255, 216, 96),  (72, 44, 6),     (232, 178, 44),  (60, 36, 4)),
    2000:   ("2K",  (150, 62, 8),    (255, 148, 56),  (250, 244, 238), (220, 104, 24),  (255, 240, 226)),
    5000:   ("5K",  (14, 16, 22),    (68, 74, 88),    (226, 182, 72),  (30, 34, 44),    (255, 224, 138)),
    10000:  ("10K", (28, 92, 74),    (72, 194, 152),  (250, 248, 240), (34, 128, 100),  (232, 255, 246)),
}

CHIP_ORDER = [10, 50, 100, 500, 1000, 2000, 5000, 10000]


def radial_disc(size: int, inner: tuple, outer: tuple, r_norm: float = 1.0,
                cx: float = 0.36, cy: float = 0.30) -> np.ndarray:
    """RGB array with a light->dark radial ramp offset toward (cx, cy)."""
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    n = size - 1.0
    dx = xx / n - cx
    dy = yy / n - cy
    d = np.sqrt(dx * dx + dy * dy) / (r_norm * 0.95)
    t = np.clip(d, 0.0, 1.0)[..., None]
    return (np.array(inner, np.float32) * (1 - t) + np.array(outer, np.float32) * t)


def disc_mask(size: int, radius: float, cx: float | None = None, cy: float | None = None,
              feather: float = 1.4) -> np.ndarray:
    """Antialiased filled-circle alpha in [0,1]."""
    c = (size - 1) / 2.0
    cx = c if cx is None else cx
    cy = c if cy is None else cy
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
    return np.clip((radius - d) / feather + 0.5, 0.0, 1.0)


def ring_mask(size: int, r_out: float, r_in: float, feather: float = 1.4) -> np.ndarray:
    return np.clip(disc_mask(size, r_out, feather=feather) - disc_mask(size, r_in, feather=feather), 0, 1)


def make_chip(value: int, px: int) -> Image.Image:
    label, dark, light, spot, inlay, textc = CHIP_SPECS[value]
    S = px * SS
    r = S / 2.0 - 2 * SS
    c = (S - 1) / 2.0

    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    nx = (xx - c) / r
    ny = (yy - c) / r
    dist = np.clip(np.sqrt(nx * nx + ny * ny), 0, 1.4)

    alpha = disc_mask(S, r)

    # Flat body colour, then a directional bevel so the disc reads as 3D.
    body = np.zeros((S, S, 3), np.float32)
    body[:] = np.array(dark, np.float32)
    lift = np.clip(1.0 - dist * 0.72, 0, 1)[..., None]
    body = body * (1 - lift * 0.55) + np.array(light, np.float32) * lift * 0.55
    tilt = np.clip(0.5 - (nx * 0.52 + ny * 0.60) * 0.5, 0, 1)
    body *= (0.80 + 0.42 * tilt)[..., None]

    # Eight edge spots inset into the rim.
    spots = Image.new("L", (S, S), 0)
    ds = ImageDraw.Draw(spots)
    pad = S / 2.0 - r
    for i in range(8):
        a0 = i * 45 - 12
        ds.pieslice([pad, pad, S - pad, S - pad], a0, a0 + 24, fill=255)
    spots = spots.filter(ImageFilter.GaussianBlur(SS * 0.6))
    spot_ring = np.array(spots, np.float32) / 255.0 * ring_mask(S, r * 0.985, r * 0.760)
    spot_rgb = np.array(spot, np.float32) * (0.84 + 0.32 * tilt)[..., None]
    body = body * (1 - spot_ring[..., None]) + spot_rgb * spot_ring[..., None]

    # Inlay disc with a darker seam around it.
    seam = ring_mask(S, r * 0.700, r * 0.660)
    body *= (1 - seam[..., None] * 0.45)
    inl = disc_mask(S, r * 0.660)
    inlay_rgb = np.zeros((S, S, 3), np.float32)
    inlay_rgb[:] = np.array(inlay, np.float32)
    inlay_rgb *= (0.86 + 0.30 * tilt)[..., None]
    inlay_rgb += np.clip(1 - dist / 0.66, 0, 1)[..., None] * 16
    body = body * (1 - inl[..., None]) + inlay_rgb * inl[..., None]
    hairline = ring_mask(S, r * 0.610, r * 0.588)
    body = np.clip(body + hairline[..., None] * 46, 0, 255)

    # Narrow specular arc along the upper-left rim.
    ang = np.arctan2(ny, nx)
    arc = np.exp(-(((ang + 2.36) % (2 * np.pi) - np.pi) ** 2) / 0.34)
    arc *= np.exp(-((dist - 0.90) ** 2) / 0.006)
    body = np.clip(body + arc[..., None] * 150, 0, 255)

    # Rim darkening + bright outer lip.
    body *= (1 - np.clip((dist - 0.86) / 0.14, 0, 1) * 0.30)[..., None]
    lip = ring_mask(S, r, r * 0.945)
    body = np.clip(body + lip[..., None] * (60 + 90 * tilt)[..., None], 0, 255)

    chip = Image.fromarray(
        np.dstack([body.astype(np.uint8), (alpha * 255).astype(np.uint8)]), "RGBA"
    )

    # Denomination.
    d = ImageDraw.Draw(chip)
    f = fit_text(d, label, int(r * 1.02), int(r * 0.86))
    centered(d, (S / 2, S / 2), label, f, textc + (255,),
             stroke=max(1, int(S * 0.008)), stroke_fill=(0, 0, 0, 70))

    # Drop shadow.
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    sh = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse(
        [pad + S * 0.02, pad + S * 0.05, S - pad + S * 0.02, S - pad + S * 0.05],
        fill=(0, 0, 0, 130),
    )
    out.alpha_composite(sh.filter(ImageFilter.GaussianBlur(S * 0.02)))
    out.alpha_composite(chip)
    return out.resize((px, px), Image.LANCZOS)


def build_chips() -> None:
    print("chips")
    for v in CHIP_ORDER:
        make_chip(v, 192).save(OUT / "chips" / f"chip-{v}.png", optimize=True)
        make_chip(v, 96).save(OUT / "chips" / f"chip-{v}-sm.png", optimize=True)
    print(f"  {len(CHIP_ORDER)} denominations x2 sizes")


# ──────────────────────────────────────────────────────────────────────
# Zone plates — reuse the original silhouettes, repaint the interior
# ──────────────────────────────────────────────────────────────────────

ZONE_STYLE = {
    "down": {
        "accent": (198, 44, 44),
        "accent_hi": (255, 118, 96),
        "felt": ((16, 74, 48), (9, 44, 29)),
        "mult": "X2",
    },
    "seven": {
        "accent": (36, 78, 208),
        "accent_hi": (118, 168, 255),
        "felt": ((16, 66, 74), (8, 38, 46)),
        "mult": "X5",
    },
    "up": {
        "accent": (32, 156, 72),
        "accent_hi": (122, 240, 150),
        "felt": ((16, 74, 48), (9, 44, 29)),
        "mult": "X2",
    },
}


def split_zone_masks() -> dict[str, tuple[Image.Image, tuple[int, int, int, int], int]]:
    """Per-zone alpha silhouette, bbox in the 1055x348 overlay, and header height."""
    src = Image.open(SRC / "e4_e4baf956-2193-4a8b-8c40-3ad866b43885.a8c87.png").convert("RGBA")
    arr = np.array(src)
    alpha = arr[..., 3]
    solid = alpha > 40
    W = src.width

    col = solid.sum(axis=0)
    ranges, run = [], None
    for x in range(W):
        if col[x] > 0 and run is None:
            run = x
        elif col[x] == 0 and run is not None:
            ranges.append((run, x - 1))
            run = None
    if run is not None:
        ranges.append((run, W - 1))
    ranges = [r for r in ranges if r[1] - r[0] > 30]

    out = {}
    for name, (x0, x1) in zip(("down", "seven", "up"), ranges):
        sub = solid[:, x0:x1 + 1]
        ys = np.where(sub.any(axis=1))[0]
        y0, y1 = int(ys.min()), int(ys.max())
        crop = arr[y0:y1 + 1, x0:x1 + 1]
        # Header band = leading rows whose colour differs from the body fill.
        mid = crop.shape[1] // 2
        body_rgb = crop[int(crop.shape[0] * 0.6), mid][:3].astype(int)
        head = 0
        for y in range(crop.shape[0]):
            px = crop[y, mid]
            if px[3] < 40:
                continue
            if np.abs(px[:3].astype(int) - body_rgb).sum() > 90:
                head = y + 1
            else:
                break
        # The shipped overlay is a flat 50%-alpha stencil; normalise it so the
        # interior is solid and only the antialiased edge stays partial.
        ma = crop[..., 3].astype(np.float32)
        peak = float(np.percentile(ma[ma > 0], 90)) or 255.0
        mask = Image.fromarray(np.clip(ma / peak * 255, 0, 255).astype(np.uint8), "L")
        out[name] = (mask, (x0, y0, x1 + 1, y1 + 1), max(head, int(crop.shape[0] * 0.11)))
    return out


def make_zone_plate(name: str, mask: Image.Image, head_h: int, glow: bool) -> Image.Image:
    st = ZONE_STYLE[name]
    w, h = mask.size
    W, H = w * 2, h * 2
    hh = head_h * 2
    m = mask.resize((W, H), Image.LANCZOS)
    ma = np.array(m, np.float32) / 255.0

    # Felt body: vertical ramp + soft centre bloom.
    top, bot = st["felt"]
    ramp = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    body = np.array(top, np.float32) * (1 - ramp) + np.array(bot, np.float32) * ramp
    body = np.repeat(body, W, axis=1)

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    bloom = np.exp(-(((xx - W / 2) / (W * 0.55)) ** 2 + ((yy - H * 0.55) / (H * 0.6)) ** 2)) * 34
    body = np.clip(body + bloom[..., None], 0, 255)

    plate = Image.fromarray(
        np.dstack([body.astype(np.uint8), (ma * 235).astype(np.uint8)]), "RGBA"
    )

    # Header band, clipped to the silhouette.
    band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    bd = ImageDraw.Draw(band)
    a, ahi = st["accent"], st["accent_hi"]
    for y in range(hh):
        t = y / max(1, hh - 1)
        c = tuple(int(ahi[i] * (1 - t) + a[i] * t) for i in range(3))
        bd.line([(0, y), (W, y)], fill=c + (255,))
    bd.line([(0, hh - 3), (W, hh - 3)], fill=(255, 236, 176, 210), width=3)
    band.putalpha(Image.fromarray((np.array(band.getchannel("A"), np.float32) * ma).astype(np.uint8)))
    plate.alpha_composite(band)

    # Gold rim traced from the silhouette edge — outer bright lip, inner shadow.
    er_a = m.filter(ImageFilter.MinFilter(9))
    er_b = er_a.filter(ImageFilter.MinFilter(9))
    er_c = er_b.filter(ImageFilter.MinFilter(9))
    lip = np.clip(np.array(m, np.float32) - np.array(er_a, np.float32), 0, 255) / 255.0
    core = np.clip(np.array(er_a, np.float32) - np.array(er_b, np.float32), 0, 255) / 255.0
    shade = np.clip(np.array(er_b, np.float32) - np.array(er_c, np.float32), 0, 255) / 255.0

    def rim_layer(mask_f, top_rgb, bot_rgb, a=255):
        rgb = np.zeros((H, W, 3), np.float32)
        t = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
        rgb = np.array(top_rgb, np.float32) * (1 - t) + np.array(bot_rgb, np.float32) * t
        rgb = np.repeat(rgb, W, axis=1)
        return Image.fromarray(
            np.dstack([rgb.astype(np.uint8), (mask_f * a).astype(np.uint8)]), "RGBA"
        )

    plate.alpha_composite(rim_layer(lip, (255, 238, 176), (176, 128, 40)))
    plate.alpha_composite(rim_layer(core, (255, 214, 108), (214, 162, 56)))
    plate.alpha_composite(rim_layer(shade, (92, 58, 12), (52, 32, 8), a=210))

    # Inner hairline for depth.
    er_d = er_c.filter(ImageFilter.MinFilter(13))
    er_e = er_d.filter(ImageFilter.MinFilter(5))
    inner = np.clip(np.array(er_d, np.float32) - np.array(er_e, np.float32), 0, 255) / 255.0
    plate.alpha_composite(
        Image.fromarray(
            np.dstack([
                np.full((H, W, 3), 255, np.uint8),
                (inner * 40).astype(np.uint8),
            ]), "RGBA"
        )
    )

    # Multiplier watermark.
    wm = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    wd = ImageDraw.Draw(wm)
    f = fit_text(wd, st["mult"], int(W * 0.6), int(H * 0.44), FONT_SERIF)
    centered(wd, (W / 2, hh + (H - hh) * 0.60), st["mult"], f, (255, 255, 255, 30))
    wm.putalpha(Image.fromarray((np.array(wm.getchannel("A"), np.float32) * ma).astype(np.uint8)))
    plate.alpha_composite(wm)

    if glow:
        # Warm halo bleeding outward from the silhouette + a hotter rim.
        halo = Image.new("RGBA", (W, H), (255, 216, 110, 0))
        halo.putalpha(Image.fromarray((ma * 255).astype(np.uint8)))
        halo = halo.filter(ImageFilter.GaussianBlur(W * 0.035))
        # Keep the bloom outside the silhouette so the felt does not go milky.
        ha = np.array(halo.getchannel("A"), np.float32) * 1.8 * (1 - ma)
        halo.putalpha(Image.fromarray(np.clip(ha, 0, 255).astype(np.uint8)))

        hot = rim_layer(np.clip(lip + core, 0, 1), (255, 250, 214), (255, 226, 132))

        out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        out.alpha_composite(halo)
        out.alpha_composite(plate)
        out.alpha_composite(hot)
        # Gentle interior lift so the winning felt reads brighter, not milky.
        lift = Image.new("RGBA", (W, H), (255, 226, 150, 0))
        lift.putalpha(Image.fromarray((ma * 18).astype(np.uint8)))
        out.alpha_composite(lift)
        plate = out

    return plate


def build_zones() -> dict[str, dict]:
    print("zone plates")
    zones = split_zone_masks()
    src_w, src_h = 1055, 348
    geom = {}
    for name, (mask, bbox, head) in zones.items():
        for glow in (False, True):
            img = make_zone_plate(name, mask, head, glow)
            save(img, f"zones/{name}{'-win' if glow else ''}.png")
        x0, y0, x1, y1 = bbox
        geom[name] = {
            "left": round(100 * x0 / src_w, 3),
            "top": round(100 * y0 / src_h, 3),
            "width": round(100 * (x1 - x0) / src_w, 3),
            "height": round(100 * (y1 - y0) / src_h, 3),
            "headPct": round(100 * head / (y1 - y0), 2),
        }
    return geom


# ──────────────────────────────────────────────────────────────────────
# Dice — upscale the original isometric faces
# ──────────────────────────────────────────────────────────────────────

def build_dice() -> None:
    print("dice")
    for kind, prefix in (("white", "7up_icon_0_"), ("gold", "7up_icon_1_")):
        for n in range(1, 7):
            src = Image.open(SRC / "icons" / f"{prefix}{n}.png").convert("RGBA")
            big = src.resize((src.width * 2, src.height * 2), Image.LANCZOS)
            big = big.filter(ImageFilter.UnsharpMask(radius=2, percent=90, threshold=2))
            save(big, f"dice/{kind}-{n}.png")

    cup = Image.open(SRC / "icons" / "7up_icon_zz.png").convert("RGBA")
    save(cup.resize((cup.width * 2, cup.height * 2), Image.LANCZOS), "dice/cup.png")


# ──────────────────────────────────────────────────────────────────────
# HUD bits
# ──────────────────────────────────────────────────────────────────────

def gold_gradient(size: tuple[int, int]) -> np.ndarray:
    w, h = size
    stops = [(0.00, (120, 78, 16)), (0.18, (255, 236, 168)), (0.44, (232, 176, 52)),
             (0.62, (168, 112, 20)), (0.80, (255, 226, 138)), (1.00, (128, 84, 18))]
    ramp = np.zeros((h, 3), np.float32)
    for y in range(h):
        t = y / max(1, h - 1)
        for i in range(len(stops) - 1):
            a, ca = stops[i]
            b, cb = stops[i + 1]
            if a <= t <= b:
                k = (t - a) / (b - a)
                ramp[y] = np.array(ca) * (1 - k) + np.array(cb) * k
                break
    return np.repeat(ramp[:, None, :], w, axis=1)


def build_logo() -> None:
    print("logo")
    W, H = 720, 200
    txt = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(txt)
    f = fit_text(d, "7 UP DOWN", int(W * 0.9), 130, FONT_SERIF)
    centered(d, (W / 2, H / 2), "7 UP DOWN", f, 255)

    grad = gold_gradient((W, H))
    face = Image.fromarray(np.dstack([grad.astype(np.uint8), np.array(txt)]), "RGBA")

    out = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    edge = txt.filter(ImageFilter.MaxFilter(9))
    out.alpha_composite(Image.fromarray(
        np.dstack([np.full((H, W, 3), 60, np.uint8), np.array(edge)]), "RGBA"))
    glow = txt.filter(ImageFilter.GaussianBlur(12))
    out.alpha_composite(Image.fromarray(
        np.dstack([
            np.dstack([np.full((H, W), 255, np.uint8), np.full((H, W), 196, np.uint8),
                       np.full((H, W), 80, np.uint8)]),
            (np.array(glow, np.float32) * 0.55).astype(np.uint8),
        ]), "RGBA"))
    out.alpha_composite(face)
    save(out.crop(out.getbbox()), "ui/logo.png")


def round_button(px: int, glyph: str, base: tuple, edge: tuple) -> Image.Image:
    S = px * SS
    r = S / 2 - 3 * SS
    body = radial_disc(S, tuple(min(255, c + 70) for c in base), base)
    alpha = disc_mask(S, r)
    rim = ring_mask(S, r, r * 0.86)
    body = body * (1 - rim[..., None]) + np.array(edge, np.float32) * rim[..., None]
    hi = disc_mask(S, r * 0.7, cx=S * 0.34, cy=S * 0.28, feather=r * 0.8) * 0.35
    body = np.clip(body + 255 * hi[..., None] * 0.55, 0, 255)
    img = Image.fromarray(np.dstack([body.astype(np.uint8), (alpha * 255).astype(np.uint8)]), "RGBA")
    d = ImageDraw.Draw(img)
    f = fit_text(d, glyph, int(r * 1.0), int(r * 1.1))
    centered(d, (S / 2, S / 2 - S * 0.02), glyph, f, (255, 244, 214, 255),
             stroke=int(S * 0.012), stroke_fill=(70, 34, 4, 200))
    return img.resize((px, px), Image.LANCZOS)


def build_buttons() -> None:
    print("buttons")
    save(round_button(128, "+", (176, 34, 40), (238, 196, 92)), "ui/btn-add.png")


def build_history_pills() -> None:
    """Round result markers 2..12, coloured by winning side."""
    print("history pills")
    for n in range(2, 13):
        if n < 7:
            base, edge = (188, 46, 46), (255, 150, 130)
        elif n > 7:
            base, edge = (30, 148, 70), (128, 244, 156)
        else:
            base, edge = (40, 84, 214), (140, 184, 255)
        px = 96
        S = px * SS
        r = S / 2 - 2 * SS
        body = radial_disc(S, tuple(min(255, c + 80) for c in base), base)
        alpha = disc_mask(S, r)
        rim = ring_mask(S, r, r * 0.82)
        body = body * (1 - rim[..., None]) + np.array(edge, np.float32) * rim[..., None]
        hi = disc_mask(S, r * 0.66, cx=S * 0.34, cy=S * 0.28, feather=r * 0.8) * 0.4
        body = np.clip(body + 255 * hi[..., None] * 0.5, 0, 255)
        img = Image.fromarray(np.dstack([body.astype(np.uint8), (alpha * 255).astype(np.uint8)]), "RGBA")
        d = ImageDraw.Draw(img)
        f = fit_text(d, str(n), int(r * 1.15), int(r * 1.0))
        centered(d, (S / 2, S / 2), str(n), f, (255, 255, 255, 255),
                 stroke=int(S * 0.014), stroke_fill=(0, 0, 0, 140))
        save(img.resize((px, px), Image.LANCZOS), f"history/{n}.png")


def build_room_bg() -> None:
    """Darkened, vignetted lounge backdrop (the shipped room-bg is a screenshot)."""
    print("room background")
    src = Image.open(SRC / "assets" / "texture__7up_bg.png").convert("RGB")
    src = src.resize((1792, 828), Image.LANCZOS)
    a = np.array(src, np.float32)
    a *= 0.62
    h, w, _ = a.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    vig = 1 - np.clip(((xx - w / 2) / (w * 0.62)) ** 2 + ((yy - h * 0.56) / (h * 0.78)) ** 2, 0, 1) * 0.55
    a *= vig[..., None]
    spot = np.exp(-(((xx - w / 2) / (w * 0.36)) ** 2 + ((yy - h * 0.42) / (h * 0.42)) ** 2)) * 34
    a = np.clip(a + spot[..., None] * np.array([1.0, 0.86, 0.7]), 0, 255)
    save(Image.fromarray(a.astype(np.uint8), "RGB").convert("RGBA"), "ui/room-bg.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chips").mkdir(exist_ok=True)
    build_chips()
    geom = build_zones()
    build_dice()
    build_logo()
    build_buttons()
    build_history_pills()
    build_room_bg()

    import json
    (OUT / "zones" / "geometry.json").write_text(json.dumps(geom, indent=2))
    print("\nzone geometry (% of felt box):")
    print(json.dumps(geom, indent=2))


if __name__ == "__main__":
    main()
