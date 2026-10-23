"""Bảng Nhân vật v3 của chủ dự án (ảnh chụp màn hình ChatGPT: assets/ui/_source/bang-nhan-vat-v3-chup.png).

- Nền thẻ hồng (227,50,243) + góc đen bo tròn của thẻ → trong suốt
- Nút "chia sẻ" của ChatGPT đè lên góc mây dưới phải → dựng lại bằng cách lật góc dưới trái (khung đối xứng)
- Xoá nhân vật mẫu ở giữa (giữ vòng pháp trận dưới chân)
Ra: assets/ui/frames/bang-nhan-vat-v3.png; in toạ độ ô trang bị, thanh tên, nút ✕ theo ảnh đã cắt.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = 'assets/ui/_source/bang-nhan-vat-v3-chup.png'
OUT = 'assets/ui/frames/bang-nhan-vat-v3.png'
CROP = (60, 895, 1062, 2018)
CARD = np.array([227, 50, 243])
AXIS = 560                                  # trục đối xứng dọc (toạ độ ảnh gốc)
SHARE = (890, 1890, 1025, 2018)             # nút chia sẻ đè lên khung
CHAR = (488, 1285, 632, 1640)               # nhân vật mẫu
SLOTS = [(183, 1163), (183, 1334), (183, 1509), (183, 1681), (757, 1163), (757, 1334), (757, 1509), (757, 1681)]
SLOT = (178, 162)
BARS = [(383, 1724, 350, 57), (383, 1791, 350, 58)]
CLOSE = (947, 1006, 86, 78)


def main():
    a = np.array(Image.open(SRC).convert('RGB')).astype(int)
    # dựng lại góc bị nút chia sẻ che
    x0, y0, x1, y1 = SHARE
    for x in range(x0, x1):
        a[y0:y1, x] = a[y0:y1, 2 * AXIS - x]
    # xoá nhân vật: điểm ảnh ấm (tóc, da, áo, chân) → nền xanh đêm
    cx0, cy0, cx1, cy1 = CHAR
    reg = a[cy0:cy1, cx0:cx1]
    bg = np.median(a[1400:1500, 420:470].reshape(-1, 3), axis=0)
    warm = reg[..., 0] >= reg[..., 2] - 4
    reg[warm] = bg
    sub = a[CROP[1]:CROP[3], CROP[0]:CROP[2]]
    dist = np.sqrt(((sub - CARD) ** 2).sum(axis=2))
    alpha = np.clip((dist - 40) / 60, 0, 1)
    # góc đen của thẻ: điểm đen tuyền nối với mép vùng cắt
    black = sub.max(axis=2) < 8
    lab, _ = ndimage.label(black)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    alpha[np.isin(lab, list(edge))] = 0
    rgba = np.dstack([sub.clip(0, 255), (alpha * 255)]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    box = Image.fromarray(np.where(alpha > .15, 255, 0).astype(np.uint8)).getbbox()
    img = img.crop(box)
    img.save(OUT, optimize=True); img.save(OUT.replace('.png', '.webp'), 'WEBP', quality=88, method=6)  # game dùng webp
    ox, oy = CROP[0] + box[0], CROP[1] + box[1]
    print('khung', img.size)
    print('slots', [(x - ox, y - oy) for x, y in SLOTS], 'cỡ', SLOT)
    print('bars', [(x - ox, y - oy, w, h) for x, y, w, h in BARS])
    print('close', (CLOSE[0] - ox, CLOSE[1] - oy, CLOSE[2], CLOSE[3]), 'avatar', (CHAR[0] - ox, CHAR[1] - oy, CHAR[2] - CHAR[0], CHAR[3] - CHAR[1]))


if __name__ == '__main__':
    main()
