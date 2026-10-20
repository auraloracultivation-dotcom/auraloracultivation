"""Cắt tấm ảnh nhiều hình (nền hồng / xanh lá / trắng) thành từng khung theo HÀNG.

Dùng làm thư viện cho tools/asset_build.py, hoặc chạy để xem các hàng tìm được:
    python3 -I tools/sheet_cut.py <ảnh> [magenta|green|white] [độ_gộp]
In ra: mỗi hàng (y0..y1) và các khung (x0, y0, x1, y1) trong hàng đó.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, __import__('os').path.dirname(__file__))
from ui_slice import key_magenta  # noqa: E402


def key_green(rgb):
    r, g, b = (rgb[..., i].astype(np.float32) for i in range(3))
    m = g - np.maximum(r, b)  # độ "xanh lá"
    alpha = np.clip((150 - m) / (150 - 60), 0, 1)
    out = rgb.astype(np.float32).copy()
    spill = alpha < 1
    out[..., 1] = np.where(spill, np.minimum(out[..., 1], np.maximum(out[..., 0], out[..., 2])), out[..., 1])
    return out.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)


def key_white(rgb):
    light = rgb.min(axis=2) > 235
    labels, _ = ndimage.label(light)
    edge = set(np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))) - {0}
    alpha = np.where(np.isin(labels, list(edge)), 0, 255).astype(np.uint8)
    return rgb, alpha


def load_keyed(path, bg='magenta'):
    im = Image.open(path)
    if im.mode in ('RGBA', 'LA', 'P') and bg == 'alpha':
        a = np.array(im.convert('RGBA'))
        return a[..., :3], a[..., 3]
    rgb = np.array(im.convert('RGB'))
    if bg == 'magenta':
        return key_magenta(rgb)
    if bg == 'green':
        return key_green(rgb)
    if bg == 'white':
        return key_white(rgb)
    raise ValueError(bg)


def rows_and_frames(alpha, merge=6, min_area=120, row_gap=6):
    """Tìm các khung: gộp vụn bằng giãn nở `merge` điểm, rồi xếp theo hàng."""
    solid = ndimage.binary_dilation(alpha > 40, iterations=merge)
    labels, _ = ndimage.label(solid)
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(labels), 1):
        if sl is None:
            continue
        if (alpha[sl] > 40).sum() < min_area:
            continue
        boxes.append((sl[1].start, sl[0].start, sl[1].stop, sl[0].stop))
    boxes.sort(key=lambda b: (b[1] + b[3]) / 2)
    rows = []
    for b in boxes:
        cy = (b[1] + b[3]) / 2
        for r in rows:
            if r['y0'] - row_gap <= cy <= r['y1'] + row_gap:
                r['f'].append(b); r['y0'] = min(r['y0'], b[1]); r['y1'] = max(r['y1'], b[3]); break
        else:
            rows.append({'y0': b[1], 'y1': b[3], 'f': [b]})
    for r in rows:
        r['f'].sort()
    return rows


def crop(rgb, alpha, box):
    x0, y0, x1, y1 = box
    return Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]]), 'RGBA')


if __name__ == '__main__':
    path, bg = sys.argv[1], (sys.argv[2] if len(sys.argv) > 2 else 'magenta')
    merge = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    rgb, a = load_keyed(path, bg)
    for i, r in enumerate(rows_and_frames(a, merge)):
        print(i, (r['y0'], r['y1']), len(r['f']), [b[:4] for b in r['f']])
