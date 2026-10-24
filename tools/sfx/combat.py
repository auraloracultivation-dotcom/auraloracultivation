"""Tiếng chiến đấu: chém, trúng, bạo kích, quái chết, bị đánh, né, báo đòn nặng, linh cầu, chết, hồi sinh."""
import numpy as np

from dsp import (adsr, bell, bp, crush, exp_env, finish, hp, lp, mix, noise, osc, partials, reverb, sweep, sweep_bp, t_,
                 thump)


def kiem_chem():  # vụt gió + ngân thép + chạm (bản chủ dự án đã duyệt 24/10)
    wh = sweep_bp(noise(0.17, 7), 6000, 1200) * np.sin(np.pi * np.linspace(0, 1, 7497)) ** 1.5
    ring = partials([2350, 3720, 5180, 7930, 11200], 0.27, [0.12, 0.09, 0.07, 0.05, 0.03], [1, .7, .5, .3, .15], drop=0.04, drop_tau=0.06)
    click = hp(noise(0.03, 3), 3000) * exp_env(0.03, 0.006, 0.0005)
    x = mix((wh, 0, 0.55), (ring, 0.045, 0.32), (thump(0.25, 140, 60, 0.05), 0.06, 0.6), (click, 0.06, 0.25))
    return finish(crush(x, 12, 2, 0.35), 1.2, tail=0.06)


def danh_tay():  # đấm tay không: vụt ngắn + bụp
    wh = sweep_bp(noise(0.09, 11), 3000, 900) * adsr(0.09, 0.03, 0.05, 0, 0.01)
    x = mix((wh, 0, 0.5), (thump(0.18, 180, 55, 0.045), 0.05, 0.9), (lp(noise(0.05, 12), 2500) * exp_env(0.05, 0.01), 0.05, 0.4))
    return finish(crush(x, 12, 2, 0.3), 1.4)


def trung():  # trúng quái (rất ngắn, phát nhiều lần)
    x = mix((bp(noise(0.06, 21), 900, 4200) * exp_env(0.06, 0.012, 0.0005), 0, 0.7), (thump(0.09, 220, 90, 0.025), 0, 0.6))
    return finish(crush(x, 11, 2, 0.35), 1.5, tail=0.01)


def bao_kich():  # bạo kích: chát + keng sáng + bụp lớn
    crack = hp(noise(0.05, 31), 2500) * exp_env(0.05, 0.008, 0.0003)
    ding = partials([1760, 2640, 3960, 5940], 0.35, [0.18, 0.12, 0.08, 0.05], [1, .6, .4, .2])
    x = mix((crack, 0, 0.8), (ding, 0.005, 0.35), (thump(0.3, 200, 45, 0.07), 0, 1.0), (bp(noise(0.12, 32), 400, 1500) * exp_env(0.12, 0.03), 0, 0.4))
    return finish(crush(reverb(x, 0.12, 0.6), 12, 2, 0.3), 1.3, tail=0.05)


def quai_chet():  # quái tan: "bùm" pixel — tiếng vuông tụt cao độ + phụt khói
    chirp = osc(sweep(0.22, 880, 110), kind='square') * adsr(0.22, 0.002, 0.2, 0, 0.02)
    puff = lp(noise(0.3, 41), 1800) * exp_env(0.3, 0.08, 0.01)
    x = mix((lp(chirp, 3500), 0, 0.35), (puff, 0.02, 0.6), (thump(0.2, 160, 50, 0.05), 0, 0.5))
    return finish(crush(x, 10, 2, 0.4), 1.3)


def boss_chet():  # boss gục: nổ trầm + mảnh vỡ + ánh sáng ngân
    boom = lp(noise(1.2, 51), 600) * exp_env(1.2, 0.35, 0.005)
    debris = bp(noise(0.15, 52), 1200, 5000) * exp_env(0.15, 0.03) * 0.5
    shine = sum(bell(f, 1.6, 2.76, 2.5, 0.7, 0.3) for f in (587.3, 880.0, 1174.7)) / 3
    x = mix((boom, 0, 1.0), (thump(0.8, 120, 35, 0.25), 0, 0.9), (debris, 0.1, 0.4), (debris, 0.25, 0.3), (shine, 0.35, 0.35))
    return finish(reverb(x, 0.25, 1.2), 1.4, tail=0.3)


