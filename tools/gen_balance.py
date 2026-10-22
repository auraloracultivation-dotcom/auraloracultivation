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
# Chủ dự án 23/10 (bản 2): TỪ Nguyên Anh Hậu kỳ trở đi mỗi tầng quái mạnh GẤP ĐÔI tầng trước (HT Sơ = 2× NA Hậu, HT Trung = 2× HT Sơ…)
LATE_FROM = 'na_hau'
# Bản 3 (chủ dự án 23/10 04:41: người chơi Hóa Thần Hậu kỳ chém được Âm Hư sau 20 phút): TỪ Hóa Thần trở đi quái tăng mạnh hơn —
# Khí huyết ×2.5, Thủ ×1.3 mỗi tầng (Công vẫn ×2). Thêm áp chế cảnh giới trong code (gameplay.json → monster.suppress).
STEP_LATE = {'hp': 2.5, 'atk': 2.0, 'def': 1.3}    # trong một đại cảnh giới
JUMP_LATE = {'hp': 2.5, 'atk': 2.0, 'def': 1.5}    # sang đại cảnh giới mới (Thủ nhảy nhiều hơn để giữ luật boss)
# boss HP 1.8 (không phải 3): vì quái chỉ ×2 mỗi tầng, boss Hậu kỳ (kể cả lệch +5%) vẫn phải yếu hơn quái thường Sơ kỳ cảnh giới sau
RANK_MUL = {'thuong': {'hp': 1, 'atk': 1, 'def': 1}, 'elite': {'hp': 1.5, 'atk': 1.25, 'def': 1.12},
            'boss': {'hp': 1.8, 'atk': 1.5, 'def': 1.25}}
HUVO_MUL = {'hp': 1.2, 'atk': 1.65, 'def': 1.35}  # Âm Hư: so với "quái thường" cảnh giới Âm Hư (đã nhảy 1 bậc trên Vấn Đỉnh Hậu kỳ)
VARIANCE = 0.05  # quái sinh ra lệch ngẫu nhiên ±5%

stage_stats = {}
cur = dict(BASE)
prev_realm = None
late = False
for sid, sname, rid, first in stages:
    if prev_realm is not None:
        if late: step = JUMP_LATE if rid != prev_realm else STEP_LATE
        else: step = JUMP if rid != prev_realm else (STEP_LK if rid == 'luyen-khi' else STEP_IN)
        cur = {k: cur[k] * step[k] for k in cur}
    stage_stats[sid] = {k: round(v) for k, v in cur.items()}
    prev_realm = rid
    late = late or sid == LATE_FROM
cur = {k: cur[k] * JUMP_LATE[k] for k in cur}
stage_stats['am_hu'] = {k: round(v) for k, v in cur.items()}

# ---------- Người chơi: tính ngược từ quái thường cùng tầng ----------
DEF_K, MIN_RATIO = 150, 0.05
def red(d, pen=0.025): return d / (d + DEF_K) * (1 - pen)
HITS_TO_KILL, HITS_TO_DIE = 4, 18
# Người chơi tối đa Hóa Thần Hậu kỳ (chủ dự án 23/10). Anh Biến, Vấn Đỉnh: chỉ có quái (vùng Đen / Tím = tường cuối game).
PLAYER_MAX = 'ht_hau'
# Sau Nguyên Anh Hậu kỳ người chơi chỉ mạnh thêm ×1.4 mỗi tầng (quái ×2) → càng lên càng khó, cần trang bị + đan
PLAYER_LATE = {'linh': 1.4, 'hp': 1.4, 'def': 1.15}
# Tu vi: số quái thường cần hạ mỗi tầng tăng ×1.28 (≈ 1 tháng chơi tới Hóa Thần Hậu kỳ, không phải vài giờ)
def kills_at(i): return round(12 * 1.28 ** i)
player = []
for i, (sid, sname, rid, first) in enumerate(stages):
    m = stage_stats[sid]
    if player and player[-1]['id'] in (LATE_FROM,) or (player and player[-1].get('_late')):
        q = player[-1]
        p = {'id': sid, 'name': sname, 'hp': round(q['hp'] * PLAYER_LATE['hp']), 'linh': round(q['linh'] * PLAYER_LATE['linh']),
             'def': round(q['def'] * PLAYER_LATE['def']), '_late': True}
    else:
        p = {'id': sid, 'name': sname, 'hp': round(HITS_TO_DIE * m['atk'] * 0.8 * (1 - red(m['def'] * 0.85, 0))),
             'linh': round(m['hp'] / (HITS_TO_KILL * 0.825 * (1 - red(m['def'])))), 'def': round(m['def'] * 0.85)}
    p.update({'mp': 100 + 15 * i, 'exp_need': round(m['hp'] / 10 * kills_at(i))})
    player.append(p)
    if sid == PLAYER_MAX: break
