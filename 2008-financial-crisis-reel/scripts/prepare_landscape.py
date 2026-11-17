#!/usr/bin/env python3
"""16:9 versions of the archival photos for the landscape cut (public/img16, 2112x1188 = 10 % overscan)."""
import os, sys
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prepare_assets import grade, crop_to, RAW, ROOT

OUT = os.path.join(ROOT, "public", "img16")
W, H = 2112, 1188
# key: (raw file, crop centre x, y, saturation)
L = {
    "wall_street": ("wall_street_0916.jpg", 0.55, 0.55, 0.75),
    "lehman_night": ("lehman_hq_0915_portrait.jpg", 0.55, 0.47, 0.8),
    "lehman_ticker": ("lehman_hq_0915_portrait.jpg", 0.62, 0.47, 0.8),
    "lehman_crews": ("lehman_hq_0915_wide.jpg", 0.5, 0.5, 0.72),
    "lehman_day": ("lehman_times_sq.jpg", 0.5, 0.62, 0.6),
    "lehman_london": ("lehman_london_0916.jpg", 0.5, 0.45, 0.4),
    "nyse_night": ("nyse_dec2008.jpg", 0.5, 0.42, 0.85),
    "nyse_flag": ("nyse_sep2008.jpg", 0.6, 0.5, 0.65),
    "nyse_feb": ("nyse_feb2008.jpg", 0.5, 0.4, 0.6),
    "nyse_floor": ("nyse_floor2.jpg", 0.5, 0.6, 0.65),
    "nyse_floor_b": ("nyse_floor.jpg", 0.5, 0.6, 0.65),
    "nypd": ("nyse_nypd_oct2008.jpg", 0.5, 0.5, 0.5),
    "foreclosure_sign": ("foreclosure_sign.jpg", 0.4, 0.45, 0.8),
    "foreclosure_house": ("foreclosure_house.jpg", 0.5, 0.5, 0.55),
    "for_sale_owner": ("foreclosure_sign2.jpg", 0.5, 0.55, 0.6),
    "northern_rock": ("northern_rock_queue.jpg", 0.5, 0.6, 0.5),
    "bush": ("bush_0919.jpg", 0.5, 0.45, 0.7),
    "suburb_aerial": ("suburb_aerial_wa.jpg", 0.5, 0.55, 0.75),
    "suburb_aerial2": ("suburb_aerial_oh.jpg", 0.5, 0.55, 0.72),
    "suburb_street": ("suburb_street_ut.jpg", 0.5, 0.55, 0.75),
    "suburb_house": ("suburb_house_az.jpg", 0.5, 0.5, 0.8),
    "suburb_bw": ("suburb_houses_bw.jpg", 0.5, 0.55, 0.0),
    "job_fair": ("job_fair_2009.jpg", 0.5, 0.45, 0.5),
    "empty_office": ("empty_office.jpg", 0.5, 0.5, 0.4),
    "paint_moneylender": ("paint_moneylender.jpg", 0.5, 0.55, 0.9),
    "paint_babel": ("paint_babel.jpg", 0.5, 0.5, 0.9),
    "paint_medusa": ("paint_medusa.jpg", 0.5, 0.55, 0.85),
    "paint_belshazzar": ("paint_belshazzar.jpg", 0.5, 0.45, 0.9),
    "paint_taxcollectors": ("paint_taxcollectors.jpg", 0.5, 0.45, 0.9),
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    Image.MAX_IMAGE_PIXELS = None
    for k, (src, cx, cy, sat) in L.items():
        p = os.path.join(RAW, src)
        if not os.path.exists(p):
            print("  (missing)", k); continue
        im = crop_to(Image.open(p).convert("RGB"), 16 / 9, cx, cy).resize((W, H), Image.LANCZOS)
        grade(im, sat=sat, contrast=1.12).save(os.path.join(OUT, k + ".jpg"), quality=88)
        print("  ", k)
