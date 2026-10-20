"""Tách khung bảng từ ảnh mẫu chụp trong game (nền là bản đồ cỏ/nước, không phải nền hồng).

python3 -I tools/panel_from_mockup.py <ảnh mẫu> <x0> <y0> <x1> <y1> <file ra>
Nền = điểm ảnh màu cỏ (xanh lá) hoặc nước (xanh lam sáng) nối liền với mép vùng cắt → trong suốt.
Khung chủ dự án dùng xanh đêm / vàng / tím nên không lẫn với nền.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def extract(src, box, out):
    rgb = np.array(Image.open(src).convert('RGB').crop(box)).astype(int)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    grass = (g > r + 5) & (g >= b - 6)            # cỏ, kể cả đường kẻ ô cỏ tối
    water = (b - r > 30) & (g - r > 25)             # nước, kể cả đường kẻ ô nước tối
    bg = grass | water
    bg = ndimage.binary_closing(bg, iterations=3, border_value=1) & ~(r > 120)  # nối khe các đường kẻ ô; chừa vàng/tím
    labels, _ = ndimage.label(bg)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    outside = np.isin(labels, list(edge))
    # gom vụn: điểm lẻ không phải nền nhưng bị nền bao quanh ngoài khung cũng bỏ
    keep = ~outside
    lab2, n = ndimage.label(keep)
    if n > 1:
        sizes = ndimage.sum(keep, lab2, range(1, n + 1))
        keep = lab2 == (1 + int(np.argmax(sizes)))
    keep = ndimage.binary_fill_holes(keep)
    alpha = np.where(keep, 255, 0).astype(np.uint8)
    img = Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), 'RGBA')
    img.save(out, optimize=True)
    return img.size


if __name__ == '__main__':
    a = sys.argv
    print(a[6], extract(a[1], tuple(map(int, a[2:6])), a[6]))
