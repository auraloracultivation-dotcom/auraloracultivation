"""Vệt chém lưỡi liềm kiểu My Heroes (chủ dự án 25/10/2026, vẽ bằng GPT theo lệnh mẫu: nền đen, không viền, 6 khung).
Nguồn: assets/effects/_source/slash/<tên>-phong.png — mỗi tấm một hàng 6 khung, nền đen (vẽ cộng sáng: đen = trong suốt).
Khung tách theo khoảng trống dọc; khung dính nhau tách ở cột ít điểm sáng nhất. Mỗi khung đặt vào ô cùng cỡ,
canh theo tâm ô gốc (bề ngang tấm / 6) để vệt không giật vị trí giữa các khung.
Màu: giữ độ sáng từng điểm, đổi sắc độ sang màu hệ (data/build/dao-van.json → he.<hệ>.color) — lõi trắng vẫn trắng.
Dùng: python3 -I tools/fx_slash.py   → assets/effects/v3/<tên>.<hệ>.webp + data/art/sprites.json → fx "s.<tên>.<hệ>"
"""
import colorsys
import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('assets/effects/_source/slash')  # <tên>-phong.png: chem (lưỡi liềm), choc (đâm), no (nổ trúng đòn), xoay (vòng), gai (gai đất)
NAMES = ['chem', 'choc', 'no', 'xoay', 'gai']
OUT = Path('assets/effects/v3')
N = 6
SCALE = 0.5  # khung gốc ~360 px → 180 px (đủ nét khi phóng to trên điện thoại)
SLUG = {'Kim': 'kim', 'Ám': 'am', 'Thủy': 'thuy', 'Hỏa': 'hoa', 'Mộc': 'moc', 'Thổ': 'tho',
        'Quang': 'quang', 'Lôi': 'loi', 'Băng': 'bang', 'Phong': 'phong', 'Hư': 'hu', 'Thời': 'thoi'}


def frames(a):
    """Cắt tại cột tối nhất gần mỗi ranh giới ô (bề ngang / 6) — chịu được khung dính nhau, khung tràn ô."""
    lit = a.max(axis=2) > 30
    col = lit.sum(axis=0)
    slot = a.shape[1] / N
    cuts = [0] + [int(k * slot - 90 + np.argmin(col[int(k * slot) - 90:int(k * slot) + 90])) for k in range(1, N)] + [a.shape[1]]
    ys = np.where(lit.any(axis=1))[0]
    y0, y1 = ys[0], ys[-1] + 1
    half = int(max(max(abs(cuts[k] - (k + 0.5) * slot), abs(cuts[k + 1] - (k + 0.5) * slot)) for k in range(N)))
    out = []
    for k in range(N):
        s0, s1, c = cuts[k], cuts[k + 1], int((k + 0.5) * slot)
        f = np.zeros((y1 - y0, 2 * half, 3), np.uint8)
        lo, hi = max(s0, c - half), min(s1, c + half)
        f[:, lo - (c - half):hi - (c - half)] = a[y0:y1, lo:hi]
        out.append(f)
    return out


def tint(f, color):
    r, g, b = (int(color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    th, ts, _ = colorsys.rgb_to_hsv(r, g, b)
    x = f.astype(np.float32) / 255
    mx, mn = x.max(axis=2), x.min(axis=2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0) * min(1.0, ts / 0.56)
    v = mx
    # hsv → rgb với sắc độ cố định th
    i = int(th * 6) % 6; fr = th * 6 - int(th * 6)
    p, q, t = v * (1 - s), v * (1 - s * fr), v * (1 - s * (1 - fr))
    rgb = [(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)][i]
    return (np.dstack(rgb) * 255).clip(0, 255).astype(np.uint8)


def main():
    colors = {he: v['color'] for he, v in json.load(open('data/build/dao-van.json', encoding='utf-8'))['he'].items()}
    OUT.mkdir(parents=True, exist_ok=True)
    sp = json.load(open('data/art/sprites.json', encoding='utf-8'))
    for name in NAMES:
        fs = frames(np.asarray(Image.open(SRC / f'{name}-phong.png').convert('RGB')))
        h, w = fs[0].shape[:2]
        fw, fh = round(w * SCALE), round(h * SCALE)
        for he, slug in SLUG.items():
            sheet = Image.new('RGB', (fw * N, fh))
            for k, f in enumerate(fs):
                sheet.paste(Image.fromarray(tint(f, colors[he])).resize((fw, fh), Image.LANCZOS), (k * fw, 0))
            path = OUT / f'{name}.{slug}.webp'
            sheet.save(path, quality=86, method=6)
            sp['fx'][f's.{name}.{slug}'] = {'src': str(path), 'fw': fw, 'fh': fh, 'anims': {'play': {'row': 0, 'n': N}}, 'fps': 18,
                                            'blend': 'add', 'lazy': True}
        print(name, fw, fh, path.stat().st_size)
    Path('data/art/sprites.json').write_text(json.dumps(sp, ensure_ascii=False) + '\n')  # cùng cách ghi với tools/thien_fx.py


if __name__ == '__main__':
    main()
