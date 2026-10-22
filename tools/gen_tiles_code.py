"""Vẽ BẰNG CODE ô đất cho 2 vùng mới (23/10/2026), chờ chủ dự án gửi ảnh thật:
- hac-thach-1..4 (Vùng Đen): từ ô hắc thổ, tối hẳn, ánh lam lạnh + vân nứt sáng mờ
- tu-vuc-1..4 (Vùng Tím): từ ô sỏi đá, nhuộm tím + đốm tinh thể phát sáng

Dùng: python3 -I tools/gen_tiles_code.py — thêm/ghi đè các ô này vào assets/tiles/atlas.webp + data/tiles.json.
"""
import json
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

TILES = Path('data/tiles.json')
idx = json.loads(TILES.read_text())
S = idx['size']
atlas = Image.open(idx['atlas']).convert('RGB')
W, H = atlas.size
cols = W // S


def tile(name):
    x, y = idx['tiles'][name]
    return atlas.crop((x, y, x + S, y + S))


def tint(img, mul, add):
    a = np.asarray(img).astype(float)
    lum = a.mean(axis=2, keepdims=True)
    out = lum * np.array(mul) + np.array(add)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))


def hac_thach(src, seed):
    rnd = random.Random(seed)
    im = tint(src, (0.42, 0.42, 0.55), (6, 6, 14))
    d = ImageDraw.Draw(im)
    for _ in range(3):  # vân nứt sáng lam mờ
        x, y = rnd.randrange(S), rnd.randrange(S)
        pts = [(x, y)]
        for _ in range(5):
            x = max(0, min(S - 1, x + rnd.randint(-18, 18))); y = max(0, min(S - 1, y + rnd.randint(-18, 18)))
            pts.append((x, y))
        d.line(pts, fill=(70, 120, 150), width=2)
    for _ in range(10):
        x, y = rnd.randrange(S), rnd.randrange(S)
        d.point((x, y), fill=(120, 200, 230))
    return im


def tu_vuc(src, seed):
    rnd = random.Random(seed)
    im = tint(src, (0.52, 0.3, 0.74), (12, 2, 26))
    glow = Image.new('RGB', (S, S), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    for _ in range(rnd.randint(3, 6)):  # tinh thể tím phát sáng
        x, y, r = rnd.randrange(8, S - 8), rnd.randrange(8, S - 8), rnd.randint(2, 4)
        g.polygon([(x, y - r * 2), (x + r, y), (x, y + r * 2), (x - r, y)], fill=(230, 150, 255))
    im = Image.fromarray(np.clip(np.asarray(im).astype(int) + np.asarray(glow.filter(ImageFilter.GaussianBlur(3))).astype(int) * 0.8
                                 + np.asarray(glow).astype(int) * 0.6, 0, 255).astype(np.uint8))
    return im


new = {}
for i, base in enumerate(['dat-den-1', 'dat-den-2', 'dat-den-3', 'dat-den-5']):
    new[f'hac-thach-{i + 1}'] = hac_thach(tile(base), 100 + i)
for i, base in enumerate(['soi-1', 'soi-2', 'soi-3', 'soi-4']):
    new[f'tu-vuc-{i + 1}'] = tu_vuc(tile(base), 200 + i)

used = {tuple(v) for k, v in idx['tiles'].items() if k not in new}
slots = [(c * S, r * S) for r in range(H // S + 2) for c in range(cols) if (c * S, r * S) not in used]
need_h = max(y for _, y in slots[:len(new)]) + S
if need_h > H:
    big = Image.new('RGB', (W, need_h), (0, 0, 0)); big.paste(atlas, (0, 0)); atlas = big
for (name, im), (x, y) in zip(new.items(), slots):
    atlas.paste(im, (x, y))
    idx['tiles'][name] = [x, y]
atlas.save(idx['atlas'], quality=88, method=6)
TILES.write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n')
print('atlas', atlas.size, 'thêm', list(new))
