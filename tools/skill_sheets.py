"""Tấm kỹ năng chủ dự án (23/10/2026): mỗi hàng = 1 icon nút tròn bên trái + các khung hiệu ứng từ nhỏ tới lớn rồi tan.

Nguồn: assets/effects/_source/ky-nang-<n>.webp (nền hồng). Các khung có thể chạm nhau nên cắt theo mốc chia đều
nên ranh giới các khung ghi tay trong SHEETS (đo trên ảnh thước).
Ra: icon → assets/ui/skills/<mã>.png (96×96); hoạt ảnh → assets/effects/v2/k.<mã>.webp + data/art/sprites.json → fx.
Dùng: python3 -I tools/skill_sheets.py [xem-trước.png]   ·   python3 -I tools/skill_sheets.py ruler <thư mục>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key, cuts  # noqa: E402
from fx_sheets import runs  # noqa: E402

SRC = Path('assets/effects/_source')
OUT = Path('assets/effects/v2')
ICONS = Path('assets/ui/skills')
SPRITES = Path('data/art/sprites.json')
MAXH = 150
# tấm → [(mã, [cột cắt: hết icon, ranh giới các khung…, mép phải], neo, khung/giây)] theo hàng.
# Khung to dần và chạm nhau nên ranh giới đo bằng mắt trên ảnh thước (tools/skill_sheets.py ruler).
SKIP = {5: 88}  # tấm có chữ đánh số bên trái icon: bỏ bấy nhiêu cột đầu
SHEETS = {
    1: [('bo-cam-che', [140, 228, 308, 398, 508, 635, 790, 955, 1130, 1310, 1558, 1745, 1915, 2045, 2172], 'day', 14),
        ('cc-kim', [140, 228, 315, 410, 515, 625, 785, 955, 1130, 1320, 1478, 1690, 1785, 1890, 2005, 2068, 2172], 'day', 12),
        ('cc-am', [140, 228, 318, 415, 520, 628, 787, 947, 1139, 1326, 1530, 1668, 1793, 1893, 1970, 2022, 2172], 'day', 12),
        ('cc-thuy', [140, 228, 318, 418, 515, 615, 787, 917, 1122, 1227, 1483, 1680, 1860, 2012, 2172], 'day', 12),
        ('cc-hoa', [140, 228, 325, 432, 568, 724, 887, 1072, 1269, 1450, 1658, 1918, 2048, 2172], 'day', 12),
        ('cc-moc', [140, 228, 318, 420, 535, 724, 884, 1054, 1234, 1448, 1648, 1778, 1878, 2008, 2172], 'day', 12)],
    2: [('cc-tho', [140, 225, 330, 460, 610, 805, 1048, 1238, 1415, 1550, 1655, 1712, 1770], 'day', 12),
        ('dan-tho', [140, 183, 232, 318, 425, 605, 775, 965, 1190, 1410, 1535, 1600, 1770], 'giua', 12, {'dan-tho-bay': [4]}),
        ('bao-kim', [140, 203, 293, 415, 572, 780, 995, 1220, 1400, 1555, 1655, 1712, 1770], 'day', 16),
        ('bao-am', [140, 218, 308, 415, 560, 760, 1048, 1298, 1487, 1585, 1655, 1700, 1770], 'day', 16),
        ('bao-thuy', [140, 215, 312, 415, 570, 775, 1050, 1340, 1565, 1770], 'day', 14),
        ('bao-moc', [140, 200, 292, 440, 592, 862, 1155, 1352, 1560, 1690, 1770], 'day', 14)],
    3: [('bao-tho', [152, 245, 355, 535, 740, 935, 1075, 1215, 1320, 1410, 1470, 1520], 'day', 16),
        ('loi-lien', [152, 275, 385, 560, 700, 860, 1010, 1150, 1325, 1400, 1520], 'giua', 14),
        ('dai-thanh', [152, 263, 385, 540, 695, 892, 1098, 1240, 1365, 1450, 1520], 'day', 8),
        ('phi-kiem-hoan', [152, 307, 540, 770, 1035, 1278, 1420, 1520], 'giua', 10),
        ('u-hon', [152, 288, 445, 640, 915, 1100, 1300, 1410, 1520], 'giua', 9),
        ('ho-lo-phun', [152, 1525], 'giua', 1)],
    4: [('pb-moc-dinh', [150, 243, 348, 466, 597, 746, 906, 1062, 1205, 1323, 1420, 1520], 'day', 10),
        ('pb-tran-son', [150, 245, 335, 440, 585, 730, 940, 1150, 1295, 1415, 1520], 'day', 12),
        ('pb-ho-than', [150, 250, 380, 525, 720, 925, 1100, 1250, 1380, 1450, 1520], 'day', 10),
        ('pb-loi-chau', [150, 226, 326, 476, 722, 1022, 1188, 1336, 1440, 1520], 'giua', 12),
        ('thuy-tien', [150, 228, 325, 420, 590, 745, 985, 1180, 1330, 1425, 1520], 'giua', 14, {'thuy-tien-bay': [6]}),
        ('dat-chay', [150, 235, 350, 490, 735, 1050, 1230, 1525], 'day', 7)],
    5: [('hon-tinh', [237, 298, 378, 477, 603, 727, 860, 1005, 1150, 1283, 1398, 1500], 'day', 10),
        ('nhan-chu', [237, 308, 398, 508, 625, 745, 857, 993, 1135, 1325, 1418, 1500], 'day', 10),
        ('canh-kim-tram', [237, 293, 355, 445, 550, 690, 830, 985, 1230, 1320, 1385, 1450, 1510], 'giua', 16, {'canh-kim-bay': [6]}),
        ('van-kiem-trieu', [237, 312, 395, 458, 532, 592, 680], 'day', 12),
        ('u-minh-trao', [237, 315, 390, 475, 560, 690, 930, 1110, 1290, 1525], 'giua', 12),
        ('phe-hon-diem', [237, 290, 355, 435, 545, 690, 770, 880, 1040, 1210, 1525], 'day', 12)],
}


def snap(profile, guess, span=28):
    r = range(max(1, guess - span), min(len(profile) - 1, guess + span))
    return min(r, key=lambda i: profile[i])


def auto_cuts(prof, x0, x1, rel=0.16, sep=34):
    """Ranh giới tự động: cột thưa (≤ rel × đỉnh trong cửa sổ ±70 điểm), cực tiểu cục bộ, cách nhau ≥ sep."""
    sm = np.convolve(prof.astype(float), np.ones(3) / 3, mode='same')
    cand = []
    for i in range(x0 + 12, x1 - 12):
        if sm[i] > sm[i - 1] or sm[i] > sm[i + 1]: continue
        peak = sm[max(x0, i - 70):min(x1, i + 70)].max()
        if sm[i] <= rel * peak: cand.append(i)
    pick = []
    for i in sorted(cand, key=lambda i: sm[i]):
        if all(abs(i - j) >= sep for j in pick): pick.append(i)
    return sorted(pick)


def frames_of(rgb, alpha, y0, y1, xs, skip=0):
    """Icon = mảnh liền đầu hàng (bỏ `skip` cột đầu — chữ đánh số); khung k = điểm ảnh giữa cột xs[k]..xs[k+1]
    (bỏ mảnh vụn < 2% mảnh lớn nhất). xs = 'auto' → tự tìm ranh giới (auto_cuts)."""
    solid = alpha[y0:y1] > 50
    solid[:, :skip] = False
    def cut(a, b):
        m = solid[:, a:b]
        lab, k = ndimage.label(ndimage.binary_dilation(m, iterations=1))
        if not k: return None
        sizes = ndimage.sum(m, lab, range(1, k + 1))
        mk = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= 0.02 * sizes.max()]) & m
        yy, xx = np.nonzero(mk)
        al = np.where(mk, alpha[y0:y1, a:b], 0)[yy.min():yy.max() + 1, xx.min():xx.max() + 1].astype(np.uint8)
        return Image.fromarray(np.dstack([rgb[y0:y1, a:b][yy.min():yy.max() + 1, xx.min():xx.max() + 1], al]), 'RGBA')
    if xs == 'auto':
        prof = solid.sum(axis=0)
        segs = [g for g in runs(prof, 2) if solid[:, g[0]:g[1]].sum() > 120]
        x0 = segs[0][1] + 2  # hết icon
        xs = [x0] + auto_cuts(prof, x0, segs[-1][1]) + [segs[-1][1]]
    icon = cut(skip, xs[0])
    return icon, [f for f in (cut(a, b) for a, b in zip(xs[:-1], xs[1:])) if f], xs


def main():
    OUT.mkdir(parents=True, exist_ok=True); ICONS.mkdir(parents=True, exist_ok=True)
    sp = json.loads(SPRITES.read_text())
    prev = []
    for n, rows in SHEETS.items():
        rgb, alpha = key(np.asarray(Image.open(SRC / f'ky-nang-{n}.webp').convert('RGB')))
        ys = cuts((alpha > 50).sum(axis=1).astype(float), 0, alpha.shape[0], len(rows))
        for row, y0, y1 in zip(rows, ys[:-1], ys[1:]):
            code, xs, anchor, fps = row[:4]
            icon, frs, xs = frames_of(rgb, alpha, y0, y1, xs, SKIP.get(n, 0))
            for sub, idx in (row[4] if len(row) > 4 else {}).items():  # hiệu ứng phụ 1 khung (đạn bay)
                f = frs[idx[0]]; k = min(1, 90 / f.height); f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
                f.save(OUT / f'k.{sub}.webp', quality=90, method=6)
                sp['fx'][f'k.{sub}'] = {'src': f'assets/effects/v2/k.{sub}.webp', 'fw': f.width, 'fh': f.height, 'anims': {'play': {'row': 0, 'n': 1}}, 'fps': 10, 'anchor': 'giua', 'lazy': True}
            ic = icon.copy(); ic.thumbnail((96, 96), Image.LANCZOS)
            t = Image.new('RGBA', (96, 96)); t.alpha_composite(ic, ((96 - ic.width) // 2, (96 - ic.height) // 2)); t.save(ICONS / f'{code}.png')
            fw = max(f.width for f in frs); fh = max(f.height for f in frs)
            k = min(1, MAXH / fh); sw, sh = max(1, round(fw * k)), max(1, round(fh * k))
            strip = Image.new('RGBA', (sw * len(frs), sh))
            for j, f in enumerate(frs):
                f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
                y = sh - f.height if anchor == 'day' else (sh - f.height) // 2
                strip.alpha_composite(f, (j * sw + (sw - f.width) // 2, y))
            fid = f'k.{code}'
            strip.save(OUT / f'{fid}.webp', quality=90, method=6)
            sp['fx'][fid] = {'src': f'assets/effects/v2/{fid}.webp', 'fw': sw, 'fh': sh, 'anims': {'play': {'row': 0, 'n': len(frs)}},
                             'fps': fps, 'anchor': anchor, 'lazy': True}
            prev.append(strip); print(code, len(frs), 'khung', sw, sh)
    SPRITES.write_text(json.dumps(sp, ensure_ascii=False) + '\n')
    if len(sys.argv) > 1:
        W = max(p.width for p in prev); H = sum(p.height for p in prev)
        im = Image.new('RGBA', (W, H), (60, 64, 72, 255)); y = 0
        for p in prev: im.alpha_composite(p, (0, y)); y += p.height
        im.save(sys.argv[1])



def ruler(out):
    """Ảnh thước đo (vạch mỗi 50 điểm) từng tấm, chia 3 phần — để đo ranh giới khung."""
    from PIL import ImageDraw
    for n, rows in SHEETS.items():
        rgb, alpha = key(np.asarray(Image.open(SRC / f'ky-nang-{n}.webp').convert('RGB')))
        H, W = alpha.shape
        im = Image.new('RGBA', (W, H), (60, 64, 72, 255)); im.alpha_composite(Image.fromarray(np.dstack([rgb, alpha]), 'RGBA'))
        d = ImageDraw.Draw(im)
        for x in range(0, W, 50): d.line((x, 0, x, 8), fill=(255, 255, 0, 255)); d.text((x + 1, 8), str(x), fill=(255, 255, 0, 255))
        ys = cuts((alpha > 50).sum(axis=1).astype(float), 0, H, len(rows))
        for r, (y0, y1) in enumerate(zip(ys[:-1], ys[1:])):
            _, _, xs = frames_of(rgb, alpha, y0, y1, rows[r][1], SKIP.get(n, 0))
            for x in xs: d.line((x, y0, x, y1), fill=(0, 255, 255, 255))
        for i in range(3): im.crop((i * W // 3, 0, (i + 1) * W // 3, H)).save(f'{out}/ruler-{n}-{i}.png')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'ruler': ruler(sys.argv[2])
    else: main()
