"""Sinh bộ UI "pixel chuẩn" (assets/ui/px/) từ tấm gốc của chủ dự án.

Mọi mảnh được đưa về cùng một cỡ pixel hình (tools/ui_native.py, hệ số F) rồi trong game chỉ
phóng theo BỘI SỐ NGUYÊN của cùng một cỡ → mọi viền khung cùng độ dày, sắc nét.
Khung cần co giãn (bảng, nút chữ, băng tên) dùng 9-slice: góc giữ nguyên, cạnh kéo dài.

Dùng: python3 -I tools/build_ui_px.py   → assets/ui/px/*.png + data/ui_px.json
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

import sys
sys.path.insert(0, 'tools')
from ui_native import to_native  # noqa: E402

OUT = Path('assets/ui/px')
P6 = Path('assets/ui/pieces/sheet6-doc-tim')
P2 = Path('assets/ui/pieces/sheet2-bang-tim')
P5 = Path('assets/ui/pieces/sheet5-den-vang')
F = 2  # tấm 6 (giao diện dọc): 1 pixel hình ≈ 2 điểm ảnh gốc
NAVY = (18, 26, 47)


def tight(img):
    box = img.getbbox()
    return img.crop(box) if box else img


def fix_spill(img):
    """Viền lẫn màu nền hồng sau khi tách → đổi về tím than đậm như viền gốc."""
    a = np.array(img)
    r, g, b, al = (a[..., i].astype(int) for i in range(4))
    spill = (al > 0) & (np.minimum(r, b) - g > 55) & (r > 70) & (b > 70) & (np.abs(r - b) < 90)
    a[spill, :3] = (34, 18, 44)
    return Image.fromarray(a, 'RGBA')


def native(path, f=F, colors=32):
    img, _ = to_native(tight(Image.open(path).convert('RGBA')), f, colors)
    return fix_spill(tight(img))


def split_rows(img):
    a = np.array(img)[..., 3] > 0
    rows = a.any(axis=1)
    parts, start = [], None
    for y, v in enumerate(list(rows) + [False]):
        if v and start is None:
            start = y
        elif not v and start is not None:
            if y - start > 4:
                parts.append(tight(img.crop((0, start, img.width, y))))
            start = None
    return parts


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {'unit': 'pixel hình (art px)', 'items': {}}

    def save(name, img, **extra):
        img.save(OUT / f'{name}.png', optimize=True)
        meta['items'][name] = {'w': img.width, 'h': img.height, **extra}

    # Khung cố định (hiển thị đúng kích thước gốc × cỡ pixel)
    save('vong-dai-dien', native(P6 / '002.png'))
    save('vong-tron', native(P6 / '004.png'))
    save('vong-tron-lon', native(P6 / '033.png'))
    save('o-vuong', native(P6 / '009.png'))
    save('nut-dong', native(P6 / '046.png'))
    save('nut-cong', native(P6 / '043.png'))
    save('nut-tru', native(P6 / '044.png'))
    save('nut-v', native(P6 / '045.png'))
    save('nut-cai-dat', native(P6 / '020.png'))
    save('nut-ban-do', native(P6 / '019.png'))
    save('nut-menu', native(P6 / '017.png'))

    # 9-slice: [trên, phải, dưới, trái] tính bằng pixel hình
    save('bang', native(P6 / '023.png'), slice=[22, 22, 22, 22])
    save('bang-tieu-de', native(P6 / '041.png'), slice=[8, 14, 8, 14])
    save('bang-ten', native(P6 / '042.png'), slice=[6, 22, 6, 22])
    save('o-nhap', native(P6 / '032.png'), slice=[8, 14, 8, 14])
    save('thanh-mong', native(P6 / '039.png'), slice=[6, 10, 6, 10])

    # Thanh Khí huyết / Linh lực / Tu vi: icon riêng mỗi thanh, khung dùng chung đã xoá màu tô sẵn
    bars = split_rows(native(P6 / '003.png', colors=48))
    green = np.array(bars[3])
    gr, gg, gb = (green[..., i].astype(int) for i in range(3))
    fill = (green[..., 3] > 0) & (gg > 140) & (gr < 140) & (gb < 170) & (gg - gr > 40)
    ys, xs = np.nonzero(fill)
    fx0, fx1, fy0, fy1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    # lòng thanh kéo tới mép trong khung bên phải (điểm sáng đầu tiên sau phần tô)
    lum = green[..., :3].astype(int).mean(axis=2)
    cy = (fy0 + fy1) // 2
    x = fx1
    while x < green.shape[1] - 1 and lum[cy, x] < 110:
        x += 1
    fx1 = x - 1
    frame = green.copy()
    frame[fy0 - 1:fy1 + 1, fx0:fx1, :3] = NAVY  # xoá cả vệt sáng mép trên phần tô
    cap = int(fx0) - 2  # phần icon bên trái
    for name, src in (('thanh-khi-huyet', bars[0]), ('thanh-linh-luc', bars[1]), ('thanh-tu-vi', bars[2])):
        s = np.array(src.resize(bars[3].size, Image.NEAREST))
        out = frame.copy()
        out[:, :cap] = s[:, :cap]
        img = Image.fromarray(out, 'RGBA')
        right = img.width - int(fx1) + 1
        save(name, img, slice=[0, right, 0, cap + 2], fill=[int(fx0), int(fy0), int(fx1 - fx0), int(fy1 - fy0)])

    # Bảng nhân vật cũ (tấm 2) không dùng nữa — bảng mới dựng bằng 9-slice + ô vuông.
    # Icon (bộ đen–vàng) thu nhỏ để nằm gọn trong ô tròn
    for name, piece in (('icon-tan-cong', '005'), ('icon-phi-hanh', '047'), ('icon-toc-bien', '026'), ('icon-khoa', '085')):
        save(name, native(P5 / f'{piece}.png', f=3, colors=24))

    Path('data/ui_px.json').write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    for k, v in meta['items'].items():
        print(f'{k:18s} {v["w"]:>4}×{v["h"]:<4}', {x: y for x, y in v.items() if x not in ('w', 'h')} or '')


if __name__ == '__main__':
    main()
