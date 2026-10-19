"""Tách nền và cắt tấm UI thành từng mảnh.

Dùng: python3 -I tools/ui_slice.py <ảnh nguồn> <thư mục ra> [--bg magenta|black]
- magenta: xoá nền hồng toàn ảnh, làm mềm viền và khử ám hồng ở mép.
- black: chỉ xoá vùng đen nối với mép ảnh (giữ phần tối bên trong khung).
Mỗi mảnh liền nhau thành một file PNG, nén bảng màu (giữ trong suốt), kèm manifest.json.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

MIN_AREA = 150  # bỏ vụn nhỏ hơn số điểm ảnh này


def key_magenta(rgb):
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    # "độ hồng": hồng thuần (250,3,252) ≈ 248; nét vẽ ≈ 0 hoặc âm
    m = np.minimum(r, b) - g
    alpha = np.clip((210 - m) / (210 - 110), 0, 1)  # m>=210 trong suốt, m<=110 đặc
    # khử ám hồng ở mép: tách màu nền ra khỏi điểm ảnh lẫn (obs = a*fg + (1-a)*nền)
    bgc = np.array([250, 3, 251], np.float32)
    a = np.maximum(alpha, 0.05)[..., None]
    fg = (rgb.astype(np.float32) - (1 - a) * bgc) / a
    out = np.where(alpha[..., None] < 1, fg, rgb.astype(np.float32))
    return out.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)


def key_black(rgb):
    dark = rgb.max(axis=2) < 22
    labels, _ = ndimage.label(dark)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    bg = np.isin(labels, list(edge))
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    return rgb, alpha


def slice_sheet(src, out_dir, bg):
    im = Image.open(src).convert('RGB')
    rgb = np.array(im)
    rgb, alpha = key_magenta(rgb) if bg == 'magenta' else key_black(rgb)
    solid = ndimage.binary_dilation(alpha > 40, iterations=2)
    labels, n = ndimage.label(solid)
    out_dir.mkdir(parents=True, exist_ok=True)
    pieces = []
    for idx, sl in enumerate(ndimage.find_objects(labels), start=1):
        if sl is None:
            continue
        mask = labels[sl] == idx
        if mask.sum() < MIN_AREA:
            continue
        a = np.where(mask, alpha[sl], 0).astype(np.uint8)
        rgba = np.dstack([rgb[sl], a])
        pieces.append((sl[0].start, sl[1].start, rgba))
    # đánh số theo hàng (trên→dưới), rồi trái→phải
    pieces.sort(key=lambda p: (p[0] // 40, p[1]))
    manifest = []
    for i, (y, x, rgba) in enumerate(pieces, start=1):
        name = f'{i:03d}.png'
        img = Image.fromarray(rgba, 'RGBA')
        img.quantize(colors=128, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out_dir / name, optimize=True)
        manifest.append({'file': name, 'x': int(x), 'y': int(y), 'w': img.width, 'h': img.height})
    (out_dir / 'manifest.json').write_text(json.dumps({'source': Path(src).name, 'pieces': manifest}, ensure_ascii=False, indent=1))
    return manifest


if __name__ == '__main__':
    src, out = sys.argv[1], Path(sys.argv[2])
    bg = sys.argv[sys.argv.index('--bg') + 1] if '--bg' in sys.argv else 'magenta'
    m = slice_sheet(src, out, bg)
    print(f'{src}: {len(m)} mảnh → {out}')
