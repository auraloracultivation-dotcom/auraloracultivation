"""NGŨ THIÊN ĐẠO CẢNH — hệ tu luyện riêng của Auralora (chủ dự án 24/10/2026, thay bảng của tools/gen_balance.py).

Người chơi: 60 cấp = 6 cảnh giới × 10 tầng. Quái GIỮ bậc cũ (Luyện Khí … Âm Hư) — hai bên không dùng chung tên.
  Khai Linh 1–10 · Ngưng Mạch 11–20 · Tụ Tinh 21–30 · Hóa Nguyệt 31–40 · Phá Nhật 41–50 · Hợp Đạo 51–60 (trần).
Mục tiêu (chủ dự án 24/10 03:55): TRANG BỊ quyết định sức mạnh, cảnh giới chỉ là nền.
  - Chỉ số gốc tăng đều ×~40 cả 60 cấp (trước: ×20.000). Dòng trang bị vẫn là % chỉ số gốc (Đen 25–40%/dòng) → đồ tốt
    (×3–5) thắng được người cao hơn 1 cảnh giới đồ thường — "đứa cùi chăm chỉ vẫn vượt cấp được".
  - Quái theo bậc cũ, chỉ số tính từ người chơi "chuẩn" ở cấp tương ứng (có trang bị nhận dần từ nhiệm vụ Đạo Tâm).
  - ~7 ngày chơi đều lên cấp 60 (số con quái cần hạ mỗi cấp + giới hạn linh khí ngày).
Luật cứng giữ nguyên: boss mạnh nhất một đại cảnh giới quái ≤ quái thường yếu nhất Sơ kỳ kế tiếp (tool tự nâng HP theo cảnh giới).

Ghi: data/gameplay.json (player.stages = 60 cấp lv1…lv60, player.tier_map, player.old_to_level, major_realm_first_stage,
     daily_linh_khi.cap, monster.exp_cap, late_realm, monster.suppress), data/monsters/monsters.json (stage_stats, hp/atk/def hiển thị),
     data/realms.json (tên 6 cảnh giới người chơi, tỷ lệ đột phá), data/lifespan.json (gain theo cấp).
Dùng: python3 -I tools/gen_thien_dao.py   (chạy lại được, in bảng kiểm tra)
"""
import json
import math
from pathlib import Path


def load(p): return json.loads(Path(p).read_text())
def save(p, d): Path(p).write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')


REALMS = [  # (id realm.json giữ nguyên, tên mới, mã bậc quái tương ứng, tỷ lệ đột phá vào cảnh này)
    ('realm.luyen-khi', 'Khai Linh', 'lk', None),
    ('realm.truc-co', 'Ngưng Mạch', 'tc', 0.9),
    ('realm.ket-dan', 'Tụ Tinh', 'kd', 0.8),
    ('realm.nguyen-anh', 'Hóa Nguyệt', 'na', 0.7),
    ('realm.hoa-than', 'Phá Nhật', 'ht', 0.6),
    ('realm.anh-bien', 'Hợp Đạo', 'ab', 0.5),
]
MAX_LV = 60
G = 40 ** (1 / 59)          # hp / linh gốc ×40 từ cấp 1 → 60
G_DEF = 1.04
DEF_K = 150


def tier_of(lv):
    """Bậc quái tương ứng cấp người chơi (dùng cho mở khoá nội dung theo mã cũ, bí cảnh, áp chế)."""
    m, t = (lv - 1) // 10, (lv - 1) % 10 + 1
    code = REALMS[m][2]
    if code == 'lk': return f'lk{t}'
    return f'{code}_' + ('so' if t <= 3 else 'trung' if t <= 6 else 'hau')


def base(lv):
    return {'hp': round(180 * G ** (lv - 1)), 'linh': round(35 * G ** (lv - 1)), 'def': round(7 * G_DEF ** (lv - 1)), 'mp': 100 + 6 * (lv - 1)}


def gear_e(L):  # hệ số trang bị "chuẩn" (bộ Đạo Tâm nhận dần) — quái tính theo mức này
    return 1 + 1.6 * (min(L, 60) - 1) / 59 + 0.25 * max(0, L - 60)


# ---------- Quái ----------
LREF = {f'lk{i}': 1 + (i - 1) * 0.45 for i in range(1, 11)}  # quái trong một cảnh giới gần nhau → lên cấp thì dễ dần, sang vùng mới là một bước rõ
for m, (_, _, code, _) in enumerate(REALMS[1:], 1):
    for k, off in (('so', 1), ('trung', 2), ('hau', 3)): LREF[f'{code}_{k}'] = 10 * m + off
LREF.update({'vd_so': 63, 'vd_trung': 67, 'vd_hau': 71, 'am_hu': 78})


