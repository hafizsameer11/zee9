#!/usr/bin/env python3
"""Dev-time contact sheet for the generated 7 Up Down assets."""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
import generate_7updown_assets as g  # noqa: E402

what = sys.argv[1] if len(sys.argv) > 1 else "chips"
OUT = g.OUT

if what == "chips":
    g.OUT.mkdir(parents=True, exist_ok=True)
    (g.OUT / "chips").mkdir(exist_ok=True)
    g.build_chips()
    vals = g.CHIP_ORDER
    cell = 120
    sheet = Image.new("RGBA", (8 * cell, 2 * cell - 20), (14, 58, 38, 255))
    for i, v in enumerate(vals):
        im = Image.open(OUT / f"chips/chip-{v}.png").convert("RGBA")
        im.thumbnail((104, 104))
        sheet.paste(im, (i * cell + (cell - im.width) // 2, 8), im)
        im2 = Image.open(OUT / f"chips/chip-{v}-sm.png").convert("RGBA")
        im2.thumbnail((46, 46))
        sheet.paste(im2, (i * cell + (cell - im2.width) // 2, cell + 26), im2)
    sheet.save("/tmp/v2_chips.png")

elif what == "zones":
    zs = [Image.open(OUT / f"zones/{n}.png").convert("RGBA") for n in ("down", "seven", "up")]
    ws = [Image.open(OUT / f"zones/{n}-win.png").convert("RGBA") for n in ("down", "seven", "up")]
    tot = sum(z.width for z in zs)
    sc = 1000 / tot
    H = int(max(z.height for z in zs) * sc) + 20
    sheet = Image.new("RGBA", (1010, H * 2), (26, 16, 12, 255))
    for row, group in enumerate((zs, ws)):
        x = 5
        for z in group:
            z2 = z.resize((int(z.width * sc), int(z.height * sc)), Image.LANCZOS)
            sheet.alpha_composite(z2, (x, row * H + (H - 20 - z2.height) + 10))
            x += z2.width
    sheet.save("/tmp/v2_zones.png")

elif what == "misc":
    items = ["ui/logo.png", "ui/btn-add.png", "dice/white-3.png", "dice/gold-5.png",
             "dice/cup.png", "history/4.png", "history/7.png", "history/11.png"]
    cell = 180
    sheet = Image.new("RGBA", (4 * cell, 2 * cell), (26, 16, 12, 255))
    for i, f in enumerate(items):
        im = Image.open(OUT / f).convert("RGBA")
        im.thumbnail((cell - 16, cell - 16))
        sheet.alpha_composite(im, ((i % 4) * cell + (cell - im.width) // 2,
                                   (i // 4) * cell + (cell - im.height) // 2))
    sheet.save("/tmp/v2_misc.png")

print("ok", what)
