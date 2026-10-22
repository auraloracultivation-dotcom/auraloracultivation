"""Ghép bộ ô đất mới của chủ dự án (23/10/2026, bản 3: mỗi khối 2×2 = 1 ô lớn, liền mạch, nhạt màu) vào atlas.

Nguồn: assets/tiles/_source/v2-<vùng>.png — nền hồng, mỗi ảnh đất có 4 khối 2×2 ô (16 ô), ảnh nước có 16 ô rời.
- Ô đất (v3-<vùng>-1..4): mỗi khối 2×2 là MỘT ô bản đồ — xoá vạch lưới giữa, bỏ mép lượn sóng, nhạt màu,
  hoà dải mép về màu nền chung của vùng để các ô liền nhau (chủ dự án 23/10: to hơn, đỡ đau mắt, liền mạch).
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


SAT = 0.58      # giảm độ đậm màu (yêu cầu 23/10: nhạt hơn nữa)
LIGHT = 1.10    # sáng lên cho đỡ nặng mắt
FEATHER = 0.14  # bề rộng dải mép (tỷ lệ cạnh ô) hoà dần về màu nền chung của vùng → các ô đặt cạnh nhau liền mạch
EDGE_MIX = 0.55 # tại sát mép: 55% màu nền chung, 45% ảnh gốc


def soften(rgb):
    hsv = np.asarray(Image.fromarray(rgb).convert('HSV')).astype(float)
    hsv[..., 1] *= SAT
    hsv[..., 2] = np.minimum(255, hsv[..., 2] * LIGHT)
    return np.asarray(Image.fromarray(hsv.astype(np.uint8), 'HSV').convert('RGB'))


def cut_seam(a, m, axis, b=10, k=12):
    """Cắt dải 2b quanh vạch lưới ở vị trí m (theo trục axis), nối hai nửa và hoà k điểm ảnh cho liền."""
    if axis == 1: return cut_seam(a.transpose(1, 0, 2), m, 0, b, k).transpose(1, 0, 2)
    top, bot = a[:m - b], a[m + b:]
    w = np.linspace(0, 1, k)[:, None, None]
    mid = top[-k:] * (1 - w) + bot[:k] * w
    return np.concatenate([top[:-k], mid, bot[k:]])


def land_tiles(name):
    """Mỗi khối 2×2 trong ảnh = MỘT ô bản đồ (chủ dự án đã gộp 4 ô thành 1). Xoá vạch lưới giữa khối, cắt mép lượn sóng,
    nhạt màu, rồi hoà dải mép về màu nền chung của vùng để ô cạnh nhau nối liền."""
    img = Image.open(SRC / f'v2-{name}.png').convert('RGB')
    raw = []
    for x0, y0, x1, y1 in blocks(img, 4):
        OUT = 26  # mép ngoài lượn sóng + viền đen
        a = np.asarray(img)[y0 + OUT:y1 - OUT, x0 + OUT:x1 - OUT].astype(float)
        mx, my = (x1 - x0) // 2 - OUT, (y1 - y0) // 2 - OUT
        a = cut_seam(a, mx, axis=1)  # bỏ hẳn vạch lưới dọc giữa khối, nối 2 nửa bằng dải hoà màu
        a = cut_seam(a, my, axis=0)  # vạch ngang
        if name in DARKEN: a = a * DARKEN[name]
        raw.append(soften(a.clip(0, 255).astype(np.uint8)))
    tiles = [np.asarray(Image.fromarray(r).resize((S, S), Image.LANCZOS)).astype(float) for r in raw]
    base = np.median(np.concatenate([t.reshape(-1, 3) for t in tiles]), axis=0)  # màu nền chung của vùng
    yy, xx = np.mgrid[0:S, 0:S] / (S - 1)
    edge = np.minimum(np.minimum(xx, 1 - xx), np.minimum(yy, 1 - yy))   # 0 ở mép, 0.5 ở giữa
    w = (np.clip(1 - edge / FEATHER, 0, 1) ** 1.6 * EDGE_MIX)[..., None]
    return [Image.fromarray((t * (1 - w) + base * w).clip(0, 255).astype(np.uint8)) for t in tiles]


def water_tiles():
    img = Image.open(SRC / 'v2-nuoc.png').convert('RGB')
    return [Image.fromarray(soften(np.asarray(img.crop((x0 + 4, y0 + 4, x1 - 4, y1 - 4)).resize((S, S), Image.LANCZOS))))
            for x0, y0, x1, y1 in blocks(img, 16)]


new = {}
for k in [k for k in idx['tiles'] if any(k.startswith(f'v2-{n}-') or k.startswith(f'v3-{n}-') for n in LAND)]:
    del idx['tiles'][k]  # bản cắt 16 ô nhỏ cũ (thay bằng 4 ô lớn v3)
for name in LAND:
    for i, t in enumerate(land_tiles(name)):
        new[f'v3-{name}-{i + 1}'] = t
# Biến thể TRƠN mỗi vùng (v3-<vùng>-tron-1..4): lọc trung vị bỏ sỏi, cỏ, cây vẽ sẵn, giữ vân nền + hạt nhiễu nhẹ.
# Bản đồ dùng chủ yếu ô trơn, ô nhiều chi tiết chỉ thỉnh thoảng (chủ dự án: sỏi + cây chi chít đau mắt).
import cv2
rng0 = np.random.default_rng(3)
for name in LAND:
    for i in range(4):
        a = np.asarray(new[f'v3-{name}-{i + 1}']).copy()
        a = cv2.medianBlur(cv2.medianBlur(a, 19), 11).astype(float) + rng0.normal(0, 2.2, a.shape[:2])[..., None]
        new[f'v3-{name}-tron-{i + 1}'] = Image.fromarray(a.clip(0, 255).astype(np.uint8))
# Đường đất: lấy ô cát, lọc trung vị bỏ hết xương rồng / đá / cỏ, nhuộm nâu đất, thêm hạt sỏi nhỏ → khớp phong cách ô mới
import cv2
rng = np.random.default_rng(7)
for i in range(4):
    a = np.asarray(new[f'v3-cam-cat-{i + 1}']).copy()
    a = cv2.medianBlur(cv2.medianBlur(a, 21), 15).astype(float)
    a = a * np.array([0.80, 0.66, 0.50]) + rng.normal(0, 3.5, a.shape[:2])[..., None]
    for _ in range(26):  # sỏi
        x, y, r = rng.integers(6, S - 6), rng.integers(6, S - 6), int(rng.integers(1, 3))
        a[y - r:y + r, x - r:x + r] *= 0.78
    new[f'v3-duong-{i + 1}'] = Image.fromarray(a.clip(0, 255).astype(np.uint8))
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
# xem trước: mỗi vùng ghép 6×3 ô ngẫu nhiên (thấy chỗ nối), nước 16 ô
import random
rnd = random.Random(1)
prev = Image.new('RGB', (6 * 96 * 2, 4 * 3 * 96), (0, 0, 0))
for r, name in enumerate(LAND):
    ox, oy = (r % 2) * 6 * 96, (r // 2) * 3 * 96
    for j in range(3):
        for i in range(6):
            t = new[f'v3-{name}-{rnd.randint(1, 4)}']
            if rnd.random() < 0.5: t = t.transpose(Image.FLIP_LEFT_RIGHT)
            prev.paste(t.resize((96, 96)), (ox + i * 96, oy + j * 96))
for i in range(16): prev.paste(new[f'v2-nuoc-{i + 1}'].resize((72, 72)), (6 * 96 + (i % 8) * 72, 9 * 96 + (i // 8) * 72))
import sys
if len(sys.argv) > 1: prev.save(sys.argv[1])  # python3 -I tools/tiles_v2.py xem-truoc.png
