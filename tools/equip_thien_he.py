"""6 THIÊN HỆ (chủ dự án 23/10/2026 21h): Quang · Lôi · Băng · Phong · Hư · Thời — mỗi hệ đủ 8 món như ngũ hành.

Nguồn: assets/equipment/_source/thien-he/ — hình đã cắt cho Tủ Đồ Tu Chân (<loại>.7–12.webp, meta.json) và kết quả
chủ dự án xếp + lưu trên Tủ Đồ (presets.json: vùng tay/giày/cổ, thông số thân, vũ khí, cánh, pháp tướng, mặt nạ, hồn thú).
Tấm có thú ở hàng cuối của tấm mặt nạ / nhẫn / dây chuyền = HỒN THÚ (ô linh thú); thú ở tấm nhân vật = PHÁP TƯỚNG.
Ra:
  - assets/equipment/<ô>/art.<loại>.he.7–12.webp (linh thú: art.pet.he.13–18 vì 7–12 đã là linh thú lớn ngũ hành)
  - data/equipment/he6.json: hình + bộ he.7–12 (rig vẽ áo / kiếm / cánh / pháp tướng theo thông số đã lưu)
  - manifest mặt nạ / nhẫn / dây chuyền / linh thú → tools/art_pack.py → data/equipment/art.json
  - data/items/items.json: 48 món item.<loại>.he.N (set he.7–12, he = tên hệ)
  - data/build/dao-van.json: thêm 6 hệ vào he_order + Đạo Vận + Hợp Nhất (số liệu soi theo hệ ngũ hành tương ứng)
Chạy: python3 -I tools/equip_thien_he.py
"""
import json, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'assets/equipment/_source/thien-he'
EQ = ROOT / 'assets/equipment'
HE = ['Quang', 'Lôi', 'Băng', 'Phong', 'Hư', 'Thời']
PRE = ['Thánh Quang', 'Lôi Đình', 'Hàn Băng', 'Phong Linh', 'Hư Không', 'Thời Không']
# hệ ngũ hành làm khuôn số liệu Đạo Vận / Hợp Nhất (cùng sức mạnh, đổi tên + màu)
TWIN = {'Quang': 'Kim', 'Lôi': 'Hỏa', 'Băng': 'Thủy', 'Phong': 'Mộc', 'Hư': 'Ám', 'Thời': 'Thổ'}
DV_NAME = {'Quang': 'Thánh Quang Thiên Trận', 'Lôi': 'Cửu Tiêu Lôi Đình', 'Băng': 'Hàn Băng Vạn Lý', 'Phong': 'Phong Linh Cửu Chuyển',
           'Hư': 'Hư Không Phệ Diệt', 'Thời': 'Thời Không Luân Hồi'}
HN_NAME = {'Quang': 'Thánh Quang Phổ Chiếu', 'Lôi': 'Lôi Đình Diệt Thế', 'Băng': 'Băng Phong Vạn Cổ', 'Phong': 'Phong Quyển Tàn Vân',
           'Hư': 'Hư Không Quy Nhất', 'Thời': 'Thời Quang Đảo Lưu'}
COLOR = {'Quang': '#fff1b0', 'Lôi': '#b98cff', 'Băng': '#8fd8ff', 'Phong': '#9ff0c8', 'Hư': '#7a5cff', 'Thời': '#e6c98a'}
PET = ['Thánh Quang Kỳ Lân', 'Lôi Đình Bạch Lang', 'Hàn Băng Long', 'Phong Linh Hồ', 'Hư Không Ma Long', 'Thời Không Kỳ Thú']
KIND = {  # loại trong Tủ → (ô, tiền tố hình, tên món, bù số hình)
    'char': ('trang-phuc', 'outfit', 'Đạo bào', 0), 'weapon': ('vu-khi', 'weapon', 'Pháp trượng', 0), 'wing': ('canh', 'wing', 'Linh dực', 0),
    'avatar': ('phap-tuong', 'avatar', 'Pháp tướng', 0), 'mask': ('mat-na', 'mask', 'Diện cụ', 0), 'ring': ('nhan', 'ring', 'Giới chỉ', 0),
    'necklace': ('day-chuyen', 'necklace', 'Hạng liên', 0), 'pet': ('linh-thu', 'pet', None, 6)}
RIG = {'char': 'outfit', 'weapon': 'weapon', 'wing': 'wing', 'avatar': 'avatar'}