def bi_danh():  # mình bị đánh: thịch trầm + âm rè tụt (đau)
    grunt = lp(osc(sweep(0.16, 260, 120), kind='saw'), 1200) * adsr(0.16, 0.005, 0.14, 0, 0.02)
    x = mix((thump(0.18, 130, 45, 0.05), 0, 1.0), (grunt, 0, 0.35), (bp(noise(0.06, 61), 600, 2200) * exp_env(0.06, 0.012), 0, 0.5))
    return finish(crush(x, 11, 2, 0.3), 1.4)


def ne():  # né đòn: vụt lên nhanh
    wh = sweep_bp(noise(0.16, 71), 900, 5500, 1.4) * np.sin(np.pi * np.linspace(0, 1, 7056)) ** 2
    blip = osc(sweep(0.08, 1200, 2400), kind='tri') * exp_env(0.08, 0.03)
    return finish(mix((wh, 0, 0.7), (blip, 0.06, 0.15)), 1.2)


def don_nang():  # quái vung đòn nặng (0,9 giây báo trước): rền trầm dâng lên, kết bằng tiếng nghiến
    d = 0.9
    rise = lp(osc(sweep(d, 70, 190), kind='saw') + 0.6 * osc(sweep(d, 71.5, 194), kind='saw'), 900) * np.linspace(0.2, 1, 39690) ** 2
    rumble = lp(noise(d, 81), 220) * np.linspace(0.3, 1, 39690)
    x = mix((rise, 0, 0.5), (rumble, 0, 0.6))
    return finish(x, 1.5, tail=0.04)


def linh_cau():  # quái bắn linh cầu: "buông" mềm, sáng
    body = osc(sweep(0.25, 520, 260), kind='sine') * exp_env(0.25, 0.08, 0.004)
    shim = osc(sweep(0.25, 1560, 780), kind='tri') * exp_env(0.25, 0.05, 0.002)
    return finish(reverb(mix((body, 0, 0.7), (shim, 0, 0.2)), 0.18, 0.5), 1.2, tail=0.08)


def chet():  # nhân vật ngã: hợp âm thứ tụt dần + nổ trầm
    notes = [440.0, 349.2, 293.7, 220.0]
    arp = mix(*[(bell(f, 0.9, 2.0, 1.5, 0.45, 0.2), i * 0.16, 0.45) for i, f in enumerate(notes)])
    x = mix((arp, 0, 1.0), (thump(1.0, 90, 30, 0.35), 0.5, 0.8), (lp(noise(1.0, 91), 400) * exp_env(1.0, 0.3), 0.5, 0.5))
    return finish(reverb(x, 0.3, 1.3), 1.2, tail=0.4)


def hoi_sinh():  # hồi sinh: ánh sáng dâng lên + hợp âm trưởng ngũ cung
    up = sweep_bp(noise(1.0, 101), 400, 7000, 1.3) * np.linspace(0, 1, 44100) ** 1.5
    chord = mix(*[(bell(f, 1.4, 3.0, 2.0, 0.8, 0.25), 0.5 + i * 0.07, 0.4) for i, f in enumerate([587.3, 740.0, 880.0, 1174.7])])
    return finish(reverb(mix((up, 0, 0.35), (chord, 0, 1.0)), 0.3, 1.2), 1.1, tail=0.4)


SOUNDS = {
    'sfx.kiem.chem': kiem_chem, 'sfx.danh.tay': danh_tay, 'sfx.trung': trung, 'sfx.bao-kich': bao_kich,
    'sfx.quai.chet': quai_chet, 'sfx.boss.chet': boss_chet, 'sfx.bi-danh': bi_danh, 'sfx.ne': ne,
    'sfx.don-nang': don_nang, 'sfx.linh-cau': linh_cau, 'sfx.chet': chet, 'sfx.hoi-sinh': hoi_sinh,
}
