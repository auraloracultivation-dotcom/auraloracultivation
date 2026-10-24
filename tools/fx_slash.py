"""Vệt chém lưỡi liềm kiểu My Heroes (chủ dự án 25/10/2026, vẽ bằng GPT theo lệnh mẫu: nền đen, không viền, 6 khung).
Nguồn: assets/effects/_source/slash/<tên>-phong.png — mỗi tấm một hàng 6 khung, nền đen (vẽ cộng sáng: đen = trong suốt).
Khung tách theo khoảng trống dọc; khung dính nhau tách ở cột ít điểm sáng nhất. Mỗi khung đặt vào ô cùng cỡ,
canh theo tâm ô gốc (bề ngang tấm / 6) để vệt không giật vị trí giữa các khung.
Màu: giữ độ sáng từng điểm, đổi sắc độ sang màu hệ (data/build/dao-van.json → he.<hệ>.color) — lõi trắng vẫn trắng.
Dùng: python3 -I tools/fx_slash.py   → assets/effects/v3/<tên>.<hệ>.webp + data/art/sprites.json → fx "s.<tên>.<hệ>"
Thêm tấm GPT mới: lưu thành assets/effects/_source/slash/<họ>-phong.png (vd. dan-phong.png), chạy lệnh trên, rồi ghi chiêu nào dùng họ đó ở
data/gameplay.json → fx_families (families.<họ> + skills.<id>). Tên họ dự kiến: dan, no-to, cot, loc, song, nova, hoi, khien, tran, hodem, dichchuyen, haoquang.
"""
import colorsys
import json
from pathlib import Path

import numpy as np
from PIL import Image

SRC = Path('assets/effects/_source/slash')  # <tên>-phong.png: chem (lưỡi liềm), choc (đâm), no (nổ trúng đòn), xoay (vòng), gai (gai đất)
NAMES = sorted(p.name[:-len('-phong.png')] for p in SRC.glob('*-phong.png'))  # tự nhận mọi tấm mới: thả <họ>-phong.png vào thư mục là đủ
OUT = Path('assets/effects/v3')
N = 6
SCALE = 0.5  # khung gốc ~360 px → 180 px (đủ nét khi phóng to trên điện thoại)
SLUG = {'Kim': 'kim', 'Ám': 'am', 'Thủy': 'thuy', 'Hỏa': 'hoa', 'Mộc': 'moc', 'Thổ': 'tho',
        'Quang': 'quang', 'Lôi': 'loi', 'Băng': 'bang', 'Phong': 'phong', 'Hư': 'hu', 'Thời': 'thoi'}


def frames(a):
    """Tách 6 khung, không cắt cụt quầng sáng:
    - ranh giới = 5 chỗ trũng sâu nhất của lượng điểm SÁNG theo cột (đã làm mượt), cách nhau ≥ 1/2 ô — GPT xếp khung không đều;
    - mỗi khung lấy rộng ra hai bên (MARGIN) nhưng chỉ giữ phần thuộc khung đó, phần khung bên cạnh mờ dần chứ không cắt thẳng;
    - ô ra đủ rộng cho khung rộng nhất, canh theo tâm khối sáng mỗi khung theo chiều ngang của ô gốc."""
    v = a.max(axis=2).astype(np.float32)
    col = (v > 90).sum(axis=0).astype(np.float32)
    k = 31; col_s = np.convolve(col, np.ones(k) / k, mode='same')
    slot = a.shape[1] / N
    cand = sorted(range(int(slot * 0.5), int(a.shape[1] - slot * 0.5)), key=lambda x: col_s[x])
    cuts = []
    for x in cand:
        if all(abs(x - c) >= slot * 0.5 for c in cuts): cuts.append(x)
        if len(cuts) == N - 1: break
    cuts = [0] + sorted(cuts) + [a.shape[1]]
    lit = v > 6
    ys = np.where(lit.any(axis=1))[0]
    y0, y1 = max(0, ys[0] - 12), min(a.shape[0], ys[-1] + 13)
    centers = [int((k + 0.5) * slot) for k in range(N)]
    MARGIN = 40
    half = int(max(max(c - (cuts[k] - MARGIN), (cuts[k + 1] + MARGIN) - c) for k, c in enumerate(centers)))
    out = []
    xs = np.arange(a.shape[1])
    for k, c in enumerate(centers):
        # trọng số thuộc khung k: 1 trong [cut_k, cut_k+1], mờ dần ra ngoài trong MARGIN (đè lên khung bên cạnh vẫn nhỏ)
        d = np.maximum(cuts[k] - xs, xs - cuts[k + 1]).clip(0, None)
        w = (1 - d / MARGIN).clip(0, 1) ** 2
        f = np.zeros((y1 - y0, 2 * half, 3), np.float32)
        lo, hi = max(0, c - half), min(a.shape[1], c + half)
        f[:, lo - (c - half):hi - (c - half)] = a[y0:y1, lo:hi] * w[lo:hi][None, :, None]
        out.append(f.clip(0, 255).astype(np.uint8))
    return out


def clean(f):
    """Nền đen thật sự: trừ mức đen (sương mờ GPT để lại → thành khung mờ khi cộng sáng) rồi mờ dần ở mép ô."""
    x = f.astype(np.float32)
    x = ((x - 7) / (255 - 7) * 255).clip(0, 255)
    h, w = x.shape[:2]
    fy = np.minimum(np.arange(h), np.arange(h)[::-1]) / max(1, h * 0.08)
    fx = np.minimum(np.arange(w), np.arange(w)[::-1]) / max(1, w * 0.06)
    x *= (np.minimum(fy[:, None], fx[None, :]).clip(0, 1) ** 1.5)[:, :, None]
    return x.astype(np.uint8)


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
                sheet.paste(Image.fromarray(clean(tint(f, colors[he]))).resize((fw, fh), Image.LANCZOS), (k * fw, 0))
            path = OUT / f'{name}.{slug}.webp'
            sheet.save(path, quality=86, method=6)
            sp['fx'][f's.{name}.{slug}'] = {'src': str(path), 'fw': fw, 'fh': fh, 'anims': {'play': {'row': 0, 'n': N}}, 'fps': 18,
                                            'blend': 'add', 'lazy': True}
        print(name, fw, fh, path.stat().st_size)
    Path('data/art/sprites.json').write_text(json.dumps(sp, ensure_ascii=False) + '\n')  # cùng cách ghi với tools/thien_fx.py


if __name__ == '__main__':
    main()
