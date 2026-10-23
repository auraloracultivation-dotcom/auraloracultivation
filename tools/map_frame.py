"""Khung bản đồ tròn của chủ dự án (assets/ui/_source/khung-ban-do.png, nền hồng).

Tách: vòng khung + 4 chữ N/E/S/W → frames/khung-ban-do.png (lòng tròn trong suốt để game vẽ bản đồ thật bên dưới);
nút ✕, +, − → icons/ban-do-dong.png, ban-do-cong.png, ban-do-tru.png.
Phần bản đồ vẽ mẫu trong lòng bị xoá; chỗ chữ N/E/S/W đè vào lòng tròn thì chỉ giữ điểm ảnh màu khung.
In ra toạ độ tâm/bán kính lòng tròn theo ảnh khung đã cắt (dùng trong src/ui/compass.js).
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, 'tools')
from ui_slice import key_magenta  # noqa: E402

SRC = 'assets/ui/_source/khung-ban-do.png'
CX, CY, R = 627, 585, 376               # lòng tròn (ảnh gốc)
BADGES = [(560, 130, 700, 300), (560, 870, 700, 1050), (150, 500, 310, 680), (945, 500, 1105, 680)]
FRAME_BOX = (130, 85, 1125, 1065)        # vùng khung (không gồm nút ✕ + −)
BUTTONS = {'ban-do-dong': (1030, 97, 1162, 222), 'ban-do-cong': (472, 1078, 600, 1203), 'ban-do-tru': (655, 1078, 782, 1203)}


def frame_colour(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    dark = rgb.max(axis=2) < 70
    gold = (r > 170) & (r - b > 50)
    purple = (r > 110) & (b > 140) & (g < r - 15)
    return dark | gold | purple


def main():
    img = np.array(Image.open(SRC).convert('RGB'))
    rgb, alpha = key_magenta(img)
    h, w = alpha.shape
    yy, xx = np.mgrid[0:h, 0:w]
    inside = (xx - CX) ** 2 + (yy - CY) ** 2 < R ** 2
    badge = np.zeros_like(inside)
    for x0, y0, x1, y1 in BADGES:
        badge[y0:y1, x0:x1] = True
    clear = inside & ~(badge & frame_colour(rgb.astype(int)))
    a = alpha.copy()
    a[clear] = 0
    x0, y0, x1, y1 = BUTTONS['ban-do-dong']
    a[y0 - 4:y1 + 4, x0 - 4:x1 + 4] = 0  # nút ✕ nằm trong vùng cắt khung → bỏ
    out = Image.fromarray(np.dstack([rgb, a]), 'RGBA').crop(FRAME_BOX)
    out.save('assets/ui/frames/khung-ban-do.png', optimize=True); out.save('assets/ui/frames/khung-ban-do.webp', 'WEBP', quality=88, method=6)  # game dùng webp
    for name, box in BUTTONS.items():
        Image.fromarray(np.dstack([rgb, alpha]), 'RGBA').crop(box).save(f'assets/ui/icons/{name}.png', optimize=True)
    x0, y0 = FRAME_BOX[:2]
    print('khung', out.size, 'tâm', (CX - x0, CY - y0), 'bán kính', R)


if __name__ == '__main__':
    main()
