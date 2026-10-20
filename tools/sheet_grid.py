"""Cắt bảng vật phẩm GPT (xếp lưới, nền hồng) thành từng món.

Dùng:
  python3 -I tools/sheet_grid.py <ảnh> <thư mục ra> --grid COTxHANG --prefix art.mask [--rows 0,2,4] [--start 1]
                                 [--anchor center|bottom|grip]

- Tách nền hồng bằng cách của tools/ui_slice.py (khử ám hồng ở mép).
- Mỗi mảnh liền nhau gán vào ô lưới chứa tâm của nó, nên hiệu ứng tràn sang ô bên vẫn về đúng món.
- --rows: chỉ lấy những hàng này (bảng trộn hai loại, ví dụ hàng chẵn mặt nạ, hàng lẻ vũ khí).
- --anchor: điểm neo ghi vào manifest (toạ độ trong ảnh món):
    center = tâm ảnh (mặt nạ, pháp bảo…), bottom = giữa đáy (hào quang, pháp tướng đứng trên đất),
    grip   = chuôi vũ khí + góc lưỡi (độ, 0 = mũi chỉ lên, tăng theo chiều kim đồng hồ).
Ra: <prefix>.<số 3 chữ>.png + manifest (mặc định manifest.json; --manifest để đặt tên khác khi nhiều bảng chung thư mục).
"""
import argparse
import json
import math
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ui_slice import key_magenta  # noqa: E402

MIN_AREA = 60


def weapon_grip(alpha):
    """Ước lượng trục lưỡi bằng PCA; chuôi = đầu dưới, điểm cầm cách đầu chuôi 12% chiều dài."""
    ys, xs = np.nonzero(alpha > 128)
    pts = np.stack([xs, ys], 1).astype(np.float64)
    c = pts.mean(0)
    _, _, vt = np.linalg.svd(pts - c, full_matrices=False)
    d = vt[0]
    proj = (pts - c) @ d
    a, b = c + d * proj.min(), c + d * proj.max()
    hilt, tip = (a, b) if a[1] > b[1] else (b, a)  # chuôi là đầu thấp hơn trong ảnh
    grip = hilt + (tip - hilt) * 0.12
    v = tip - hilt
    ang = math.degrees(math.atan2(v[0], -v[1]))  # 0 = chỉ lên
    return [round(float(grip[0]), 1), round(float(grip[1]), 1)], round(ang, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('src')
    ap.add_argument('out')
    ap.add_argument('--grid', required=True)
    ap.add_argument('--prefix', required=True)
    ap.add_argument('--rows', default='')
    ap.add_argument('--start', type=int, default=1)
    ap.add_argument('--manifest', default='manifest.json')
    ap.add_argument('--crop', default='', help='x0,y0,x1,y1: chỉ cắt vùng này của ảnh')
    ap.add_argument('--anchor', default='center', choices=['center', 'bottom', 'grip'])
    args = ap.parse_args()

    cols, rows = map(int, args.grid.lower().split('x'))
    keep_rows = {int(r) for r in args.rows.split(',')} if args.rows else set(range(rows))
    im = Image.open(args.src).convert('RGB')
    if args.crop:
        im = im.crop(tuple(int(v) for v in args.crop.split(',')))
    arr = np.array(im)
    rgb, alpha = key_magenta(arr)
    r, g, b = (arr[..., i].astype(int) for i in range(3))
    alpha = np.where((r > 110) & (b > 110) & (g < 90), 0, alpha).astype(np.uint8)  # viền ô / sắc hồng nền
    H, W = alpha.shape
    cw, ch = W / cols, H / rows

    solid = ndimage.binary_dilation(alpha > 40, iterations=1)
    labels, n = ndimage.label(solid)
    # mỗi điểm ảnh -> ô lưới. Mảnh nằm gọn một ô: theo tâm. Mảnh tràn nhiều ô (hiệu ứng hai món chạm nhau):
    # cắt theo đường lưới, dời đường cắt tới chỗ mảnh mỏng nhất gần đó để không cắt ngang thân món.
    cellmap = np.full((H, W), -1, np.int32)
    for idx, sl in enumerate(ndimage.find_objects(labels), start=1):
        if sl is None:
            continue
        m = labels[sl] == idx
        if m.sum() < MIN_AREA:
            continue
        hh, ww = m.shape
        if hh <= ch * 1.1 and ww <= cw * 1.1:
            cy, cx = ndimage.center_of_mass(m)
            cellmap[sl][m] = int((cy + sl[0].start) // ch) * cols + int((cx + sl[1].start) // cw)
            continue
        def lines(n, size, start, prof):
            out = []
            for k in range(1, n):
                b = k * size - start
                lo, hi = int(max(0, b - .3 * size)), int(min(len(prof), b + .3 * size))
                if hi <= lo:
                    out.append(b)
                    continue
                win = prof[lo:hi]
                out.append(lo + int(np.argmin(win + np.abs(np.arange(lo, hi) - b) * 1e-3)))
            return np.array(out)
        yl = lines(rows, ch, sl[0].start, m.sum(1))
        xl = lines(cols, cw, sl[1].start, m.sum(0))
        ry = np.searchsorted(yl, np.arange(hh), side='right')
        rx = np.searchsorted(xl, np.arange(ww), side='right')
        cm = ry[:, None] * cols + rx[None, :]
        cellmap[sl][m] = cm[m]

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    manifest = []
    num = args.start
    for r in range(rows):
        if r not in keep_rows:
            continue
        for c in range(cols):
            m = cellmap == r * cols + c
            if m.sum() < MIN_AREA * 4:
                continue
            ys, xs = np.nonzero(m)
            y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
            a = np.where(m[y0:y1, x0:x1], alpha[y0:y1, x0:x1], 0).astype(np.uint8)
            edge = (a > 0) & ndimage.binary_dilation(a == 0, iterations=2)
            pr, pg, pb = (rgb[y0:y1, x0:x1, i].astype(int) for i in range(3))
            a[edge & (pr > pg + 60) & (pb > pg + 60)] = 0  # khử viền hồng sót
            piece = Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], a]), 'RGBA')
            name = f'{args.prefix}.{num:03d}'
            piece.save(out / f'{name}.png', optimize=True)
            w, h = piece.size
            item = {'id': name, 'file': f'{name}.png', 'w': w, 'h': h, 'src': [int(x0), int(y0)],
                    'cell': [r, c]}
            if args.anchor == 'center':
                item['anchor'] = [round(w / 2, 1), round(h / 2, 1)]
            elif args.anchor == 'bottom':
                item['anchor'] = [round(w / 2, 1), h]
            else:
                item['anchor'], item['angle'] = weapon_grip(a)
            manifest.append(item)
            num += 1
    (out / args.manifest).write_text(json.dumps(manifest, ensure_ascii=False, indent=1))
    print(f'{len(manifest)} món → {out}')


if __name__ == '__main__':
    main()
