"""Sinh bảng cảnh giới + chỉ số quái/người chơi theo luật chủ dự án (23/10/2026).

Dùng: python3 -I tools/gen_balance.py   (chạy lại được bất cứ lúc nào, ghi đè các phần do nó quản lý)

Luật:
- 7 đại cảnh giới người chơi: Luyện Khí 1–10, Trúc Cơ / Kết Đan / Nguyên Anh / Hóa Thần / Anh Biến / Vấn Đỉnh (Sơ–Trung–Hậu kỳ).
- Âm Hư: cảnh giới thứ 8, CHỈ có boss (5 Âm Hư từ hư vô), mạnh hơn mọi thứ.
- 7 vùng từ tâm ra ngoài: Xanh=LK, Cam=TC, Xám khói=KĐ, Trắng=NA, Xám than=HT, Đen=AB, Tím=VĐ.
- LUẬT CỨNG: boss mạnh nhất của một đại cảnh giới (kể cả lệch ngẫu nhiên) KHÔNG được mạnh hơn quái thường yếu nhất
  ở Sơ kỳ đại cảnh giới kế tiếp — trên từng chỉ số HP / Công / Thủ. tools/check_refs.mjs kiểm lại mỗi lần.

Ghi vào: data/monsters/monsters.json (zones, stage_stats, rank_mul, quái), data/realms.json (realms, power_mul),
data/gameplay.json (player.stages, major_realm_first_stage, gearQ_by_stage, monster.stone_by_stage).
"""
import json
import math
from pathlib import Path

ROOT = Path('.')
def load(p): return json.loads((ROOT / p).read_text())
def save(p, d): (ROOT / p).write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')

# ---------- Cảnh giới ----------
REALMS = [  # id, tên, viết tắt, vùng, mã tầng
    ('luyen-khi', 'Luyện Khí', 'LK', 'xanh', 'lk'),
    ('truc-co', 'Trúc Cơ', 'TC', 'cam', 'tc'),
    ('ket-dan', 'Kết Đan', 'KD', 'xam', 'kd'),
    ('nguyen-anh', 'Nguyên Anh', 'NA', 'trang', 'na'),
    ('hoa-than', 'Hóa Thần', 'HT', 'than', 'ht'),
    ('anh-bien', 'Anh Biến', 'AB', 'den', 'ab'),
    ('van-dinh', 'Vấn Đỉnh', 'VD', 'tim', 'vd'),
]
KY = [('so', 'Sơ kỳ'), ('trung', 'Trung kỳ'), ('hau', 'Hậu kỳ')]
BREAK = {  # đan đột phá + tỷ lệ cơ bản (Lab cho tới HT; AB, VĐ Claude đề xuất)
    'truc-co': (0.85, 'item.dan.truc-co.001'), 'ket-dan': (0.7, 'item.dan.ket-dan.001'),
    'nguyen-anh': (0.5, 'item.dan.nguyen-anh.001'), 'hoa-than': (0.3, 'item.dan.hoa-than.001'),
    'anh-bien': (0.2, 'item.dan.anh-bien.001'), 'van-dinh': (0.12, 'item.dan.van-dinh.001'),
}
UNLOCK = {'luyen-khi': 'danh-thuong', 'truc-co': 'skill.chieu.kiem-khi.001', 'ket-dan': 'skill.khe.linh-thu.001',
          'nguyen-anh': 'skill.than.canh-phong.001', 'hoa-than': 'skill.phap-tuong.thien-thu.001',
          'anh-bien': 'chua-co', 'van-dinh': 'chua-co'}

stages = []  # (id, tên, đại cảnh giới, có phải tầng đầu đại cảnh giới)
for rid, name, short, zone, code in REALMS:
    if code == 'lk':
        for i in range(1, 11): stages.append((f'lk{i}', f'Luyện Khí tầng {i}', rid, False))
    else:
        for j, (k, kn) in enumerate(KY): stages.append((f'{code}_{k}', f'{name} {kn}', rid, j == 0))
