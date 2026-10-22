"""Bộ trang bị 6 hệ bản 2 (chủ dự án 23/10/2026): mặt nạ, nhẫn, dây chuyền, linh thú (2 hàng).

Nguồn: assets/items/_source/trang-bi-6he.webp — nền hồng, 6 cột = 6 hệ (Kim, Ám, Thủy, Hỏa, Mộc, Thổ), 5 hàng:
mặt nạ, nhẫn, dây chuyền, linh thú nhỏ, linh thú lớn. Các hình chạm nhau → cắt theo đường cắt đo sẵn (hàng điểm ảnh
thưa nhất gần mốc), trong mỗi ô giữ các mảnh ≥ 3% mảnh lớn nhất (đá vụn, tia lửa quanh hình).
Ra: assets/equipment/<ô>/art.<loại>.he.<n>.webp + thêm vào manifest.json của ô (thay bản cũ cùng mã),
rồi chạy tools/art_pack.py để ghi data/equipment/art.json. Vật phẩm Kho: data/items/items.json (item.<loại>.he.<n>).
Dùng: python3 -I tools/equip_6he.py
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

sys.path.insert(0, str(Path(__file__).parent))
from monster_sheets import key  # noqa: E402

SRC = Path('assets/items/_source/trang-bi-6he.webp')
EQ = Path('assets/equipment')
ROW_GUESS = [195, 370, 560, 758]  # mốc đường cắt hàng
# hàng → (ô, tiền tố mã hình, tiền tố vật phẩm, số bắt đầu)
ROWS = [('mat-na', 'mask', 0), ('nhan', 'ring', 0), ('day-chuyen', 'necklace', 0), ('linh-thu', 'pet', 0), ('linh-thu', 'pet', 6)]
HE = ['Kim', 'Ám', 'Thủy', 'Hỏa', 'Mộc', 'Thổ']
PRE = ['Kim Quang', 'U Minh', 'Thương Hải', 'Xích Diệm', 'Thanh Mộc', 'Hậu Thổ']
NAME = {'mask': ['Diện cụ'] * 6, 'ring': ['Giới chỉ'] * 6, 'necklace': ['Hạng liên'] * 6,
        'pet': ['Thánh Sư', 'Ma Lang', 'Thủy Long', 'Hỏa Sư', 'Diệp Long', 'Thạch Vương',
                'Thiên Hồ', 'Ma Ưng', 'Lam Long', 'Viêm Long', 'Thanh Long', 'Nham Ma']}


def cut_at(profile, guess, span):
    r = range(max(1, guess - span), min(len(profile) - 1, guess + span))
    return min(r, key=lambda i: profile[i])


def main():
    rgb, alpha = key(np.asarray(Image.open(SRC).convert('RGB')))
    solid = alpha > 60
    H, W = solid.shape
    ys = [0] + [cut_at(solid.sum(1), g, 45) for g in ROW_GUESS] + [H]
    items, mans = [], {}
    for r, (slot, kind, start) in enumerate(ROWS):
        band = solid[ys[r]:ys[r + 1]]
        xs = [0] + [cut_at(band.sum(0), round(W * c / 6), 40) for c in range(1, 6)] + [W]
        for c in range(6):
            X0, X1, Y0, Y1 = xs[c], xs[c + 1], ys[r], ys[r + 1]
            m = solid[Y0:Y1, X0:X1]
            lab, n = ndimage.label(ndimage.binary_dilation(m, iterations=2))
            sizes = ndimage.sum(m, lab, range(1, n + 1))
            keep = [i + 1 for i, s in enumerate(sizes) if s >= 0.03 * sizes.max()]
            mk = np.isin(lab, keep) & m
            yy, xx = np.nonzero(mk)
            a = np.where(mk, alpha[Y0:Y1, X0:X1], 0)[yy.min():yy.max() + 1, xx.min():xx.max() + 1].astype(np.uint8)
            im = Image.fromarray(np.dstack([rgb[Y0:Y1, X0:X1][yy.min():yy.max() + 1, xx.min():xx.max() + 1], a]), 'RGBA')
            n_ = start + c + 1
            aid = f'art.{kind}.he.{n_}'
            (EQ / slot).mkdir(parents=True, exist_ok=True)
            im.save(EQ / slot / f'{aid}.webp', 'WEBP', quality=90, method=6)
            mans.setdefault(slot, []).append({'id': aid, 'file': f'{aid}.webp', 'w': im.width, 'h': im.height,
                                              'anchor': [im.width / 2, im.height / 2 if kind != 'pet' else im.height]})
            items.append({'id': f'item.{kind}.he.{n_}', 'name': f'{PRE[c]} {NAME[kind][start + c]}', 'cat': 'trang-bi', 'slot': slot,
                          'art': aid, 'set': f'he.{c + 1}', 'he': HE[c]})
    for slot, new in mans.items():
        p = EQ / slot / 'manifest.json'
        old = json.loads(p.read_text()) if p.exists() else []
        ids = {x['id'] for x in new}
        p.write_text(json.dumps([x for x in old if x['id'] not in ids] + new, ensure_ascii=False, indent=1))
    ip = Path('data/items/items.json')
    d = json.loads(ip.read_text())
    ids = {x['id'] for x in items}
    d['items'] = [x for x in d['items'] if x['id'] not in ids] + items
    ip.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
    subprocess.run([sys.executable, '-I', 'tools/art_pack.py'], check=True)
    print(len(items), 'món')


if __name__ == '__main__':
    main()
