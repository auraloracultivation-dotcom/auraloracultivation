"""Tiếng kỹ năng theo hệ (Kim · Mộc · Thủy · Hỏa · Thổ · Ám · Thiên), pháp bảo, pháp tướng, bay / hạ cánh.
Phong cách (chủ dự án 24/10): gần gũi, dễ thương, đơn giản — tròn, sáng, ngắn; ngũ cung Rê (D E F# A B)."""
import numpy as np

from dsp import (adsr, bell, bp, crush, exp_env, finish, hp, lp, mix, noise, osc, partials, pluck, reverb, sweep,
                 sweep_bp, t_, thump)

D5, E5, FS5, A5, B5, D6 = 587.33, 659.26, 739.99, 880.0, 987.77, 1174.66


def _arp(freqs, gap, d=0.6, tau=0.25, gain=0.4, ratio=3.0):
    return mix(*[(bell(f, d, ratio, 1.5, tau, 0.08), i * gap, gain) for i, f in enumerate(freqs)])


def he_kim():  # Kim: "xoẹt-keng" sáng, hai lưỡi + lấp lánh
    wh = sweep_bp(noise(0.14, 201), 7000, 2000) * adsr(0.14, 0.03, 0.1, 0, 0.01)
    k1 = partials([2637, 3951, 5274], 0.3, [0.12, 0.09, 0.06], [1, .6, .35], drop=0.02)
    k2 = partials([3136, 4699, 6272], 0.3, [0.1, 0.07, 0.05], [1, .6, .35], drop=0.02)
    x = mix((wh, 0, 0.45), (k1, 0.03, 0.3), (k2, 0.11, 0.25), (_arp([A5 * 2, D6 * 2], 0.05, 0.4, 0.12, 0.12), 0.16, 1))
    return finish(reverb(crush(x, 12, 2, 0.25), 0.15, 0.6), 1.2, tail=0.08)


def he_moc():  # Mộc: gõ mõ gỗ tròn + lá xào xạc
    knock = lambda f: bp(noise(0.12, int(f)), f * 0.9, f * 1.1, 2) * exp_env(0.12, 0.03, 0.0005) * 6
    rustle = bp(noise(0.35, 211), 2500, 7000) * (adsr(0.35, 0.05, 0.2, 0.3, 0.1)) * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t_(0.35)))
    x = mix((knock(620), 0, 0.6), (knock(930), 0.07, 0.5), (rustle, 0.05, 0.3), (pluck(D5, 0.5, 0.35, 0.993, 212), 0.12, 0.35))
    return finish(reverb(x, 0.12, 0.5), 1.3, tail=0.08)


def he_thuy():  # Thủy: tạt nước + bong bóng
    splash = sweep_bp(noise(0.3, 221), 5000, 700, 1.3) * exp_env(0.3, 0.09, 0.004)
    bubbles = mix(*[(osc(sweep(0.06, f, f * 1.8), kind='sine') * exp_env(0.06, 0.02, 0.002), st, 0.3)
                    for st, f in [(0.05, 500), (0.11, 700), (0.16, 620), (0.22, 880), (0.27, 760)]])
    return finish(reverb(mix((splash, 0, 0.7), (bubbles, 0, 1.0)), 0.18, 0.7), 1.2, tail=0.1)


def he_hoa():  # Hỏa: "phừng" lửa bùng + lách tách
    roar = lp(noise(0.5, 231), 1600) * adsr(0.5, 0.03, 0.25, 0.25, 0.2)
    burst = sweep_bp(noise(0.2, 232), 600, 3500) * exp_env(0.2, 0.07, 0.01)
    r = np.random.default_rng(233)
    crack = mix(*[(hp(noise(0.012, 234 + i), 2500) * exp_env(0.012, 0.003, 0.0002), float(st), 0.5) for i, st in enumerate(np.sort(r.uniform(0.08, 0.45, 9)))])
    return finish(mix((roar, 0, 0.6), (burst, 0, 0.55), (crack, 0, 1.0), (thump(0.2, 120, 50, 0.06), 0, 0.4)), 1.3, tail=0.08)


def he_tho():  # Thổ: đá dộng "uỳnh" + sỏi lạo xạo
    r = np.random.default_rng(241)
    gravel = mix(*[(bp(noise(0.03, 242 + i), 700, 3000) * exp_env(0.03, 0.008), float(st), 0.35) for i, st in enumerate(np.sort(r.uniform(0.04, 0.35, 12)))])
    x = mix((thump(0.5, 110, 38, 0.14), 0, 1.0), (lp(noise(0.45, 243), 500) * exp_env(0.45, 0.12, 0.003), 0, 0.6), (gravel, 0, 1.0))
    return finish(crush(x, 11, 2, 0.3), 1.4, tail=0.1)


def he_am():  # Ám: luồng khói mờ cuộn ngược + ngân trầm bí ẩn (không đáng sợ)
    swell = sweep_bp(noise(0.45, 251), 300, 2500, 1.5) * np.linspace(0, 1, 19845) ** 2
    hum = lp(osc(146.8, 0.6, 'saw') + osc(148.6, 0.6, 'saw'), 700) * adsr(0.6, 0.2, 0.2, 0.6, 0.25)
    sparkle = _arp([B5, FS5, D5], 0.06, 0.5, 0.18, 0.15, 2.0)
    return finish(reverb(mix((swell, 0, 0.5), (hum, 0.15, 0.35), (sparkle, 0.4, 1.0)), 0.25, 0.9), 1.2, tail=0.12)


