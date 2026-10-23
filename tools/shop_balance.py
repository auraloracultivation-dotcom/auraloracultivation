# Cân bằng Vạn Bảo Lâu + nguyên liệu chế tạo theo MỘT đơn vị: "phút farm" ở cảnh giới dùng món đó (chủ dự án 23/10 21h).
# Tốc độ farm đo thật trong game (Tự động, đồ đã thức tỉnh, chỗ farm không chết — xem PR #132/#133 và thử nghiệm 23/10):
#   KPM = con / phút theo đại cảnh giới; trộn loại quái ~93% thường · 5% tinh anh · 2% thủ lĩnh.
# Luật:
#   R1 Nguyên liệu chế tạo luôn lấy ở vùng của cảnh giới mở món (không bao giờ bắt đi vùng SAU).
#   R2 Đan đột phá: nguyên liệu ≈ PILL_MIN phút farm vùng hiện tại; đan phương ≈ RECIPE_PILL_MIN phút Linh thạch (10 lượt).
#   R3 Phôi trang bị: nguyên liệu ≈ BLANK_MIN phút; công thức ≈ RECIPE_BLANK_MIN phút LT (3 lượt).
#   R4 Bí kíp: mua 1 lần HỌC VĨNH VIỄN (không tính lượt) ≈ BOOK_MIN phút LT. Cấp n mở ở đại cảnh giới (mở + n − 1),
#      nguyên liệu cấp n ≈ SKILL_MIN × n phút farm ở vùng của cảnh giới đó → 5 cấp đi cùng 5 cảnh giới.
#   R5 Nguyên liệu bán lẻ: giá = LT kiếm được trong lúc farm ra 1 cái × 1,5 (mua tiện hơn nhưng đắt hơn tự farm).
#   R6 Đồ bán bằng Vàng: Vàng = 16 × LT (đúng tỷ lệ rơi); đan hồi huyết ≈ 1,5 phút Vàng ở Luyện Khí.
# Chạy: python3 -I tools/shop_balance.py  → sửa data/shop.json, items/pills.json, equipment/blanks.json, skills/cong-phap.json; in bảng ra màn hình.
import json, math, os
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
J = lambda p: json.load(open(os.path.join(R, p)))
def W(p, d): open(os.path.join(R, p), 'w').write(json.dumps(d, ensure_ascii=False, indent=1) + '\n')

PILL_MIN, RECIPE_PILL_MIN, BLANK_MIN, RECIPE_BLANK_MIN, BOOK_MIN, SKILL_MIN, RETAIL_MUL = 45, 30, 15, 20, 30, 10, 1.5
MAJ = ['lk', 'tc', 'kd', 'na', 'ht']; ZONE = {'lk': 'xanh', 'tc': 'cam', 'kd': 'xam', 'na': 'trang', 'ht': 'than'}
KPM = {'lk': 2.5, 'tc': 4.5, 'kd': 7, 'na': 5, 'ht': 3}
MIX = {'thuong': .93, 'elite': .05, 'boss': .02}
gp, mats, shop = J('data/gameplay.json'), J('data/items/materials.json'), J('data/shop.json')
pills, blanks, cp, misc = J('data/items/pills.json'), J('data/equipment/blanks.json'), J('data/skills/cong-phap.json'), J('data/items/misc.json')
STONE, EM, KR, LOOT = gp['monster']['stone_by_stage'], gp['monster']['exp_mul'], gp['kill_rewards'], gp['loot']
M = {m['id']: m for m in mats['materials']}
pool = lambda z, g: [m for m in mats['materials'] if m['zone'] == z and m['group'] == g]
major = lambda st: st[:2]

def lt_min(st):  # Linh thạch / phút farm ở tầng st
    return KPM[major(st)] * sum(w * STONE[st] * EM[r] for r, w in MIX.items()) * KR['stone_mul']
