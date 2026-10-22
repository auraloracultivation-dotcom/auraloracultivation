"""Thư viện + công cụ xem: tách các món rời trên tấm nền hồng (trang trí, icon) thành từng hình.

  python3 -I tools/cut_objects.py <ảnh> <ảnh-xem-trước.png>   → in danh sách món (đánh số, hộp) + vẽ số lên ảnh xem trước
Món = cụm điểm ảnh liền nhau (gộp mảnh vụn gần nhau); ô chữ đen (nhãn tên) bị bỏ.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key  # noqa: E402


def is_label(rgb, alpha, b):
    """Ô chữ tên: phần lớn điểm ảnh đen, dẹt ngang."""
    x0, y0, x1, y1 = b
    a = alpha[y0:y1, x0:x1] > 128
    if not a.any(): return True
    dark = (rgb[y0:y1, x0:x1].max(axis=2) < 50) & a
    return dark.sum() / a.sum() > 0.45 and (x1 - x0) > 2.2 * (y1 - y0)


def drop_labels(rgb, alpha):
    """Xoá ô chữ tên (khung đen chữ trắng) dính sát hình: vùng đen đặc, dẹt ngang."""
    dark = (rgb.max(axis=2) < 60) & (alpha > 128)
    lab, n = ndimage.label(ndimage.binary_closing(dark, structure=np.ones((9, 9))))
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if w > 150 and 25 < h < 110 and w > 2.5 * h and (lab[sl] == i).mean() > 0.6:
            alpha[max(0, sl[0].start - 4):sl[0].stop + 4, max(0, sl[1].start - 4):sl[1].stop + 4] = 0


def objects(path, merge=6, min_area=400, labels=False):
    rgb = np.asarray(Image.open(path).convert('RGB'))
    rgb, alpha = key(rgb)
    if labels: drop_labels(rgb, alpha)
    solid = alpha > 60
    lab, n = ndimage.label(ndimage.binary_dilation(solid, iterations=merge))
    boxes = []
    for i, sl in enumerate(ndimage.find_objects(lab), 1):
        if (solid[sl] & (lab[sl] == i)).sum() < min_area: continue
        b = (sl[1].start, sl[0].start, sl[1].stop, sl[0].stop)
        if not is_label(rgb, alpha, b): boxes.append((b, i))
    # theo hàng (tâm dọc gần nhau) rồi theo x
    boxes.sort(key=lambda t: (t[0][1] + t[0][3]) / 2)
    rows = []
    for b, i in boxes:
        cy = (b[1] + b[3]) / 2
        for r in rows:
            if abs(cy - r[0]) < 0.35 * (b[3] - b[1] + r[1]):
                r[2].append((b, i)); break
        else: rows.append([cy, b[3] - b[1], [(b, i)]])
    out = []
    for r in rows:
        for b, i in sorted(r[2], key=lambda t: t[0][0]):
            x0, y0, x1, y1 = b
            m = lab[y0:y1, x0:x1] == i
            a = np.where(m, alpha[y0:y1, x0:x1], 0).astype(np.uint8)
            out.append((b, Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], a]), 'RGBA')))
    return out


if __name__ == '__main__':
    objs = objects(sys.argv[1], labels='icon' in sys.argv[1])
    im = Image.open(sys.argv[1]).convert('RGB')
    d = ImageDraw.Draw(im)
    for k, (b, _) in enumerate(objs):
        d.rectangle(b, outline=(255, 255, 0)); d.text((b[0] + 3, b[1] + 2), str(k), fill=(255, 255, 255))
        print(k, b)
    im.save(sys.argv[2])
