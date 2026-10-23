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
SHEETS = {
    1: [('bo-cam-che', [140, 228, 308, 398, 508, 635, 790, 955, 1130, 1310, 1558, 1745, 1915, 2045, 2172], 'day', 14),
        ('cc-kim', [140, 228, 315, 410, 515, 625, 785, 955, 1130, 1320, 1478, 1690, 1785, 1890, 2005, 2068, 2172], 'day', 12),
        ('cc-am', [140, 228, 318, 415, 520, 628, 787, 947, 1139, 1326, 1530, 1668, 1793, 1893, 1970, 2022, 2172], 'day', 12),
        ('cc-thuy', [140, 228, 318, 418, 515, 615, 787, 917, 1122, 1227, 1483, 1680, 1860, 2012, 2172], 'day', 12),
        ('cc-hoa', [140, 228, 325, 432, 568, 724, 887, 1072, 1269, 1450, 1658, 1918, 2048, 2172], 'day', 12),
        ('cc-moc', [140, 228, 318, 420, 535, 724, 884, 1054, 1234, 1448, 1648, 1778, 1878, 2008, 2172], 'day', 12)],
}


def snap(profile, guess, span=28):
    r = range(max(1, guess - span), min(len(profile) - 1, guess + span))
    return min(r, key=lambda i: profile[i])


def frames_of(rgb, alpha, y0, y1, xs):
    """Icon = mảnh liền đầu hàng; khung k = điểm ảnh giữa cột xs[k]..xs[k+1] (bỏ mảnh vụn < 2% mảnh lớn nhất)."""
    solid = alpha[y0:y1] > 50
    def cut(a, b):
        m = solid[:, a:b]
        lab, k = ndimage.label(ndimage.binary_dilation(m, iterations=1))
        if not k: return None
        sizes = ndimage.sum(m, lab, range(1, k + 1))
        mk = np.isin(lab, [i + 1 for i, v in enumerate(sizes) if v >= 0.02 * sizes.max()]) & m
        yy, xx = np.nonzero(mk)
        al = np.where(mk, alpha[y0:y1, a:b], 0)[yy.min():yy.max() + 1, xx.min():xx.max() + 1].astype(np.uint8)
        return Image.fromarray(np.dstack([rgb[y0:y1, a:b][yy.min():yy.max() + 1, xx.min():xx.max() + 1], al]), 'RGBA')
    icon = cut(0, xs[0])
    return icon, [f for f in (cut(a, b) for a, b in zip(xs[:-1], xs[1:])) if f]


def main():
    OUT.mkdir(parents=True, exist_ok=True); ICONS.mkdir(parents=True, exist_ok=True)
    sp = json.loads(SPRITES.read_text())
    prev = []
    for n, rows in SHEETS.items():
        rgb, alpha = key(np.asarray(Image.open(SRC / f'ky-nang-{n}.webp').convert('RGB')))
        ys = cuts((alpha > 50).sum(axis=1).astype(float), 0, alpha.shape[0], len(rows))
        for (code, xs, anchor, fps), y0, y1 in zip(rows, ys[:-1], ys[1:]):
            icon, frs = frames_of(rgb, alpha, y0, y1, xs)
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
        for i in range(3): im.crop((i * W // 3, 0, (i + 1) * W // 3, H)).save(f'{out}/ruler-{n}-{i}.png')


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'ruler': ruler(sys.argv[2])
    else: main()
