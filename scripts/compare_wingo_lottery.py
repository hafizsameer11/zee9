#!/usr/bin/env python3
"""Compare current-render.png vs S9 reference for layout density (not pixel equality)."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageEnhance, ImageStat

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "public/games/casino-table/reference/s9-reference.png"
CUR = ROOT / "public/games/casino-table/reference/current-render.png"
OUT = ROOT / "public/games/casino-table/reference/diff-preview.png"


def main() -> None:
    if not CUR.exists():
        print(f"Missing {CUR} — capture an 850x480 screenshot first.")
        sys.exit(1)
    ref = Image.open(REF).convert("RGB").resize((850, 480), Image.Resampling.LANCZOS)
    cur = Image.open(CUR).convert("RGB").resize((850, 480), Image.Resampling.LANCZOS)
    diff = ImageChops.difference(ref, cur)
    # amplify for visibility
    diff_vis = ImageEnhance.Brightness(diff).enhance(2.2)
    # blend overlay
    blend = Image.blend(cur, ref, 0.5)
    canvas = Image.new("RGB", (850 * 3, 480))
    canvas.paste(cur, (0, 0))
    canvas.paste(ref, (850, 0))
    canvas.paste(diff_vis, (1700, 0))
    canvas.save(OUT)
    # crude metrics
    st = ImageStat.Stat(diff)
    mean = sum(st.mean) / 3
    # brightness of current vs ref
    cur_b = sum(ImageStat.Stat(cur).mean) / 3
    ref_b = sum(ImageStat.Stat(ref).mean) / 3
    report = {
        "size": [850, 480],
        "mean_rgb_diff": round(mean, 2),
        "current_brightness": round(cur_b, 2),
        "reference_brightness": round(ref_b, 2),
        "brightness_gap": round(ref_b - cur_b, 2),
        "diff_preview": str(OUT.relative_to(ROOT)),
        "note": "Original artwork will never match pixel-perfect; use for layout/density/colour drift.",
    }
    print(json.dumps(report, indent=2))
    (ROOT / "public/games/casino-table/reference/compare-report.json").write_text(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
