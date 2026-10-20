"""Chuẩn bị khung nhân vật HUD mới của chủ dự án (assets/ui/_source/khung-nhan-vat-moi.png).

Xoá phần vẽ sẵn để game tự vẽ: nhân vật trong vòng tròn, chữ + màu trong 3 thanh, chữ "Phàm nhân",
biểu tượng xoắn của Tu vi (thay bằng bông sen). Giữ viền, trái tim, ngọn lửa, nút nâng cấp.
Tách nền hồng, thu nửa kích thước (887 rộng) → assets/ui/frames/khung-nhan-vat-v2.png
Toạ độ trong file là toạ độ ảnh gốc 1774×887.
"""
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, 'tools')
from ui_slice import key_magenta  # noqa: E402

SRC = 'assets/ui/_source/khung-nhan-vat-moi.png'
OUT = 'assets/ui/frames/khung-nhan-vat-v2.png'
NAVY = (8, 22, 48)
TRACK = (7, 22, 48)

AVATAR = (352, 392, 192)                      # tâm x, tâm y, bán kính lòng vòng tròn
BARS = [(752, 262, 1583, 356), (752, 397, 1583, 492), (752, 535, 1417, 634)]  # khung ngoài 3 thanh — vẽ lại sạch
CREAM, DARK = (250, 238, 186), (4, 4, 14)
PLATE = (122, 664, 546, 741)                   # lòng bảng "Phàm nhân"
SPIRAL = (612, 518, 752, 646)                  # biểu tượng xoắn Tu vi (xoá điểm ảnh tím/sáng)


def main():
    img = Image.open(SRC).convert('RGB')
    d = ImageDraw.Draw(img)
    cx, cy, r = AVATAR
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=NAVY)
    d.rectangle(PLATE, fill=NAVY)
    for x0, y0, x1, y1 in BARS:  # vẽ lại thanh rỗng: viền kem 8, chỉ đen 4, lòng xanh đêm
        d.rectangle((x0 - 4, y0 - 4, x1 + 4, y1 + 4), fill=NAVY)
        d.rounded_rectangle((x0, y0, x1, y1), radius=14, fill=CREAM)
        d.rounded_rectangle((x0 + 8, y0 + 8, x1 - 8, y1 - 8), radius=9, fill=DARK)
        d.rounded_rectangle((x0 + 12, y0 + 12, x1 - 12, y1 - 12), radius=6, fill=TRACK)
    d.rectangle(SPIRAL, fill=NAVY)
    a = np.array(img)
    rgb, alpha = key_magenta(a)
    out = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    box = Image.fromarray(np.where(alpha > 40, 255, 0).astype(np.uint8)).getbbox()
    out = out.crop(box)
    out = out.resize((out.width // 2, out.height // 2), Image.LANCZOS)
    out.save(OUT, optimize=True)
    print(OUT, out.size, 'cắt từ', box)


if __name__ == '__main__':
    main()