AM_HU = ('am_hu', 'Âm Hư')

# ---------- Chỉ số quái thường theo tầng ----------
# Lên 1 tầng trong Luyện Khí / trong một đại cảnh giới / nhảy sang đại cảnh giới mới (Hậu kỳ → Sơ kỳ kế tiếp)
STEP_LK = {'hp': 1.25, 'atk': 1.15, 'def': 1.10}
STEP_IN = {'hp': 1.30, 'atk': 1.18, 'def': 1.12}
JUMP = {'hp': 3.6, 'atk': 1.75, 'def': 1.40}
BASE = {'hp': 110, 'atk': 13, 'def': 8}  # Luyện Khí tầng 1 (giữ như Yêu Hồ Sơ cũ)
RANK_MUL = {'thuong': {'hp': 1, 'atk': 1, 'def': 1}, 'elite': {'hp': 2.2, 'atk': 1.25, 'def': 1.12},
            'boss': {'hp': 3.0, 'atk': 1.5, 'def': 1.25}}
HUVO_MUL = {'hp': 1.2, 'atk': 1.65, 'def': 1.35}  # Âm Hư: so với "quái thường" cảnh giới Âm Hư (đã nhảy 1 bậc trên Vấn Đỉnh Hậu kỳ)
VARIANCE = 0.05  # quái sinh ra lệch ngẫu nhiên ±5%

stage_stats = {}
cur = dict(BASE)
prev_realm = None
for sid, sname, rid, first in stages:
    if prev_realm is not None:
        step = JUMP if rid != prev_realm else (STEP_LK if rid == 'luyen-khi' else STEP_IN)
        cur = {k: cur[k] * step[k] for k in cur}
    stage_stats[sid] = {k: round(v) for k, v in cur.items()}
    prev_realm = rid
cur = {k: cur[k] * JUMP[k] for k in cur}
stage_stats['am_hu'] = {k: round(v) for k, v in cur.items()}

# ---------- Người chơi: tính ngược từ quái thường cùng tầng ----------
DEF_K, MIN_RATIO = 150, 0.05
def red(d, pen=0.025): return d / (d + DEF_K) * (1 - pen)
HITS_TO_KILL, HITS_TO_DIE = 4, 18
player = []
for i, (sid, sname, rid, first) in enumerate(stages):
    m = stage_stats[sid]
    linh = m['hp'] / (HITS_TO_KILL * 0.825 * (1 - red(m['def'])))
    pdef = m['def'] * 0.85
    hp = HITS_TO_DIE * m['atk'] * 0.8 * (1 - red(pdef, 0))
    kills = 10 + 3 * i
    player.append({'id': sid, 'name': sname, 'hp': round(hp), 'linh': round(linh), 'def': round(pdef),
                   'mp': 100 + 15 * i, 'exp_need': round(m['hp'] / 10 * kills)})

# ---------- Ghi realms.json ----------
rj = load('data/realms.json')
rj['_ghi_chu_rieng'] = 'Cảnh giới chốt 23/10/2026 (chủ dự án): 7 đại cảnh giới người chơi + Âm Hư chỉ có boss. Sinh bằng tools/gen_balance.py.'
rj['realms'] = []
for rid, name, short, zone, code in REALMS:
    r = {'id': f'realm.{rid}', 'name': name, 'short': short,
         'stages': [f'lk{i}' for i in range(1, 11)] if code == 'lk' else [k for k, _ in KY],
         'unlock_skill': UNLOCK[rid], 'zone': zone}
    if rid in BREAK: r['breakthrough'] = {'rate': BREAK[rid][0], 'pill': BREAK[rid][1]}
    rj['realms'].append(r)
rj['realms'].append({'id': 'realm.am-hu', 'name': 'Âm Hư', 'short': 'AH', 'stages': [], 'unlock_skill': 'chua-co',
                     'zone': 'huvo', 'monster_only': True,
                     '_ghi_chu': 'Người chơi không tu tới được. Chỉ 5 Âm Hư từ hư vô (boss) mang cảnh giới này.'})
