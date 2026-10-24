"""Mảnh sáng cho hệ thống hiệu ứng ghép (chủ dự án 25/10/2026: "mỗi lần GPT tạo 6–10 hình dạng ánh sáng, Claude tự code thành hiệu ứng").
Nguồn: assets/effects/_source/frag/<tấm>.png — lưới 4×2 ô đều nhau, nền đen, mỗi ô một hình tĩnh xanh ngọc.
Mỗi ô: cắt theo khung sáng thật (bỏ nền đen thừa), trừ mức đen (sương mờ GPT), mờ dần ở mép, thu về tối đa CELL px,
xếp vào một tấm atlas. Màu giữ xanh ngọc — trình duyệt tự đổi màu theo hệ (src/entity/vfx.js).
Dùng: python3 -I tools/fx_frag.py  → assets/effects/v3/frag.webp + data/art/vfx-frag.json (tên mảnh → [x, y, w, h])
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('assets/effects/_source/frag')
OUT_IMG = Path('assets/effects/v3/frag.webp')
OUT_JSON = Path('data/art/vfx-frag.json')
CELL = 200
# tên mảnh theo thứ tự ô (hàng trên trái → phải, rồi hàng dưới); None = bỏ ô đó
NAMES = {
    'co-ban': ['vong', 'sao', 'liem', 'cot', 'cau', 'tinh-the', 'xoay', 'may'],
    'hat': ['lua', 'set', 'la', 'long-vu', 'lap-lanh', 'giot', 'vet', 'khoi'],
    'bo1': ['sen', 'an-thai-cuc', 'dau-rong', 'kiem-vong', 'hoa-dao', None, 'loc', 'canh'],
    'bo2': ['an-rong', 'tam-kiem', 'nai', 'quyen-truc', 'truc', 'chuong', 'thai-cuc', 'ho-sen'],
    'bo3': ['an-sen', 'rong', 'cay', 'nui', 'sach', 'dinh', 'mua-kiem', 'phuong'],
    'bo4': ['loc-2', 'buom', 'trang', 'hoa', 'sen-2', 'lua-2', 'an-2', 'may-2'],
    'bo5': ['phu-vong', 'rong-2', 'hac', 'tinh-the-2', 'kiem', 'quyen-2', 'cau-sen', None],
}


def cut(a, r, c):
    h, w = a.shape[:2]
    y0, y1, x0, x1 = round(r * h / 2), round((r + 1) * h / 2), round(c * w / 4), round((c + 1) * w / 4)
    cell = a[y0:y1, x0:x1].astype(np.float32)
    cell = ((cell - 8) / (255 - 8) * 255).clip(0, 255)  # mức đen → 0
    lit = cell.max(axis=2) > 10
    ys, xs = np.where(lit)
    if not len(ys):
        return None
    m = 10
    cy0, cy1 = max(0, ys.min() - m), min(cell.shape[0], ys.max() + m + 1)
    cx0, cx1 = max(0, xs.min() - m), min(cell.shape[1], xs.max() + m + 1)
    cell = cell[cy0:cy1, cx0:cx1]
    hh, ww = cell.shape[:2]
    fy = np.minimum(np.arange(hh), np.arange(hh)[::-1]) / max(1, m)
    fx = np.minimum(np.arange(ww), np.arange(ww)[::-1]) / max(1, m)
    cell *= (np.minimum(fy[:, None], fx[None, :]).clip(0, 1) ** 1.5)[:, :, None]
    im = Image.fromarray(cell.astype(np.uint8))
    k = CELL / max(im.size)
    if k < 1:
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    return im


def main():
    frags = {}
    for sheet, names in NAMES.items():
        a = np.asarray(Image.open(SRC / f'{sheet}.png').convert('RGB'))
        for i, name in enumerate(names):
            if name:
                im = cut(a, i // 4, i % 4)
                if im:
                    frags[name] = im
    cols = 8
    rows = (len(frags) + cols - 1) // cols
    atlas = Image.new('RGB', (cols * CELL, rows * CELL))
    rects = {}
    for i, (name, im) in enumerate(frags.items()):
        x, y = (i % cols) * CELL, (i // cols) * CELL
        atlas.paste(im, (x, y))
        rects[name] = [x, y, im.width, im.height]
    OUT_IMG.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT_IMG, quality=88, method=6)
    OUT_JSON.write_text(json.dumps({'_ghi_chu': 'Sinh bằng tools/fx_frag.py — KHÔNG sửa tay. Mảnh sáng xanh ngọc, nền đen (vẽ cộng sáng), đổi màu theo hệ lúc chạy.',
                                    'src': str(OUT_IMG), 'frag': rects}, ensure_ascii=False, indent=1) + '\n')
    print(len(frags), atlas.size, OUT_IMG.stat().st_size)


if __name__ == '__main__':
    main()
