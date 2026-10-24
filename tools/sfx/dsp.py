"""Thư viện tổng hợp âm thanh cho Auralora (chủ dự án 24/10/2026: làm lại toàn bộ âm thanh, kiểu game pixel hành động mobile).

Không dùng mẫu thu sẵn — mọi tiếng tạo bằng toán: dao động, nhiễu lọc, dây gảy Karplus–Strong (đàn tranh), chuông FM,
vang Schroeder, nén mềm, chút thô 8-bit. Mono 44,1 kHz, mảng float -1..1.
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

SR = 44100
_rng = np.random.default_rng(2410)


def n_(d):
    return max(1, int(round(SR * d)))


def t_(d):
    return np.arange(n_(d)) / SR


def silence(d):
    return np.zeros(n_(d))


def noise(d, seed=None):
    r = np.random.default_rng(seed) if seed is not None else _rng
    return r.standard_normal(n_(d))


def adsr(d, a=0.004, dec=0.08, s=0.0, r=0.05):
    """Bao hình ADSR dài d giây (giữ s tới khi còn r giây)."""
    n = n_(d)
    A, D, R = n_(a), n_(dec), n_(r)
    H = max(0, n - A - D - R)
    e = np.concatenate([np.linspace(0, 1, A, endpoint=False), np.linspace(1, s, D, endpoint=False), np.full(H, s), np.linspace(s, 0, R)])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def exp_env(d, tau, a=0.002):
    t = t_(d)
    return np.minimum(t / max(a, 1e-6), 1.0) * np.exp(-t / tau)


def sweep(d, f0, f1, curve='exp'):
    """Tần số tức thời quét f0 → f1 (Hz) trong d giây."""
    x = np.linspace(0, 1, n_(d))
    return f0 * (f1 / f0) ** x if curve == 'exp' else f0 + (f1 - f0) * x


def osc(freq, d=None, kind='sine', phase=0.0):
    """freq: số hoặc mảng tần số tức thời. kind: sine | tri | saw | square | pulse25."""
    if np.isscalar(freq):
        freq = np.full(n_(d), float(freq))
    ph = 2 * np.pi * np.cumsum(freq) / SR + phase
    if kind == 'sine':
        return np.sin(ph)
    p = (ph / (2 * np.pi)) % 1.0
    if kind == 'saw':
        return 2 * p - 1
    if kind == 'tri':
        return 4 * np.abs(p - 0.5) - 1
    if kind == 'square':
        return np.where(p < 0.5, 1.0, -1.0)
    if kind == 'pulse25':
        return np.where(p < 0.25, 1.0, -1.0)
    raise ValueError(kind)


def bp(x, lo, hi, order=2):
    hi = min(hi, SR / 2 - 100)
    return signal.sosfilt(signal.butter(order, [max(lo, 20), hi], btype='band', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, min(f, SR / 2 - 100), btype='low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, max(f, 20), btype='high', fs=SR, output='sos'), x)


def sweep_bp(x, f0, f1, q=1.6, block=256):
    """Lọc dải có tâm quét f0 → f1 theo từng khối (vụt gió, xé không khí)."""
    out = np.zeros_like(x)
    nb = (len(x) + block - 1) // block
    for i in range(nb):
        f = f0 * (f1 / f0) ** (i / max(1, nb - 1))
        s, e = i * block, min(len(x), (i + 1) * block)
        pre = max(0, s - 1024)
        out[s:e] = bp(x[pre:e], f / q, f * q)[s - pre:]
    return out


def pluck(freq, d, bright=0.5, decay=0.996, seed=None):
    """Dây gảy Karplus–Strong (dạng lọc IIR, nhanh) — tiếng đàn tranh / tỳ bà.
    y[n] = x[n] + decay·½(y[n−N] + y[n−N−1]), x = tiếng ồn ngắn dài N mẫu."""
    r = np.random.default_rng(seed) if seed is not None else _rng
    N = max(2, int(round(SR / freq)))
    exc = lp(r.uniform(-1, 1, N), 800 + 9000 * bright, 1)
    x = np.zeros(n_(d)); x[:N] = exc
    a = np.zeros(N + 2); a[0] = 1; a[N] = -decay * 0.5; a[N + 1] = -decay * 0.5
    y = signal.lfilter([1.0], a, x)
    A = n_(0.0015); y[:A] *= np.linspace(0, 1, A)  # vào mềm 1,5 ms — bỏ tiếng tách đầu dây
    return y


def bell(freq, d, ratio=3.5, index=4.0, tau=0.6, itau=0.2):
    """Chuông FM (tỷ lệ không nguyên → tiếng kim loại / khánh)."""
    t = t_(d)
    mod = index * np.exp(-t / itau) * np.sin(2 * np.pi * freq * ratio * t)
    return np.sin(2 * np.pi * freq * t + mod) * np.exp(-t / tau)


def partials(freqs, d, taus, amps=None, drop=0.0, drop_tau=0.08):
    """Họa âm lệch tắt dần (ngân kim loại). drop: tỷ lệ tụt cao độ."""
    t = t_(d)
    amps = amps or [1.0] * len(freqs)
    out = np.zeros_like(t)
    for f, tau, a in zip(freqs, taus, amps):
        fr = f * (1 - drop * (1 - np.exp(-t / drop_tau)))
        out += a * np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / tau)
    return out * np.minimum(t / 0.0015, 1)


def thump(d, f0=150, f1=50, tau=0.06):
    """Cú đấm trầm (kick) — cảm giác trúng đòn."""
    return osc(f1 + (f0 - f1) * np.exp(-t_(d) / (tau * 0.4)), kind='sine') * exp_env(d, tau, 0.001)


def reverb(x, wet=0.25, size=1.0, damp=3500):
    """Vang Schroeder: 4 comb song song + 2 allpass nối tiếp."""
    out = np.zeros(len(x) + n_(1.2 * size))
    xx = np.pad(x, (0, len(out) - len(x)))
    acc = np.zeros_like(out)
    for dl, g in [(0.0297, 0.80), (0.0371, 0.78), (0.0411, 0.76), (0.0437, 0.74)]:
        D = n_(dl * size)
        y = signal.lfilter([1], np.r_[1, np.zeros(D - 1), -g], xx)
        acc += lp(y, damp, 1)
    for dl, g in [(0.005, 0.7), (0.0017, 0.7)]:
        D = n_(dl)
        acc = signal.lfilter(np.r_[-g, np.zeros(D - 1), 1], np.r_[1, np.zeros(D - 1), -g], acc)
    out = xx * (1 - wet) + acc * wet * 0.25
    return out


def crush(x, bits=12, hold=2, mix=0.3):
    """Thô 8-bit nhẹ: giảm độ phân giải + giữ mẫu, trộn mix để giòn mà không rè."""
    q = 2 ** (bits - 1)
    y = np.round(np.repeat(x[::hold], hold)[:len(x)] * q) / q
    return (1 - mix) * x + mix * y


def mix(*parts):
    """Cộng các lớp: mỗi phần (mảng, thời điểm bắt đầu giây, âm lượng)."""
    L = max(n_(st) + len(a) for a, st, _ in parts)
    out = np.zeros(L)
    for a, st, g in parts:
        s = n_(st) if st > 0 else 0
        out[s:s + len(a)] += g * a
    return out


def fade(x, a=0.002, r=0.03):
    n = len(x)
    e = np.ones(n)
    A, R = min(n, n_(a)), min(n, n_(r))
    e[:A] = np.linspace(0, 1, A)
    e[n - R:] *= np.linspace(1, 0, R)
    return x * e


def finish(x, drive=1.3, peak=0.89, tail=0.03, trim=True):
    """Nén mềm + chuẩn hoá đỉnh (-1 dBFS) + cắt đuôi im lặng + fade cuối."""
    x = np.tanh(x * drive) / np.tanh(drive)
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    if trim:
        idx = np.where(np.abs(x) > 0.002)[0]
        if len(idx):
            x = x[:idx[-1] + n_(0.02)]
    return fade(x, 0.001, tail)


def write_mp3(x, path, kbps=128, stereo_width=0.0):
    """Ghi mp3 qua ffmpeg (mono). Trả về thời lượng giây."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-',
                    '-codec:a', 'libmp3lame', '-b:a', f'{kbps}k', str(path)], input=pcm, check=True)
    return len(x) / SR