def per_min(item_id, st):  # số cái item rơi / phút ở vùng của nó (loot gameplay.json, chia đều trong nhóm của vùng)
    m = M[item_id]; key = {'thao': 'herb', 'khoang': 'ore', 'dacbiet': 'special'}[m['group']]
    n = len(pool(m['zone'], m['group']))
    per_kill = sum(w * LOOT[r][key][0] * (LOOT[r][key][1] + LOOT[r][key][2]) / 2 for r, w in MIX.items()) / n
    return KPM[major(st)] * per_kill
nice = lambda x: int(round(x, -int(math.floor(math.log10(max(x, 1)))) + 1)) if x >= 10 else max(1, round(x))
report = []

# ---- R2: đan đột phá (luyện ở tầng cuối cảnh giới trước, vùng của cảnh giới đó) ----
BT = {'item.dan.truc-co.001': 'lk10', 'item.dan.ket-dan.001': 'tc_hau', 'item.dan.nguyen-anh.001': 'kd_hau', 'item.dan.hoa-than.001': 'na_hau'}
PL = pills['pills']
for p in PL:
    if p['id'] not in BT: continue
    st = BT[p['id']]; z = ZONE[major(st)]
    herbs, ores, sp = pool(z, 'thao'), pool(z, 'khoang'), pool(z, 'dacbiet')
    herbs = [h for h in herbs if not h.get('spawn_share')]
    inp = [{'id': herbs[0]['id'], 'count': nice(per_min(herbs[0]['id'], st) * PILL_MIN)},
           {'id': herbs[1]['id'], 'count': nice(per_min(herbs[1]['id'], st) * PILL_MIN * .6)},
           {'id': ores[0]['id'], 'count': nice(per_min(ores[0]['id'], st) * PILL_MIN)}]
    if sp: inp.append({'id': sp[0]['id'], 'count': nice(per_min(sp[0]['id'], st) * PILL_MIN)})
    old = p['recipe']['inputs']; p['recipe']['inputs'] = inp; p['recipe'].pop('alt_inputs', None)
    report.append(('Đan đột phá', p['name'], st, ' + '.join(f"{M[i['id']]['name']} {i['count']}" for i in inp), ' + '.join(f"{M.get(i['id'], {'name': i['id']})['name']} {i['count']}" for i in old)))
pills['_ghi_chu_can_bang'] = 'Nguyên liệu đan đột phá: tools/shop_balance.py (≈45 phút farm vùng hiện tại). Không sửa tay.'
W('data/items/pills.json', pills)

# ---- R3: phôi (nguyên liệu vùng của cảnh giới mở ô) ----
SP_OF = {'linh-thu': 'xam', 'canh': 'trang', 'phap-tuong': 'than'}  # đồ đặc biệt bắt buộc: lấy đúng vùng mở ô
for b in blanks['blanks']:
    st = b['unlock']; z = ZONE[major(st)]
    herbs = [h for h in pool(z, 'thao') if not h.get('spawn_share')]; ores = pool(z, 'khoang')
    k = {'vu-khi': (0, 0), 'trang-phuc': (1, 0), 'nhan': (2, 1), 'day-chuyen': (0, 1), 'mat-na': (1, 1)}.get(b['slot'], (0, 0))
    inp = [{'id': ores[k[1] % len(ores)]['id'], 'count': nice(per_min(ores[k[1] % len(ores)]['id'], st) * BLANK_MIN)},
           {'id': herbs[k[0] % len(herbs)]['id'], 'count': nice(per_min(herbs[k[0] % len(herbs)]['id'], st) * BLANK_MIN)}]
    if b['slot'] in SP_OF:
        ores2 = ores[1] if len(ores) > 1 else ores[0]
        inp.insert(1, {'id': ores2['id'], 'count': nice(per_min(ores2['id'], st) * BLANK_MIN * .5)})
        inp.append({'id': pool(SP_OF[b['slot']], 'dacbiet')[0]['id'], 'count': 1})
    old = b['inputs']; b['inputs'] = inp
    report.append(('Phôi', b['slot'], st, ' + '.join(f"{M[i['id']]['name']} {i['count']}" for i in inp), ' + '.join(f"{M.get(i['id'], {'name': i['id']})['name']} {i['count']}" for i in old)))
