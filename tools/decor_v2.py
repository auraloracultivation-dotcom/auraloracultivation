"""Trang trí bản đồ bản 2 (chủ dự án 23/10/2026) — thay TOÀN BỘ cây, đá, cỏ hoa cũ.

Nguồn: assets/decor/_source/{thien-nhien, phe-tich-1, phe-tich-2, den-mieu}.webp (nền hồng).
Ra:  assets/decor/atlas.webp + data/art/sprites.json → decor + data/terrain.json → decor của từng loại đất.
Loại: tree = cây (chặn ở gốc), rock = đá / đồ vật (chặn cả khối), small = cỏ hoa / nền đá (đi xuyên),
      big = công trình (nhà hoang, cổng, tượng, ao…) — hiếm, mọc theo lưới thưa, dọn chỗ quanh nó (src/map/decor.js).
Dùng: python3 -I tools/decor_v2.py [xem-trước.png]
"""
import colorsys
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from cut_objects import objects  # noqa: E402

SRC = Path('assets/decor/_source')
# (khoá, tấm, số thứ tự món (tools/cut_objects.py), cao trên bản đồ (điểm), loại, đổi màu)
ITEMS = [
    # --- thiên nhiên (tấm thien-nhien, cắt merge=2) ---
    ('cay-xanh', 'tn', 0, 60, 'tree'), ('anh-dao', 'tn', 1, 60, 'tree'), ('cay-vang', 'tn', 2, 58, 'tree'), ('thong', 'tn', 3, 64, 'tree'),
    ('lieu', 'tn', 4, 60, 'tree'), ('truc', 'tn', 5, 58, 'tree'),
    ('bui', 'tn', 6, 16, 'small'), ('hoa-vang', 'tn', 7, 13, 'small'), ('hoa-hong', 'tn', 8, 13, 'small'), ('co-cao', 'tn', 9, 15, 'small'),
    ('hoa-trang', 'tn', 10, 12, 'small'), ('duong-xi', 'tn', 11, 13, 'small'), ('qua-do', 'tn', 12, 13, 'small'), ('mam', 'tn', 13, 11, 'small'),
    ('co-nho', 'tn', 14, 8, 'small'), ('nam', 'tn', 15, 11, 'small'),
    ('da-to', 'tn', 16, 32, 'rock'), ('da-cao', 'tn', 17, 34, 'rock'), ('da-vua', 'tn', 18, 22, 'rock'), ('da-nho', 'tn', 19, 17, 'rock'),
    ('da-doi', 'tn', 20, 17, 'rock'), ('soi', 'tn', 21, 7, 'small'),
    ('ao-sen', 'tn', 22, 30, 'big'), ('ao', 'tn', 23, 26, 'big'), ('thac', 'tn', 24, 54, 'big'), ('soi-2', 'tn', 25, 7, 'small'),
    ('khuc-go', 'tn', 26, 15, 'rock'), ('khuc-go-rong', 'tn', 27, 15, 'rock'), ('dong-go', 'tn', 28, 18, 'rock'), ('cui', 'tn', 29, 10, 'small'),
    ('goc-cay', 'tn', 30, 20, 'rock'), ('goc-cay-reu', 'tn', 31, 20, 'rock'), ('van-go', 'tn', 32, 9, 'small'),
    ('cui-2', 'tn', 33, 10, 'small'), ('da-vun', 'tn', 34, 8, 'small'), ('cui-da', 'tn', 35, 11, 'small'),
    ('tuong-da', 'tn', 36, 34, 'rock'), ('cot-da', 'tn', 37, 36, 'rock'), ('da-vun-2', 'tn', 38, 16, 'rock'), ('da-vun-3', 'tn', 39, 14, 'rock'),
    ('nha-tranh', 'tn', 40, 64, 'big'), ('lan-tre', 'tn', 41, 50, 'big'), ('rom', 'tn', 42, 38, 'big'), ('hang-rao', 'tn', 43, 18, 'rock'),
    ('bien-go', 'tn', 45, 24, 'rock'), ('gieng', 'tn', 46, 28, 'big'), ('vo-sanh', 'tn', 47, 16, 'rock'), ('hop-go', 'tn', 48, 20, 'rock'),
    ('den-treo', 'tn', 49, 30, 'rock'), ('lua-trai', 'tn', 50, 26, 'big'), ('co-cum', 'tn', 51, 13, 'small'), ('bui-reu', 'tn', 52, 12, 'small'),
    ('xe-go', 'tn', 53, 24, 'big'), ('thung', 'tn', 54, 16, 'rock'),
    # --- phế tích (2 tấm, 2 bản vẽ khác nhau của cùng bộ) ---
    *[(f'nha-hoang-{i}{v}', s, k, 80, 'big') for v, s in (('', 'pt1'), ('b', 'pt2')) for i, k in ((1, 0), (2, 1), (3, 2), (4, 4), (5, 5))],
    ('dinh', 'pt1', 3, 86, 'big'), ('dinh-b', 'pt2', 3, 86, 'big'), ('cong-nho', 'pt1', 6, 70, 'big'), ('cong-nho-b', 'pt2', 6, 70, 'big'),
    ('cong-tuong', 'pt1', 7, 70, 'big'), ('cong-tuong-b', 'pt2', 7, 70, 'big'), ('xe-hong', 'pt1', 9, 28, 'big'), ('xe-hong-b', 'pt2', 9, 28, 'big'),
    ('tuong-pha', 'pt1', 10, 40, 'big'), ('tuong-pha-b', 'pt2', 10, 40, 'big'), ('cay-kho', 'pt1', 11, 56, 'tree'), ('cay-kho-b', 'pt2', 11, 56, 'tree'),
    ('den-da', 'pt1', 12, 34, 'rock'), ('den-da-b', 'pt2', 12, 34, 'rock'),
    ('cay-kho-den', 'pt1', 11, 56, 'tree', 'den'), ('cay-kho-tim', 'pt2', 11, 56, 'tree', 'tim'),
    # --- đền miếu cổ ---
    ('cong-mai', 'dm', 0, 76, 'big'), ('cong-cot', 'dm', 1, 66, 'big'), ('cong-gay', 'dm', 2, 66, 'big'), ('dai-tron', 'dm', 3, 70, 'big'),
    ('tuong-ngoi', 'dm', 4, 52, 'big'), ('tuong-dung', 'dm', 5, 58, 'big'), ('dau-phat', 'dm', 6, 44, 'big'), ('kiem-dai', 'dm', 7, 62, 'big'),
    ('trang-khuyet', 'dm', 8, 54, 'big'), ('am-duong', 'dm', 9, 50, 'big'), ('bia-da', 'dm', 10, 40, 'rock'), ('dinh-nho', 'dm', 11, 56, 'big'),
    ('dinh-tram', 'dm', 12, 28, 'rock'), ('ban-te', 'dm', 13, 28, 'rock'), ('cot-co', 'dm', 14, 44, 'rock'), ('den-da-2', 'dm', 15, 38, 'rock'),
    ('te-dan-tinh', 'dm', 16, 56, 'big'), ('dai-cot', 'dm', 17, 50, 'big'), ('bac-thang', 'dm', 18, 28, 'rock'), ('cot-do', 'dm', 19, 20, 'rock'),
    ('cot-gay', 'dm', 20, 34, 'rock'), ('cot-doi', 'dm', 21, 34, 'rock'), ('nen-da', 'dm', 22, 20, 'small'), ('dong-da', 'dm', 23, 26, 'rock'),
    ('da-ngon', 'dm', 24, 36, 'rock'), ('tuong-mieu', 'dm', 25, 30, 'rock'),
    ('da-to-tim', 'tn', 16, 32, 'rock', 'tim'), ('da-cao-den', 'tn', 17, 34, 'rock', 'den'), ('thong-tuyet', 'tn', 3, 64, 'tree', 'tuyet'),
]
SHEETS = {'tn': ('thien-nhien', 2), 'pt1': ('phe-tich-1', 6), 'pt2': ('phe-tich-2', 6), 'dm': ('den-mieu', 6)}

