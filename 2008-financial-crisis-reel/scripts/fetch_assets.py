#!/usr/bin/env python3
"""Download the archival source material listed in assets_src/manifest.json.

Sources are Wikimedia Commons, Flickr (CC-licensed originals), the Internet Archive and
U.S. Government sites. Requests are sequential and paced, identify themselves honestly
and honour Retry-After, so this script can be re-run safely. Files that already exist
are skipped.

usage: python3 scripts/fetch_assets.py [--only KEY ...]
"""
import hashlib, json, os, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets_src", "raw")
UA = "CrisisReelAssetFetcher/1.0 (educational documentary build; sequential, rate-limited)"
PACE = 10.0

def commons_url(name, width=None, page=None):
    n = name.replace(" ", "_")
    h = hashlib.md5(n.encode("utf-8")).hexdigest()
    q = urllib.parse.quote(n)
    if page is not None:      # PDF page rendered by Commons
        return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/page{page}-{width}px-{q}.jpg"
    if width and n.lower().endswith((".tif", ".tiff")):   # Commons serves TIFFs as lossy JPEG renditions
        return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/lossy-page1-{width}px-{q}.jpg"
    if width:
        return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{h[0]}/{h[:2]}/{q}/{width}px-{q}"
    return f"https://upload.wikimedia.org/wikipedia/commons/{h[0]}/{h[:2]}/{q}"

def fetch(url, dest):
    """Sequential download with resume (large Library of Congress masters can drop mid-transfer)."""
    part = dest + ".part"
    for attempt in range(8):
        have = os.path.getsize(part) if os.path.exists(part) else 0
        try:
            headers = {"User-Agent": UA}
            if have: headers["Range"] = f"bytes={have}-"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=120) as r:
                resumed = r.status == 206
                total = int(r.headers.get("Content-Length") or 0) + (have if resumed else 0)
                with open(part, "ab" if resumed else "wb") as f:
                    while True:
                        chunk = r.read(1 << 18)
                        if not chunk: break
                        f.write(chunk)
            got = os.path.getsize(part)
            if total and got < total:
                print(f"    short read {got}/{total} – resuming", flush=True); time.sleep(3); continue
            os.replace(part, dest)
            return True
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = min(max(int(e.headers.get("Retry-After") or 45), 20), 300)
                print(f"    429 – waiting {wait}s", flush=True); time.sleep(wait)
            else:
                print(f"    HTTP {e.code} for {url}", flush=True); return False
        except Exception as e:
            print(f"    {type(e).__name__}: {e} – retrying", flush=True); time.sleep(5)
    return False

def main():
    only = set(sys.argv[sys.argv.index("--only") + 1:]) if "--only" in sys.argv else None
    manifest = json.load(open(os.path.join(ROOT, "assets_src", "manifest.json")))
    os.makedirs(RAW, exist_ok=True)
    for key, a in manifest["assets"].items():
        if only and key not in only: continue
        dest = os.path.join(RAW, a["file"])
        if os.path.exists(dest) and os.path.getsize(dest) > 2000:
            continue
        if "commons" in a:
            url = commons_url(a["commons"], a.get("width"), a.get("page"))
        else:
            url = a["url"]
        print(f"{key:28s} <- {url[:110]}", flush=True)
        if a.get("convert") == "tif2jpg":      # Library of Congress masters are ~150 MB TIFFs: keep a 3200 px JPEG
            tmp = dest + ".tif"
            ok = fetch(url, tmp)
            if ok:
                from PIL import Image, ImageFile
                Image.MAX_IMAGE_PIXELS = None; ImageFile.LOAD_TRUNCATED_IMAGES = True
                im = Image.open(tmp).convert("RGB"); im.thumbnail((3200, 3200), Image.LANCZOS)
                im.save(dest, quality=92); os.remove(tmp)
        else:
            ok = fetch(url, dest)
        print(f"    {'ok ' + str(os.path.getsize(dest)) if ok else 'FAILED'}", flush=True)
        time.sleep(PACE)

if __name__ == "__main__":
    main()
