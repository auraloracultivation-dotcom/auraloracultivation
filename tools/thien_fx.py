"""Hiệu ứng 6 bộ kỹ năng Thiên hệ (chủ dự án 24/10/2026): 8 tấm nền hồng, mỗi hàng = 1 hoạt ảnh (khung từ trái sang phải).
Nguồn: assets/effects/_source/thien/<hệ>-<n>.webp. Hàng tách theo khoảng trống ngang; khung tách theo khoảng trống dọc,
khung dính nhau thì chia đều theo bề rộng trung bình của hàng.
Dùng:
  python3 -I tools/thien_fx.py list <thư mục>   → ảnh đánh số hàng.khung để chọn
  python3 -I tools/thien_fx.py build            → assets/effects/v2/t.<mã>.webp + data/art/sprites.json → fx + icon nút kỹ năng
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

SRC = Path('assets/effects/_source/thien')
OUT = Path('assets/effects/v2')
ICONS = Path('assets/ui/skills')
SPRITES = Path('data/art/sprites.json')
MAXH = 150
NROWS = {'quang-1': 4, 'quang-2': 5, 'loi-1': 5, 'loi-2': 6, 'bang-1': 6, 'phong-1': 6, 'hu-1': 6, 'thoi-1': 6}  # số hàng mỗi tấm (đếm trên ảnh)
SHEETS = list(NROWS)
MANUAL = {('bang-1', 2): [10, 166, 310, 476, 666, 878, 1104, 1332, 1520]}  # ranh giới khung đo tay khi khung dính nhau
NFR = {('quang-1', 0): 9, ('quang-1', 1): 9, ('quang-1', 2): 8, ('quang-1', 3): 8, ('quang-2', 0): 10, ('quang-2', 1): 8, ('quang-2', 2): 1, ('quang-2', 3): 8, ('quang-2', 4): 7, ('loi-1', 0): 8, ('loi-1', 1): 7, ('loi-1', 2): 6, ('loi-1', 3): 8, ('loi-1', 4): 7, ('loi-2', 0): 6, ('loi-2', 1): 1, ('loi-2', 2): 8, ('loi-2', 3): 7, ('loi-2', 4): 8, ('loi-2', 5): 9, ('bang-1', 0): 8, ('bang-1', 1): 1, ('bang-1', 2): 8, ('bang-1', 3): 12, ('bang-1', 4): 7, ('bang-1', 5): 9, ('phong-1', 0): 6, ('phong-1', 1): 1, ('phong-1', 2): 7, ('phong-1', 3): 9, ('phong-1', 4): 7, ('phong-1', 5): 10, ('hu-1', 0): 8, ('hu-1', 1): 8, ('hu-1', 2): 10, ('hu-1', 3): 8, ('hu-1', 4): 7, ('hu-1', 5): 9, ('thoi-1', 0): 9, ('thoi-1', 1): 9, ('thoi-1', 2): 9, ('thoi-1', 3): 8, ('thoi-1', 4): 9, ('thoi-1', 5): 8}  # (tấm, hàng) → số khung (đếm trên ảnh); khung đặt ở các khe thấp nhất


def best_cuts(prof, n, lo, hi):
    """n−1 vết cắt trong (lo, hi) tại các thung lũng thấp nhất của prof, cách nhau ≥ 45% khoảng đều (quy hoạch động)."""
    L = hi - lo; sep = int(L / n * 0.3); p = np.convolve(prof[lo:hi], np.ones(7) / 7, 'same')
    INF = 1e18; best = {0: (0.0, [])}
    # dp theo từng vết cắt: chọn vị trí trong cửa sổ quanh vị trí đều
    cand = [list(range(max(sep, int(L * k / n) - int(L / n * 0.8)), min(L - sep, int(L * k / n) + int(L / n * 0.8)))) for k in range(1, n)]
    prev = [(0.0, -10**9, [])]
    for cs in cand:
        nxt = []
        for c in cs[::2]:
            opts = [(v + p[c] + 0.003 * abs(c - L * len(path + [c]) / n), c, path + [c]) for v, last, path in prev if c - last >= sep]
            if opts: nxt.append(min(opts, key=lambda o: o[0]))
        nxt.sort(key=lambda o: o[0]); prev = nxt[:200]
    path = min(prev, key=lambda o: o[0])[2] if prev else [int(L * k / n) for k in range(1, n)]
    return [lo] + [lo + c for c in path] + [hi]


def greedy_cuts(prof, n, lo, hi, mass):
    """Khe trống thật trước; thiếu khung thì chẻ đoạn rộng nhất ở chỗ thấp nhất; thừa thì gộp đoạn ít điểm ảnh nhất vào bên cạnh."""
    segs = [list(g) for g in runs(np.maximum(0, prof - 0.5), 3) if lo <= g[0] < hi]
    if not segs: segs = [[lo, hi]]
    segs[0][0] = lo; segs[-1][1] = hi
    for i in range(len(segs) - 1): m = (segs[i][1] + segs[i + 1][0]) // 2; segs[i][1] = m; segs[i + 1][0] = m
    while len(segs) > n:
        i = min(range(len(segs)), key=lambda i: mass[segs[i][0]:segs[i][1]].sum())
        j = i - 1 if i == len(segs) - 1 or (i > 0 and mass[segs[i - 1][0]:segs[i - 1][1]].sum() < mass[segs[i + 1][0]:segs[i + 1][1]].sum()) else i + 1
        a, b = sorted([i, j]); segs[a] = [segs[a][0], segs[b][1]]; del segs[b]
    while len(segs) < n:
        i = max(range(len(segs)), key=lambda i: segs[i][1] - segs[i][0]); a, b = segs[i]; w = b - a
        q = np.convolve(prof[a:b], np.ones(9) / 9, 'same'); r0, r1 = int(w * 0.25), int(w * 0.75)
        c = a + r0 + int(np.argmin(q[r0:r1])); segs[i:i + 1] = [[a, c], [c, b]]
    return [s[0] for s in segs] + [segs[-1][1]]


def rows_of(name):
    """Hàng: cắt ở các thung lũng ngang (biết trước số hàng). Điểm ảnh thuộc hàng theo tâm vùng liền của nó (không lẹm hàng kề).
    Khung trong hàng: đoạn ngăn bởi cột trống; mảnh hẹp nhập vào khung bên cạnh."""
    rgb = np.asarray(Image.open(SRC / f'{name}.webp').convert('RGB'))
    rgb, alpha = key(rgb)
    alpha = alpha.copy(); alpha[:6] = 0; alpha[-6:] = 0; alpha[:, :6] = 0; alpha[:, -6:] = 0  # mép ảnh có viền mờ
    solid = alpha > 40
    lab, n = ndimage.label(solid)
    cy = np.array(ndimage.center_of_mass(solid, lab, range(1, n + 1)))[:, 0] if n else np.zeros(0)
    occ = solid.sum(axis=1).astype(float); ys = np.flatnonzero(occ > 10)
    yb = best_cuts(occ, NROWS[name], int(ys[0]), int(ys[-1]) + 1)
    out = []
    for y0, y1 in zip(yb[:-1], yb[1:]):
        ids = 1 + np.flatnonzero((cy >= y0) & (cy < y1))
        own = np.isin(lab, ids)
        rows_y = np.flatnonzero(own.any(axis=1)); top, bot = rows_y[0], rows_y[-1] + 1
        band = own[top:bot]
        strong = band & (alpha[top:bot] > 170)
        prof = np.convolve(strong.sum(axis=0).astype(float), np.ones(5) / 5, 'same')
        xs = np.flatnonzero(prof > 2); lo, hi = int(xs[0]), int(xs[-1]) + 1
        ref = np.percentile(prof[lo:hi], 60)
        n_fix = NFR.get((name, len(out)))
        best = MANUAL.get((name, len(out))) or greedy_cuts(prof, n_fix or 8, lo, hi, band.sum(axis=0).astype(float))
        frames = []
        for x0, x1 in zip(best[:-1], best[1:]):
            yy = np.flatnonzero(band[:, x0:x1].any(axis=1))
            if len(yy): frames.append({'x0': x0, 'x1': x1, 'y0': top + yy[0], 'y1': top + yy[-1] + 1, 'ids': ids})
        out.append(frames)
    return rgb, alpha, lab, out


def crop(rgb, alpha, lab, f):
    """Chỉ lấy điểm ảnh thuộc khung (không lẹm khung hàng bên cạnh)."""
    x0, y0, x1, y1 = f['x0'], f['y0'], f['x1'], f['y1']
    m = np.isin(lab[y0:y1, x0:x1], f['ids'])
    a = np.where(m, alpha[y0:y1, x0:x1], 0).astype(np.uint8)
    return Image.fromarray(np.dstack([rgb[y0:y1, x0:x1], a]), 'RGBA')


def list_mode(out):
    Path(out).mkdir(parents=True, exist_ok=True)
    for n in SHEETS:
        rgb, alpha, lab, rows = rows_of(n)
        im = Image.new('RGBA', (rgb.shape[1], rgb.shape[0]), (40, 44, 52, 255))
        im.alpha_composite(Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'))
        d = ImageDraw.Draw(im)
        for r, bs in enumerate(rows):
            for i, f in enumerate(bs):
                d.rectangle([f['x0'], f['y0'], f['x1'], f['y1']], outline=(255, 255, 0, 255)); d.text((f['x0'] + 2, f['y0'] + 1), f'{r}.{i}', fill=(255, 255, 255, 255))
        im.save(f'{out}/{n}.png')
        print(n, [len(b) for b in rows])


if __name__ == '__main__':
    if sys.argv[1] == 'list': list_mode(sys.argv[2])


# mã → (tấm, hàng, [khung], neo 'giua' | 'day', khung/giây). Tất cả là t.* (Thiên hệ, vẽ cộng sáng: glow trong sprites.json)
FX = {
    # Quang
    't.quang-gong': ('quang-1', 0, [0, 1, 2, 3, 4], 'giua', 14), 't.quang-dan': ('quang-1', 0, [6], 'giua', 10),
    't.quang-chem': ('quang-1', 1, [2, 3, 4, 5, 6, 7, 8], 'giua', 16), 't.quang-ho-the': ('quang-1', 2, [2, 3, 4, 3], 'giua', 8),
    't.quang-phan-quyet': ('quang-1', 3, [0, 1, 2, 3, 4, 5, 6, 7], 'day', 12), 't.quang-no': ('quang-2', 4, [0, 1, 2, 3, 4, 5, 6], 'day', 14),
    # Lôi
    't.loi-cong': ('loi-2', 0, [0], 'giua', 8), 't.loi-long': ('loi-2', 0, [1, 2, 3, 4], 'giua', 12),
    't.loi-tru': ('loi-2', 2, [0, 1, 2, 3, 4, 5, 6, 7], 'day', 16), 't.loi-buoc': ('loi-2', 4, [0, 1, 2, 3, 4, 5, 6, 7], 'giua', 18),
    't.loi-no': ('loi-2', 5, [3, 4, 5, 6, 7, 8], 'day', 14), 't.loi-dan': ('loi-1', 0, [2], 'giua', 10),
    # Băng
    't.bang-nguc': ('bang-1', 0, [0, 1, 2, 3, 4, 5, 6, 7], 'day', 11), 't.bang-sen': ('bang-1', 2, [0, 1, 2, 3, 4, 5, 6, 7], 'day', 11),
    't.bang-tru': ('bang-1', 3, list(range(12)), 'day', 16), 't.bang-xoay': ('bang-1', 4, [0, 1, 2, 3, 4, 5, 6], 'giua', 12),
    't.bang-dan': ('bang-1', 5, [0], 'giua', 10), 't.bang-no': ('bang-1', 5, [4, 5, 6, 7, 8], 'day', 12),
    # Phong
    't.phong-loc': ('phong-1', 0, [0, 1, 2, 3, 4, 5], 'day', 12), 't.phong-no': ('phong-1', 2, [0, 1, 2, 3, 4, 5, 6], 'day', 12),
    't.phong-nhan': ('phong-1', 4, [0, 1, 2, 3], 'giua', 12), 't.phong-anh': ('phong-1', 5, list(range(10)), 'giua', 18),
    # Hư
    't.hu-hac-dong': ('hu-1', 0, [0, 1, 2, 3, 4, 5, 6, 7], 'giua', 10), 't.hu-xoay': ('hu-1', 1, [0, 1, 2, 3, 4, 5, 6, 7], 'giua', 10),
    't.hu-tru': ('hu-1', 2, list(range(10)), 'day', 14), 't.hu-tram': ('hu-1', 3, [0, 1, 2, 3, 4, 5, 6, 7], 'giua', 16),
    't.hu-dan': ('hu-1', 4, [0], 'giua', 10), 't.hu-no': ('hu-1', 5, [0, 1, 2, 3, 4, 5, 6, 7, 8], 'day', 14),
    # Thời
    't.thoi-sa-lau': ('thoi-1', 0, [0, 1, 2, 3, 4, 5, 6, 7, 8], 'day', 11), 't.thoi-dong-ho': ('thoi-1', 1, [0, 1, 2, 3, 4, 5, 6, 7, 8], 'giua', 12),
    't.thoi-vong': ('thoi-1', 2, [0, 1, 2, 3, 4, 5, 6, 7, 8], 'day', 11), 't.thoi-chem': ('thoi-1', 3, [0, 1, 2, 3, 4, 5, 6], 'giua', 14),
    't.thoi-ngung': ('thoi-1', 4, [0, 1, 2, 3, 4, 5, 6, 7, 8], 'giua', 12), 't.thoi-no': ('thoi-1', 5, [5, 6, 7], 'day', 10),
}
GLOW = 0.45  # vẽ thêm một lớp cộng sáng (kiểu My Heroes: hiệu ứng rực, chồng nhau cháy trắng)


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    cache, sp = {}, json.loads(SPRITES.read_text())
    for fid, (n, r, idx, anchor, fps) in FX.items():
        if n not in cache: cache[n] = rows_of(n)
        rgb, alpha, lab, rows = cache[n]
        frames = [crop(rgb, alpha, lab, rows[r][i]) for i in idx]
        mass = [np.asarray(f)[..., 3].astype(float).sum() for f in frames]; med = np.median(mass)
        frames = [f for f, m in zip(frames, mass) if m >= 0.3 * med] or frames  # bỏ khung mảnh (cắt lẹm) — đỡ chớp
        fw, fh = max(f.width for f in frames), max(f.height for f in frames)
        k = min(1, MAXH / fh); sw, sh = max(1, round(fw * k)), max(1, round(fh * k))
        strip = Image.new('RGBA', (sw * len(frames), sh))
        for j, f in enumerate(frames):
            f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
            y = sh - f.height if anchor == 'day' else (sh - f.height) // 2
            strip.alpha_composite(f, (j * sw + (sw - f.width) // 2, y))
        strip.save(OUT / f'{fid}.webp', quality=90, method=6)
        sp['fx'][fid] = {'src': f'assets/effects/v2/{fid}.webp', 'fw': sw, 'fh': sh, 'anims': {'play': {'row': 0, 'n': len(frames)}},
                         'fps': fps, 'anchor': anchor, 'glow': GLOW, 'lazy': True}
    SPRITES.write_text(json.dumps(sp, ensure_ascii=False) + '\n')
    print(len(FX), 'hiệu ứng Thiên hệ')


if __name__ == '__main__' and sys.argv[1] == 'build': build()