blanks['_ghi_chu_can_bang'] = 'Nguyên liệu phôi: tools/shop_balance.py (≈15 phút farm vùng của cảnh giới mở ô; đồ đặc biệt bắt buộc lấy đúng vùng đó). Không sửa tay.'
W('data/equipment/blanks.json', blanks)

# ---- R4: công pháp — cấp n mở ở đại cảnh giới (mở + n − 1), nguyên liệu vùng đó ----
for s in cp['skills']:
    u = MAJ.index(major(s['unlock'])); lv = []
    for n in range(1, s['max_level'] + 1):
        mj = MAJ[min(4, u + n - 1)]; st = s['unlock'] if n == 1 else f'{mj}_so' if mj != 'lk' else 'lk1'
        st_rate = st if st in STONE else s['unlock']; z = ZONE[mj]
        herbs = [h for h in pool(z, 'thao') if not h.get('spawn_share')]; ores = pool(z, 'khoang')
        h = herbs[(n + len(s['id'])) % len(herbs)]
        lv.append({'unlock': st, 'inputs': [{'id': h['id'], 'count': nice(per_min(h['id'], st_rate) * SKILL_MIN * n)},
                                            {'id': ores[0]['id'], 'count': nice(per_min(ores[0]['id'], st_rate) * SKILL_MIN * n * .6)}]})
    s['levels'] = lv
cp['_ghi_chu_cap'] = 'Chủ dự án 23/10 21h: bí kíp học VĨNH VIỄN (không tính lượt). levels[n-1] = cấp n: mở ở cảnh giới unlock, nguyên liệu vùng của cảnh giới đó (tools/shop_balance.py). 5 cấp đi cùng 5 đại cảnh giới.'
W('data/skills/cong-phap.json', cp)

# ---- Công dụng nguyên liệu (materials.json → use): sinh từ công thức thật, không viết tay ----
SLOT_VN = {'vu-khi': 'Vũ khí', 'trang-phuc': 'Trang phục', 'nhan': 'Nhẫn', 'day-chuyen': 'Dây chuyền', 'mat-na': 'Mặt nạ',
           'linh-thu': 'Linh thú', 'canh': 'Cánh', 'phap-tuong': 'Pháp tướng'}
def uses(mid):
    out = {'Đan': [], 'Phôi': [], 'Tu luyện': []}
    for p in PL:
        r = p.get('recipe') or {}
        if any(i['id'] == mid for g in [r.get('inputs', [])] + r.get('alt_inputs', []) for i in g): out['Đan'].append(p['name'])
    for b in blanks['blanks']:
        if any(i['id'] == mid for i in b.get('inputs', [])): out['Phôi'].append(SLOT_VN.get(b['slot'], b['slot']))
    for s in cp['skills']:
        if any(i['id'] == mid for lv in s.get('levels', []) for i in lv.get('inputs', [])): out['Tu luyện'].append(s['name'])
    return ' · '.join(f"{k}: {', '.join(dict.fromkeys(v))}" for k, v in out.items() if v)
for m in mats['materials']:
    u = uses(m['id'])
    if u: m['use'] = u
    elif m.get('use') and '(chưa dùng)' not in m['use'] and 'chưa chốt' not in m['use']: m['use'] = 'Chưa dùng vào công thức nào (để dành)'
W('data/items/materials.json', mats)
for s in cp['skills']:
    report.append(('Công pháp', s['name'], s['unlock'], ' | '.join(f"c{n+1} {L['unlock']}: " + ' + '.join(f"{M[i['id']]['name']} {i['count']}" for i in L['inputs']) for n, L in enumerate(s['levels'])), ''))

