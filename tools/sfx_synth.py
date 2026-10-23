"""Tổng hợp âm thanh hiệu ứng tu tiên bằng code (chủ dự án 23/10/2026: "GPT tạo âm thanh chán").

Không dùng mẫu thu sẵn: dao động (sine / tam giác / răng cưa), nhiễu lọc, quét cao độ, chuông (partial không điều hoà),
vang (Schroeder: 4 comb + 2 allpass). Mỗi tiếng ghép nhiều lớp: lớp "đòn" (transient), lớp "thân" (thân âm), lớp "đuôi" (vang).
Ra: assets/audio/sfx/<mã>.mp3 (mono 44,1 kHz) — chuẩn hoá đỉnh -1 dBFS.
Dùng: python3 -I tools/sfx_synth.py [thư-mục-ra]
"""
import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
rng = np.random.default_rng(23)


def t_(d):
    return np.arange(int(SR * d)) / SR


def env(n, a=0.005, d=0.1, s=0.0, r=0.1, hold=0.0):
    """ADSR theo giây, độ dài n mẫu."""
    A, D, H, R = (int(SR * x) for x in (a, d, hold, r))
    e = np.concatenate([np.linspace(0, 1, max(A, 1)), np.linspace(1, s, max(D, 1)), np.full(H, s), np.linspace(s, 0, max(R, 1))])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def expdecay(n, tau):
    return np.exp(-np.arange(n) / (SR * tau))


def sweep(f0, f1, d, shape='sine', curve='exp'):
    t = t_(d)
    f = f0 * (f1 / f0) ** (t / d) if curve == 'exp' else f0 + (f1 - f0) * t / d
    ph = 2 * np.pi * np.cumsum(f) / SR
    if shape == 'sine':
        return np.sin(ph)
    if shape == 'tri':
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if shape == 'saw':
        return 2 * ((ph / (2 * np.pi)) % 1) - 1
    return np.sign(np.sin(ph))


def noise(d):
    return rng.standard_normal(int(SR * d))


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos')
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)


def sweep_filter(x, f0, f1, q=4.0):
    """Lọc băng quét (whoosh): chia khối 256 mẫu, mỗi khối một tần số tâm."""
    out = np.zeros_like(x)
    n, B = len(x), 256
    zi = None
    for i in range(0, n, B):
        f = f0 * (f1 / f0) ** (i / max(1, n))
        bw = f / q
        sos = signal.butter(2, [max(30, f - bw), min(SR / 2 - 100, f + bw)], 'bandpass', fs=SR, output='sos')
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        out[i:i + B], zi = signal.sosfilt(sos, x[i:i + B], zi=zi)
    return out


def bell(f, d, partials=(1, 2.76, 5.40, 8.93), decay=(1, .6, .35, .2), amp=(1, .5, .3, .15)):
    t = t_(d)
    return sum(a * np.sin(2 * np.pi * f * p * t) * np.exp(-t / (d * k)) for p, k, a in zip(partials, decay, amp))


def reverb(x, wet=0.3, size=1.0, tail=1.0):
    """Schroeder: 4 comb song song + 2 allpass nối tiếp."""
    y = np.pad(x, (0, int(SR * tail)))
    out = np.zeros_like(y)
    for dms, g in ((29.7, .80), (37.1, .78), (41.1, .76), (43.7, .74)):
        D = int(SR * dms / 1000 * size)
        b = np.zeros(D + 1); b[0] = 1
        a = np.zeros(D + 1); a[0] = 1; a[D] = -g
        out += signal.lfilter(b, a, y)
    for dms, g in ((5.0, .7), (1.7, .7)):
        D = int(SR * dms / 1000)
        b = np.zeros(D + 1); b[0] = -g; b[D] = 1
        a = np.zeros(D + 1); a[0] = 1; a[D] = -g
        out = signal.lfilter(b, a, out)
    out = lp(out, 6000)
    return y * (1 - wet) + out * wet * 0.25


def fade_out(x, sec=0.02):
    n = min(len(x), int(SR * sec))
    x = x.copy(); x[-n:] *= np.linspace(1, 0, n)
    return x


