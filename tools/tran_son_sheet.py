"""Trấn Sơn Ấn mới (chủ dự án 23/10/2026 11:50: "Trấn Sơn Ấn bên trong vẫn vỡ ảnh" → gửi tấm vẽ lại).

Tấm 3 hàng nền hồng (assets/effects/_source/ky-nang-9.webp): hàng 1 = icon tròn + ấn núi mọc lên (5 khung),
hàng 2 = ấn giáng nổ đá (6 khung), hàng 3 = đất nứt, khói tan (6 khung). Ghép 17 khung thành một dải
k.pb-tran-son (neo đáy, mọi khung cùng cỡ, căn giữa theo trọng tâm) + icon → assets/ui/skills/pb-tran-son-an.png.
Khung tách theo cột trống (các khung có khoảng hở rõ). Dùng: python3 -I tools/tran_son_sheet.py [xem-trước.png]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key, cuts  # noqa: E402

SRC = Path('assets/effects/_source/ky-nang-9.webp')
FID = 'k.pb-tran-son'
MAXH = 170


def pieces(rgb, alpha, y0, y1, min_gap=6):
    """Các khung trong một hàng: tách theo dải cột trống ≥ min_gap, bỏ mảnh quá nhỏ."""
    a = alpha[y0:y1] > 40
    col = ndimage.binary_closing(a.any(0), structure=np.ones(min_gap))
    lab, n = ndimage.label(col)
    out = []
    for i in range(1, n + 1):
        xs = np.flatnonzero(lab == i)
        x0, x1 = xs[0], xs[-1] + 1
        m = a[:, x0:x1]
        if m.sum() < 400:
            continue
        ys = np.flatnonzero(m.any(1))
        sub = (slice(y0 + ys[0], y0 + ys[-1] + 1), slice(x0, x1))
        al = np.where(alpha[sub] > 8, alpha[sub], 0).astype(np.uint8)
        out.append(Image.fromarray(np.dstack([rgb[sub], al]), 'RGBA'))
    return out


def depink(rgb, alpha):
    """Vùng trong mờ (vòng sáng, khói) còn lẫn nền hồng: giảm alpha theo độ hồng, kéo màu về vàng đất."""
    f = rgb.astype(np.float32)
    m = np.minimum(f[..., 0], f[..., 2]) - f[..., 1]
    k = np.clip((m - 5) / 70, 0, 1)
    a = alpha.astype(np.float32) * (1 - 0.85 * k)
    g = f[..., 1]
    out = f.copy()
    out[..., 0] = f[..., 0] * (1 - k) + np.clip(g * 1.25 + 40, 0, 255) * k   # đỏ → vàng
    out[..., 2] = f[..., 2] * (1 - k) + g * 0.55 * k                          # tím → nâu
    # khói / bụi hồng nhạt (xanh dương > xanh lá): kéo xanh dương xuống → màu bụi đất
    k2 = np.clip((out[..., 2] - out[..., 1] + 5) / 30, 0, 1) * (out[..., 0] > out[..., 1])
    out[..., 2] = out[..., 2] * (1 - k2) + out[..., 1] * 0.72 * k2
    out[..., 0] = out[..., 0] * (1 - 0.3 * k2) + out[..., 1] * 1.1 * 0.3 * k2
    return out.clip(0, 255).astype(np.uint8), a.clip(0, 255).astype(np.uint8)


def split(rgb, alpha, y0, y1, x0, x1, n):
    """n khung trong [x0, x1): ranh giới ở cột ít điểm ảnh nhất quanh vị trí chia đều (khung sát nhau)."""
    occ = (alpha[y0:y1] > 40).sum(0).astype(float)
    xs = cuts(occ, x0, x1, n)
    out = []
    for a, b in zip(xs[:-1], xs[1:]):
        m = alpha[y0:y1, a:b] > 40
        lab, k = ndimage.label(ndimage.binary_dilation(m, iterations=2))
        sizes = ndimage.sum(m, lab, range(1, k + 1))
        keep = np.isin(lab, 1 + np.flatnonzero(sizes >= 0.03 * sizes.max())) & m
        yy, xx = np.nonzero(keep)
        sub = (slice(y0 + yy.min(), y0 + yy.max() + 1), slice(a + xx.min(), a + xx.max() + 1))
        al = np.where(keep[yy.min():yy.max() + 1, xx.min():xx.max() + 1], alpha[sub], 0).astype(np.uint8)
        out.append(Image.fromarray(np.dstack([rgb[sub], al]), 'RGBA'))
    return out


def main():
    rgb, alpha = key(np.asarray(Image.open(SRC).convert('RGB')))
    rgb, alpha = depink(rgb, alpha)
    ys = cuts((alpha > 50).sum(axis=1).astype(float), 0, alpha.shape[0], 3)
    # icon tròn góc trái hàng 1: tách theo hình tròn (chạm khung 1 theo chiều ngang)
    m = alpha[ys[0]:ys[1], :400] > 40
    lab, _ = ndimage.label(m)
    big = 1 + int(np.argmax(ndimage.sum(m, lab, range(1, lab.max() + 1))))
    yy, xx = np.nonzero(lab == big)
    sub = (slice(ys[0] + yy.min(), ys[0] + yy.max() + 1), slice(xx.min(), xx.max() + 1))
    icon = Image.fromarray(np.dstack([rgb[sub], np.where(lab[yy.min():yy.max() + 1, xx.min():xx.max() + 1] == big, alpha[sub], 0).astype(np.uint8)]), 'RGBA')
    alpha[ys[0]:ys[1], :400][lab == big] = 0
    W = alpha.shape[1]
    rows = [split(rgb, alpha, ys[0], ys[1], 320, W, 5), split(rgb, alpha, ys[1], ys[2], 0, W, 6), split(rgb, alpha, ys[2], ys[3], 0, W, 6)]
    frames = rows[0] + rows[1] + rows[2]
    ic = icon.copy(); ic.thumbnail((96, 96), Image.LANCZOS)
    t = Image.new('RGBA', (96, 96)); t.alpha_composite(ic, ((96 - ic.width) // 2, (96 - ic.height) // 2))
    t.save('assets/ui/skills/pb-tran-son-an.png')
    fw = max(f.width for f in frames); fh = max(f.height for f in frames)
    k = min(1, MAXH / fh); sw, sh = round(fw * k) + 2, round(fh * k) + 2
    strip = Image.new('RGBA', (sw * len(frames), sh))
    for j, f in enumerate(frames):
        f = f.resize((max(1, round(f.width * k)), max(1, round(f.height * k))), Image.LANCZOS)
        strip.alpha_composite(f, (j * sw + (sw - f.width) // 2, sh - f.height - 1))
    strip.save(f'assets/effects/v2/{FID}.webp', quality=90, method=6)
    sp = json.loads(Path('data/art/sprites.json').read_text())
    sp['fx'][FID] = {'src': f'assets/effects/v2/{FID}.webp', 'fw': sw, 'fh': sh, 'anims': {'play': {'row': 0, 'n': len(frames)}},
                     'fps': 13, 'anchor': 'day', 'lazy': True}
    Path('data/art/sprites.json').write_text(json.dumps(sp, ensure_ascii=False) + '\n')
    print(FID, len(frames), 'khung', sw, sh)
    if len(sys.argv) > 1:
        bg = Image.new('RGBA', strip.size, (40, 90, 50, 255)); bg.alpha_composite(strip); bg.save(sys.argv[1])


if __name__ == '__main__':
    main()
