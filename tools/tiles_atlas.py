"""Cắt tấm ô đất/nước của chủ dự án thành atlas dùng trong game.

Dùng: python3 -I tools/tiles_atlas.py
Vào:  assets/tiles/_source-o-dat-nuoc.png (nền hồng, trái 5×7 ô đất, phải 5×6 ô nước)
Ra:   assets/tiles/atlas.webp + data/tiles.json (tên ô → vị trí trong atlas)
Mỗi ô bỏ viền đen và mép trang trí rồi chuẩn hoá về 128×128 để xếp liền không lộ đường kẻ.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path('assets/tiles/_source-o-dat-nuoc.png')
OUT_ATLAS = Path('assets/tiles/atlas.webp')
OUT_JSON = Path('data/tiles.json')
SIZE = 128
COLS = 8

GROUND_ROWS = ['co', 'cat', 'da-lat', 'tuyet', 'soi', 'dat-kho', 'dat-den']
WATER_ROWS = ['nuoc-sau', 'nuoc-lam', 'nuoc-vua', 'nuoc-ngoc', 'nuoc-nong', 'nuoc-ven-bo']
BOTTOM_FRINGE = {'co', 'tuyet'}  # hàng có mép trang trí ở đáy
INSET = 6
INSET_BOTTOM_FRINGE = 13


def find_cells(rgb):
    magenta = (np.minimum(rgb[..., 0], rgb[..., 2]) - rgb[..., 1]) > 150
    labels, _ = ndimage.label(~magenta)
    cells = []
    for sl in ndimage.find_objects(labels):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h > 60 and w > 60:
            cells.append((sl[1].start, sl[0].start, w, h))
    return cells


def group_rows(cells):
    cells.sort(key=lambda c: (c[1], c[0]))
    rows, cur = [], []
    for c in cells:
        if cur and abs(c[1] - cur[0][1]) > 40:
            rows.append(sorted(cur)); cur = []
        cur.append(c)
    rows.append(sorted(cur))
    return rows


def main():
    img = Image.open(SRC).convert('RGB')
    rgb = np.array(img).astype(int)
    cells = find_cells(rgb)
    mid = img.width // 2
    left = group_rows([c for c in cells if c[0] < mid])
    right = group_rows([c for c in cells if c[0] >= mid])
    assert len(left) == len(GROUND_ROWS) and len(right) == len(WATER_ROWS), (len(left), len(right))

    tiles = []
    for names, rows in ((GROUND_ROWS, left), (WATER_ROWS, right)):
        for name, row in zip(names, rows):
            for i, (x, y, w, h) in enumerate(row, start=1):
                bottom = INSET_BOTTOM_FRINGE if name in BOTTOM_FRINGE else INSET
                crop = img.crop((x + INSET, y + INSET, x + w - INSET, y + h - bottom))
                tiles.append((f'{name}-{i}', crop.resize((SIZE, SIZE), Image.LANCZOS)))

    rows_n = -(-len(tiles) // COLS)
    atlas = Image.new('RGB', (COLS * SIZE, rows_n * SIZE))
    index = {}
    for k, (name, tile) in enumerate(tiles):
        cx, cy = k % COLS, k // COLS
        atlas.paste(tile, (cx * SIZE, cy * SIZE))
        index[name] = [cx * SIZE, cy * SIZE]
    atlas.save(OUT_ATLAS, quality=90, method=6)
    OUT_JSON.write_text(json.dumps({'atlas': str(OUT_ATLAS), 'size': SIZE, 'tiles': index}, ensure_ascii=False, indent=1))
    print(f'{len(tiles)} ô → {OUT_ATLAS} ({OUT_ATLAS.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
