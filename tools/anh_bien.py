"""MỞ ANH BIẾN (chủ dự án 23/10/2026 23h28) — các bảng số theo tầng mới + đan max tu vi theo đại cảnh giới + Cửu Thiên Bí Cảnh.
Chạy SAU tools/gen_balance.py (tầng ab_so/ab_trung/ab_hau đã có trong gameplay.json → player.stages).
  - gameplay.json → late_realm (luật giữ chân), daily_linh_khi.cap Anh Biến = DAILY_PCT vạch tầng, pills (Viên Mãn Đan theo đại cảnh giới)
  - lifespan.json → gain Anh Biến;  quests.json → routine.table Anh Biến (≤ QUEST_PCT vạch / lượt)
  - items/premium.json + shop.json: 5 loại Viên Mãn Đan (Luyện Khí → Hóa Thần), giá Tiên ngọc khác nhau; bỏ Viên Mãn Đan cũ khỏi shop
  - build/bi-canh.json → extra: Cửu Thiên Bí Cảnh (1 lượt/ngày, qua hết = 1 món Thiên hệ ngẫu nhiên)
Không ghi tỷ lệ ra chữ người chơi thấy. Chạy: python3 -I tools/anh_bien.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = lambda p: json.loads((ROOT / p).read_text())
def W(p, d, ind=1): (ROOT / p).write_text(json.dumps(d, ensure_ascii=False, indent=ind) + '\n')
def ind_of(p): return 2 if (ROOT / p).read_text().startswith('{\n  "') else 1

DAILY_PCT, QUEST_PCT, DEATH_PCT, DROP_KEEP = 0.02, 0.01, 0.03, 0.5
AB = ['ab_so', 'ab_trung', 'ab_hau']
# Viên Mãn Đan: (mã đại cảnh giới, tên, giá Tiên ngọc, giới hạn/ngày) — Anh Biến KHÔNG có (để giữ chân)
VM = [('lk', 'Luyện Khí', 5, 5), ('tc', 'Trúc Cơ', 20, 4), ('kd', 'Kết Đan', 45, 3), ('na', 'Nguyên Anh', 90, 3), ('ht', 'Hóa Thần', 180, 2)]

gp = J('data/gameplay.json'); need = {s['id']: s['exp_need'] for s in gp['player']['stages']}
gp['late_realm'] = {'prefixes': ['ab'], 'quest_exp_max': QUEST_PCT, 'death_loss': DEATH_PCT, 'drop_keep': DROP_KEEP,
                    '_ghi_chu': 'Chủ dự án 23/10 23h28 (giữ chân ở Anh Biến): tu vi/ngày (quái + nhiệm vụ) tiến sát daily_linh_khi.cap = 2% vạch, giảm dần; '
                                '1 lượt nhiệm vụ ≤ 1% vạch; chết mất 3% vạch, không đủ → về 0 + trọng thương, chết khi đang trọng thương → thụt 1 tầng (giữ 50% vạch tầng dưới). '
                                'Code: src/game/late-realm.js. Sinh bằng tools/anh_bien.py.'}
for s in AB: gp['daily_linh_khi']['cap'][s] = round(need[s] * DAILY_PCT)
P = gp['pills']
P['item.dan.tu-vi.001']['realm_max'] = 'ht'; P['item.dan.vien-man.001']['realm_max'] = 'ht'  # đan cũ: tới Hóa Thần
for code, _n, _p, _l in VM: P[f'item.dan.vien-man.{code}'] = {'exp_fill': True, 'realm': code}
W('data/gameplay.json', gp, ind_of('data/gameplay.json'))

life = J('data/lifespan.json'); life['gain'].update({'ab_so': 160, 'ab_trung': 80, 'ab_hau': 80}); W('data/lifespan.json', life, ind_of('data/lifespan.json'))

q = J('data/quests/quests.json'); T = q['routine']['table']; h = T['ht_hau']
for s in AB:  # [tu vi, Linh thạch, Vàng]; tu vi theo vạch tầng (≤ 1%), tiền ×1,5 so với Hóa Thần Hậu kỳ
    T[s] = {'daily': [round(need[s] * QUEST_PCT * .5), round(h['daily'][1] * 1.5), round(h['daily'][2] * 1.5)],
            'weekly': [round(need[s] * QUEST_PCT), round(h['weekly'][1] * 1.5), round(h['weekly'][2] * 1.5)],
            'chapter': [round(need[s] * QUEST_PCT), round(h['chapter'][1] * 1.5), round(h['chapter'][2] * 1.5)]}
W('data/quests/quests.json', q, ind_of('data/quests/quests.json'))

pr = J('data/items/premium.json'); ids = {f'item.dan.vien-man.{c}' for c, *_ in VM}
pr['items'] = [x for x in pr['items'] if x['id'] not in ids]
for x in pr['items']:
    if x['id'] == 'item.dan.vien-man.001': x['use'] = 'Lấp đầy vạch tu vi tầng hiện tại (tới Hóa Thần; đại cảnh giới mới vẫn phải bấm Đột phá). Bản cũ — Vạn Bảo Lâu nay bán theo từng cảnh giới.'
    if x['id'] == 'item.dan.tu-vi.001': x['use'] = 'Tăng tu vi tầng hiện tại (tới Hóa Thần)'
for c, n, _p, _l in VM:
    pr['items'].append({'id': f'item.dan.vien-man.{c}', 'name': f'Viên Mãn Đan · {n}', 'cat': 'linh-dan', 'premium': True,
                        'use': f'Lấp đầy vạch tu vi tầng hiện tại — chỉ dùng khi đang ở {n} (đại cảnh giới mới vẫn phải bấm Đột phá)'})
W('data/items/premium.json', pr, ind_of('data/items/premium.json'))

shop = J('data/shop.json'); st = shop['stock']
at = next(k for k, s in enumerate(st) if s['id'] == 'item.dan.vien-man.001' or s['id'] in ids)  # chạy lại: chèn đúng chỗ cũ
st[:] = [s for s in st if s['id'] not in ids and s['id'] != 'item.dan.vien-man.001']
for k, (c, n, p, l) in enumerate(VM): st.insert(at + k, {'id': f'item.dan.vien-man.{c}', 'price': p, 'currency': 'tien-ngoc', 'daily_limit': l})
W('data/shop.json', shop, ind_of('data/shop.json'))

bc = J('data/build/bi-canh.json')
bc['extra'] = [{'id': 'thien', 'name': 'Cửu Thiên Bí Cảnh', 'state_key': 'biCanhThien', 'tries_per_day': 1, 'hp_per_wave': 0.25, 'base_count': 8, 'per_wave': 3,
                'desc': 'Mỗi ngày 1 lượt. Đứng ngoài thành rồi bấm Bắt đầu: 10 đợt quái cảnh giới của bạn, mạnh hơn Huyết Sát. Vượt hết 10 đợt nhận 1 món trang bị Thiên hệ ngẫu nhiên (Quang · Lôi · Băng · Phong · Hư · Thời) còn thiếu — đủ cả thì đổi Linh thạch.',
                'reward': {'stone_per_wave': 400, 'gold_per_wave': 1000, 'card_at': [], 'card_min_tier': [], 'items_per_3': [], 'full_clear': [],
                           'treasure_blank_at': 99, 'set_item_at': 99, 'thien_item': 1}}]
bc['_ghi_chu_extra'] = 'Chủ dự án 23/10 23h28: thêm Cửu Thiên Bí Cảnh — trường thiếu lấy theo Huyết Sát (bicanh.js). Sinh bằng tools/anh_bien.py.'
W('data/build/bi-canh.json', bc, ind_of('data/build/bi-canh.json'))
print('AB cap/ngày:', {s: gp['daily_linh_khi']['cap'][s] for s in AB})
