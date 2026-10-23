"""Hình mới cho 6 pháp bảo Thiên hệ (chủ dự án 24/10/2026): Quang · Lôi · Băng · Phong · Thời · Hư (Hư tạm = chén băng đổi màu).

Mỗi tấm gốc nền hồng ở assets/effects/_source/phap-bao-thien/<hệ>.webp, xếp theo hàng:
  hàng 1 = pháp bảo xoay / nghiêng, hàng 2 = vòng quanh người, hàng 3 = triệu hồi dưới đất,
  hàng 4 = chiêu (đạn / tia dài / sét quanh cờ), các hàng cuối = nổ khi trúng (Thời có thêm thiên hà + hồi phục).
Khung trong một hàng sát nhau → tách ở "khe" ít điểm ảnh nhất (valleys). Mỗi hiệu ứng ghép thành một dải đều khung
→ assets/effects/thien/tp.<hệ>.<tên>.webp, chỉ mục vào data/art/sprites.json → fx. Icon 96×96 → assets/ui/skills/pb-tp-<hệ>.png.
Dùng: python3 -I tools/thien_phap_bao.py [thư-mục-xem-trước]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key, main_parts  # noqa: E402

SRC = Path('assets/effects/_source/phap-bao-thien')
OUT = Path('assets/effects/thien')
ICON = Path('assets/ui/skills')
GLOW = 0.35  # lớp cộng sáng của drawEffect (sprites.js) — hiệu ứng tự phát sáng kiểu My Heroes

# tấm: (ranh giới hàng ước lượng, số khung mỗi hàng)
SHEETS = {
    'quang': ([198, 352, 558, 690, 850], [10, 7, 8, 8, 7, 7]),
    'loi': ([255, 400, 600, 800], [10, 6, 8, 7, 7]),
    'bang': ([236, 412, 612, 790], [9, 6, 8, 1, 6]),
    'phong': ([202, 398, 600, 790], [10, 6, 8, 1, 7]),
    'thoi': ([198, 392, 568, 710, 860], [10, 7, 9, 1, 5, 8]),
    'hu': ([236, 412, 612, 790], [9, 6, 8, 1, 6]),
}
FILE = {'hu': 'hu-tam'}

# hiệu ứng: id → (tấm, [(hàng, [khung…])], neo, cao tối đa (điểm ảnh), fps)
FX = {
    'tp.quang.xoay': ('quang', [(0, range(10))], 'giua', 110, 14),
    'tp.quang.vong': ('quang', [(1, range(7))], 'giua', 130, 12),
    'tp.quang.trieu': ('quang', [(2, range(8))], 'day', 150, 12),
    'tp.quang.dan': ('quang', [(3, [0])], 'giua', 90, 10),
    'tp.quang.luan': ('quang', [(4, range(7))], 'giua', 120, 14),
    'tp.quang.no': ('quang', [(5, range(7))], 'day', 140, 14),
    'tp.loi.vong': ('loi', [(1, range(6))], 'giua', 130, 12),
    'tp.loi.phien': ('loi', [(2, range(8)), (3, range(7))], 'day', 180, 11),
    'tp.loi.set': ('loi', [(2, [0, 1, 2]), (4, [5])], 'day', 160, 14),
    'tp.bang.do': ('bang', [(0, range(9))], 'day', 140, 14),
    'tp.bang.tran': ('bang', [(2, range(8))], 'day', 160, 12),
    'tp.bang.tia': ('bang', [(3, [0])], 'giua', 120, 10),
    'tp.bang.no': ('bang', [(4, range(6))], 'day', 140, 12),
    'tp.phong.do': ('phong', [(0, range(5))], 'day', 130, 12),
    'tp.phong.loc': ('phong', [(2, range(8))], 'day', 170, 10),
    'tp.phong.song': ('phong', [(3, [0])], 'giua', 120, 10),
    'tp.phong.no': ('phong', [(4, range(7))], 'day', 140, 12),
    'tp.thoi.trieu': ('thoi', [(2, range(9))], 'day', 150, 12),
    'tp.thoi.dong': ('thoi', [(3, [0])], 'giua', 110, 10),
    'tp.thoi.ha': ('thoi', [(4, range(5))], 'giua', 130, 8),
    'tp.thoi.hoi': ('thoi', [(5, range(8))], 'day', 140, 12),
    'tp.hu.do': ('hu', [(0, range(9))], 'day', 140, 14),
    'tp.hu.tran': ('hu', [(2, range(8))], 'day', 160, 12),
    'tp.hu.tia': ('hu', [(3, [0])], 'giua', 120, 10),
    'tp.hu.no': ('hu', [(4, range(6))], 'day', 140, 12),
}


def near(occ, g, r=30):
    seg = occ[g - r:g + r]
    return g - r + int(np.argmin(np.convolve(seg, np.ones(7) / 7, 'same')))


def valleys(occ, n):
    """n khung: ranh giới ở n-1 điểm trũng thấp nhất, cách nhau ≥ 45% bề rộng trung bình."""
    W = len(occ)
    if n == 1:
        return [0, W]
    s = np.convolve(occ, np.ones(9) / 9, 'same')
    mind = W / n * 0.45
    lm = sorted((i for i in range(5, W - 5) if s[i] <= s[i - 1] and s[i] <= s[i + 1]), key=lambda i: s[i])
    pick = []
    for i in lm:
        if all(abs(i - j) >= mind for j in pick) and mind * 0.6 < i < W - mind * 0.6:
            pick.append(i)
        if len(pick) == n - 1:
            break
    return [0] + sorted(pick) + [W]


def frames_of(name):
    rgb, alpha = key(np.asarray(Image.open(SRC / f'{FILE.get(name, name)}.webp').convert('RGB')))
    gs, ns = SHEETS[name]
    ys = [0] + [near((alpha > 40).sum(1).astype(float), g) for g in gs] + [alpha.shape[0]]
    rows = []
    for i, (y0, y1) in enumerate(zip(ys[:-1], ys[1:])):
        xs = valleys((alpha[y0:y1] > 40).sum(0).astype(float), ns[i])
        row = []
        for a, b in zip(xs[:-1], xs[1:]):
            al = main_parts(alpha[y0:y1, a:b].copy())
            yy, xx = np.nonzero(al > 8)
            if not len(yy):
                row.append(None)
                continue
            sub = (slice(yy.min(), yy.max() + 1), slice(xx.min(), xx.max() + 1))
            row.append(Image.fromarray(np.dstack([rgb[y0:y1, a:b][sub], al[sub]]), 'RGBA'))
        rows.append(row)
    return rows


def strip(frames, anchor, maxh):
    fw, fh = max(f.width for f in frames), max(f.height for f in frames)
    k = min(1, maxh / fh)
    sw, sh = round(fw * k) + 2, round(fh * k) + 2
    out = Image.new('RGBA', (sw * len(frames), sh))
    for j, f in enumerate(frames):
        f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
        y = sh - f.height - 1 if anchor == 'day' else (sh - f.height) // 2
        out.alpha_composite(f, (j * sw + (sw - f.width) // 2, y))
    return out, sw, sh


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    rows = {n: frames_of(n) for n in SHEETS}
    sp = json.loads(Path('data/art/sprites.json').read_text())
    sp['fx'] = {k: v for k, v in sp['fx'].items() if not k.startswith('tp.')}  # chạy lại: bỏ bản cũ
    for f in OUT.glob('*.webp'):
        f.unlink()
    prev = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    for fid, (sheet, parts, anchor, maxh, fps) in FX.items():
        frames = [rows[sheet][r][i] for r, idx in parts for i in idx]
        frames = [f for f in frames if f is not None]
        img, sw, sh = strip(frames, anchor, maxh)
        img.save(OUT / f'{fid}.webp', quality=88, method=6)
        sp['fx'][fid] = {'src': f'assets/effects/thien/{fid}.webp', 'fw': sw, 'fh': sh, 'anims': {'play': {'row': 0, 'n': len(frames)}},
                         'fps': fps, 'anchor': anchor, 'lazy': True, 'glow': GLOW}
        print(fid, len(frames), 'khung', sw, sh)
        if prev:
            bg = Image.new('RGBA', img.size, (20, 22, 34, 255))
            bg.alpha_composite(img)
            bg.convert('RGB').save(prev / f'{fid}.jpg', quality=80)
    for n in SHEETS:  # icon: khung đứng đầu tiên
        ic = rows[n][0][0].copy()
        ic.thumbnail((88, 88), Image.LANCZOS)
        t = Image.new('RGBA', (96, 96))
        t.alpha_composite(ic, ((96 - ic.width) // 2, (96 - ic.height) // 2))
        t.save(ICON / f'pb-tp-{n}.png')
    Path('data/art/sprites.json').write_text(json.dumps(sp, ensure_ascii=False) + '\n')


if __name__ == '__main__':
    main()