def mon_normal(L):
    g = G ** (L - 1)
    linh_p, hp_p = 35 * g * gear_e(L), 180 * g * gear_e(L)
    def_p = 7 * G_DEF ** (L - 1) * (1 + 0.8 * (min(L, 60) - 1) / 59)
    def_m = 8 * 1.042 ** (L - 1)
    hits = 4 + 3 * (min(L, 60) - 1) / 59 + 0.5 * max(0, L - 60)
    die = 14 - 4 * (min(L, 60) - 1) / 59
    dmg_p = linh_p * 0.8 * (1 - def_m / (def_m + DEF_K))
    return {'hp': hits * dmg_p, 'atk': hp_p / (die * 0.8 * (1 - def_p / (def_p + DEF_K))), 'def': def_m}


def main():
    gp, mj, rj, life = load('data/gameplay.json'), load('data/monsters/monsters.json'), load('data/realms.json'), load('data/lifespan.json')
    order = list(mj['stage_stats'].keys())
    # Dữ liệu đổi bản lưu cũ (v1: 25 bậc Luyện Khí … Anh Biến) — chỉ ghi lần đầu, lúc data còn là bảng cũ
    if 'migrate_v2' not in gp and not gp['player']['stages'][0]['id'].startswith('lv'):
        gp['migrate_v2'] = {'_ghi_chu': 'Đổi bản lưu cũ sang Ngũ Thiên Đạo Cảnh (src/game/progress.js): old_order = 25 bậc cũ theo thứ tự lưu; pet_atk = công quái cũ theo bậc để quy đổi thú cưng giữ đúng sức mạnh tương đối.',
                            'old_order': [x['id'] for x in gp['player']['stages']], 'pet_atk': {t: v['atk'] for t, v in mj['stage_stats'].items()}}
    rmul = mj['rank_mul']
    ss = {t: mon_normal(LREF[t]) for t in order}
    ss['am_hu'] = {'hp': ss['am_hu']['hp'] * 2.3, 'atk': ss['am_hu']['atk'] * 0.25, 'def': ss['am_hu']['def']}  # Âm Hư: cấp 60 đồ ×7 ≈ 250 đòn, chịu ~8 đòn
    # Luật cứng (tools/check_refs.mjs): quái mạnh nhất vùng cảnh giới trước ≤ quái thường yếu nhất Sơ kỳ vùng sau, từng chỉ số.
    # Tính đúng như Đồ giám (× hạng × mul riêng × lệch, làm tròn); thiếu thì nâng chỉ số đó cho mọi bậc từ vùng sau trở đi.
    var = mj['variance']
    realm_of_zone = {z['id']: f"realm.{z['realm']}" for z in mj['zones']}
    rorder = mj['rule']['order']

    def ranges():
        out = {}
        for m in mj['monsters']:
            rm = rmul['huvo' if m.get('void') else m['rank']]
            mul = m.get('mul', 1)
            out[m['id']] = {k: [round(min(ss[t][k] for t in m['stages']) * rm[k] * mul * (1 - var)),
                                round(max(ss[t][k] for t in m['stages']) * rm[k] * mul * (1 + var))] for k in ('hp', 'atk', 'def')}
        return out
    for _ in range(60):
        ss = {t: {k: max(1, round(v)) for k, v in ss[t].items()} for t in order}
        R, bad = ranges(), False
        for a, b in zip(rorder, rorder[1:]):
            top = [m for m in mj['monsters'] if realm_of_zone[m['zone']] == a]
            nxt = [m for m in mj['monsters'] if realm_of_zone[m['zone']] == b]
            first = next((m for m in nxt if m['rank'] == 'thuong' or m.get('void')), None)
            if not top or not first: continue
            low = [m for m in nxt if (m['rank'] == 'thuong' or m.get('void')) and m['stages'][0] == first['stages'][0]]
            for k in ('hp', 'atk', 'def'):
                hi, lo = max(R[m['id']][k][1] for m in top), min(R[m['id']][k][0] for m in low)
                if hi > lo:
                    bad = True
                    f = (hi + 2) / lo * 1.02
                    for t in order[order.index(first['stages'][0]):]: ss[t][k] *= f
        if not bad: break
    mj['stage_stats'] = {t: {k: max(1, round(v)) for k, v in ss[t].items()} for t in order}
    ss = {t: dict(v) for t, v in mj['stage_stats'].items()}
    for m in mj['monsters']:  # khoảng hiển thị (Đồ giám)
        m.update(ranges()[m['id']])
    mj['_ghi_chu_thien_dao'] = 'Chỉ số quái sinh bằng tools/gen_thien_dao.py (24/10/2026): quái giữ bậc cũ, chỉ số theo người chơi chuẩn ở cấp tương ứng (LREF).'

    # ---------- Người chơi ----------
    kill_exp = lambda L: mj['stage_stats'][tier_of(L)]['hp'] / 10 * gp['monster']['exp_mul']['thuong'] * gp['kill_rewards']['exp_mul']
    kills = lambda L: round(8 * 1.065 ** (L - 1))
    BARS = [14, 9, 7, 6, 5, 4]  # linh khí ngày ≈ số cấp/ngày từ quái theo cảnh giới
    stages, cap = [], {}
    for L in range(1, MAX_LV + 1):
        m, t = (L - 1) // 10, (L - 1) % 10 + 1
        need = max(10, round(kill_exp(L) * kills(L)))
        stages.append({'id': f'lv{L}', 'name': f'{REALMS[m][1]} tầng {t}', 'realm': REALMS[m][0], 'major': m, 'tier': tier_of(L), **base(L), 'exp_need': need})
        cap[f'lv{L}'] = round(need * BARS[m])
    p = gp['player']
    p['stages'] = stages
    p['max_stage'] = f'lv{MAX_LV}'
    p['_cach_tinh'] = 'Ngũ Thiên Đạo Cảnh (tools/gen_thien_dao.py): 60 cấp, chỉ số gốc tăng đều ×40; trang bị (dòng % chỉ số gốc) quyết định sức mạnh.'
    # mã bậc cũ → cấp: mở khoá nội dung (cấp đầu tiên có bậc đó) và đổi tiến trình cũ (cuối khoảng, chủ dự án: chỉ tặng không trừ)
    first, last = {}, {}
    for i, s in enumerate(stages): first.setdefault(s['tier'], i); last[s['tier']] = i
    p['tier_first'] = first
    p['old_to_level'] = last
    gp['major_realm_first_stage'] = {f'lv{10 * m + 1}': REALMS[m][0] for m in range(1, 6)}
    D = gp['daily_linh_khi']
    D['cap'] = cap
    D['bars'] = {}
    D['_ghi_chu'] = 'Ngũ Thiên Đạo Cảnh (24/10): mỗi ngày hạ quái nhận trọn tu vi tới cap (≈ số cấp/ngày: Khai Linh 14, Ngưng Mạch 9, Tụ Tinh 7, Hóa Nguyệt 6, Phá Nhật 5, Hợp Đạo 4), giảm dần sau đó. ~7 ngày lên cấp 60.'
    gp['monster']['exp_cap'].update({'thuong': 0.05, 'elite': 0.1, 'boss': 0.25, 'void': 0.3})
    gp['monster']['suppress'].update({'grace': 3, 'per_stage': 0.7, 'min': 0.02, '_ghi_chu_24_10': 'Nới áp chế (24/10): trang bị tốt được đánh vượt cấp; quá 3 bậc mới giảm sát thương ×0,7/bậc.'})
    gp['late_realm']['prefixes'] = []
    gp['late_realm']['_ghi_chu_24_10'] = 'Tắt (24/10): Hợp Đạo là trần, lên trong ~1 tuần như mọi cảnh giới khác.'
    save('data/gameplay.json', gp)
    save('data/monsters/monsters.json', mj)

    for r in rj['realms']:
        for rid, name, code, rate in REALMS:
            if r['id'] == rid:
                r.setdefault('monster_name', r['name']); r['name'] = name
                if rate is not None:
                    r['breakthrough'] = {'rate': rate, 'pill': r['breakthrough']['pill']}
    rj['_ghi_chu_thien_dao'] = '24/10: name = tên cảnh giới NGƯỜI CHƠI (Ngũ Thiên Đạo Cảnh); monster_name = tên bậc quái cũ. id giữ nguyên.'
    save('data/realms.json', rj)

    life['gain'] = {f'lv{L}': (10 * 2 ** ((L - 1) // 10 - 1) if L % 10 == 1 else 1) for L in range(2, MAX_LV + 1)}
    life['_ghi_chu_gain'] = 'Ngũ Thiên Đạo Cảnh (24/10): mỗi tầng +1 năm; vào cảnh giới mới +10/20/40/80/160 năm.'
    save('data/lifespan.json', life)

    tot = sum(s['exp_need'] for s in stages)
    print(f"{'Cấp':<22}{'HP':>8}{'Linh':>8}{'Thủ':>5}{'Tu vi':>12}{'bậc quái':>10}{'HP quái':>10}{'Công quái':>10}")
    for s in stages[::5] + [stages[-1]]:
        q = mj['stage_stats'][s['tier']]
        print(f"{s['name']:<22}{s['hp']:>8}{s['linh']:>8}{s['def']:>5}{s['exp_need']:>12}{s['tier']:>10}{q['hp']:>10}{q['atk']:>10}")
    print('Tổng tu vi tới cấp 60:', tot, '· quái cần hạ ≈', sum(kills(L) for L in range(1, 61)))
    print('Âm Hư:', mj['stage_stats']['am_hu'])


if __name__ == '__main__':
    main()