# ---- Giá cửa hàng ----
REC = {x['id']: x for x in J('data/items/recipes.json')['items']}
SKU = {s['id']: s['unlock'] for s in cp['skills']}
BL = {b['id']: b['unlock'] for b in blanks['blanks']}
ZST = {'xanh': 'lk3', 'cam': 'tc_so', 'xam': 'kd_so', 'trang': 'na_so', 'than': 'ht_so'}
PILL = {p['id']: p for p in PL}
def pill_stage(pid):  # tầng sớm nhất farm đủ nguyên liệu của đan (vùng xa nhất trong các nguyên liệu)
    zs = [ZST[M[i['id']]['zone']] for i in PILL.get(pid, {}).get('recipe', {}).get('inputs', []) if i['id'] in M]
    return max(zs, key=list(ZST.values()).index) if zs else 'lk3'
def price_for(s):
    i, cur = s['id'], s.get('currency', 'linh-thach')
    r = REC.get(i)
    if cur == 'tien-ngoc': return None
    if r and r.get('cat') == 'cong-phap': return nice(lt_min(SKU[r['teaches']]) * BOOK_MIN), 'bí kíp · 30 phút LT ở cảnh giới mở'
    if r and r.get('cat') == 'dan-phuong':
        st = BT.get(r['teaches'])
        if st: return nice(lt_min(st) * RECIPE_PILL_MIN), 'đan phương đột phá · 30 phút LT'
        st = pill_stage(r['teaches'])  # đan thường: theo vùng của nguyên liệu khó nhất — chưa tới vùng đó thì chưa bán
        if st != 'lk3': s['min_stage'] = st
        return nice(lt_min(st) * 15), f'đan phương thường · 15 phút LT ở {st}'
    if r and r.get('cat') == 'phap-khi': return nice(lt_min(BL[r['teaches']]) * RECIPE_BLANK_MIN), 'công thức phôi · 20 phút LT ở cảnh giới mở ô'
    if i in M and cur == 'linh-thach':
        m = M[i]; st = ZST[m['zone']]
        return nice(lt_min(st) / per_min(i, st) * RETAIL_MUL), 'nguyên liệu · giá farm × 1,5'
    if i in M and cur == 'vang':
        m = M[i]; st = 'lk3'
        return nice(lt_min(st) / per_min(i, st) * RETAIL_MUL * 16), 'nguyên liệu · giá farm × 1,5 × 16 Vàng'
    if cur == 'vang' and i == 'item.dan.tieu-hoi-huyet.001': return nice(lt_min('lk3') * 16 * 1.5), 'đan hồi huyết · 1,5 phút Vàng'
    if cur == 'vang' and i == 'item.dan.hoi-linh.001': return nice(lt_min('lk3') * 16 * 2), 'đan hồi linh · 2 phút Vàng'
    return None
for s in shop['stock']:
    r = price_for(s)
    if not r: continue
    new, why = r; old = s['price']
    if new != old: report.append(('Giá', s['id'], s.get('currency', 'linh-thach'), f'{old} → {new}', why))
    s['price'] = new
# công thức phôi Cánh / Pháp tướng: trước chỉ rơi từ thủ lĩnh — nay bán thêm (cần đúng cảnh giới)
have = {s['id'] for s in shop['stock']}
for rid, st in [('item.congthuc.canh.001', 'na_so'), ('item.congthuc.phap-tuong.001', 'ht_so')]:
    if rid not in have:
        p = nice(lt_min(st) * RECIPE_BLANK_MIN); shop['stock'].insert(max(k for k, s in enumerate(shop['stock']) if s['id'].startswith('item.congthuc.')) + 1, {'id': rid, 'price': p, 'min_stage': st})
        report.append(('Thêm', rid, st, str(p), 'công thức phôi · 20 phút LT'))
shop['_ghi_chu_gia'] = 'Giá tính bằng tools/shop_balance.py theo "phút farm" ở cảnh giới dùng món (chủ dự án 23/10 21h). Sửa hằng số trong tool rồi chạy lại, không sửa tay.'
W('data/shop.json', shop)
for r in report: print(' | '.join(map(str, r)))