for p in player: p.pop('_late', None)

# ---------- Ghi realms.json ----------
rj = load('data/realms.json')
rj['_ghi_chu_rieng'] = 'Cảnh giới chốt 23/10/2026 (chủ dự án): 7 đại cảnh giới người chơi + Âm Hư chỉ có boss. Sinh bằng tools/gen_balance.py.'
rj['realms'] = []
for rid, name, short, zone, code in REALMS:
    r = {'id': f'realm.{rid}', 'name': name, 'short': short,
         'stages': [f'lk{i}' for i in range(1, 11)] if code == 'lk' else [k for k, _ in KY],
         'unlock_skill': UNLOCK[rid], 'zone': zone}
    if rid in BREAK: r['breakthrough'] = {'rate': BREAK[rid][0], 'pill': BREAK[rid][1]}
    if rid in ('anh-bien', 'van-dinh'): r['player_locked'] = True; r['_ghi_chu'] = 'Người chơi tạm tối đa Hóa Thần Hậu kỳ (23/10) — chỉ có quái'
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
pids = {p['id'] for p in player}
gp['major_realm_first_stage'] = {sid: f'realm.{rid}' for sid, _, rid, first in stages if first and sid in pids}
gp['player']['max_stage'] = PLAYER_MAX
gq = {}
n = len(stages)
for i, (sid, *_r) in enumerate(stages):
    if sid in pids and (sid in ('lk1', 'lk5', 'lk10') or sid.endswith('_so') or sid.endswith('_hau')):
        gq[sid] = round(0.15 + 0.85 * i / (len(player) - 1), 2)
gp['gearQ_by_stage'] = gq
mon = gp['monster']
mon.pop('stone_per_hp', None)
mon['stone_by_stage'] = {sid: max(1, round(3 * 1.2 ** i)) for i, (sid, *_r) in enumerate(stages)}
mon['stone_by_stage']['am_hu'] = round(3 * 1.2 ** n * 3)
mon['_stone'] = 'Linh thạch rơi = stone_by_stage[tầng quái] × exp_mul[cấp quái] (không theo HP nữa, để giá cửa hàng không mất giá ở cảnh giới cao)'
mon['band'] = {'elite': 0.2, 'boss': 0.45, '_ghi_chu': 'Độ sâu trong vành vùng (0 = mép trong, 1 = mép ngoài) tối thiểu để tinh anh / boss xuất hiện. Tầng quái tăng theo độ sâu.'}
save('data/gameplay.json', gp)

