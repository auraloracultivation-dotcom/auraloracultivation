"""Cắt các tấm quái chủ dự án gửi (23/10/2026) thành sprite trong game.

Nguồn: assets/monsters/_source/quai-<vùng>.webp — nền hồng, cột chữ tên bên trái, hàng chữ tiêu đề ở trên,
lưới 5 hàng (3 quái thường, tinh anh, boss) × 4 cột (đứng im, bước 1, bước 2, tấn công).
Âm Hư (quai-huvo): 5 hàng × 4 cột (khe nứt, vuốt, xoáy, khe nhỏ).

Ra:  assets/monsters/<mã>.webp (1 hàng 4 khung, cùng cỡ, chân thẳng hàng) + data/art/monster_sheets.json
     (fw, fh, body_h = chiều cao thân ở khung đứng im — tools/gen_balance.py dùng để đặt cỡ quái trong game).
Dùng: python3 -I tools/monster_sheets.py [xem-truoc.png]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path('assets/monsters/_source')
OUT = Path('assets/monsters')
MANIFEST = Path('data/art/monster_sheets.json')
SCALE = 0.62  # thu nhỏ khi lưu (thân quái thường cao ~110 điểm ảnh — đủ nét khi phóng trên điện thoại)

# (tệp, mép phải cột chữ, mép dưới hàng tiêu đề, độ đậm màu, [mã từng hàng])
SHEETS = [
    ('xanh', 292, 58, 1.0, ['yeu-ho', 'thanh-xa', 'thach-giap', 'hac-lang-vuong', 'son-dong-lao-yeu']),
    ('cam', 292, 58, 1.0, ['huyet-sai', 'diem-xa', 'nham-giap', 'huyet-lang-vuong', 'hoa-vuc-ma-ton']),
    ('trang', 280, 52, 1.0, ['bang-ho', 'tuyet-ung', 'han-giap', 'bang-hon-tuong', 'tuyet-son-lao-to']),
    # Cổ Chiến Hồn… vẽ tông băng nhưng ở Vùng Xám Khói → giảm màu cho ra thép xám, giữ chút ánh lam
    ('xam', 278, 52, 0.42, ['co-chien-hon', 'doc-yeu', 'huyen-giap', 'thuong-co-chien-tuong', 'huyen-vuc-ma-ton']),
    ('than', 292, 56, 1.0, ['hac-vuc-yeu', 'hu-khong-thu', 'tan-the-giap', 'thuong-co-ma-tuong', 'hac-vuc-chu-te']),
    ('den', 272, 56, 1.0, ['tu-suong-yeu-ho', 'u-moc-thach-mang', 'co-ma-da-nhan-thu', 'tu-moc-yeu-than', 'u-suong-ma-hoang']),
    ('tim', 306, 58, 1.0, ['vinh-da-u-minh', 'luan-hoi-doan-menh', 'bat-diet-co-hon', 'phach-huyet-truong-sinh', 'quy-tich-vinh-hang']),
    ('huvo', 318, 8, 1.0, ['hac-am-phe-hon-gia', 'tich-diet-vo-tung-anh', 'u-lenh-huyet-sat-su', 'vinh-da-dao-anh-quy', 'tham-uyen-u-minh-ma']),
]


def key(rgb):
    """Nền hồng → trong suốt. Vùng hồng liền khối lớn = nền; mép mờ dần + khử ám hồng."""
    f = rgb.astype(np.float32)
    m = np.minimum(f[..., 0], f[..., 2]) - f[..., 1]
    pinkish = m > 120
    lab, n = ndimage.label(pinkish)
    sizes = ndimage.sum(np.ones_like(m), lab, range(1, n + 1))
    big = np.isin(lab, 1 + np.flatnonzero(sizes > 1500))
    bg = big | (m > 185)
    alpha = np.where(bg, 0.0, 1.0)
    edge = ~bg & ndimage.binary_dilation(bg, iterations=2)
    alpha[edge] = np.clip((185 - m[edge]) / (185 - 70), 0, 1)
    bgc = np.median(rgb[bg], axis=0).astype(np.float32) if bg.any() else np.array([248, 3, 248], np.float32)
    a = np.maximum(alpha, 0.05)[..., None]
    fg = np.where(alpha[..., None] < 1, (f - (1 - a) * bgc) / a, f)
    return fg.clip(0, 255).astype(np.uint8), (alpha * 255).astype(np.uint8)


def kill_lines(rgb, alpha, min_len=120):
    """Đường kẻ lưới / khung ô tối dài (ngang/dọc) → trong suốt."""
    dark = (rgb.max(axis=2) < 120) & (alpha > 100)
    kill = ndimage.binary_opening(dark, structure=np.ones((1, min_len))) | ndimage.binary_opening(dark, structure=np.ones((min_len, 1)))
    thick = ndimage.binary_dilation(ndimage.binary_opening(dark, structure=np.ones((9, 9))), iterations=4)  # lòng khe nứt tối: giữ
    alpha[ndimage.binary_dilation(kill & ~thick, iterations=3) & ~thick] = 0


def cuts(occ, start, end, n):
    """Chia [start, end) thành n khoảng: mỗi ranh giới ở chỗ ít điểm ảnh nhất quanh vị trí chia đều."""
    step = (end - start) / n
    bounds = [start]
    for k in range(1, n):
        c = int(start + k * step); r = int(step * 0.3)
        seg = occ[c - r:c + r]
        bounds.append(c - r + int(np.argmin(np.convolve(seg, np.ones(9) / 9, 'same'))))
    return bounds + [end]


def main_parts(alpha, keep=0.06):
    a = alpha > 60
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=4))
    if n <= 1: return alpha
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    good = []
    for i, sl in enumerate(ndimage.find_objects(lab)):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if min(h, w) <= 12 and max(h, w) >= 40: continue  # mẩu đường kẻ khung ô còn sót
        if sizes[i] >= keep * sizes.max(): good.append(i + 1)
    ok = np.isin(lab, good)
    return np.where(ok, alpha, 0).astype(np.uint8)


def body_box(alpha):
    """Thân = cụm lớn nhất (không tính hiệu ứng rời)."""
    a = alpha > 60
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=2))
    sizes = ndimage.sum(a, lab, range(1, n + 1))
    sl = ndimage.find_objects(lab)[int(np.argmax(sizes))]
    return sl[1].start, sl[0].start, sl[1].stop, sl[0].stop


def desat(rgb, k):
    if k >= 1: return rgb
    g = rgb.astype(np.float32).mean(axis=2, keepdims=True)
    return (g + (rgb - g) * k).clip(0, 255).astype(np.uint8)


def cut_sheet(name, label_x, head_y, sat, ids):
    rgb = np.asarray(Image.open(SRC / f'quai-{name}.webp').convert('RGB'))
    rgb, alpha = key(rgb)
    kill_lines(rgb, alpha)
    alpha[:, :label_x] = 0
    alpha[:head_y] = 0
    H, W = alpha.shape
    xs = cuts((alpha > 60).sum(axis=0).astype(float), label_x, W, 4)
    ys = cuts((alpha[:, label_x:] > 60).sum(axis=1).astype(float), head_y, H, 5)
    out = {}
    for r, mid in enumerate(ids):
        cells = []
        for c in range(4):
            x0, x1, y0, y1 = xs[c], xs[c + 1], ys[r], ys[r + 1]
            a = main_parts(alpha[y0:y1, x0:x1].copy())
            ys_, xs_ = np.nonzero(a > 30)
            if not len(xs_): raise SystemExit(f'{name} hàng {r} cột {c}: trống')
            box = (xs_.min(), ys_.min(), xs_.max() + 1, ys_.max() + 1)
            cells.append((desat(rgb[y0:y1, x0:x1], sat), a, box, body_box(a)))
        # căn: đáy chân thẳng hàng; ngang theo mép trái thân (đuôi) — hiệu ứng đánh ra bên phải không làm lệch thân
        void = name == 'huvo'
        ref = []
        for _, a, box, bb in cells:
            ax = (bb[0] + bb[2]) / 2 if void else bb[0]
            ref.append((ax, bb[3] if not void else (bb[1] + bb[3]) / 2))
        idle_bb = cells[0][3]
        cx_off = (idle_bb[2] - idle_bb[0]) / 2 if not void else 0  # tâm thân khung đứng im so với mốc căn
        left = max(rx - b[0] for (rx, _), (_, _, b, _) in zip(ref, cells))
        right = max(b[2] - rx for (rx, _), (_, _, b, _) in zip(ref, cells))
        up = max(ry - b[1] for (_, ry), (_, _, b, _) in zip(ref, cells))
        down = max(b[3] - ry for (_, ry), (_, _, b, _) in zip(ref, cells))
        half = max(left + cx_off, right - cx_off) + 2  # khung đối xứng quanh tâm thân → game vẽ giữa khung = giữa thân
        fw, fh = int(np.ceil(half * 2)), int(np.ceil(up + down)) + 2
        strip = Image.new('RGBA', (fw * 4, fh))
        for i, ((im, a, b, bb), (rx, ry)) in enumerate(zip(cells, ref)):
            tile = Image.fromarray(np.dstack([im, a]), 'RGBA')
            ox = int(round(i * fw + half - cx_off - rx)); oy = int(round(up - ry)) + 1
            strip.alpha_composite(tile, (max(0, ox), max(0, oy)))
        sw, sh = max(1, round(fw * SCALE)), max(1, round(fh * SCALE))
        strip = strip.resize((sw * 4, sh), Image.LANCZOS)
        strip.save(OUT / f'{mid}.webp', quality=90, method=6)
        body_h = (idle_bb[3] - idle_bb[1]) * SCALE
        out[mid] = {'src': f'assets/monsters/{mid}.webp', 'fw': sw, 'fh': sh, 'body_h': round(body_h, 1),
                    'feet': round((up + (0 if void else 0)) / (up + down), 3), 'void': void}
    return out


def register(man):
    """Thêm sheet m.<mã> vào data/art/sprites.json (tải lười). Khung: 0 đứng, 1 bước tới, 2 bước về, 3 đánh."""
    p = Path('data/art/sprites.json')
    sp = json.loads(p.read_text())
    sp['sheets'] = {k: v for k, v in sp['sheets'].items() if not k.startswith('m.')}
    for mid, m in man.items():
        anims = ({'idle': {'row': 0, 'n': 4, 'frames': [0, 0, 0, 3]}, 'walk': {'row': 0, 'n': 4, 'frames': [0, 1, 2, 1]},
                  'attack': {'row': 0, 'n': 4, 'frames': [1, 2, 2, 3]}, 'hurt': {'row': 0, 'n': 4, 'frames': [3]},
                  'death': {'row': 0, 'n': 4, 'frames': [3]}} if m['void'] else
                 {'idle': {'row': 0, 'n': 4, 'frames': [0]}, 'walk': {'row': 0, 'n': 4, 'frames': [1, 0, 2, 0]},
                  'attack': {'row': 0, 'n': 4, 'frames': [0, 3, 3, 3]}, 'hurt': {'row': 0, 'n': 4, 'frames': [0]},
                  'death': {'row': 0, 'n': 4, 'frames': [0]}})
        sp['sheets'][f'm.{mid}'] = {'src': m['src'], 'fw': m['fw'], 'fh': m['fh'], 'anims': anims, 'lazy': True}
    p.write_text(json.dumps(sp, ensure_ascii=False) + '\n')


def main():
    if len(sys.argv) > 1 and sys.argv[1] == 'register':
        return register(json.loads(MANIFEST.read_text())['sheets'])
    man = {}
    for spec in SHEETS:
        man.update(cut_sheet(*spec))
    MANIFEST.write_text(json.dumps({'_ghi_chu': 'Sinh bằng tools/monster_sheets.py — không sửa tay.', 'sheets': man}, ensure_ascii=False, indent=1) + '\n')
    register(man)
    print(len(man), 'quái')
    if len(sys.argv) > 1 and sys.argv[1] != 'register':  # xem trước: mỗi quái 1 hàng 4 khung, nền xám
        rows = list(man.items())
        cw, ch = 150, 110
        prev = Image.new('RGBA', (cw * 4 * 2, ch * ((len(rows) + 1) // 2)), (70, 74, 82, 255))
        for i, (mid, m) in enumerate(rows):
            im = Image.open(OUT / f'{mid}.webp')
            for f in range(4):
                fr = im.crop((f * m['fw'], 0, (f + 1) * m['fw'], m['fh']))
                fr.thumbnail((cw - 4, ch - 4))
                prev.alpha_composite(fr, ((i % 2) * cw * 4 + f * cw + 2, (i // 2) * ch + 2))
        prev.save(sys.argv[1])


if __name__ == '__main__':
    main()
