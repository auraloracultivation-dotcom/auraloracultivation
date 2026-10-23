"""Huy hiệu kỹ năng tròn đồng bộ cho ô kỹ năng (chủ dự án 23/10/2026: "icon skill ghép vào ô không trùng hình tròn").

Mọi kỹ năng (icon tấm vẽ lẫn khung hiệu ứng cũ) → 1 huy hiệu tròn cùng cỡ, khít đúng lỗ tròn của khung ô
(assets/ui/skills/trong.png: lỗ tâm 128, bán kính 88 / 256):
- cắt sát phần có hình (bỏ viền trong suốt), bỏ chữ/nhãn dính ở mép (giữ mảng hình lớn nhất);
- icon vốn đã tròn (nút tròn trong tấm vẽ) → phóng đầy huy hiệu; hình hiệu ứng → đặt giữa nền tối màu hệ, vừa 80%;
- cắt tròn, viền mảnh màu hệ ngũ hành (data/build/dao-van.json → he.*.color).
Ra: assets/ui/skills/m/<mã>.png (160×160) + data/gameplay.json → skills.<mã>.medal.
Dùng: python3 -I tools/skill_medals.py [xem-trước.png]
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

SIZE = 160
OUT = Path('assets/ui/skills/m')
NEUTRAL = '#c9b98a'
# Chữ nhãn dính trên icon gốc (x0, y0, x1, y1 theo điểm ảnh icon 96×96) → vá bằng màu xung quanh
ERASE = {'canh-kim-tram': (0, 55, 29, 73)}


def erase(im, box):
    import cv2
    arr = np.array(im)
    m = np.zeros(arr.shape[:2], 'uint8')
    x0, y0, x1, y1 = box
    m[y0:y1, x0:x1] = 255
    rgb = cv2.inpaint(np.ascontiguousarray(arr[:, :, :3]), m, 5, cv2.INPAINT_TELEA)
    a = cv2.inpaint(np.ascontiguousarray(arr[:, :, 3]), m, 5, cv2.INPAINT_TELEA)
    return Image.fromarray(np.dstack([rgb, a]))


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def fx_frame(sp, fid, frame):
    f = sp['fx'][fid]
    im = Image.open(f['src']).convert('RGBA')
    n = min(frame, f['anims']['play']['n'] - 1)
    row = f['anims']['play']['row']
    return im.crop((n * f['fw'], row * f['fh'], (n + 1) * f['fw'], (row + 1) * f['fh']))


def clean(im):
    """Cắt sát hình, bỏ mảnh rời nhỏ (chữ nhãn, hạt bụi) ở xa khối chính."""
    a = np.array(im)[:, :, 3]
    mask = a > 24
    lab, n = ndimage.label(ndimage.binary_dilation(mask, iterations=3))
    if n > 1:
        sizes = ndimage.sum(mask, lab, range(1, n + 1))
        keep = [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * 0.12]
        arr = np.array(im)
        arr[~np.isin(lab, keep)] = 0
        im = Image.fromarray(arr)
        mask = np.array(im)[:, :, 3] > 24
    ys, xs = np.nonzero(mask)
    return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))


def is_round(im):
    """Nút tròn có sẵn: gần vuông và lấp gần kín hình tròn nội tiếp."""
    w, h = im.size
    if abs(w - h) > 0.12 * max(w, h):
        return False
    a = np.array(im.resize((64, 64)))[:, :, 3] > 60
    yy, xx = np.mgrid[:64, :64]
    inside = (xx - 31.5) ** 2 + (yy - 31.5) ** 2 <= 28 ** 2
    return a[inside].mean() > 0.88


def medal(src, color):
    c = np.array(hexrgb(color), dtype=float)
    S = SIZE
    yy, xx = np.mgrid[:S, :S]
    r = np.hypot(xx - (S - 1) / 2, yy - (S - 1) / 2) / (S / 2)
    # nền: tâm sáng nhẹ màu hệ → mép gần đen
    t = np.clip(r, 0, 1)[..., None]
    bg = (c * 0.38) * (1 - t) + np.array([14, 10, 24]) * t
    base = Image.fromarray(np.dstack([bg, np.full((S, S), 255)]).astype('uint8'), 'RGBA')
    art = clean(src)
    if is_round(art):
        fit = S
    else:
        fit = int(S * 0.8)
        glow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse((S * .22, S * .22, S * .78, S * .78), fill=(*hexrgb(color), 90))
        base.alpha_composite(glow.filter(ImageFilter.GaussianBlur(S * .1)))
    k = fit / max(art.size)
    art = art.resize((max(1, round(art.width * k)), max(1, round(art.height * k))), Image.LANCZOS)
    base.alpha_composite(art, ((S - art.width) // 2, (S - art.height) // 2))
    # cắt tròn mịn + viền màu hệ
    m = Image.new('L', (S * 4, S * 4), 0)
    ImageDraw.Draw(m).ellipse((2, 2, S * 4 - 3, S * 4 - 3), fill=255)
    base.putalpha(m.resize((S, S), Image.LANCZOS))
    ring = Image.new('RGBA', (S * 4, S * 4), (0, 0, 0, 0))
    ImageDraw.Draw(ring).ellipse((6, 6, S * 4 - 7, S * 4 - 7), outline=(*hexrgb(color), 230), width=10)
    base.alpha_composite(ring.resize((S, S), Image.LANCZOS))
    return base


def main():
    gp = json.load(open('data/gameplay.json'))
    sp = json.load(open('data/art/sprites.json'))
    he = json.load(open('data/build/dao-van.json'))['he']
    S = gp['skills']
    OUT.mkdir(parents=True, exist_ok=True)
    made = []
    for sid in S['_order']:
        s = S.get(sid)
        if not s:
            continue
        if s.get('icon_url') and Path(s['icon_url']).exists():
            src = Image.open(s['icon_url']).convert('RGBA')
        elif s.get('icon'):
            src = fx_frame(sp, *s['icon'])
        else:
            continue
        if sid in ERASE:
            src = erase(src, ERASE[sid])
        color = he.get(s.get('he') or '', {}).get('color', NEUTRAL)
        p = OUT / f'{sid}.png'
        medal(src, color).save(p, optimize=True)
        s['medal'] = str(p)
        made.append((sid, p))
    open('data/gameplay.json', 'w').write(json.dumps(gp, ensure_ascii=False, indent=1) + '\n')
    print(f'{len(made)} huy hiệu → {OUT}')
    if len(sys.argv) > 1:  # bảng xem trước: huy hiệu đặt trong khung ô thật
        frame = Image.open('assets/ui/skills/trong.png').convert('RGBA').resize((128, 128))
        cols = 8
        sheet = Image.new('RGBA', (cols * 132, ((len(made) + cols - 1) // cols) * 132), (60, 60, 60, 255))
        for i, (_, p) in enumerate(made):
            cell = frame.copy()
            md = Image.open(p).resize((88, 88), Image.LANCZOS)  # 68,75% của 128
            cell.alpha_composite(md, (20, 20))
            sheet.alpha_composite(cell, ((i % cols) * 132, (i // cols) * 132))
        sheet.save(sys.argv[1])


if __name__ == '__main__':
    main()