p0 = player[0]['linh']
rj['power_mul'] = {p['id']: round(p['linh'] / p0, 2) for p in player}
for k in ('lab_duel_build',): rj.pop(k, None)
save('data/realms.json', rj)

# ---------- Ghi gameplay.json ----------
gp = load('data/gameplay.json')
gp['player']['_cach_tinh'] = ('Sinh bằng tools/gen_balance.py: Linh lực đủ hạ quái thường cùng tầng trong ~4 đòn, '
                              'HP chịu ~18 đòn của nó. Elite/Boss cần đan + trang bị. Đột phá đại cảnh giới = nhảy vọt sức mạnh.')
gp['player']['stages'] = player
gp['major_realm_first_stage'] = {sid: f'realm.{rid}' for sid, _, rid, first in stages if first}
gq = {}
n = len(stages)
for i, (sid, *_r) in enumerate(stages):
    if sid in ('lk1', 'lk5', 'lk10') or sid.endswith('_so') or sid.endswith('_hau'):
        gq[sid] = round(0.15 + 0.85 * i / (n - 1), 2)
gp['gearQ_by_stage'] = gq
mon = gp['monster']
mon.pop('stone_per_hp', None)
mon['stone_by_stage'] = {sid: max(1, round(3 * 1.2 ** i)) for i, (sid, *_r) in enumerate(stages)}
mon['stone_by_stage']['am_hu'] = round(3 * 1.2 ** n * 3)
mon['_stone'] = 'Linh thạch rơi = stone_by_stage[tầng quái] × exp_mul[cấp quái] (không theo HP nữa, để giá cửa hàng không mất giá ở cảnh giới cao)'
mon['band'] = {'elite': 0.2, 'boss': 0.45, '_ghi_chu': 'Độ sâu trong vành vùng (0 = mép trong, 1 = mép ngoài) tối thiểu để tinh anh / boss xuất hiện. Tầng quái tăng theo độ sâu.'}
save('data/gameplay.json', gp)