def main():
    meta = json.loads((SRC / 'meta.json').read_text()); pre = json.loads((SRC / 'presets.json').read_text())
    he6p = ROOT / 'data/equipment/he6.json'; he6 = json.loads(he6p.read_text())
    items, mans = [], {}
    for kind, (slot, pre_id, nm, off) in KIND.items():
        for c, m in enumerate(meta[kind]):
            n = 7 + c; aid = f'art.{pre_id}.he.{n + off}'; f = f'{aid}.webp'
            (EQ / slot).mkdir(parents=True, exist_ok=True); shutil.copy(SRC / f'{kind}.{n}.webp', EQ / slot / f)
            if kind in RIG:  # rig đọc he6.json
                a = {'id': aid, 'file': f'assets/equipment/{slot}/{f}', 'w': m['w'], 'h': m['h']}
                if kind == 'char': a['hem'] = m['hem']
                if kind == 'weapon': a['grip'] = m['grip']; a['angle'] = m['angle']
                he6['art'][aid] = a
            else:
                mans.setdefault(slot, []).append({'id': aid, 'file': f, 'w': m['w'], 'h': m['h'], 'anchor': [m['w'] / 2, m['h'] if kind == 'pet' else m['h'] / 2]})
            name = f'{PRE[c]} {nm}' if nm else PET[c]
            items.append({'id': f'item.{pre_id}.he.{n + off}', 'name': name, 'cat': 'trang-bi', 'slot': slot, 'art': aid, 'set': f'he.{n}', 'he': HE[c], 'thien': True})
    # bộ he.7–12 theo kết quả chủ dự án lưu trên Tủ Đồ
    sets = [s for s in he6['sets'] if s['id'] not in {f'he.{n}' for n in range(7, 13)}]
    for c in range(6):
        n = 7 + c; p = pre[f'char.{n}']
        sets.append({'id': f'he.{n}', 'name': f'Bộ {PRE[c]}', 'he': HE[c], 'thien': True,
                     **{k: f'art.{k}.he.{n}' for k in ['outfit', 'weapon', 'wing', 'avatar']},
                     'region': p['region'], 'region_shared': p['region_tim'] if p.get('share') else None, 'shared_from': 'art.outfit.he.2' if p.get('share') else None,
                     'toggles': p['toggles'], 'params': p['params'], 'saved_at': p['savedAt']})
    he6['sets'] = sets
    he6['_ghi_chu_thien_he'] = 'he.7–12 = 6 Thiên hệ (chủ dự án 23/10 21h), sinh bằng tools/equip_thien_he.py từ kết quả lưu trên Tủ Đồ Tu Chân.'
    he6p.write_text(json.dumps(he6, ensure_ascii=False, indent=1) + '\n')
    for slot, new in mans.items():
        p = EQ / slot / 'manifest.json'; old = json.loads(p.read_text()) if p.exists() else []
        ids = {x['id'] for x in new}; p.write_text(json.dumps([x for x in old if x['id'] not in ids] + new, ensure_ascii=False, indent=1))
    ip = ROOT / 'data/items/items.json'; d = json.loads(ip.read_text()); ids = {x['id'] for x in items}
    d['items'] = [x for x in d['items'] if x['id'] not in ids] + items
    ip.write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
    # Đạo Vận + Hợp Nhất
    dp = ROOT / 'data/build/dao-van.json'; dv = json.loads(dp.read_text())
    dv['he_order'] = [h for h in dv['he_order'] if h not in HE][:6] + HE
    for h in HE:
        t = json.loads(json.dumps(dv['he'][TWIN[h]])); t['name'] = DV_NAME[h]; t['color'] = COLOR[h]; t['thien'] = True; t['twin'] = TWIN[h]
        dv['he'][h] = t
        hn = json.loads(json.dumps(dv['hop_nhat']['he'][TWIN[h]])); hn['name'] = HN_NAME[h]; hn['twin'] = TWIN[h]; dv['hop_nhat']['he'][h] = hn  # twin: pháp bảo hệ ngũ hành tương ứng được tính
    dv['_ghi_chu_thien_he'] = 'Chủ dự án 23/10 21h: thêm 6 Thiên hệ (Quang, Lôi, Băng, Phong, Hư, Thời). Số liệu Đạo Vận / Hợp Nhất soi theo hệ ngũ hành "twin" (cùng sức mạnh, khác tên + màu) — chỉnh riêng sau. Đồ Thiên hệ chỉ rơi từ Âm Hư (set_drop.thien_from).'
    dv['set_drop']['thien_from'] = ['void']
    dv['set_drop']['_thien'] = 'Đồ Thiên hệ (items.json → thien) chỉ rơi từ các nguồn trong thien_from; quái thường / tinh anh / thủ lĩnh chỉ rơi đồ ngũ hành.'
    dp.write_text(json.dumps(dv, ensure_ascii=False, indent=1) + '\n')
    subprocess.run([sys.executable, '-I', str(ROOT / 'tools/art_pack.py')], check=True, cwd=ROOT)
    print(len(items), 'món Thiên hệ')


if __name__ == '__main__':
    main()