def he_thien():  # Thiên hệ (Quang · Lôi · Băng · Phong · Hư · Thời): sấm chớp sáng — tách + rền + chuông trời
    crack = hp(noise(0.08, 261), 1800) * exp_env(0.08, 0.015, 0.0003)
    rumble = lp(noise(1.0, 262), 300) * exp_env(1.0, 0.3, 0.02)
    x = mix((crack, 0, 0.9), (rumble, 0.02, 0.9), (_arp([D6, A5 * 2, D6 * 2], 0.04, 0.8, 0.3, 0.18, 2.4), 0.05, 1))
    return finish(reverb(x, 0.25, 1.0), 1.3, tail=0.2)


def phap_bao():  # pháp bảo bấm tay: vù phép + hợp âm chuông
    wh = sweep_bp(noise(0.3, 271), 800, 4500, 1.4) * np.sin(np.pi * np.linspace(0, 1, 13230))
    x = mix((wh, 0, 0.45), (_arp([D5, A5, D6], 0.035, 0.7, 0.3, 0.35), 0.08, 1))
    return finish(reverb(x, 0.22, 0.8), 1.2, tail=0.15)


def hop_nhat_ban():  # Thiên Cơ Hợp Nhất tự phóng (mỗi 0,45 giây): "píu" nhỏ, nhẹ, không gây mệt tai
    x = osc(sweep(0.09, 1400, 700), kind='tri') * exp_env(0.09, 0.03, 0.002)
    return finish(lp(x, 4000), 1.0, peak=0.6, tail=0.02)


def luot():  # Lướt
    wh = sweep_bp(noise(0.22, 281), 700, 4000, 1.5) * np.sin(np.pi * np.linspace(0, 1, 9702)) ** 1.5
    return finish(mix((wh, 0, 0.8), (osc(sweep(0.12, 600, 1500), kind='tri') * exp_env(0.12, 0.05), 0.04, 0.12)), 1.2)


def bay():  # ngự kiếm cất cánh: kiếm ngân + gió dâng
    wind = sweep_bp(noise(0.7, 291), 400, 2600, 1.5) * adsr(0.7, 0.25, 0.2, 0.5, 0.25)
    ring = partials([1318.5, 1975.5, 2637], 0.6, [0.3, 0.2, 0.12], [1, .5, .3])
    return finish(reverb(mix((wind, 0, 0.6), (ring, 0.05, 0.25), (_arp([D5, FS5, A5], 0.05, 0.5, 0.2, 0.15), 0.2, 1)), 0.2, 0.8), 1.2, tail=0.15)


def ha_canh():  # hạ cánh: gió hạ + chạm đất êm
    wind = sweep_bp(noise(0.35, 301), 2400, 500, 1.5) * adsr(0.35, 0.05, 0.25, 0.2, 0.08)
    return finish(mix((wind, 0, 0.6), (thump(0.2, 140, 60, 0.05), 0.28, 0.6)), 1.2)


def phap_tuong():  # Pháp tướng hoá hình (3,8 giây, cao trào giây 2,1): dâng lên, nổ sáng, hợp âm hùng
    d = 3.8
    t = t_(d)
    rise = sum(lp(osc(sweep(2.1, f, f * 2), kind='saw'), 1500) for f in (73.4, 110.0, 146.8)) / 3
    rise = np.pad(rise * np.linspace(0, 1, len(rise)) ** 2, (0, len(t) - len(rise)))
    air = sweep_bp(noise(2.1, 311), 300, 6000, 1.4) * np.linspace(0, 1, 92610) ** 2
    chord = mix(*[(lp(osc(f, 1.7, 'saw') + osc(f * 1.004, 1.7, 'saw'), 2500) * adsr(1.7, 0.02, 0.4, 0.5, 1.0), 0, 0.18)
                  for f in (146.8, 220.0, 293.7, 370.0, 440.0)])
    bells = _arp([D6, A5, FS5, D5 * 2, A5 * 2], 0.08, 1.4, 0.5, 0.25, 2.6)
    boom = thump(1.2, 100, 30, 0.4)
    crack = hp(noise(0.1, 312), 1500) * exp_env(0.1, 0.02)
    x = mix((rise, 0, 0.6), (air, 0, 0.35), (crack, 2.1, 0.7), (boom, 2.1, 1.0), (chord, 2.1, 1.0), (bells, 2.15, 1.0))
    return finish(reverb(x, 0.3, 1.3)[:len(t)], 1.3, tail=0.5, trim=False)


SOUNDS = {
    'sfx.he.kim': he_kim, 'sfx.he.moc': he_moc, 'sfx.he.thuy': he_thuy, 'sfx.he.hoa': he_hoa, 'sfx.he.tho': he_tho,
    'sfx.he.am': he_am, 'sfx.he.thien': he_thien, 'sfx.phap-bao': phap_bao, 'sfx.hop-nhat.ban': hop_nhat_ban,
    'sfx.luot': luot, 'sfx.bay': bay, 'sfx.ha-canh': ha_canh, 'sfx.phaptuong.hoahinh': phap_tuong,
}