# ---------- Quái ----------
SPECIES = {  # vùng: [(mã, tên, cấp, các tầng (None = mọi tầng của vùng), hình)]
    'xanh': [('yeu-ho', 'Yêu Hồ', 'thuong', ['lk1', 'lk2', 'lk3'], {'sheet': 'slime', 'h': 16, 'still': True}),
             ('thanh-xa', 'Thanh Xà Yêu', 'thuong', ['lk4', 'lk5', 'lk6'], {'sheet': 'ran', 'h': 20, 'still': True}),
             ('thach-giap', 'Thạch Giáp Thú', 'thuong', ['lk7', 'lk8', 'lk9', 'lk10'], {'sheet': 'gai-dat', 'h': 20, 'still': True}),
             ('hac-lang-vuong', 'Hắc Lang Vương', 'elite', None, {'sheet': 'orc', 'h': 30}),
             ('son-dong-lao-yeu', 'Sơn Động Lão Yêu', 'boss', None, {'sheet': 'orc', 'h': 46, 'hue': 40})],
    'cam': [('huyet-sai', 'Huyết Sài', 'thuong', ['tc_so'], {'sheet': 'blood', 'h': 24}),
            ('diem-xa', 'Diễm Xà', 'thuong', ['tc_trung'], {'sheet': 'doi-lua', 'h': 30}),
            ('nham-giap', 'Nham Giáp Thú', 'thuong', ['tc_hau'], {'sheet': 'oc-gai', 'h': 22, 'still': True}),
            ('huyet-lang-vuong', 'Huyết Lang Vương', 'elite', None, {'sheet': 'demon', 'h': 32}),
            ('hoa-vuc-ma-ton', 'Hỏa Vực Ma Tôn', 'boss', None, {'sheet': 'demon', 'h': 50, 'hue': 25})],
    'xam': [('co-chien-hon', 'Cổ Chiến Hồn', 'thuong', ['kd_so'], {'sheet': 'dau-lau', 'h': 22, 'still': True}),
            ('doc-yeu', 'Độc Yêu', 'thuong', ['kd_trung'], {'sheet': 'nhen', 'h': 24, 'still': True}),
            ('huyen-giap', 'Huyền Giáp Thú', 'thuong', ['kd_hau'], {'sheet': 'oc-gai', 'h': 26, 'hue': 200, 'still': True}),
            ('thuong-co-chien-tuong', 'Thượng Cổ Chiến Tướng', 'elite', None, {'sheet': 'knight', 'h': 38}),
            ('huyen-vuc-ma-ton', 'Huyền Vực Ma Tôn', 'boss', None, {'sheet': 'xuc-tu', 'h': 58})],
    'trang': [('bang-ho', 'Băng Hồ', 'thuong', ['na_so'], {'sheet': 'ca-quai', 'h': 22, 'still': True}),
              ('tuyet-ung', 'Tuyết Ưng', 'thuong', ['na_trung'], {'sheet': 'ruoi', 'h': 24, 'hue': 180, 'still': True}),
              ('han-giap', 'Hàn Giáp Thú', 'thuong', ['na_hau'], {'sheet': 'gai-dat', 'h': 24, 'hue': 170, 'still': True}),
              ('bang-hon-tuong', 'Băng Hồn Tướng', 'elite', None, {'sheet': 'soldier', 'h': 30, 'hue': 180}),
              ('tuyet-son-lao-to', 'Tuyết Sơn Lão Tổ', 'boss', None, {'sheet': 'knight', 'h': 52, 'hue': 180})],
    'than': [('hac-vuc-yeu', 'Hắc Vực Yêu', 'thuong', ['ht_so'], {'sheet': 'soi-loi', 'h': 34}),
             ('hu-khong-thu', 'Hư Không Thú', 'thuong', ['ht_trung'], {'sheet': 'nhan-cau', 'h': 26, 'hue': 250, 'still': True}),
             ('tan-the-giap', 'Tận Thế Giáp Thú', 'thuong', ['ht_hau'], {'sheet': 'ran-ba-dau', 'h': 42}),
             ('thuong-co-ma-tuong', 'Thượng Cổ Ma Tướng', 'elite', None, {'sheet': 'thu-tim', 'h': 46}),
             ('hac-vuc-chu-te', 'Hắc Vực Chủ Tể', 'boss', None, {'sheet': 'ky-lan-loi', 'h': 66})],
    'den': [('hac-diem-lang', 'Hắc Diệm Lang', 'thuong', ['ab_so'], {'sheet': 'soi-loi', 'h': 36, 'hue': 300}),
            ('u-minh-quy-xa', 'U Minh Quỷ Xà', 'thuong', ['ab_trung'], {'sheet': 'ran', 'h': 30, 'hue': 260, 'still': True}),
            ('hac-nham-cu-nhan', 'Hắc Nham Cự Nhân', 'thuong', ['ab_hau'], {'sheet': 'orc', 'h': 40, 'hue': 220}),
            ('am-da-ma-tuong', 'Ám Dạ Ma Tướng', 'elite', None, {'sheet': 'knight', 'h': 46, 'hue': 270}),
            ('hac-uyen-ma-de', 'Hắc Uyên Ma Đế', 'boss', None, {'sheet': 'demon', 'h': 68, 'hue': 250})],
    'tim': [('tu-loi-yeu-dieu', 'Tử Lôi Yêu Điêu', 'thuong', ['vd_so'], {'sheet': 'doi-lua', 'h': 34, 'hue': 230}),
            ('tu-tinh-ma-nhen', 'Tử Tinh Ma Nhện', 'thuong', ['vd_trung'], {'sheet': 'nhen', 'h': 30, 'hue': 260, 'still': True}),
            ('hu-linh-giap-thu', 'Hư Linh Giáp Thú', 'thuong', ['vd_hau'], {'sheet': 'ky-lan-loi', 'h': 48, 'hue': 200}),
            ('tu-vuc-thien-tuong', 'Tử Vực Thiên Tướng', 'elite', None, {'sheet': 'soldier', 'h': 48, 'hue': 260}),
            ('van-thien-tu-de', 'Vấn Thiên Tử Đế', 'boss', None, {'sheet': 'xuc-tu', 'h': 74, 'hue': 270})],
}
HUVO = [  # 5 Âm Hư: vẽ bằng code (src/entity/void-draw.js) tới khi có ảnh
    ('ma-nhan', 'Hư Không Ma Nhãn', 1.0, {'code': 'hu-vo', 'shape': 'nhan', 'h': 64, 'color': '#b06bff'}),
    ('cot-long', 'Âm Hư Cốt Long', 1.15, {'code': 'hu-vo', 'shape': 'long', 'h': 78, 'color': '#7fd2ff'}),
    ('anh-ma', 'Vô Tướng Ảnh Ma', 0.9, {'code': 'hu-vo', 'shape': 'anh', 'h': 70, 'color': '#d9d9ff'}),
    ('huyet-lien', 'Tịch Diệt Huyết Liên', 1.05, {'code': 'hu-vo', 'shape': 'lien', 'h': 66, 'color': '#ff4a7a'}),
    ('thon-thien', 'Thôn Thiên Hư Thú', 1.2, {'code': 'hu-vo', 'shape': 'thu', 'h': 82, 'color': '#8a5bff'}),
]
ZONE_DEFS = [  # id, tên, đại cảnh giới, bậc, màu (quái hình tạm, ngọn linh thảo)
    ('xanh', 'Vùng Xanh', 'luyen-khi', 1, '#5fbf5a', '#b8ffb0'), ('cam', 'Vùng Cam', 'truc-co', 2, '#e08a3a', '#ff7a4a'),
    ('xam', 'Vùng Xám Khói', 'ket-dan', 3, '#8d8f99', '#c7a6ff'), ('trang', 'Vùng Trắng', 'nguyen-anh', 4, '#cfe6f2', '#e8f6ff'),
    ('than', 'Vùng Xám Than', 'hoa-than', 5, '#4a3b46', '#ff3b6b'), ('den', 'Vùng Đen', 'anh-bien', 6, '#1d1a24', '#7cf2ff'),
    ('tim', 'Vùng Tím', 'van-dinh', 7, '#7a3fb0', '#f0a8ff'), ('huvo', 'Hư Vô', 'am-hu', 8, '#2a0f3d', '#d18bff'),
]
stage_name = {s[0]: s[1] for s in stages}
stage_name['am_hu'] = 'Âm Hư'
realm_stages = {}
for sid, _, rid, _f in stages: realm_stages.setdefault(rid, []).append(sid)

