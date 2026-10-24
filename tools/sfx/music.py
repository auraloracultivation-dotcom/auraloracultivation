"""Nhạc nền lặp liền mạch. Ngũ cung Rê trưởng / Si thứ (cùng 5 nốt D E F# A B) — tu tiên mà thân thiện, kiểu game pixel.
bgm.tuchan: thám hiểm 88 BPM — đàn tranh rải hợp âm, sáo hát giai điệu, pad mỏng, mõ + lắc nhẹ.
bgm.chien : phó bản 132 BPM — trống trận, bass móc, đàn tranh rải nhanh, kèn chiptune."""
import numpy as np

from dsp import SR, adsr, bp, exp_env, hp, lp, n_, noise, osc, pluck, reverb, thump

m2f = lambda m: 440.0 * 2 ** ((m - 69) / 12)
CH = {'D': [50, 57, 62, 66], 'Bm': [47, 54, 59, 62], 'G': [43, 50, 55, 59], 'A': [45, 52, 57, 61], 'Em': [40, 47, 52, 55]}


class Track:
    def __init__(self, bpm, beats):
        self.spb = 60 / bpm
        self.L = n_(beats * self.spb)
        self.buf = np.zeros(self.L + n_(4))  # chỗ cho đuôi, sẽ cuộn về đầu để lặp liền

    def put(self, x, beat, g=1.0):
        s = n_(beat * self.spb)
        e = min(len(self.buf), s + len(x))
        self.buf[s:e] += g * x[:e - s]

    def loop(self):
        out = self.buf[:self.L].copy()
        tail = self.buf[self.L:]
        out[:len(tail)] += tail  # đuôi vang cuộn về đầu → vòng lặp không hẫng
        return out


def flute(f, d):
    t = np.arange(n_(d)) / SR
    vib = 1 + 0.006 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(t / 0.25, 1)
    tone = osc(f * vib, kind='sine') + 0.18 * osc(2 * f * vib, kind='sine') + 0.05 * osc(3 * f * vib, kind='sine')
    breath = bp(noise(d), f * 1.5, f * 4) * 0.06
    return (tone + breath) * adsr(d, 0.06, 0.1, 0.8, min(0.18, d * 0.4))


def pad(freqs, d):
    return sum(lp(osc(f, d, 'saw') + osc(f * 1.004, d, 'saw'), 1100) for f in freqs) * adsr(d, 0.5, 0.3, 0.7, 0.5) / len(freqs)


def block(d=0.08, f=1300):  # mõ gỗ
    return bp(noise(d), f * 0.85, f * 1.15, 2) * exp_env(d, 0.02, 0.0005) * 5


def shaker(d=0.06):
    return hp(noise(d), 6000) * adsr(d, 0.01, 0.04, 0, 0.01)


MEL_A = [(69, 2), (66, 1), (69, 1), (71, 1.5), (69, .5), (66, 2), (74, 1), (71, 1), (69, 1), (66, 1), (64, 3), (None, 1),
         (66, 1), (69, 1), (74, 2), (76, 1), (74, 1), (71, 2), (69, 1), (71, .5), (69, .5), (66, 1), (64, 1), (62, 3), (None, 1)]
MEL_B = [(74, 1), (76, 1), (78, 2), (76, 1), (74, 1), (71, 2), (74, 1.5), (71, .5), (69, 2), (71, 1), (69, 1), (64, 2),
         (66, .5), (69, .5), (74, 1), (76, 2), (78, 1), (76, 1), (74, 1), (71, 1), (69, 2), (71, 1), (74, 1), (76, 4)]
MEL_END = MEL_B[:-1] + [(74, 4)]


