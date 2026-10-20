"""Bảng chỉ số của chủ dự án → khung dùng trong game.

Vào:  assets/ui/_source/chi-so-gon.png (thanh gọn 2 ô + ▲▼), chi-so-day-du.png (bảng đầy đủ 16 chỉ số)
Ra:   frames/chi-so-gon.png       — xoá kiếm/khiên + số trong 2 ô (game tự vẽ biểu tượng + số)
      frames/chi-so-day-du.png    — xoá số mẫu, giữ biểu tượng + tên chỉ số
      icons/cs-<id>.png           — 16 biểu tượng chỉ số (cắt từ bảng đầy đủ)
In ra toạ độ (theo ảnh đã cắt) để dán vào src/ui/stats.js.
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, 'tools')
from ui_slice import key_magenta  # noqa: E402

BG = (6, 10, 24)
# bảng đầy đủ: (id, cột, hàng) theo thứ tự trên ảnh
STATS = [
    ('mau', 0, 0), ('linh-khi', 0, 1), ('tu-vi', 0, 2), ('tan-cong', 0, 3),
    ('phong-thu', 0, 4), ('toc-chay', 0, 5), ('chinh-xac', 0, 6), ('toc-danh', 0, 7),
    ('bao-kich', 1, 0), ('hut-mau', 1, 1), ('phan-don', 1, 2), ('ne-tranh', 1, 3),
    ('tai-trong', 1, 4), ('toc-bay', 1, 5), ('xuyen-giap', 1, 6), ('ngu-thu', 1, 7),
]
NUM_Y = [[(264, 293), (405, 434), (546, 576), (694, 724), (836, 868), (987, 1014), (1129, 1157), (1275, 1304)],
         [(265, 294), (405, 434), (548, 576), (695, 724), (845, 874), (990, 1019), (1131, 1159), (1277, 1304)]]
TEXT_X = [(367, 483), (677, 793)]   # lòng ô chữ mỗi cột
ICON_X = [(232, 356), (542, 666)]   # ô biểu tượng mỗi cột
GON_SLOTS = [(346, 282, 657, 595), (346, 660, 658, 960)]  # lòng 2 ô thanh gọn
GON_ARROWS = [(360, 1075, 490, 1200), (359, 1243, 489, 1365)]


def cut(rgb, alpha):
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    box = Image.fromarray(np.where(alpha > 40, 255, 0).astype(np.uint8)).getbbox()
    return img.crop(box), box


def main():
    # --- bảng đầy đủ ---
    full = np.array(Image.open('assets/ui/_source/chi-so-day-du.png').convert('RGB'))
    rgb, alpha = key_magenta(full)
    for sid, col, row in STATS:
        y0, y1 = NUM_Y[col][row]
        x0, x1 = TEXT_X[col]
        ix0, ix1 = ICON_X[col]
        iy0 = y0 - 66
        k = 13  # bỏ viền ô + ngọc góc, chỉ lấy hình biểu tượng
        Image.fromarray(full[iy0 + k:iy0 + 124 - k, ix0 + k:ix1 - k]).save(f'assets/ui/icons/cs-{sid}.png', optimize=True)
        rgb[y0 - 4:y1 + 5, x0:x1] = BG
    img, box = cut(rgb, alpha)
    img.save('assets/ui/frames/chi-so-day-du.png', optimize=True)
    ox, oy = box[:2]
    print('day-du', img.size, 'so (cx, cy) theo hàng:')
    for col in (0, 1):
        print('  cot', col, [((TEXT_X[col][0] + TEXT_X[col][1]) // 2 - ox, (a + b) // 2 - oy) for a, b in NUM_Y[col]])
    # --- thanh gọn ---
    gon = np.array(Image.open('assets/ui/_source/chi-so-gon.png').convert('RGB'))
    rgb, alpha = key_magenta(gon)
    for x0, y0, x1, y1 in GON_SLOTS:  # xoá lòng ô, chừa 4 góc có ngọc
        c = 34
        rgb[y0 + 2:y1 - 2, x0 + c:x1 - c] = BG
        rgb[y0 + c:y1 - c, x0 + 2:x1 - 2] = BG
    img, box = cut(rgb, alpha)
    img.save('assets/ui/frames/chi-so-gon.png', optimize=True)
    ox, oy = box[:2]
    print('gon', img.size, 'slots', [(a - ox, b - oy, c - a, d - b) for a, b, c, d in GON_SLOTS],
          'arrows', [(a - ox, b - oy, c - a, d - b) for a, b, c, d in GON_ARROWS])


if __name__ == '__main__':
    main()