def mix(*parts):
    n = max(len(p) for p in parts)
    return sum(np.pad(fade_out(p, .012), (0, n - len(p))) for p in parts)  # mờ đuôi từng lớp: tránh tiếng "tách" khi lớp dừng


def at(x, sec, total=None):
    pad = np.zeros(int(SR * sec))
    y = np.concatenate([pad, x])
    return y if total is None else np.pad(y, (0, max(0, int(SR * total) - len(y))))[:int(SR * total)]




# ---------------- Từng tiếng ----------------

def phong_chieu():
    """25 Phóng chiêu: gió quét lên + lấp lánh linh khí."""
    d = 0.42
    w = sweep_filter(noise(d), 500, 4200, q=3) * env(int(SR * d), a=.05, d=.12, s=.5, r=.25)
    zing = sweep(700, 1800, .25, 'tri') * expdecay(int(SR * .25), .09) * .35
    sh = sum(np.sin(2 * np.pi * f * t_(d)) * expdecay(int(SR * d), .12) for f in (2093, 2637, 3136)) * .06
    return reverb(mix(w * 1.2, at(zing, .02), at(sh, .05)), wet=.25, tail=.25)


def no_trung():
    """26 Nổ trúng đòn (nhỏ, 0,1 s — phát rất nhiều lần): tiếng 'bụp' trầm + lách tách."""
    d = 0.11
    thump = sweep(180, 55, d, 'sine') * expdecay(int(SR * d), .03)
    crack = hp(noise(d), 1800) * expdecay(int(SR * d), .012) * .5
    body = bp(noise(d), 300, 1200) * expdecay(int(SR * d), .025) * .5
    return fade_out(mix(thump, crack, body), .015)


def quai_chet():
    """27 Quái chết (0,15 s): 'phụt' tan thành khói + nốt rơi xuống."""
    d = 0.16
    puff = sweep_filter(noise(d), 2500, 300, q=2) * env(int(SR * d), a=.003, d=.05, s=.3, r=.1)
    drop = sweep(900, 260, .12, 'tri') * expdecay(int(SR * .12), .05) * .4
    return fade_out(mix(puff * 1.3, drop), .02)


def nhat_do():
    """28 Nhặt đồ: chuông ngọc 3 nốt đi lên (Đô–Mi–Sol quãng cao) + lấp lánh."""
    notes = (1046.5, 1318.5, 1568.0)
    parts = [at(bell(f, .35, amp=(1, .4, .2, .1)) * .5, i * .055) for i, f in enumerate(notes)]
    sp = hp(noise(.3), 6000) * expdecay(int(SR * .3), .06) * .08
    return reverb(mix(*parts, sp), wet=.35, tail=.35)


def dot_pha():
    """29 Đột phá cảnh giới (2 s, không nhạc): linh khí tụ lại (quét lên) → nổ thiên địa (chuông + trống trầm) → vang."""
    d = 2.0
    n = int(SR * d)
    rise = sweep_filter(noise(1.1), 200, 5000, q=2.5) * np.linspace(0, 1, int(SR * 1.1)) ** 2 * .8
    drone = sum(sweep(f, f * 2, 1.1, 'saw') for f in (110, 110 * 1.5, 220)) * np.linspace(0, 1, int(SR * 1.1)) ** 2
    drone = lp(drone, 1800) * .18
    hit_t = 1.05
    boom = sweep(90, 38, .9, 'sine') * expdecay(int(SR * .9), .35) * 1.1
    gong = bell(196, 1.0, partials=(1, 1.5, 2.0, 2.76, 4.1), decay=(1, .8, .6, .4, .25), amp=(1, .6, .5, .35, .2)) * .5
    shimmer = sum(np.sin(2 * np.pi * f * t_(.9)) * expdecay(int(SR * .9), .3) for f in (1568, 2093, 2637, 3136)) * .07
    blast = bp(noise(.4), 200, 3000) * expdecay(int(SR * .4), .08) * .6
    x = mix(rise, drone, at(boom, hit_t), at(gong, hit_t), at(shimmer, hit_t + .02), at(blast, hit_t))
    x = reverb(x, wet=.45, size=1.4, tail=.6)[:n]
    return fade_out(x, .25)