def span(ids):
    a, b = stage_name[ids[0]], stage_name[ids[-1]]
    if len(ids) == 1: return a
    if ids[0].startswith('lk'): return f'Luyện Khí tầng {ids[0][2:]}–{ids[-1][2:]}'
    return f'{a} – {b.split(" ", 2)[-1]}'

def stat_range(ids, rank, mul=1.0, rmul=None):
    rm = rmul or RANK_MUL[rank]
    out = {}
    for k in ('hp', 'atk', 'def'):
        lo = min(stage_stats[s][k] for s in ids) * rm[k] * mul * (1 - VARIANCE)
        hi = max(stage_stats[s][k] for s in ids) * rm[k] * mul * (1 + VARIANCE)
        out[k] = [round(lo), round(hi)]
    return out

mj = load('data/monsters/monsters.json')
old = {m['id']: m for m in mj['monsters']}
mj['_ghi_chu_rieng'] = ('Chốt 23/10/2026: 7 vùng × 7 đại cảnh giới + Hư Vô (5 Âm Hư). Mỗi con có "stages" (tầng nó xuất hiện); chỉ số thật = '
                        'stage_stats[tầng] × rank_mul[cấp] × mul, lệch ±variance. hp/atk/def [min,max] chỉ để hiển thị (Đồ giám). Sinh bằng tools/gen_balance.py.')
