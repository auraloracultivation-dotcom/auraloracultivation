"""Tiếng tiến trình, vật phẩm, nhiệm vụ, giao diện, sự kiện. Ngũ cung Rê, tròn, sáng, ngắn — kiểu game pixel thân thiện."""
import numpy as np

from dsp import (adsr, bell, bp, crush, exp_env, finish, hp, lp, mix, noise, osc, partials, pluck, reverb, sweep,
                 sweep_bp, t_, thump)

PENTA = [293.66, 329.63, 369.99, 440.0, 493.88]  # D4 E4 F#4 A4 B4
def pn(i):  # nốt ngũ cung thứ i (âm = thấp xuống)
    o, k = divmod(i, 5)
    return PENTA[k] * 2 ** o


def tone(f, d, kind='tri', tau=0.12, a=0.003):  # nốt chiptune mềm
    return lp(osc(f, d, kind), 5000) * exp_env(d, tau, a)


def chime(freqs, gap, d=0.8, tau=0.35, gain=0.4, ratio=3.0, idx=1.6):
    return mix(*[(bell(f, d, ratio, idx, tau, 0.08), i * gap, gain) for i, f in enumerate(freqs)])


def len_cap():  # lên cấp: chạy nốt ngũ cung đi lên (đàn gảy + chuông)
    seq = [pn(5), pn(6), pn(7), pn(8), pn(10)]
    pl = mix(*[(pluck(f, 0.5, 0.6, 0.995, 400 + i), i * 0.07, 0.5) for i, f in enumerate(seq)])
    return finish(reverb(mix((pl, 0, 1.0), (chime([pn(10), pn(12)], 0.06), 0.3, 1.0)), 0.25, 0.9), 1.2, tail=0.2)


def dot_pha():  # đột phá thành công: sấm nhẹ + hợp âm trưởng dâng + chuông
    crack = hp(noise(0.08, 411), 1800) * exp_env(0.08, 0.015, 0.0003)
    rumble = lp(noise(1.2, 412), 280) * exp_env(1.2, 0.35, 0.03)
    pad = mix(*[(lp(osc(f, 2.0, 'saw') + osc(f * 1.003, 2.0, 'saw'), 2200) * adsr(2.0, 0.35, 0.3, 0.55, 1.2), 0, 0.15) for f in (146.83, 220.0, 293.66, 369.99)])
    bells = chime([pn(10), pn(12), pn(13), pn(15)], 0.09, 1.6, 0.6, 0.3, 2.6)
    return finish(reverb(mix((crack, 0, 0.8), (rumble, 0, 0.8), (pad, 0.2, 1.0), (bells, 0.35, 1.0)), 0.3, 1.3), 1.25, tail=0.5)


def dot_pha_loi():  # đột phá thất bại: sấm + tụt nốt (không bi thảm, kiểu "ôi tiếc quá")
    crack = hp(noise(0.08, 421), 1800) * exp_env(0.08, 0.015, 0.0003)
    down = mix(*[(tone(f, 0.35, 'square', 0.12), i * 0.14, 0.25) for i, f in enumerate([pn(8), pn(6), pn(4), pn(1)])])
    return finish(reverb(mix((crack, 0, 0.7), (lp(noise(1.0, 422), 300) * exp_env(1.0, 0.3), 0, 0.7), (lp(down, 2500), 0.15, 1)), 0.2, 1.0), 1.2, tail=0.3)


def thuc_tinh():  # thức tỉnh 1 dòng: lấp lánh đi lên
    up = sweep_bp(noise(0.4, 431), 1500, 8000, 1.4) * np.linspace(0, 1, 17640) ** 2
    return finish(reverb(mix((up, 0, 0.3), (chime([pn(10), pn(12), pn(14)], 0.06, 0.6, 0.25, 0.3), 0.25, 1)), 0.25, 0.8), 1.2, tail=0.15)


def thuc_tinh_hiem():  # ra dòng hiếm (Cam trở lên): hợp âm sáng + rắc sao
    r = np.random.default_rng(441)
    stars = mix(*[(bell(float(f), 0.4, 2.0, 1.0, 0.15, 0.05), float(st), 0.12) for st, f in zip(np.sort(r.uniform(0.3, 1.0, 10)), r.choice([pn(i) for i in range(12, 17)], 10))])
    x = mix((thuc_tinh(), 0, 0.8), (chime([pn(8), pn(10), pn(12), pn(15)], 0.04, 1.4, 0.5, 0.3, 2.4), 0.3, 1), (stars, 0, 1))
    return finish(reverb(x, 0.3, 1.1), 1.2, tail=0.4)


def nhat():  # nhặt đồ: "ting" gảy nhỏ
    return finish(mix((pluck(pn(12), 0.25, 0.8, 0.99, 451), 0, 0.7), (tone(pn(17), 0.1, 'sine', 0.04), 0.01, 0.25)), 1.2, tail=0.04)


