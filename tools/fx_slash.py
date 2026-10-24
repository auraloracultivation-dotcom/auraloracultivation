"""Vệt chém lưỡi liềm kiểu My Heroes (chủ dự án 25/10/2026, vẽ bằng GPT theo lệnh mẫu: nền đen, không viền, 6 khung).
Nguồn: assets/effects/_source/slash/chem-phong.png — một hàng 6 khung, nền đen (vẽ cộng sáng: đen = trong suốt).
Khung tách theo khoảng trống dọc; khung dính nhau tách ở cột ít điểm sáng nhất. Mỗi khung đặt vào ô cùng cỡ,
canh theo tâm ô gốc (bề ngang tấm / 6) để vệt không giật vị trí giữa các khung.
Màu: giữ độ sáng từng điểm, đổi sắc độ sang màu hệ (data/build/dao-van.json → he.<hệ>.color) — lõi trắng vẫn trắng.
Dùng: python3 -I tools/fx_slash.py   → assets/effects/v3/chem.<hệ>.webp + data/art/sprites.json → fx "s.chem.<hệ>"
"""
import colorsys
import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('assets/effects/_source/slash/chem-phong.png')
OUT = Path('assets/effects/v3')
N = 6
SCALE = 0.5  # khung gốc ~360 px → 180 px (đủ nét khi phóng to trên điện thoại)
SLUG = {'Kim': 'kim', 'Ám': 'am', 'Thủy': 'thuy', 'Hỏa': 'hoa', 'Mộc': 'moc', 'Thổ': 'tho',
        'Quang': 'quang', 'Lôi': 'loi', 'Băng': 'bang', 'Phong': 'phong', 'Hư': 'hu', 'Thời': 'thoi'}


def frames(a):
    lit = a.max(axis=2) > 30
    col = lit.sum(axis=0)
    xs = np.where(col > 0)[0]
    segs, s, p = [], xs[0], xs[0]
    for x in xs[1:]:
        if x - p > 25:
            segs.append([s, p + 1]); s = x
        p = x
    segs.append([s, p + 1])
    while len(segs) < N:  # khung dính nhau: tách đoạn rộng nhất ở cột tối nhất (vùng giữa)
        i = max(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0])
        a0, a1 = segs[i]; w = a1 - a0
        cut = a0 + w // 4 + int(np.argmin(col[a0 + w // 4:a1 - w // 4]))
        segs[i:i + 1] = [[a0, cut], [cut, a1]]
    slot = a.shape[1] / N
    ys = np.where(lit.any(axis=1))[0]
    y0, y1 = ys[0], ys[-1] + 1
    half = int(max(max(abs(s0 - (k + 0.5) * slot), abs(s1 - (k + 0.5) * slot)) for k, (s0, s1) in enumerate(segs))) + 4
    out = []
    for k, (s0, s1) in enumerate(segs):
        c = int((k + 0.5) * slot)
        f = np.zeros((y1 - y0, 2 * half, 3), np.uint8)
        part = a[y0:y1, s0:s1]
        f[:, s0 - (c - half):s1 - (c - half)] = part
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
    a = np.asarray(Image.open(SRC).convert('RGB'))
    fs = frames(a)
    h, w = fs[0].shape[:2]
    fw, fh = round(w * SCALE), round(h * SCALE)
    colors = {he: v['color'] for he, v in json.load(open('data/build/dao-van.json', encoding='utf-8'))['he'].items()}
    OUT.mkdir(parents=True, exist_ok=True)
    sp = json.load(open('data/art/sprites.json', encoding='utf-8'))
    for he, slug in SLUG.items():
        sheet = Image.new('RGB', (fw * N, fh))
        for k, f in enumerate(fs):
            sheet.paste(Image.fromarray(tint(f, colors[he])).resize((fw, fh), Image.LANCZOS), (k * fw, 0))
        path = OUT / f'chem.{slug}.webp'
        sheet.save(path, quality=86, method=6)
        sp['fx'][f's.chem.{slug}'] = {'src': str(path), 'fw': fw, 'fh': fh, 'anims': {'play': {'row': 0, 'n': N}}, 'fps': 18,
                                      'blend': 'add', 'lazy': True}
        print(path, path.stat().st_size)
    Path('data/art/sprites.json').write_text(json.dumps(sp, ensure_ascii=False) + '\n')  # cùng cách ghi với tools/thien_fx.py


if __name__ == '__main__':
    main()