# Bộ trang trí theo loại đất (data/terrain.json → id)
SETS = {
    'co': {'tree': ['cay-xanh', 'cay-xanh', 'anh-dao', 'lieu', 'truc'],
           'rock': ['da-vua', 'da-nho', 'da-doi', 'goc-cay', 'goc-cay-reu', 'khuc-go', 'khuc-go-rong', 'dong-go', 'hang-rao', 'thung', 'vo-sanh', 'hop-go'],
           'small': ['bui', 'hoa-vang', 'hoa-hong', 'co-cao', 'hoa-trang', 'duong-xi', 'qua-do', 'mam', 'co-nho', 'nam', 'co-cum', 'bui-reu', 'cui', 'van-go'],
           'big': ['nha-tranh', 'lan-tre', 'rom', 'gieng', 'lua-trai', 'xe-go', 'ao-sen', 'ao', 'thac', 'bien-go']},
    'cat': {'tree': ['cay-vang', 'cay-kho', 'cay-kho-b'], 'rock': ['da-to', 'da-cao', 'da-vua', 'goc-cay', 'khuc-go', 'tuong-da', 'cot-da', 'da-vun-2'],
            'small': ['co-cao', 'co-nho', 'cui', 'cui-2', 'soi', 'da-vun'],
            'big': ['nha-hoang-1', 'nha-hoang-2', 'nha-hoang-3', 'nha-hoang-1b', 'nha-hoang-4b', 'cong-nho', 'cong-tuong-b', 'xe-hong', 'tuong-pha']},
    'da_lat': {'tree': ['cay-vang', 'cay-kho'], 'rock': ['cot-gay', 'cot-doi', 'da-ngon', 'dong-da', 'bia-da', 'den-da', 'bac-thang', 'tuong-mieu'],
               'small': ['nen-da', 'co-nho', 'soi-2'], 'big': ['cong-mai', 'cong-cot', 'cong-gay', 'dinh-nho', 'dai-cot', 'tuong-pha-b']},
    'soi': {'tree': ['thong', 'cay-kho'], 'rock': ['da-to', 'da-cao', 'da-vua', 'da-ngon', 'cot-gay', 'dong-da', 'den-da-b', 'tuong-da'],
            'small': ['co-nho', 'soi', 'soi-2', 'da-vun', 'nen-da'],
            'big': ['nha-hoang-5', 'nha-hoang-2b', 'nha-hoang-3b', 'dinh', 'cong-nho-b', 'cong-tuong', 'tuong-pha', 'xe-hong-b']},
    'tuyet': {'tree': ['thong-tuyet', 'thong'], 'rock': ['da-to', 'da-cao', 'da-vua', 'cot-gay', 'den-da-2', 'bia-da'], 'small': ['soi', 'soi-2', 'da-vun'],
              'big': ['tuong-ngoi', 'tuong-dung', 'dinh-nho', 'dinh-b', 'nha-hoang-5b', 'dai-tron']},
    'dat_den': {'tree': ['cay-kho', 'cay-kho-b'], 'rock': ['da-cao-den', 'da-ngon', 'dong-da', 'cot-do', 'cot-gay', 'tuong-mieu'], 'small': ['soi', 'da-vun', 'cui'],
                'big': ['kiem-dai', 'cong-gay', 'nha-hoang-3', 'tuong-pha-b', 'dinh-tram']},
    'dung_nham': {'rock': ['da-ngon', 'da-cao-den'], 'small': ['soi']},
    'hac_thach': {'tree': ['cay-kho-den'], 'rock': ['da-cao-den', 'da-ngon', 'dong-da', 'cot-doi', 'dinh-tram', 'ban-te', 'cot-co'], 'small': ['nen-da', 'soi', 'da-vun'],
                  'big': ['dau-phat', 'am-duong', 'trang-khuyet', 'kiem-dai', 'dai-cot']},
    'tu_vuc': {'tree': ['cay-kho-tim'], 'rock': ['da-to-tim', 'cot-doi', 'cot-gay', 'da-ngon', 'den-da-2'], 'small': ['nen-da', 'soi-2'],
               'big': ['te-dan-tinh', 'dai-tron', 'dai-cot', 'am-duong', 'cong-cot']},
}