def chet():
    """30 Nhân vật chết (hoá linh hồn): chuông tang trầm + hơi thở tan ngược lên."""
    d = 2.2
    toll = bell(110, 2.0, partials=(1, 2.0, 2.76, 4.07, 5.4), decay=(1, .7, .5, .3, .2), amp=(1, .5, .45, .25, .15)) * .6
    sub = sweep(82, 41, 1.6, 'sine') * expdecay(int(SR * 1.6), .6) * .5
    ghost = sweep_filter(noise(1.6), 300, 2500, q=5) * env(int(SR * 1.6), a=.6, d=.3, s=.4, r=.6) * .5
    wail = sweep(660, 330, 1.4, 'sine') * env(int(SR * 1.4), a=.4, d=.2, s=.6, r=.7) * .12
    return fade_out(reverb(mix(toll, sub, at(ghost, .25), at(wail, .4)), wet=.5, size=1.5, tail=.8)[:int(SR * d)], .3)


def bam_nut():
    """31 Bấm nút giao diện: tiếng 'tách' gỗ ngọc ngắn, nhẹ."""
    d = .06
    tick = bp(noise(d), 2000, 5000) * expdecay(int(SR * d), .006) * .6
    tone = np.sin(2 * np.pi * 1760 * t_(d)) * expdecay(int(SR * d), .015) * .4
    wood = np.sin(2 * np.pi * 620 * t_(d)) * expdecay(int(SR * d), .01) * .4
    return fade_out(mix(tick, tone, wood), .01)


def am_hu():
    """32 Âm Hư / boss xuất thế (4 s): cồng lớn + đất rung + hợp âm nghịch tai dâng lên + tiếng gào hư không."""
    d = 4.2
    n = int(SR * d)
    gong = bell(73.4, 3.6, partials=(1, 1.48, 2.0, 2.63, 3.9, 5.2), decay=(1, .9, .7, .5, .35, .2), amp=(1, .7, .55, .45, .3, .2)) * .7
    rumble = lp(noise(3.8), 120, 4) * env(int(SR * 3.8), a=.4, d=.5, s=.8, r=1.5) * 2.5
    t = t_(3.6)
    cl = sum(np.sin(2 * np.pi * f * t + 2 * np.sin(2 * np.pi * .7 * t)) for f in (146.8, 155.6, 207.7, 311.1))  # nghịch: Rê, Mi giáng, Sol thăng
    cl = lp(cl, 1200) * env(len(t), a=1.6, d=.5, s=.7, r=1.3) * .12
    roar = sweep_filter(noise(2.4), 2500, 180, q=3) * env(int(SR * 2.4), a=.3, d=.6, s=.6, r=1.0) * .9
    hit2 = sweep(70, 35, 1.2, 'sine') * expdecay(int(SR * 1.2), .4)
    x = mix(gong, at(hit2, 0), at(rumble, .1), at(cl, .4), at(roar, 1.2))
    return fade_out(reverb(x, wet=.5, size=1.6, tail=1.0)[:n], .5)


SFX = {
    '25-phong-chieu': phong_chieu, '26-no-trung-don': no_trung, '27-quai-chet': quai_chet, '28-nhat-do': nhat_do,
    '29-dot-pha': dot_pha, '30-chet': chet, '31-bam-nut': bam_nut, '32-am-hu-xuat-the': am_hu,
}


def main():
    out = Path(sys.argv[1] if len(sys.argv) > 1 else 'assets/audio/sfx')
    out.mkdir(parents=True, exist_ok=True)
    for code, fn in SFX.items():
        x = fn().astype(np.float64)
        x = x - np.mean(x)
        x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-1 / 20)
        pcm = (x * 32767).astype('<i2').tobytes()
        dst = out / f'{code}.mp3'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                        '-codec:a', 'libmp3lame', '-q:a', '3', str(dst)], input=pcm, check=True)
        print(f'{code}: {len(x) / SR:.2f}s → {dst}')


if __name__ == '__main__':
    main()
