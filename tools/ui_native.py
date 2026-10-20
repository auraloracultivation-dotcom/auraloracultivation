"""Chuẩn hoá một mảnh UI về "pixel gốc" để mọi khung trong game có viền cùng độ dày và sắc nét.

Vấn đề: ảnh UI vẽ ở nhiều tỉ lệ khác nhau (một "điểm pixel" của hình = 1, 2 hay 3 điểm ảnh tuỳ mảnh)
và hơi nhoè. Phóng to/thu nhỏ tuỳ ý trong game làm viền mỗi khung một độ dày, mờ.

Cách làm:
1. Đo độ dày viền đen ngoài cùng (tính bằng điểm ảnh gốc) → hệ số f.
2. Thu nhỏ đúng f lần (mỗi ô f×f lấy màu đại diện) → mỗi điểm = 1 "pixel hình".
3. Gom màu về bảng ≤ COLORS màu, độ trong suốt chỉ còn có/không → mép sắc.
Game sau đó chỉ phóng các ảnh này theo BỘI SỐ NGUYÊN của cùng một cỡ pixel → viền đồng đều.

Dùng: python3 -I tools/ui_native.py <ảnh RGBA> <ảnh ra> [--f 2] [--colors 32]
"""
import sys

import numpy as np
from PIL import Image

COLORS = 32


def outline_thickness(rgba):
    a = rgba[..., 3] > 127
    lum = rgba[..., :3].astype(int).mean(axis=2)
    runs = []
    h, w = a.shape
    for y in range(0, h, max(1, h // 40)):
        row = a[y]
        xs = np.flatnonzero(row)
        if len(xs) < 4:
            continue
        for x0, step in ((xs[0], 1), (xs[-1], -1)):
            n = 0
            x = x0
            while 0 <= x < w and row[x] and lum[y, x] < 60 and n < 8:
                n += 1
                x += step
            if n:
                runs.append(n)
    return int(np.clip(round(np.median(runs)) if runs else 1, 1, 4))


def to_native(img, f=None, colors=COLORS):
    rgba = np.array(img.convert('RGBA'))
    if f is None:
        f = outline_thickness(rgba)
    h, w = rgba.shape[:2]
    nh, nw = max(1, round(h / f)), max(1, round(w / f))
    # màu đại diện mỗi ô: trung bình có trọng số alpha (tránh viền hồng/đen loang vào)
    big = Image.fromarray(rgba, 'RGBA').resize((nw * f, nh * f), Image.LANCZOS)
    b = np.array(big).astype(float).reshape(nh, f, nw, f, 4)
    al = b[..., 3:4]
    rgb = (b[..., :3] * al).sum(axis=(1, 3)) / np.maximum(al.sum(axis=(1, 3)), 1)
    alpha = b[..., 3].mean(axis=(1, 3))
    out = np.dstack([rgb.clip(0, 255), np.where(alpha > 110, 255, 0)]).astype(np.uint8)
    small = Image.fromarray(out, 'RGBA')
    q = small.convert('RGB').quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    final = np.dstack([np.array(q), out[..., 3]])
    return Image.fromarray(final, 'RGBA'), f


if __name__ == '__main__':
    a = sys.argv
    f = int(a[a.index('--f') + 1]) if '--f' in a else None
    colors = int(a[a.index('--colors') + 1]) if '--colors' in a else COLORS
    img, used = to_native(Image.open(a[1]), f, colors)
    img.save(a[2], optimize=True)
    print(f'{a[2]}: f={used} → {img.size[0]}×{img.size[1]}')
