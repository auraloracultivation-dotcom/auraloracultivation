"""Cắt 5 tấm hiệu ứng chủ dự án gửi (23/10/2026) thành hoạt ảnh chiêu thức.

Nguồn: assets/effects/_source/hieu-ung-<1..5>.webp — nền hồng, mỗi hàng một hệ (hỏa, băng, phong, thổ, lôi…),
trong hàng các hình xếp từ nhỏ (đạn) tới lớn (nổ / trận).
Dùng:
  python3 -I tools/fx_sheets.py list <thư mục>   → ảnh đánh số từng hình (để chọn) — <thư mục>/fx-<tấm>.png
  python3 -I tools/fx_sheets.py build            → assets/effects/v2/<mã>.webp + thêm vào data/art/sprites.json → fx
Bảng FX dưới: mã → (tấm, hàng, [số thứ tự hình], neo 'giua' | 'day', khung/giây). Đổi hình chiêu: sửa bảng rồi build lại.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key, cuts  # noqa: E402

ROWS = {1: 10, 2: 12, 3: 11, 4: 9, 5: 11}  # số hàng mỗi tấm

SRC = Path('assets/effects/_source')
OUT = Path('assets/effects/v2')
SPRITES = Path('data/art/sprites.json')
MAXH = 150  # cao tối đa mỗi khung khi lưu


def runs(occ, min_gap):
    """Các đoạn có điểm ảnh, ngắt ở khoảng trống dài ≥ min_gap."""
    on = occ > 2
    segs, start, gap = [], None, 0
    for i, v in enumerate(on):
        if v:
            if start is None: start = i
            gap = 0; end = i + 1
        elif start is not None:
            gap += 1
            if gap >= min_gap: segs.append([start, end]); start = None
    if start is not None: segs.append([start, end])
    return segs


def items(n):
    """Hàng = dải ngang ngăn bởi khoảng trống; trong hàng, hình = đoạn ngăn bởi khoảng trống dọc (bỏ mảnh quá nhỏ)."""
    rgb = np.asarray(Image.open(SRC / f'hieu-ung-{n}.webp').convert('RGB'))
    rgb, alpha = key(rgb)
    solid = alpha > 50
    rows = []
    ys = cuts(solid.sum(axis=1).astype(float), 0, solid.shape[0], ROWS[n])
    for y0, y1 in zip(ys[:-1], ys[1:]):
        band = solid[y0:y1]
        segs = [g for g in runs(band.sum(axis=0), 2) if band[:, g[0]:g[1]].sum() > 120]
        bs = []
        for x0, x1 in segs:
            yy = np.flatnonzero(band[:, x0:x1].any(axis=1))
            bs.append([x0, y0 + yy[0], x1, y0 + yy[-1] + 1])
        rows.append(bs)
    return rgb, alpha, rows


def crop(rgb, alpha, b):
    x0, y0, x1, y1 = b
    return Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], alpha[y0:y1, x0:x1]]), 'RGBA')


def list_mode(out):
    Path(out).mkdir(parents=True, exist_ok=True)
    for n in range(1, 6):
        rgb, alpha, rows = items(n)
        im = Image.new('RGBA', (1536, 1024), (60, 64, 72, 255))
        im.alpha_composite(Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'))
        d = ImageDraw.Draw(im)
        for r, bs in enumerate(rows):
            for i, b in enumerate(bs):
                d.rectangle(b, outline=(255, 255, 0, 255))
                d.text((b[0] + 1, b[1] + 1), f'{r}.{i}', fill=(255, 255, 255, 255))
        im.save(f'{out}/fx-{n}.png')
        print(n, [len(b) for b in rows])


# mã hiệu ứng → (tấm, hàng, [hình], neo, khung/giây)
FX = {
    # đạn bay (1 khung, game tự xoay theo hướng bay)
    'v.dan-hoa': (2, 3, [1], 'giua', 10), 'v.dan-bang': (2, 2, [1], 'giua', 10), 'v.dan-phong': (2, 4, [2], 'giua', 10),
    'v.dan-am': (2, 1, [2], 'giua', 10), 'v.dan-moc': (2, 7, [1], 'giua', 10), 'v.dan-loi': (2, 8, [1], 'giua', 10),
    'v.dan-kim': (2, 0, [1], 'giua', 10), 'v.dan-thuy': (2, 6, [2], 'giua', 10),
    # nổ / trận (nhiều khung nối tiếp)
    'v.no-hoa': (2, 3, [6, 7, 8], 'day', 9), 'v.no-bang': (2, 2, [10, 7, 8], 'day', 8), 'v.loc-xoay': (2, 4, [6, 12, 6], 'day', 8),
    'v.dia-thu': (2, 5, [6, 7, 8], 'day', 9), 'v.loi-tru': (2, 8, [8, 9, 10, 11, 12], 'day', 12), 'v.thuy-ba': (2, 6, [3, 4, 5], 'day', 8),
    'v.moc-lien': (2, 7, [5, 6, 10], 'day', 6), 'v.hac-dong': (2, 1, [8, 11, 12], 'giua', 7), 'v.van-kiem': (2, 0, [7, 9, 14], 'day', 8),
    'v.ho-the': (2, 10, [2, 3], 'giua', 4), 'v.chu-tri': (2, 10, [1], 'day', 3), 'v.xich-tran': (2, 10, [14, 15], 'day', 5),
    'v.huyet-chu': (2, 10, [18, 19], 'giua', 5), 'v.am-gai': (2, 1, [13, 14], 'day', 7), 'v.tran-phap': (2, 11, [7, 8], 'day', 5),
    'v.quang-tru': (2, 11, [12], 'day', 4), 'v.hoa-xoay': (2, 3, [11], 'giua', 4), 'v.cong-hu': (2, 1, [12], 'giua', 4),
    'v.bang-hoa': (2, 2, [5, 6], 'giua', 6), 'v.phuong-hoang': (2, 3, [5], 'giua', 4), 'v.long-thuy': (2, 6, [7], 'giua', 4),
}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    cache = {}
    sp = json.loads(SPRITES.read_text())
    for fid, (n, r, idx, anchor, fps) in FX.items():
        if n not in cache: cache[n] = items(n)
        rgb, alpha, rows = cache[n]
        frames = [crop(rgb, alpha, rows[r][i]) for i in idx]
        fw, fh = max(f.width for f in frames), max(f.height for f in frames)
        k = min(1, MAXH / fh)
        sw, sh = max(1, round(fw * k)), max(1, round(fh * k))
        strip = Image.new('RGBA', (sw * len(frames), sh))
        for j, f in enumerate(frames):
            f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
            y = sh - f.height if anchor == 'day' else (sh - f.height) // 2
            strip.alpha_composite(f, (j * sw + (sw - f.width) // 2, y))
        strip.save(OUT / f'{fid}.webp', quality=90, method=6)
        sp['fx'][fid] = {'src': f'assets/effects/v2/{fid}.webp', 'fw': sw, 'fh': sh, 'anims': {'play': {'row': 0, 'n': len(frames)}},
                         'fps': fps, 'anchor': anchor}
    SPRITES.write_text(json.dumps(sp, ensure_ascii=False) + '\n')
    print(len(FX), 'hiệu ứng')


if __name__ == '__main__':
    if sys.argv[1] == 'list': list_mode(sys.argv[2])
    else: build()