def vang():  # nhận Vàng: leng keng xu
    r = np.random.default_rng(461)
    coins = mix(*[(partials([f, f * 2.76, f * 5.4], 0.2, [0.08, 0.05, 0.03], [1, .5, .3]), st, 0.3)
                  for st, f in zip([0, 0.05, 0.11, 0.15], r.uniform(2200, 3400, 4))])
    return finish(coins, 1.2, tail=0.05)


def mua():  # mua đồ: xu + "đinh" xác nhận
    return finish(mix((vang(), 0, 0.7), (chime([pn(10), pn(12)], 0.07, 0.5, 0.2, 0.35), 0.12, 1)), 1.1, tail=0.1)


def nv_xong():  # xong bước nhiệm vụ: khánh nhẹ + 3 nốt vui
    gong = bell(pn(3), 1.4, 1.41, 3.0, 0.7, 0.2)
    fan = mix(*[(pluck(f, 0.5, 0.6, 0.995, 470 + i), i * 0.09, 0.5) for i, f in enumerate([pn(7), pn(8), pn(10)])])
    return finish(reverb(mix((gong, 0, 0.35), (fan, 0.05, 1), (chime([pn(12)], 0, 0.8, 0.35, 0.3), 0.3, 1)), 0.25, 1.0), 1.2, tail=0.3)


def npc_noi():  # NPC nói: "bíp" chữ chạy (rất ngắn, lệch cao độ mỗi lần)
    return finish(tone(pn(9), 0.045, 'square', 0.02), 1.0, peak=0.5, tail=0.01)


def chon():  # chọn / xác nhận lớn (chọn hệ, ghép xong lựa chọn)
    return finish(reverb(chime([pn(5), pn(7), pn(10)], 0.03, 0.9, 0.4, 0.35), 0.25, 0.9), 1.2, tail=0.2)


def hop_nhat():  # kích Thiên Cơ Hợp Nhất: vù dâng + hợp âm lớn sáng
    up = sweep_bp(noise(1.0, 481), 300, 7000, 1.3) * np.linspace(0, 1, 44100) ** 2
    pad = mix(*[(lp(osc(f, 1.6, 'saw') + osc(f * 1.004, 1.6, 'saw'), 2600) * adsr(1.6, 0.05, 0.4, 0.5, 0.9), 0, 0.15) for f in (146.83, 220.0, 293.66, 369.99, 440.0)])
    return finish(reverb(mix((up, 0, 0.4), (pad, 0.9, 1), (chime([pn(10), pn(12), pn(13), pn(15), pn(17)], 0.06, 1.3, 0.5, 0.25, 2.6), 0.95, 1)), 0.3, 1.2), 1.25, tail=0.5)


def ghep():  # ghép Truyền Thừa: kèn chiptune + chuông
    seq = [(pn(5), 0.0, 0.15), (pn(7), 0.15, 0.15), (pn(8), 0.3, 0.15), (pn(10), 0.45, 0.6)]
    horn = mix(*[(lp(osc(f, d + 0.1, 'pulse25'), 3000) * adsr(d + 0.1, 0.01, 0.05, 0.6, 0.08), st, 0.18) for f, st, d in seq])
    return finish(reverb(mix((horn, 0, 1), (chime([pn(10), pn(12), pn(15)], 0.05, 1.2, 0.5, 0.3), 0.45, 1), (thump(0.3, 120, 50, 0.08), 0.45, 0.5)), 0.25, 1.0), 1.2, tail=0.4)


def truyen_tong():  # truyền tống: lấp lánh xoáy lên + "vút"
    swirl = sweep_bp(noise(0.9, 491), 400, 6500, 1.3) * adsr(0.9, 0.4, 0.3, 0.6, 0.2) * (0.7 + 0.3 * np.sin(2 * np.pi * 9 * t_(0.9)))
    return finish(reverb(mix((swirl, 0, 0.55), (chime([pn(7), pn(10), pn(12), pn(15)], 0.12, 0.6, 0.25, 0.25), 0.1, 1)), 0.3, 1.0), 1.2, tail=0.25)


def ui_cham():  # chạm nút: "tách" gỗ nhỏ
    return finish(bp(noise(0.03, 501), 1800, 3200) * exp_env(0.03, 0.006, 0.0003) * 4 + tone(pn(10), 0.03, 'sine', 0.01) * 0.3, 1.0, peak=0.55, tail=0.005)


def ui_mo():  # mở bảng: vù lên mềm
    return finish(mix((sweep_bp(noise(0.14, 511), 900, 3500, 1.5) * np.sin(np.pi * np.linspace(0, 1, 6174)), 0, 0.5), (tone(pn(10), 0.08, 'sine', 0.04), 0.06, 0.25)), 1.0, peak=0.6)


