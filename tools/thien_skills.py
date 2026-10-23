"""6 BỘ KỸ NĂNG THIÊN HỆ (chủ dự án 24/10/2026): mỗi hệ 1 kỹ năng chính + 1 phụ + 1 pháp bảo — điều kiện Thiên Cơ Hợp Nhất của hệ đó.
Hiệu ứng: tools/thien_fx.py (t.*). Cảm giác đòn kiểu My Heroes: charge_s (gồng), dim (tối màn hình), shake (rung) — src/game/juice.js.
Có được: phó bản Thiên Cơ Truyền Thừa (bi-canh.json → extra, 1 lượt/ngày, qua hết = 1 kỹ năng hoặc pháp bảo Thiên hệ chưa có).
Số liệu TẠM — chỉnh ở đây rồi chạy lại: python3 -I tools/thien_skills.py (chạy sau equip_thien_he.py nếu chạy lại tool đó).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
J = lambda p: json.loads((ROOT / p).read_text())
def W(p, d): (ROOT / p).write_text(json.dumps(d, ensure_ascii=False, indent=2 if (ROOT / p).read_text().startswith('{\n  "') else 1) + '\n')

HIT = {'charge_s': 0.35, 'dim': 0.55, 'shake': 5}  # chiêu chính: gồng + tối + rung
SK = {  # mã → (hệ, chính?, thông số)
    'thanh-quang-phan-quyet': ('Quang', True, {'name': 'Thánh Quang Phán Quyết', 'kind': 'strike', 'unlock': 'ht_so', 'mp': 55, 'cd_s': 16, 'mul': 3.6, 'radius_px': 95, 'range_px': 280,
        'fx': 't.quang-phan-quyet', 'fx_h': 130, 'charge_fx': 't.quang-gong', 'charge_h': 72, **HIT, 'icon': ['t.quang-phan-quyet', 5], 'desc': 'Gồng thánh kiếm rồi giáng cột sáng xuống mục tiêu (bán kính {radius_px})'}),
    'trieu-duong-ho-the': ('Quang', False, {'name': 'Triều Dương Hộ Thể', 'kind': 'buff', 'unlock': 'na_hau', 'mp': 30, 'cd_s': 24, 'buff': 'def', 'buff_mul': 1.8, 'last_s': 8,
        'fx': 't.quang-ho-the', 'fx_h': 70, 'icon': ['t.quang-ho-the', 2], 'desc': 'Vầng mặt trời hộ thể: phòng thủ ×{buff_mul} trong {last_s} giây'}),
    'loi-long-pha-khong': ('Lôi', True, {'name': 'Lôi Long Phá Không', 'kind': 'bolt', 'unlock': 'ht_so', 'mp': 55, 'cd_s': 15, 'mul': 3.4, 'pierce': True, 'range_px': 360, 'speed_px_per_s': 720,
        'fx': 't.loi-long', 'fx_size': 70, 'hit_fx': 't.loi-no', 'hit_h': 60, 'splash_px': 50, 'cast_fx': 't.loi-cong', **HIT, 'charge_s': 0.25, 'dim': 0.45, 'shake': 4,
        'icon': ['t.loi-long', 1], 'desc': 'Mở cổng sấm, rồng sét lao xuyên hàng quái, nổ lan'}),
    'tu-dien-bo': ('Lôi', False, {'name': 'Tử Điện Bộ', 'kind': 'blink', 'unlock': 'na_hau', 'mp': 18, 'cd_s': 7, 'mul': 2.0, 'range_px': 260, 'fx': 't.loi-buoc', 'fx_h': 60, 'shake': 2,
        'icon': ['t.loi-buoc', 3], 'desc': 'Hoá tia chớp lướt ra sau lưng mục tiêu và chém'}),
    'bang-phach-thien-nguc': ('Băng', True, {'name': 'Băng Phách Thiên Ngục', 'kind': 'strike', 'unlock': 'ht_so', 'mp': 50, 'cd_s': 16, 'mul': 2.8, 'stun_s': 2.5, 'radius_px': 85, 'range_px': 260,
        'fx': 't.bang-nguc', 'fx_h': 120, 'charge_fx': 't.bang-xoay', 'charge_h': 56, **HIT, 'charge_s': 0.3, 'dim': 0.5, 'shake': 4, 'icon': ['t.bang-nguc', 4],
        'desc': 'Ngục băng đóng kín quanh mục tiêu, choáng {stun_s} giây rồi vỡ tung'}),
    'huyen-bang-lien-hoa': ('Băng', False, {'name': 'Huyền Băng Liên Hoa', 'kind': 'area_self', 'unlock': 'na_hau', 'mp': 28, 'cd_s': 11, 'mul': 1.4, 'stun_s': 1.2, 'radius_px': 100,
        'fx': 't.bang-sen', 'fx_h': 80, 'icon': ['t.bang-sen', 3], 'desc': 'Sen băng nở dưới chân, đánh và làm đứng quái quanh mình {stun_s} giây'}),
    'cuu-u-phong-bao': ('Phong', True, {'name': 'Cửu U Phong Bạo', 'kind': 'tornado', 'unlock': 'ht_so', 'mp': 50, 'cd_s': 15, 'mul': 0.9, 'radius_px': 46, 'speed': 80, 'last_s': 3.5,
        'fx': 't.phong-loc', 'fx_h': 110, 'charge_fx': 't.phong-no', 'charge_h': 50, **HIT, 'charge_s': 0.25, 'dim': 0.4, 'shake': 3, 'icon': ['t.phong-loc', 4],
        'desc': 'Lốc xoáy khổng lồ cuốn đi phía trước {last_s} giây, xay mọi quái nó đi qua'}),
    'thanh-phong-toai-anh': ('Phong', False, {'name': 'Thanh Phong Toái Ảnh', 'kind': 'wave', 'unlock': 'na_hau', 'mp': 26, 'cd_s': 9, 'mul': 2.0, 'len': 220, 'w': 60, 'push': 40,
        'fx': 't.phong-anh', 'fx_h': 60, 'icon': ['t.phong-anh', 1], 'desc': 'Tách thành bóng gió chém thẳng phía trước, đẩy lùi quái'}),
    'hu-khong-thon-phe': ('Hư', True, {'name': 'Hư Không Thôn Phệ', 'kind': 'pull', 'unlock': 'ht_so', 'mp': 55, 'cd_s': 16, 'mul': 2.6, 'radius_px': 170, 'stun_s': 1.2,
        'fx': 't.hu-hac-dong', 'fx_h': 120, 'charge_fx': 't.hu-tru', 'charge_h': 70, **HIT, 'dim': 0.6, 'icon': ['t.hu-hac-dong', 4],
        'desc': 'Hố đen hút mọi quái trong bán kính {radius_px} về một điểm rồi nghiền nát'}),
    'tich-diet-tram': ('Hư', False, {'name': 'Tịch Diệt Trảm', 'kind': 'wave', 'unlock': 'na_hau', 'mp': 28, 'cd_s': 9, 'mul': 2.4, 'len': 240, 'w': 70,
        'fx': 't.hu-tram', 'fx_h': 70, 'shake': 2, 'icon': ['t.hu-tram', 4], 'desc': 'Một nhát chém tím xé khe nứt không gian phía trước'}),
    'thien-thu-nhat-thuan': ('Thời', True, {'name': 'Thiên Thu Nhất Thuấn', 'kind': 'strike', 'unlock': 'ht_so', 'mp': 60, 'cd_s': 18, 'mul': 3.8, 'radius_px': 100, 'range_px': 260,
        'fx': 't.thoi-vong', 'fx_h': 130, 'charge_fx': 't.thoi-dong-ho', 'charge_h': 64, **HIT, 'charge_s': 0.4, 'dim': 0.6, 'shake': 6, 'icon': ['t.thoi-vong', 6],
        'desc': 'Nghìn năm dồn trong một khoảnh khắc: vòng thời gian giáng xuống, quái vỡ vụn'}),
    'tue-nguyet-dinh-chi': ('Thời', False, {'name': 'Tuế Nguyệt Đình Chỉ', 'kind': 'area_self', 'unlock': 'na_hau', 'mp': 30, 'cd_s': 18, 'mul': 0.6, 'stun_s': 3, 'radius_px': 130,
        'fx': 't.thoi-ngung', 'fx_h': 90, 'icon': ['t.thoi-ngung', 4], 'desc': 'Tiếng chuông ngưng đọng thời gian: quái quanh mình đứng im {stun_s} giây'}),
}
PB = [
    {'id': 'pb.dai-nhat-kim-luan', 'name': 'Đại Nhật Kim Luân', 'he': 'Quang', 'kind': 'ring_burst', 'mp': 22, 'cd_s': 10, 'mul': 1.3, 'n': 18, 'fx': 't.quang-dan', 'size': 26,
     'icon': ['t.quang-ho-the', 2], 'cast_fx': 't.quang-ho-the', 'shake': 2, 'desc': 'Kim luân toả {n} tia nắng vàng quanh mình rồi tự đuổi quái'},
    {'id': 'pb.tu-dien-loi-ky', 'name': 'Tử Điện Lôi Kỳ', 'he': 'Lôi', 'kind': 'tower', 'mp': 30, 'cd_s': 22, 'mul': 0.7, 'r': 200, 's': 10, 'every': 0.35, 'fx': 't.loi-tru', 'h': 70,
     'icon': ['t.loi-cong', 0], 'cast_fx': 't.loi-no', 'desc': 'Cắm lôi kỳ xuống đất: {s} giây sét đánh liên hồi quái quanh cờ'},
    {'id': 'pb.luu-ly-tran', 'name': 'Băng Phách Lưu Ly Trản', 'he': 'Băng', 'kind': 'nova', 'mp': 26, 'cd_s': 16, 'mul': 1.2, 'r': 120, 'stun': 2.5, 'fx': 't.bang-xoay', 'h': 90,
     'icon': ['t.bang-dan', 0], 'cast_fx': 't.bang-sen', 'shake': 3, 'dim': 0.35, 'desc': 'Rót lửa băng lưu ly: đóng băng mọi quái quanh mình'},
    {'id': 'pb.phong-an-phien', 'name': 'Càn Khôn Phong Ấn Phiến', 'he': 'Phong', 'kind': 'sweep', 'mp': 22, 'cd_s': 12, 'mul': 0.9, 'n': 18, 's': 1.0, 'fx': 't.phong-nhan', 'size': 34,
     'icon': ['t.phong-nhan', 1], 'cast_fx': 't.phong-no', 'desc': 'Quạt một cái: {n} lưỡi gió quét quạt trước mặt'},
    {'id': 'pb.hu-khong-ban', 'name': 'Vô Cực Hư Không Bàn', 'he': 'Hư', 'kind': 'net', 'mp': 22, 'cd_s': 14, 'mul': 0.9, 'r': 130, 'stun': 2, 'fx': 't.hu-xoay',
     'icon': ['t.hu-xoay', 2], 'cast_fx': 't.hu-tru', 'shake': 3, 'desc': 'Mở cổng hư không: kéo quái về một chỗ, trói và đánh'},
    {'id': 'pb.tue-nguyet-sa-lau', 'name': 'Tuế Nguyệt Sa Lậu', 'he': 'Thời', 'kind': 'rewind', 'mp': 30, 'cd_s': 40, 'heal': 0.3, 'fx': 't.thoi-sa-lau', 'h': 90,
     'icon': ['t.thoi-sa-lau', 4], 'dim': 0.4, 'desc': 'Lật ngược đồng hồ cát: hồi khí huyết và làm mới hồi chiêu mọi kỹ năng'},
]

gp = J('data/gameplay.json'); S = gp['skills']
for sid, (he, main, s) in SK.items():
    S[sid] = {**s, 'he': he, 'thien': True, 'thien_role': 'chinh' if main else 'phu'}
    if sid not in S['_order']: S['_order'].append(sid)
S['_ghi_chu_thien'] = 'Chủ dự án 24/10: 12 kỹ năng Thiên hệ (thien: true) — không rơi từ boss, chỉ từ phó bản Thiên Cơ Truyền Thừa. charge_s/dim/shake: gồng, tối màn hình, rung (juice.js). Sinh bằng tools/thien_skills.py.'
W('data/gameplay.json', gp)

pb = J('data/build/phap-bao.json'); ids = {p['id'] for p in PB}
pb['list'] = [p for p in pb['list'] if p['id'] not in ids] + [{**p, 'thien': True} for p in PB]
pb['_ghi_chu_thien'] = 'Chủ dự án 24/10: 6 pháp bảo Thiên hệ (thien: true) — không ra từ Phôi Pháp Bảo, chỉ từ phó bản Thiên Cơ Truyền Thừa. kind rewind: hồi máu + làm mới hồi chiêu.'
W('data/build/phap-bao.json', pb)

dv = J('data/build/dao-van.json'); HN = dv['hop_nhat']['he']
for sid, (he, main, s) in SK.items():
    HN[he]['skill_sin' if main else 'skill_cui'] = sid
    HN[he].pop('twin', None)  # Thiên hệ: phải đúng pháp bảo của hệ (không mượn hệ ngũ hành nữa)
dv['hop_nhat']['_ghi_chu_thien'] = 'Chủ dự án 24/10: Hợp Nhất Thiên hệ dùng kỹ năng + pháp bảo riêng (tools/thien_skills.py); Thần Phù vẫn dùng chung với hệ ngũ hành tương ứng.'
W('data/build/dao-van.json', dv)

bc = J('data/build/bi-canh.json')
bc['extra'] = [x for x in bc.get('extra', []) if x['id'] != 'truyen-thua'] + [{
    'id': 'truyen-thua', 'name': 'Thiên Cơ Truyền Thừa', 'state_key': 'biCanhTT', 'tries_per_day': 1, 'hp_per_wave': 0.3, 'base_count': 8, 'per_wave': 3,
    'desc': 'Mỗi ngày 1 lượt. Vượt hết 10 đợt quái cảnh giới của bạn để nhận 1 truyền thừa Thiên hệ chưa có: một trong 12 kỹ năng (2 mỗi hệ Quang · Lôi · Băng · Phong · Hư · Thời) hoặc một trong 6 pháp bảo Thiên hệ. Đủ cả thì đổi Linh thạch.',
    'reward': {'stone_per_wave': 400, 'gold_per_wave': 1000, 'card_at': [], 'card_min_tier': [], 'items_per_3': [], 'full_clear': [], 'treasure_blank_at': 99, 'set_item_at': 99,
               'thien_skill': 1, 'dup_stone': 3000}}]
W('data/build/bi-canh.json', bc)
print(len(SK), 'kỹ năng,', len(PB), 'pháp bảo Thiên hệ')