# ---------- Quái ----------
# Quái + hình (sprite chủ dự án 23/10, cắt bằng tools/monster_sheets.py → sheet m.<mã>). Cỡ trong game tính từ chiều cao THÂN.
SPECIES = {  # vùng: [(mã, tên, cấp, các tầng (None = mọi tầng của vùng))]
    'xanh': [('yeu-ho', 'Yêu Hồ', 'thuong', ['lk1', 'lk2', 'lk3']), ('thanh-xa', 'Thanh Xà Yêu', 'thuong', ['lk4', 'lk5', 'lk6']),
             ('thach-giap', 'Thạch Giáp Thú', 'thuong', ['lk7', 'lk8', 'lk9', 'lk10']), ('hac-lang-vuong', 'Hắc Lang Vương', 'elite', None),
             ('son-dong-lao-yeu', 'Sơn Động Lão Yêu', 'boss', None)],
    'cam': [('huyet-sai', 'Huyết Sài', 'thuong', ['tc_so']), ('diem-xa', 'Diễm Xà', 'thuong', ['tc_trung']),
            ('nham-giap', 'Nham Giáp Thú', 'thuong', ['tc_hau']), ('huyet-lang-vuong', 'Huyết Lang Vương', 'elite', None),
            ('hoa-vuc-ma-ton', 'Hỏa Vực Ma Tôn', 'boss', None)],
    'xam': [('co-chien-hon', 'Cổ Chiến Hồn', 'thuong', ['kd_so']), ('doc-yeu', 'Độc Yêu', 'thuong', ['kd_trung']),
            ('huyen-giap', 'Huyền Giáp Thú', 'thuong', ['kd_hau']), ('thuong-co-chien-tuong', 'Thượng Cổ Chiến Tướng', 'elite', None),
            ('huyen-vuc-ma-ton', 'Huyền Vực Ma Tôn', 'boss', None)],
    'trang': [('bang-ho', 'Băng Hổ', 'thuong', ['na_so']), ('tuyet-ung', 'Tuyết Ưng', 'thuong', ['na_trung']),
              ('han-giap', 'Hàn Giáp Thú', 'thuong', ['na_hau']), ('bang-hon-tuong', 'Băng Hồn Tướng', 'elite', None),
              ('tuyet-son-lao-to', 'Tuyết Sơn Lão Tổ', 'boss', None)],
    'than': [('hac-vuc-yeu', 'Hắc Vực Yêu', 'thuong', ['ht_so']), ('hu-khong-thu', 'Hư Không Thú', 'thuong', ['ht_trung']),
             ('tan-the-giap', 'Tận Thế Giáp Thú', 'thuong', ['ht_hau']), ('thuong-co-ma-tuong', 'Thượng Cổ Ma Tướng', 'elite', None),
             ('hac-vuc-chu-te', 'Hắc Vực Chủ Tể', 'boss', None)],
    'den': [('tu-suong-yeu-ho', 'Tử Sương Yêu Hồ', 'thuong', ['ab_so']), ('u-moc-thach-mang', 'U Mộc Thạch Măng', 'thuong', ['ab_trung']),
            ('co-ma-da-nhan-thu', 'Cổ Ma Đa Nhãn Thú', 'thuong', ['ab_hau']), ('tu-moc-yeu-than', 'Tử Mộc Yêu Thần', 'elite', None),
            ('u-suong-ma-hoang', 'U Sương Ma Hoàng', 'boss', None)],
    'tim': [('vinh-da-u-minh', 'Vĩnh Dạ U Minh', 'thuong', ['vd_so']), ('luan-hoi-doan-menh', 'Luân Hồi Đoạn Mệnh', 'thuong', ['vd_trung']),
            ('bat-diet-co-hon', 'Bất Diệt Cổ Hồn', 'thuong', ['vd_hau']), ('phach-huyet-truong-sinh', 'Phách Huyết Trường Sinh', 'elite', None),
            ('quy-tich-vinh-hang', 'Quỷ Tịch Vĩnh Hằng', 'boss', None)],
}
HUVO = [  # 5 Âm Hư (mã, tên, hệ số sức mạnh)
    ('hac-am-phe-hon-gia', 'Hắc Ám Phệ Hồn Giả', 1.0), ('tich-diet-vo-tung-anh', 'Tịch Diệt Vô Tung Ảnh', 0.9),
    ('u-lenh-huyet-sat-su', 'U Lệnh Huyết Sát Sư', 1.1), ('vinh-da-dao-anh-quy', 'Vĩnh Dạ Đào Ảnh Quỷ', 1.05),
    ('tham-uyen-u-minh-ma', 'Thâm Uyên U Minh Ma', 1.2),
]
BODY_H = {'thuong': 26, 'elite': 34, 'boss': 48, 'void': 64}  # chiều cao thân trong game (điểm thế giới)
SHEETS = json.loads((ROOT / 'data/art/monster_sheets.json').read_text())['sheets']


def art_of(code, rank):
    m = SHEETS[code]
    h = BODY_H[rank] * m['fh'] / m['body_h']
    return {'sheet': f'm.{code}', 'h': round(h, 1), **({} if m['void'] else {'breathe': True})}


