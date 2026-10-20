"""Sinh bản đồ vòng lặp 500×500 ô cho khu khởi đầu.

Dùng: python3 -I tools/gen_map.py
Ra:   data/zones/zone.start.map.png — mỗi điểm ảnh là một ô, màu theo data/terrain.json.
      Mở bằng app vẽ bất kỳ để sửa tay; game đọc thẳng ảnh này.

Thiết kế (bản nháp đầu, chờ chủ dự án duyệt):
- Tâm là đồng cỏ ~100×100 ô cho tân thủ (quái yếu nhất). Ra ngoài lần lượt:
  cát vàng → đá lát → băng tuyết → sỏi đá → hắc thổ (có vũng dung nham).
- Ranh giới các vành dùng hàm nhiễu tuần hoàn nên mép tự nhiên và bản đồ nối liền khi đi qua mép (vòng lặp).
- Hai vòng sông bảo vệ: quanh đồng cỏ và quanh vành cát. Chỉ qua được ở các chỗ lội nước nông,
  để quái mạnh vành ngoài không tràn vào khu tân thủ.
- Các vành ngoài có sông uốn lượn và hồ; mỗi vành có vài hồ nhỏ làm cảnh.
"""
import json
import math
import random
from pathlib import Path

import numpy as np
from PIL import Image

N = 500
SEED = 20261020
OUT = Path('data/zones/zone.start.map.png')
TERRAIN = json.loads(Path('data/terrain.json').read_text())['types']
ID = {t['id']: i for i, t in enumerate(TERRAIN)}

# Bán kính các vành (đơn vị ô, theo "khoảng cách tròn-vuông" từ tâm)
RINGS = [('co', 57), ('cat', 100), ('da_lat', 140), ('tuyet', 180), ('soi', 220), ('dat_den', 10_000)]
MOATS = [(57, 4), (100, 4)]  # (bán kính, bề rộng) hai vòng sông bảo vệ
FORDS_PER_MOAT = 4
FORD_WIDTH = 7


def periodic_noise(rng, terms, scale_freq):
    """Nhiễu tuần hoàn trên hình xuyến: tổng sin với tần số nguyên → mép trái nối mép phải."""
    y, x = np.mgrid[0:N, 0:N] / N
    out = np.zeros((N, N))
    for _ in range(terms):
        fx, fy = rng.randint(-scale_freq, scale_freq), rng.randint(-scale_freq, scale_freq)
        if fx == 0 and fy == 0:
            fx = 1
        amp = 1 / math.hypot(fx, fy)
        out += amp * np.sin(2 * math.pi * (fx * x + fy * y) + rng.uniform(0, 2 * math.pi))
    return out / np.abs(out).max()


