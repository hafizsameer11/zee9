#!/usr/bin/env python3
"""Car Roulette asset pipeline: cut alpha, trim, resize and emit WebP into public/."""
import os
import sys
from PIL import Image, ImageFilter, ImageChops, ImageDraw, ImageFont
import numpy as np

SRC = "/root/.cursor/projects/var-www-zee9/assets"
OUT = "/var/www/zee9/public/games/car-roulette"

_session = None


def session():
    global _session
    if _session is None:
        from rembg import new_session

        _session = new_session("u2net")
    return _session


def cutout(path, lo=10, hi=60):
    """rembg mask, refined with a luminance floor so black glass keeps its edge."""
    from rembg import remove

    im = Image.open(path).convert("RGB")
    cut = remove(im, session=session(), post_process_mask=True)
    a = np.asarray(cut.split()[3]).astype(np.float32) / 255.0
    lum = np.asarray(im.convert("L")).astype(np.float32)
    # Anything essentially black is background regardless of what the matte says.
    floor = np.clip((lum - lo) / max(1.0, hi - lo), 0.0, 1.0)
    a = a * np.maximum(floor, 0.35 * (a > 0.9))
    a = np.clip(a, 0.0, 1.0)
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    return decontaminate(out)


def decontaminate(im):
    """Undo black matting on soft edges so scaled sprites keep no dark halo."""
    arr = np.asarray(im).astype(np.float32)
    rgb, a = arr[..., :3], arr[..., 3:4] / 255.0
    edge = (a > 0.02) & (a < 0.98)
    boost = np.where(edge, 1.0 / np.maximum(a, 0.25), 1.0)
    rgb = np.clip(rgb * boost, 0, 255)
    return Image.fromarray(
        np.concatenate([rgb, a * 255], axis=-1).astype(np.uint8), "RGBA"
    )


def trim(im, pad=0.01):
    bbox = im.split()[3].point(lambda v: 255 if v > 6 else 0).getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    px = int((x1 - x0) * pad)
    py = int((y1 - y0) * pad)
    return im.crop(
        (max(0, x0 - px), max(0, y0 - py), min(im.width, x1 + px), min(im.height, y1 + py))
    )


def fit(im, w=None, h=None):
    if w and h:
        return im.resize((w, h), Image.LANCZOS)
    if w:
        return im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)


def save(im, rel, quality=92, lossless=False):
    dst = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if im.mode == "RGBA":
        im.save(dst, "WEBP", quality=quality, method=6, lossless=lossless, exact=True)
    else:
        im.save(dst, "WEBP", quality=quality, method=6)
    print(f"  {rel:38s} {im.size[0]}x{im.size[1]}  {os.path.getsize(dst)//1024}KB")


def frame_cutout(path, lo=14, hi=48, keep_hole=0.02):
    """Alpha from luminance, then re-solidify the structure so only the large
    central opening (and the surround) stays transparent."""
    from scipy import ndimage

    im = Image.open(path).convert("RGB")
    lum = np.asarray(im.convert("L")).astype(np.float32)
    soft = np.clip((lum - lo) / (hi - lo), 0.0, 1.0)
    solid = lum > lo
    labels, n = ndimage.label(~solid)
    border = set(labels[0].tolist() + labels[-1].tolist())
    border |= set(labels[:, 0].tolist() + labels[:, -1].tolist())
    big = lum.size * keep_hole
    fill = np.zeros_like(solid)
    for idx, size in enumerate(ndimage.sum(~solid, labels, range(1, n + 1)), start=1):
        if idx in border or size >= big:
            continue
        fill |= labels == idx
    body = solid | fill
    parts, k = ndimage.label(body)
    if k > 1:
        sizes = ndimage.sum(body, parts, range(1, k + 1))
        body = parts == (int(np.argmax(sizes)) + 1)
    halo = ndimage.binary_dilation(body, iterations=26)
    a = np.maximum(soft * halo, body.astype(np.float32))
    out = im.convert("RGBA")
    out.putalpha(Image.fromarray((a * 255).astype(np.uint8)))
    return decontaminate(out)


def crop_aspect(im, ratio, anchor=0.5):
    w, h = im.size
    if w / h > ratio:
        nw = int(h * ratio)
        x = int((w - nw) * 0.5)
        return im.crop((x, 0, x + nw, h))
    nh = int(w / ratio)
    y = int((h - nh) * anchor)
    return im.crop((0, y, w, y + nh))


if __name__ == "__main__":
    print(sys.argv)
