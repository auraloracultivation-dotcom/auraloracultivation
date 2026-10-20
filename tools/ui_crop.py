"""Cắt một vùng chữ nhật từ tấm UI gốc, tách nền, lưu thành file có tên.

Dùng khi mảnh cần lấy dính liền với mảnh khác nên công cụ cắt tự động (ui_slice.py) không tách riêng được.
python3 -I tools/ui_crop.py <ảnh nguồn> <x> <y> <rộng> <cao> <file ra> [--bg magenta|black]
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, 'tools')
from ui_slice import key_black, key_magenta  # noqa: E402


def crop(src, x, y, w, h, out, bg='magenta'):
    rgb = np.array(Image.open(src).convert('RGB').crop((x, y, x + w, y + h)))
    rgb, alpha = key_magenta(rgb) if bg == 'magenta' else key_black(rgb)
    img = Image.fromarray(np.dstack([rgb, alpha]), 'RGBA')
    box = img.getbbox()
    if box:
        img = img.crop(box)
    img.save(out, optimize=True)
    return img.size


if __name__ == '__main__':
    a = sys.argv
    bg = a[a.index('--bg') + 1] if '--bg' in a else 'magenta'
    print(a[6], crop(a[1], int(a[2]), int(a[3]), int(a[4]), int(a[5]), a[6], bg))