mj['zones'] = [{'id': z, 'name': n, 'realm': r, 'tier': t, 'color': c, 'herb_tip': h} for z, n, r, t, c, h in ZONE_DEFS]
mj['stage_stats'] = stage_stats
mj['stage_names'] = stage_name
mj['rank_mul'] = {**RANK_MUL, 'huvo': HUVO_MUL}
mj['variance'] = VARIANCE
mj['rule'] = {'_ghi_chu': 'Luật cứng: boss mạnh nhất đại cảnh giới ≤ quái thường yếu nhất Sơ kỳ cảnh giới kế tiếp (từng chỉ số). check_refs kiểm.',
              'order': [f'realm.{r[0]}' for r in REALMS] + ['realm.am-hu']}
mons = []
zrealm = {z: r for z, _, r, *_ in ZONE_DEFS}
for zone, lst in SPECIES.items():
    rid = zrealm[zone]
    for code, name, rank, sts, art in lst:
        ids = sts or realm_stages[rid]
        mid = f'monster.{zone}.{code}.001'
        m = {'id': mid, 'name': name, 'zone': zone, 'tier': [z for z in ZONE_DEFS if z[0] == zone][0][3], 'rank': rank,
             'stages': ids, 'realm': span(ids), **stat_range(ids, rank), 'art': art, 'behavior': None}
        mons.append(m)
for code, name, mul, art in HUVO:
    mons.append({'id': f'monster.huvo.{code}.001', 'name': name, 'zone': 'huvo', 'tier': 8, 'rank': 'boss', 'void': True,
                 'stages': ['am_hu'], 'mul': mul, 'realm': 'Âm Hư', **stat_range(['am_hu'], 'boss', mul, HUVO_MUL), 'art': art,
                 'behavior': 'hu-vo'})
mj['monsters'] = mons
mj['void'] = mj.get('void') or {}
mj['void'].update({
    '_ghi_chu': ('5 Âm Hư từ hư vô: mỗi con xuất hiện ở MỘT chỗ ngẫu nhiên ngoài thành, theo lịch chung (giờ máy chủ) nên mọi người '
                 'thấy cùng chỗ, cùng lúc. Sống life_s giây rồi tan biến — ai không kịp đánh thì mất. Lịch: mỗi con mỗi cycle_s giây, '
                 'lệch nhau cycle_s/5. Máu chưa chung giữa người chơi (Mốc 3: máy chủ quản lý).'),
    'cycle_s': 3600, 'life_s': 900, 'warn_s': 60, 'aggro_px': 230, 'leash_px': 420, 'speed_px_per_s': 62, 'radius_px': 26,
    'avoid_town_px': 2400, 'seed': 20261023,
})
save('data/monsters/monsters.json', mj)

# ---------- Báo cáo + tự kiểm luật ----------
order = [r[0] for r in REALMS]
bad = []
for a, b in zip(order, order[1:] + ['am-hu']):
    top = [m for m in mons if any(s in realm_stages.get(a, []) for s in m['stages'])]
    nxt = [m for m in mons if m['rank'] == 'thuong' and m['stages'][0] == (realm_stages[b][0] if b in realm_stages else 'am_hu')]
    if b == 'am-hu': nxt = [m for m in mons if m.get('void')]
    for k in ('hp', 'atk', 'def'):
        if max(m[k][1] for m in top) > min(m[k][0] for m in nxt): bad.append((a, b, k))
print('Vi phạm luật:', bad or 'không')
for p in player[::3] + [player[-1]]:
    print(f"{p['name']:<22} HP {p['hp']:>9,}  Linh {p['linh']:>12,}  Thủ {p['def']:>4}  Tu vi cần {p['exp_need']:>12,}")
for sid in ('lk1', 'lk10', 'tc_so', 'vd_hau', 'am_hu'):
    print(sid, stage_stats[sid])
