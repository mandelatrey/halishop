"""
Make the hero's fabric weave tile (public/landing/weave.webp).

Source: Poly Haven "Crepe Satin" (CC0), Diffuse map, 2K, JPG:
  https://polyhaven.com/a/crepe_satin
  (direct: https://dl.polyhaven.org/file/ph-assets/Textures/jpg/2k/crepe_satin/crepe_satin_diff_2k.jpg)

Usage:
  python3 scripts/make-weave-tile.py crepe_satin_diff_2k.jpg public/landing/weave.webp [contrast] [brightness]
  python3 scripts/make-weave-tile.py crepe_satin_diff_2k.jpg public/landing/weave-dark.webp [contrast] [brightness] --dark

  contrast   spread of the weave in grey levels (default 6.5; higher = more visible)
  brightness average grey level 0-255 (default 249; the tile is multiplied into
             the cream, so 255 = no darkening at all). With --dark the tile is
             inverted (255 - value), so 249 becomes an average of 6 and the
             threads lighten instead.

What it does: crops a 512px patch at full size (shrinking would erase the
weave), keeps only the fine detail (high-pass), makes it seamless one axis at a
time by blending with a copy shifted ~half a tile (the shift is chosen where
the weave lines up with itself, so the blend doesn't ghost), then maps it to a
light grey around the chosen brightness. Needs numpy and Pillow.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

dark = "--dark" in sys.argv[1:]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
src, out = args[0], args[1]
std_target = float(args[2]) if len(args) > 2 else 6.5
base = float(args[3]) if len(args) > 3 else 249.0
T = 512
im = Image.open(src).convert("L")
W, H = im.size
x0, y0 = (W - T) // 2, (H - T) // 2
crop = im.crop((x0, y0, x0 + T, y0 + T))
a = np.asarray(crop, dtype=np.float64)
blur = np.asarray(crop.filter(ImageFilter.GaussianBlur(14)), dtype=np.float64)
d = a - blur  # weave detail only, no lighting gradients
d -= d.mean()

t = np.arange(T)
edge = np.minimum(t, T - 1 - t) / 128.0
w1 = np.clip(edge, 0, 1)
w1 = w1 * w1 * (3 - 2 * w1)  # 1 in the middle, 0 at the borders

def seamless(img, axis):
    """Blend with a copy rolled ~half a tile along one axis, choosing the
    shift where the weave lines up with itself; the copy wraps seamlessly at
    the borders and its own seam sits mid-tile, where the original is used."""
    best, bs = -1e18, T // 2
    for sh in range(T // 2 - 12, T // 2 + 13):
        r = np.roll(img, sh, axis=axis)
        c = float((img[64:-64, 64:-64] * r[64:-64, 64:-64]).mean())
        if c > best:
            best, bs = c, sh
    r = np.roll(img, bs, axis=axis)
    w = w1[None, :] if axis == 1 else w1[:, None]
    out = img * w + r * (1 - w)
    return out / np.sqrt(w * w + (1 - w) ** 2), bs

tile, sx = seamless(d, 1)
tile, sy = seamless(tile, 0)
bs = (sy, sx)
tile = tile / tile.std() * std_target
res = np.clip(base + tile, 0, 255).astype(np.uint8)
if dark:
    # Dark mode: mostly black with lighter threads, for a "screen" blend that
    # lightens the dark cloth the way the light tile darkens the cream
    res = 255 - res
Image.fromarray(res, "L").save(out, quality=88, method=6)
print("shift", bs, "mean", res.mean().round(1), "std", res.std().round(2), "min", res.min())