def ensure_reachable(grid):
    """Mọi ô đi được phải tới được từ tâm (xét cả nối qua mép). Vùng bị nước sâu bao kín
    thì mở một lối nước nông ngắn nhất ra vùng chính."""
    from scipy import ndimage
    walk = np.array([t['walk'] for t in TERRAIN])
    while True:
        w = walk[grid]
        tiled = np.tile(w, (3, 3))  # xếp 3×3 để tính liên thông qua mép
        labels, _ = ndimage.label(tiled)
        main_label = labels[N + N // 2, N + N // 2]
        reach = (labels == main_label).reshape(3, N, 3, N).any(axis=(0, 2))
        stuck = w & ~reach
        if not stuck.any():
            return
        sy, sx = np.argwhere(stuck)[0]
        dist = ndimage.distance_transform_edt(~reach)
        # đi dần về phía vùng chính, biến ô cản thành nước nông
        y, x = sy, sx
        while not reach[y, x]:
            nbrs = [((y + dy) % N, (x + dx) % N) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            y, x = min(nbrs, key=lambda p: dist[p])
            if not walk[grid[y, x]]:
                grid[y, x] = ID['nuoc_nong']


def main():
    rng = random.Random(SEED)
    y, x = np.mgrid[0:N, 0:N].astype(float)
    c = N / 2
    dx, dy = np.abs(x - c), np.abs(y - c)
    # chuẩn p=4: giữa tròn và vuông, để vành ngoài không phình quá to ở góc
    r = (dx ** 4 + dy ** 4) ** 0.25
    warp = periodic_noise(rng, 14, 6) * 9 + periodic_noise(rng, 10, 14) * 3
    rw = r + warp

    grid = np.full((N, N), ID['dat_den'], np.uint8)
    for name, radius in reversed(RINGS):
        grid[rw < radius] = ID[name]

    # vũng dung nham trong hắc thổ
    lava = periodic_noise(rng, 16, 18)
    grid[(grid == ID['dat_den']) & (lava > 0.55)] = ID['dung_nham']

    angle = np.arctan2(y - c, x - c)

    # hai vòng sông bảo vệ, có chỗ lội
    for radius, width in MOATS:
        ring = np.abs(rw - radius) < width / 2
        grid[ring] = ID['nuoc_sau']
        offset = rng.uniform(0, 2 * math.pi)
        for k in range(FORDS_PER_MOAT):
            a = offset + k * 2 * math.pi / FORDS_PER_MOAT
            arc = FORD_WIDTH / radius
            da = np.angle(np.exp(1j * (angle - a)))
            grid[ring & (np.abs(da) < arc / 2)] = ID['nuoc_nong']
        # bờ nước nông hai bên lòng sông sâu cho mềm mép
        bank = (np.abs(rw - radius) >= width / 2) & (np.abs(rw - radius) < width / 2 + 1.2)
        grid[bank & (grid != ID['nuoc_sau'])] = ID['nuoc_nong']

    # sông uốn lượn ở các vành ngoài (theo đường đồng mức của nhiễu)
    # là nước nông (lội được, đi chậm) để không chặn đường thành vùng kín
    river = periodic_noise(rng, 12, 5)
    outer = rw > 145
    grid[outer & (np.abs(river) < 0.03) & (grid != ID['nuoc_sau'])] = ID['nuoc_nong']

    # hồ: mỗi vành vài hồ, tránh tâm và tránh đè lên sông bảo vệ
    lakes = [(25, 40, 3, 6), (70, 92, 3, 8), (110, 135, 3, 10), (150, 175, 3, 11), (190, 215, 3, 12), (230, 300, 4, 14)]
    for rmin, rmax, count, size in lakes:
        for _ in range(count):
            a = rng.uniform(0, 2 * math.pi)
            rr = rng.uniform(rmin, rmax)
            lx, ly = (c + rr * math.cos(a)) % N, (c + rr * math.sin(a)) % N
            ddx = np.abs(x - lx); ddx = np.minimum(ddx, N - ddx)
            ddy = np.abs(y - ly); ddy = np.minimum(ddy, N - ddy)
            shape = np.hypot(ddx * rng.uniform(.7, 1.3), ddy * rng.uniform(.7, 1.3)) + periodic_noise(rng, 6, 20) * 2
            grid[shape < size] = ID['nuoc_sau']
            grid[(shape >= size) & (shape < size + 2) & (grid != ID['nuoc_sau'])] = ID['nuoc_nong']

    # điểm xuất hiện luôn là cỏ khô ráo
    grid[(np.abs(x - c) < 12) & (np.abs(y - c) < 12)] = ID['co']

    ensure_reachable(grid)

    palette = np.array([t['color'] for t in TERRAIN], np.uint8)
    Image.fromarray(palette[grid], 'RGB').save(OUT, optimize=True)
    counts = {TERRAIN[i]['id']: int((grid == i).sum()) for i in range(len(TERRAIN))}
    print(OUT, OUT.stat().st_size // 1024, 'KB', counts)


if __name__ == '__main__':
    main()