# Kỹ năng boss (chủ dự án 23/10: Nguyên Anh 1, Hóa Thần 2, Anh Biến 2, Vấn Đỉnh 3, Âm Hư 3). Báo trước bằng vòng / dải đỏ, chạy ra là né.
# kind: target (vòng tại chỗ người chơi), self (vòng quanh boss), line (dải thẳng về phía người chơi), multi (n vòng rải quanh người chơi)
MOB_SKILLS = {
    'ms.bang-lang': {'name': 'Băng Lăng Trận', 'kind': 'target', 'r': 60, 'windup_s': 1.1, 'mul': 2.0, 'cd_s': 9, 'range_px': 220, 'fx': 'v.no-bang', 'fx_h': 64},
    'ms.hac-dong': {'name': 'Hắc Động Thôn Phệ', 'kind': 'target', 'r': 75, 'windup_s': 1.3, 'mul': 2.4, 'stun_s': 0.8, 'cd_s': 11, 'range_px': 240, 'fx': 'v.hac-dong', 'fx_h': 100},
    'ms.am-tien': {'name': 'U Minh Ám Tiễn', 'kind': 'line', 'len': 260, 'w': 28, 'windup_s': 0.9, 'mul': 1.9, 'cd_s': 8, 'range_px': 250, 'fx': 'v.dan-am', 'fx_h': 40},
    'ms.u-hon-tran': {'name': 'U Hồn Gai Trận', 'kind': 'self', 'r': 110, 'windup_s': 1.2, 'mul': 2.0, 'cd_s': 10, 'range_px': 100, 'fx': 'v.am-gai', 'fx_h': 60},
    'ms.huyet-chu': {'name': 'Huyết Chú', 'kind': 'target', 'r': 50, 'windup_s': 1.0, 'mul': 2.6, 'cd_s': 9, 'range_px': 220, 'fx': 'v.huyet-chu', 'fx_h': 56},
    'ms.van-loi': {'name': 'Vạn Lôi Giáng Thế', 'kind': 'multi', 'n': 4, 'r': 45, 'spread': 110, 'windup_s': 1.2, 'mul': 2.2, 'cd_s': 12, 'range_px': 260, 'fx': 'v.loi-tru', 'fx_h': 90},
    'ms.xich-tran': {'name': 'Xích Hồn Trận', 'kind': 'target', 'r': 60, 'windup_s': 1.0, 'mul': 1.6, 'stun_s': 1.5, 'cd_s': 14, 'range_px': 220, 'fx': 'v.xich-tran', 'fx_h': 56},
    'ms.hoa-luan': {'name': 'Luyện Ngục Hỏa Luân', 'kind': 'self', 'r': 140, 'windup_s': 1.4, 'mul': 2.4, 'cd_s': 13, 'range_px': 130, 'fx': 'v.hoa-xoay', 'fx_h': 150},
    'ms.hu-khong-trao': {'name': 'Hư Không Trảo', 'kind': 'line', 'len': 300, 'w': 42, 'windup_s': 1.0, 'mul': 2.8, 'cd_s': 7, 'range_px': 280, 'fx': 'v.dan-am', 'fx_h': 60},
    'ms.thon-thien': {'name': 'Thôn Thiên Hắc Động', 'kind': 'target', 'r': 100, 'windup_s': 1.6, 'mul': 3.0, 'stun_s': 1.0, 'cd_s': 14, 'range_px': 260, 'fx': 'v.hac-dong', 'fx_h': 130},
    'ms.hu-vo-tinh-vu': {'name': 'Hư Vô Tinh Vũ', 'kind': 'multi', 'n': 6, 'r': 45, 'spread': 140, 'windup_s': 1.4, 'mul': 2.4, 'cd_s': 12, 'range_px': 280, 'fx': 'v.am-gai', 'fx_h': 64},
}
BOSS_SKILLS = {'trang': ['ms.bang-lang'], 'than': ['ms.hac-dong', 'ms.am-tien'], 'den': ['ms.u-hon-tran', 'ms.huyet-chu'],
               'tim': ['ms.van-loi', 'ms.xich-tran', 'ms.hoa-luan'], 'huvo': ['ms.hu-khong-trao', 'ms.thon-thien', 'ms.hu-vo-tinh-vu']}
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
    for code, name, rank, sts in lst:
        ids = sts or realm_stages[rid]
        mid = f'monster.{zone}.{code}.001'
        m = {'id': mid, 'name': name, 'zone': zone, 'tier': [z for z in ZONE_DEFS if z[0] == zone][0][3], 'rank': rank,
             'stages': ids, 'realm': span(ids), **stat_range(ids, rank), 'art': art_of(code, rank), 'behavior': None}
        if rank == 'boss' and zone in BOSS_SKILLS: m['skills'] = BOSS_SKILLS[zone]
        mons.append(m)
for code, name, mul in HUVO:
    mons.append({'id': f'monster.huvo.{code}.001', 'name': name, 'zone': 'huvo', 'tier': 8, 'rank': 'boss', 'void': True,
                 'stages': ['am_hu'], 'mul': mul, 'realm': 'Âm Hư', **stat_range(['am_hu'], 'boss', mul, HUVO_MUL), 'art': art_of(code, 'void'),
                 'behavior': 'hu-vo', 'skills': BOSS_SKILLS['huvo']})
mj['monsters'] = mons
mj['skills'] = MOB_SKILLS
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
tot = 0
for i, p in enumerate(player):
    tot += kills_at(i)
print('Tổng số quái thường cần hạ tới', player[-1]['name'], '≈', f'{tot:,}')
for p in player[::3] + [player[-1]]:
    print(f"{p['name']:<22} HP {p['hp']:>9,}  Linh {p['linh']:>12,}  Thủ {p['def']:>4}  Tu vi cần {p['exp_need']:>12,}")
for sid in ('lk1', 'lk10', 'tc_so', 'na_hau', 'ht_so', 'ht_trung', 'ht_hau', 'vd_hau', 'am_hu'):
    print(sid, stage_stats[sid])