def ui_dong():  # đóng bảng: vù xuống mềm
    return finish(sweep_bp(noise(0.12, 521), 3200, 900, 1.5) * np.sin(np.pi * np.linspace(0, 1, 5292)) * 0.5, 1.0, peak=0.5)


def ui_loi():  # lỗi / không được: hai nốt trầm "bùp bùp" (nhẹ nhàng, không chói)
    return finish(mix((tone(pn(-2), 0.09, 'square', 0.05), 0, 0.3), (tone(pn(-3), 0.11, 'square', 0.06), 0.1, 0.3)), 1.0, peak=0.6)


def am_hu():  # Âm Hư xuất thế: khánh trầm + ngân mờ (cảnh báo, kỳ bí)
    gong = bell(73.42, 3.0, 1.41, 5.0, 1.4, 0.6) + 0.5 * bell(110.0, 3.0, 2.76, 3.0, 1.0, 0.4)
    drone = lp(osc(55.0, 3.0, 'saw') + osc(55.6, 3.0, 'saw') + osc(82.4, 3.0, 'saw') * 0.5, 500) * adsr(3.0, 0.8, 0.3, 0.7, 1.4)
    return finish(reverb(mix((gong, 0, 0.8), (drone, 0, 0.35)), 0.35, 1.4), 1.3, tail=0.8)


def bc_dot():  # bí cảnh vào đợt: 3 tiếng trống trận + kèn ngắn
    drum = lambda s: thump(0.35, 120, 45, 0.11) + lp(noise(0.35, s), 900) * exp_env(0.35, 0.05) * 0.4
    horn = lp(osc(pn(3) / 2, 0.5, 'saw') + osc(pn(3) / 2 * 1.005, 0.5, 'saw'), 1400) * adsr(0.5, 0.04, 0.1, 0.7, 0.2)
    return finish(reverb(mix((drum(531), 0, 1), (drum(532), 0.18, 0.9), (drum(533), 0.36, 1.1), (horn, 0.4, 0.35)), 0.2, 1.0), 1.3, tail=0.2)


def bc_thang():  # vượt bí cảnh: nhạc thắng chiptune vui
    seq = [(pn(5), 0, .12), (pn(7), .12, .12), (pn(8), .24, .12), (pn(10), .36, .24), (pn(8), .62, .12), (pn(10), .74, .5)]
    lead = mix(*[(lp(osc(f, d + 0.08, 'pulse25'), 3500) * adsr(d + 0.08, 0.005, 0.05, 0.6, 0.06), st, 0.2) for f, st, d in seq])
    bass = mix(*[(lp(osc(f, 0.3, 'tri'), 1500) * adsr(0.3, 0.005, 0.1, 0.5, 0.1), st, 0.3) for f, st in [(pn(0) / 2, 0), (pn(3) / 2, 0.36), (pn(0) / 2, 0.74)]])
    return finish(reverb(mix((lead, 0, 1), (bass, 0, 1), (chime([pn(15)], 0, 1.0, 0.45, 0.2), 0.74, 1)), 0.2, 1.0), 1.2, tail=0.4)


def bc_thua():  # thua bí cảnh: tụt chậm "ôi" (nhẹ, không nặng nề)
    seq = [(pn(7), 0), (pn(6), 0.18), (pn(5), 0.36), (pn(2), 0.54)]
    lead = mix(*[(lp(osc(f, 0.35, 'tri'), 3000) * adsr(0.35, 0.01, 0.1, 0.5, 0.15), st, 0.4) for f, st in seq])
    return finish(reverb(lead, 0.25, 1.0), 1.2, tail=0.3)


SOUNDS = {
    'sfx.len-cap': len_cap, 'sfx.dot-pha': dot_pha, 'sfx.dot-pha.loi': dot_pha_loi, 'sfx.thuc-tinh': thuc_tinh,
    'sfx.thuc-tinh.hiem': thuc_tinh_hiem, 'sfx.nhat': nhat, 'sfx.vang': vang, 'sfx.mua': mua, 'sfx.nv.xong': nv_xong,
    'sfx.npc.noi': npc_noi, 'sfx.chon': chon, 'sfx.hop-nhat': hop_nhat, 'sfx.ghep': ghep, 'sfx.truyen-tong': truyen_tong,
    'sfx.ui.cham': ui_cham, 'sfx.ui.mo': ui_mo, 'sfx.ui.dong': ui_dong, 'sfx.ui.loi': ui_loi, 'sfx.am-hu': am_hu,
    'sfx.bc.dot': bc_dot, 'sfx.bc.thang': bc_thang, 'sfx.bc.thua': bc_thua,
}
