"""Nút Bay lên / Hạ xuống từ ảnh mẫu (assets/ui/_source/mau-hud-doc.png).

Trong ảnh mẫu, bảng chữ "Bay lên"/"Hạ xuống" đè lên đáy vòng tròn nên đáy bị khuyết.
Vòng tròn đối xứng trên–dưới, nên dựng lại phần đáy bằng cách lật phần trên xuống.
"""
import sys

import numpy as np
from PIL import Image

sys.path.insert(0, 'tools')
from ui_slice import key_magenta  # noqa: E402

SRC = 'assets/ui/_source/mau-hud-doc.png'
BUTTONS = {'bay-len': (845, 547), 'ha-xuong': (845, 759)}  # tâm vòng tròn
HALF = 94          # nửa cạnh ô cắt (gồm cả viên ngọc trên/dưới)
HIDDEN_FROM = 54   # từ tâm xuống quá khoảng này là phần bị bảng chữ che → lật từ phần trên


def main():
    rgb, alpha = key_magenta(np.array(Image.open(SRC).convert('RGB')))
    for name, (cx, cy) in BUTTONS.items():
        box = (slice(cy - HALF, cy + HALF), slice(cx - HALF, cx + HALF))
        c, a = rgb[box].copy(), alpha[box].copy()
        n = 2 * HALF
        for y in range(HALF + HIDDEN_FROM, n):
            m = 2 * HALF - 1 - y  # hàng đối xứng qua tâm
            c[y], a[y] = c[m], a[m]
        yy, xx = np.mgrid[0:n, 0:n]
        a[(xx - HALF + 0.5) ** 2 + (yy - HALF + 0.5) ** 2 > HALF ** 2] = 0
        # mép phải dính nút +/− bên cạnh: vòng đối xứng trái–phải nên lật dải mép trái sang
        for x in range(HALF + 62, n):
            m = 2 * HALF - 1 - x
            c[:, x], a[:, x] = c[:, m], a[:, m]
        img = Image.fromarray(np.dstack([c, a]), 'RGBA')  # giữ ô vuông cố định để 2 trạng thái không lệch
        img.save(f'assets/ui/icons/{name}.png', optimize=True)
        print(name, img.size)


if __name__ == '__main__':
    main()