def tuchan():
    tr = Track(88, 128)
    prog = ['D', 'Bm', 'G', 'A'] * 8
    for bar, ch in enumerate(prog):
        b0 = bar * 4
        notes = CH[ch]
        tr.put(lp(osc(m2f(notes[0] - 12), 4.3 * tr.spb, 'tri'), 700) * adsr(4.3 * tr.spb, 0.03, 0.4, 0.6, 0.45), b0, 0.35)  # bass (nối sang ô sau)
        tr.put(pad([m2f(n) for n in notes[1:]], 4.8 * tr.spb), b0, 0.10)  # pad nối legato
        arp = [notes[0], notes[1], notes[2], notes[3] + 12, notes[2] + 12, notes[3] + 12, notes[2], notes[1]]
        if not 16 <= bar < 24:  # đoạn C: đàn tranh hát chính, bỏ rải
            for k, n in enumerate(arp):
                tr.put(pluck(m2f(n + 12), 1.2, 0.45, 0.996, bar * 8 + k), b0 + k * 0.5, 0.16)
        if bar >= 4:  # bộ gõ vào từ ô 5
            tr.put(thump(0.3, 100, 50, 0.08), b0, 0.25)
            for bt in (1, 3):
                tr.put(block(), b0 + bt, 0.12)
            for k in range(8):
                tr.put(shaker(), b0 + k * 0.5, 0.05 if k % 2 else 0.025)

    def melody(seq, start, inst):
        b = start
        for n, d in seq:
            if n is not None:
                x = flute(m2f(n), d * tr.spb * 0.98) if inst == 'flute' else pluck(m2f(n + 12), d * tr.spb + 1.0, 0.65, 0.997, int(b * 10))
                tr.put(x, b, 0.32 if inst == 'flute' else 0.42)
            b += d
    melody(MEL_A, 0, 'flute'); melody(MEL_B, 32, 'flute'); melody(MEL_A, 64, 'zheng'); melody(MEL_END, 96, 'flute')
    x = reverb(tr.loop(), 0.22, 1.2)
    L = tr.L; y = x[:L].copy(); y[:len(x) - L] += x[L:]  # cuộn đuôi vang
    return y / (np.max(np.abs(y)) + 1e-9) * 0.85


LEAD_C = [(71, .5), (74, .5), (76, 1), (74, .5), (71, .5), (69, 1), (71, .5), (69, .5), (66, 1), (64, 2),  # 2 câu × 16 phách
          (66, .5), (69, .5), (71, 1), (74, 1), (71, 1), (69, 3), (None, 1),
          (74, .5), (76, .5), (78, 1), (76, .5), (74, .5), (71, 1), (74, .5), (71, .5), (69, 1), (66, 2),
          (64, .5), (66, .5), (69, 1), (71, 1), (69, 1), (71, 3), (None, 1)]


def chien():
    tr = Track(132, 128)
    prog = ['Bm', 'G', 'D', 'A'] * 8
    for bar, ch in enumerate(prog):
        b0 = bar * 4
        notes = CH[ch]
        for k in range(8):  # bass móc 8 phách
            n = notes[0] - 12 + (12 if k in (3, 7) else 0)
            tr.put(lp(osc(m2f(n), 0.42 * tr.spb, 'pulse25'), 900) * adsr(0.42 * tr.spb, 0.003, 0.05, 0.6, 0.03), b0 + k * 0.5, 0.22)
        for k in range(16):  # đàn tranh 16 phách
            n = [notes[1], notes[2], notes[3], notes[2] + 12][k % 4] + 12
            tr.put(pluck(m2f(n), 0.5, 0.5, 0.993, bar * 16 + k), b0 + k * 0.25, 0.09)
        for bt in (0, 1.5, 2):  # trống trận
            tr.put(thump(0.35, 130, 42, 0.1) + lp(noise(0.35), 600) * exp_env(0.35, 0.05) * 0.4, b0 + bt, 0.55)
        for bt in (1, 3):  # trống con
            tr.put(bp(noise(0.15), 900, 5000) * exp_env(0.15, 0.04, 0.001), b0 + bt, 0.25)
        for k in range(8):
            tr.put(shaker(0.04), b0 + k * 0.5, 0.06 if k % 2 else 0.03)
        if bar >= 8:
            tr.put(pad([m2f(n) for n in notes[1:]], 4.8 * tr.spb), b0, 0.07)
    b = 32
    for rep in range(3):  # kèn chiptune từ ô 9
        for n, d in LEAD_C:
            if n is not None:
                tr.put(lp(osc(m2f(n + (12 if rep == 2 else 0)), d * tr.spb * 0.9, 'pulse25'), 3200) * adsr(d * tr.spb * 0.9, 0.005, 0.05, 0.7, 0.04), b, 0.13)
            b += d
    x = reverb(tr.loop(), 0.15, 0.9)
    L = tr.L; y = x[:L].copy(); y[:len(x) - L] += x[L:]
    return y / (np.max(np.abs(y)) + 1e-9) * 0.85


MUSIC = {'bgm.tuchan': tuchan, 'bgm.chien': chien}
