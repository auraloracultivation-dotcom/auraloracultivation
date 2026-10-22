"""Ghép bộ ô đất mới của chủ dự án (23/10/2026) vào atlas.

Nguồn: assets/tiles/_source/v2-<vùng>.png — nền hồng, mỗi ảnh đất có 4 khối 2×2 ô (16 ô), ảnh nước có 16 ô rời.
- Ô đất: cắt từng ô, bỏ viền đen lượn sóng / vạch lưới trong ảnh, rồi kẻ lại MỘT viền xám đen đều quanh mọi ô
  (yêu cầu chủ dự án: ô ghép không khít thì có viền xám đen như viền gốc, không vẽ chồng lên nhau).
- Ô nước: cắt sát, không viền (nước được phép vẽ chồng nhẹ để liền mạch).
Ra: thêm/ghi đè ô v2-<vùng>-<số> trong assets/tiles/atlas.webp + data/tiles.json.

Dùng: python3 -I tools/tiles_v2.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

TILES = Path('data/tiles.json')
SRC = Path('assets/tiles/_source')
LAND = ['xanh-co', 'cam-cat', 'xam-khoi', 'trang-tuyet', 'xam-than', 'den', 'tim']
DARKEN = {'den': 0.62}   # Vùng Đen: ảnh gốc xám trung tính → làm tối để khác Xám Than
BORDER = (38, 35, 42)    # xám đen như viền ảnh gốc
BW = 5                   # độ dày viền (điểm ảnh trên ô 128)

idx = json.loads(TILES.read_text())
S = idx['size']


def blocks(img, want):
    a = np.asarray(img).astype(int)
    pink = (a[..., 0] > 190) & (a[..., 1] < 90) & (a[..., 2] > 190)
    lab, n = ndimage.label(~pink)
    objs = ndimage.find_objects(lab)
    sizes = ndimage.sum(np.ones_like(lab), lab, range(1, n + 1))
    keep = sorted(range(n), key=lambda i: -sizes[i])[:want]
    out = []
    for i in keep:  # khung khối theo hàng/cột phủ >60% (bỏ phần cỏ, đá thò ra ngoài mép khối)
        sl = objs[i]
        m = lab[sl] == i + 1
        rows = np.where(m.mean(axis=1) > 0.6)[0]
        cols = np.where(m.mean(axis=0) > 0.6)[0]
        out.append((sl[1].start + cols[0], sl[0].start + rows[0], sl[1].start + cols[-1] + 1, sl[0].start + rows[-1] + 1))
    out.sort(key=lambda b: (round(b[1] / 120), b[0]))  # theo hàng rồi theo cột
    return out


def land_tiles(name):
    img = Image.open(SRC / f'v2-{name}.png').convert('RGB')
    out = []
    for x0, y0, x1, y1 in blocks(img, 4):
        mx, my = (x0 + x1) // 2, (y0 + y1) // 2
        OUT, IN = 18, 6  # cắt bỏ: mép ngoài lượn sóng + viền đen; vạch lưới giữa khối
        for cy in range(2):
            for cx in range(2):
                l = x0 + OUT if cx == 0 else mx + IN
                r = mx - IN if cx == 0 else x1 - OUT
                t = y0 + OUT if cy == 0 else my + IN
                b = my - IN if cy == 0 else y1 - OUT
                inner = img.crop((l, t, r, b)).resize((S - 2 * BW, S - 2 * BW), Image.LANCZOS)
                if name in DARKEN:
                    inner = Image.fromarray((np.asarray(inner).astype(float) * DARKEN[name]).clip(0, 255).astype(np.uint8))
                tile = Image.new('RGB', (S, S), BORDER)
                tile.paste(inner, (BW, BW))
                out.append(tile)
    return out


def water_tiles():
    img = Image.open(SRC / 'v2-nuoc.png').convert('RGB')
    return [img.crop((x0 + 4, y0 + 4, x1 - 4, y1 - 4)).resize((S, S), Image.LANCZOS) for x0, y0, x1, y1 in blocks(img, 16)]


new = {}
for name in LAND:
    for i, t in enumerate(land_tiles(name)):
        new[f'v2-{name}-{i + 1}'] = t
for i, t in enumerate(water_tiles()):
    new[f'v2-nuoc-{i + 1}'] = t

atlas = Image.open(idx['atlas']).convert('RGB')
W, H = atlas.size
cols = W // S
used = {tuple(v) for k, v in idx['tiles'].items() if k not in new}
slots = [(c * S, r * S) for r in range(H // S + len(new) // cols + 2) for c in range(cols) if (c * S, r * S) not in used]
need_h = max(y for _, y in slots[:len(new)]) + S
if need_h > H:
    big = Image.new('RGB', (W, need_h)); big.paste(atlas, (0, 0)); atlas = big
for (name, im), (x, y) in zip(new.items(), slots):
    atlas.paste(im, (x, y))
    idx['tiles'][name] = [x, y]
atlas.save(idx['atlas'], quality=88, method=6)
TILES.write_text(json.dumps(idx, ensure_ascii=False, indent=1) + '\n')
print('atlas', atlas.size, len(new), 'ô')

# xem trước: mỗi vùng 1 hàng 16 ô
prev = Image.new('RGB', (16 * 64, 8 * 64), (0, 0, 0))
for r, name in enumerate(LAND + ['nuoc']):
    for i in range(16):
        prev.paste(new[f'v2-{name}-{i + 1}'].resize((64, 64)), (i * 64, r * 64))
import sys
if len(sys.argv) > 1: prev.save(sys.argv[1])  # python3 -I tools/tiles_v2.py xem-truoc.png
