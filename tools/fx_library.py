"""Thư viện hiệu ứng (chủ dự án 24/10/2026: 9 tấm hiệu ứng nền hồng — "thích đồ hoạ này quá, muốn cho vào game").

Mỗi tấm: nhiều hàng, mỗi hàng ~9–10 hình rời (đạn nhỏ → đạn bay → xoáy → nổ → mảnh tan) cùng một hệ màu.
Tự tách hàng theo dải trống ngang, tách hình theo cột trống (các hình có khoảng hở), bỏ vụn.
Ra: assets/effects/lib/tam-<n>.webp (mỗi tấm một atlas, ô vuông CELL px, hình căn giữa)
    + data/art/fx-lib.json: { cell, sheets: { "<n>": { src, cols, rows: [[ô,...], ...] } } } — mã hình lib.<n>.<hàng>.<cột> (đếm từ 1).
Dùng: python3 -I tools/fx_library.py [thư-mục-xem-trước]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key, cuts  # noqa: E402
from fx_sheets import runs  # noqa: E402

SRC = Path('assets/effects/_source/lib')
OUT = Path('assets/effects/lib')
CELL = 96
ROWS = {'1': 6, '2': 6, '3': 8, '4': 8, '5': 8, '6': 8, '7': 6, '8': 8, '9': 6}  # số hàng mỗi tấm (hàng sát nhau nên chia theo số)


def spans(a):
    """Khoảng cột của từng hình: tách ở cột trống; khoảng quá rộng (hình dính nhau) chia tiếp ở cột thưa nhất."""
    col = ndimage.binary_closing(a.any(0), structure=np.ones(5))
    lab, n = ndimage.label(col)
    sp = [(np.flatnonzero(lab == i)[0], np.flatnonzero(lab == i)[-1] + 1) for i in range(1, n + 1)]
    sp = [(x0, x1) for x0, x1 in sp if a[:, x0:x1].sum() >= 150]
    if not sp:
        return sp
    W = a.shape[1] / 10.2  # mỗi hàng ~10 hình trên bề ngang tấm
    occ = a.sum(0).astype(float)
    out = []
    for x0, x1 in sp:
        k = int(round((x1 - x0) / W))
        if k >= 2 and (x1 - x0) > 1.45 * W:
            out += list(zip(*(lambda b: (b[:-1], b[1:]))(cuts(occ, x0, x1, k))))
        else:
            out.append((x0, x1))
    return out


def pieces(rgb, alpha, y0, y1):
    """Mỗi mảng hình liền (không cắt đôi hình) gán vào khoảng có chứa trọng tâm của nó; khoảng chỉ còn vụn thì gộp sang bên cạnh."""
    a = alpha[y0:y1] > 40
    sp = spans(a)
    if not sp:
        return []
    lab, k = ndimage.label(ndimage.binary_dilation(a, iterations=1))
    lab = np.where(a, lab, 0)
    cx = ndimage.center_of_mass(a, lab, range(1, k + 1))
    size = ndimage.sum(a, lab, range(1, k + 1))
    mids = np.array([(x0 + x1) / 2 for x0, x1 in sp])
    owner = {}
    for j, (c, sz) in enumerate(zip(cx, size), 1):
        if sz < 8 or np.isnan(c[1]):
            continue
        hit = [i for i, (x0, x1) in enumerate(sp) if x0 <= c[1] < x1]
        owner[j] = hit[0] if hit else int(np.argmin(abs(mids - c[1])))
    groups = [[j for j, o in owner.items() if o == i] for i in range(len(sp))]
    area = [sum(size[j - 1] for j in g) for g in groups]
    big = max(area)
    for i, g in enumerate(groups):  # khoảng chỉ có vụn (< 6% hình lớn nhất): gộp vào bên cạnh gần nhất
        if g and area[i] < 0.06 * big:
            nb = [x for x in (i - 1, i + 1) if 0 <= x < len(groups) and area[x] >= 0.06 * big]
            if nb:
                groups[nb[0]] += g; groups[i] = []
    out = []
    for g in groups:
        if not g:
            continue
        keep = np.isin(lab, g)
        yy, xx = np.nonzero(keep)
        sub = (slice(y0 + yy.min(), y0 + yy.max() + 1), slice(xx.min(), xx.max() + 1))
        al = np.where(keep[yy.min():yy.max() + 1, xx.min():xx.max() + 1], alpha[sub], 0).astype(np.uint8)
        out.append(Image.fromarray(np.dstack([rgb[sub], al]), 'RGBA'))
    return out


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    lib = {'_ghi_chu': 'Sinh bằng tools/fx_library.py từ tấm chủ dự án 24/10/2026. Mã hình lib.<tấm>.<hàng>.<cột>.', 'cell': CELL, 'sheets': {}}
    prev = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    for f in sorted(SRC.glob('tam-*.webp'), key=lambda p: int(p.stem.split('-')[1])):
        n = f.stem.split('-')[1]
        rgb, alpha = key(np.asarray(Image.open(f).convert('RGB')))
        ys = cuts((alpha > 40).sum(1).astype(float), 0, alpha.shape[0], ROWS[n])
        rows = list(zip(ys[:-1], ys[1:]))
        grid = [pieces(rgb, alpha, a, b) for a, b in rows]
        cols = max(len(r) for r in grid)
        atlas = Image.new('RGBA', (cols * CELL, len(grid) * CELL))
        meta = []
        for ri, row in enumerate(grid):
            meta.append(len(row))
            for ci, im in enumerate(row):
                k = min(1, (CELL - 2) / max(im.size))
                im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
                atlas.alpha_composite(im, (ci * CELL + (CELL - im.width) // 2, ri * CELL + (CELL - im.height) // 2))
        dst = OUT / f'tam-{n}.webp'
        atlas.save(dst, quality=92, method=6)
        lib['sheets'][n] = {'src': str(dst), 'cols': cols, 'rows': meta}
        print(f'tấm {n}: {len(grid)} hàng, {meta}')
        if prev:
            prev.mkdir(parents=True, exist_ok=True)
            bg = Image.new('RGBA', atlas.size, (40, 44, 56, 255)); bg.alpha_composite(atlas)
            d = ImageDraw.Draw(bg)
            for ri, c in enumerate(meta):
                for ci in range(c): d.text((ci * CELL + 2, ri * CELL + 1), f'{n}.{ri + 1}.{ci + 1}', fill=(255, 255, 0, 255))
            bg.save(prev / f'lib-{n}.png')
    Path('data/art/fx-lib.json').write_text(json.dumps(lib, ensure_ascii=False, indent=1) + '\n')


if __name__ == '__main__':
    main()