def tint(im, how):
    a = np.asarray(im).astype(float)
    rgb, al = a[..., :3], a[..., 3:]
    if how == 'den': rgb = rgb * np.array([0.55, 0.55, 0.68])
    elif how == 'tim':
        g = rgb.mean(axis=2, keepdims=True); rgb = g * np.array([1.05, 0.62, 1.25]) + (rgb - g) * 0.3 + np.array([10, 0, 22])
    elif how == 'tuyet':  # phủ tuyết nhẹ phía trên tán
        h = rgb.shape[0]; w = (np.linspace(1, 0, h) ** 2 * 0.45)[:, None, None]; rgb = rgb * (1 - w) + 235 * w
    return Image.fromarray(np.concatenate([rgb.clip(0, 255), al], axis=2).astype(np.uint8), 'RGBA')


def main():
    cache = {}
    ims = []
    for spec in ITEMS:
        key, sh, idx, h, kind = spec[:5]
        how = spec[5] if len(spec) > 5 else None
        if sh not in cache:
            name, merge = SHEETS[sh]
            cache[sh] = objects(SRC / f'{name}.webp', merge=merge)
        im = cache[sh][idx][1]
        if how: im = tint(im, how)
        k = min(1, (h * 2) / im.height)
        ims.append((key, im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS), h, kind))
    W, x, y, row_h, pos = 2048, 0, 0, 0, []
    for key, im, h, kind in sorted(ims, key=lambda t: -t[1].height):
        if x + im.width > W: x, y, row_h = 0, y + row_h + 2, 0
        pos.append((key, im, h, kind, x, y)); x += im.width + 2; row_h = max(row_h, im.height)
    atlas = Image.new('RGBA', (W, y + row_h))
    items = {}
    for key, im, h, kind, px, py in pos:
        atlas.alpha_composite(im, (px, py))
        w = round(im.width / im.height * h)
        r = 4 if kind == 'tree' else round(w * 0.32) if kind == 'rock' else round(w * 0.36) if kind == 'big' else 0
        items[key] = {'x': px, 'y': py, 'sw': im.width, 'sh': im.height, 'w': w, 'h': h, 'kind': kind, 'r': r}
    atlas.save('assets/decor/atlas.webp', quality=90, method=6)
    sp = json.loads(Path('data/art/sprites.json').read_text())
    sp['decor'] = {'src': 'assets/decor/atlas.webp', 'items': items, '_ghi_chu': 'Sinh bằng tools/decor_v2.py (tấm chủ dự án 23/10) — không sửa tay.'}
    Path('data/art/sprites.json').write_text(json.dumps(sp, ensure_ascii=False) + '\n')
    t = json.loads(Path('data/terrain.json').read_text())
    for ty in t['types']:
        if ty['id'] in SETS:
            ty['decor'] = {k: v for k, v in SETS[ty['id']].items()}
            for k, v in ty['decor'].items():
                for n in v:
                    if n not in items: raise SystemExit(f'{ty["id"]}: thiếu {n}')
    r = t['decor_rules']
    r.update({'big_grid': 9, 'big_chance': 0.2, 'big_clear': [3, 2], 'big_road_margin': 3,
              '_ghi_chu_big': 'Công trình (big): chỉ mọc ở tâm lưới big_grid ô, xác suất big_chance; dọn cây đá trong ±big_clear ô quanh nó; cách đường big_road_margin ô.'})
    Path('data/terrain.json').write_text(json.dumps(t, ensure_ascii=False, indent=2) + '\n')
    print(len(items), 'món, atlas', atlas.size)
    if len(sys.argv) > 1:
        prev = Image.new('RGBA', (1600, 1200), (74, 92, 60, 255))
        X = Y = RH = 0
        for key, im, h, kind in ims:
            t2 = im.copy(); t2.thumbnail((150, 120))
            if X + 160 > 1600: X, Y, RH = 0, Y + RH + 4, 0
            prev.alpha_composite(t2, (X, Y)); X += 160; RH = max(RH, t2.height)
        prev.save(sys.argv[1])


if __name__ == '__main__':
    main()
