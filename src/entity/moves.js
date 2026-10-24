// Đòn đánh thường (chủ dự án 25/10/2026: "nhân vật có hồn hơn — thêm chọc, xoay, không chỉ chém xuống").
// Hàm thuần: cho loại đòn + tiến độ t (0..1) → tư thế. Dùng chung cho game (rig.js) và Tủ Đồ Tu Chân (nạp file này).
// Góc: 0 = chĩa lên, dương = theo chiều kim đồng hồ (nhìn sang phải thì +90° = chĩa thẳng về trước).
// Trả về: ang (góc kiếm, rad), gx / gy (dời chuôi, theo CH), kk (tay vươn 0..1), sq (nén thân), head (đầu hạ, theo CH),
//         lean (thân nhô về trước, theo CH), sx (bề ngang thân: <1 = đang xoay người), hop (nhảy, theo CH), trail (có vệt chém)
export const MOVES = {
  chem: { dur: 0.42, name: 'Chém' },
  choc: { dur: 0.38, name: 'Chọc' },
  xoay: { dur: 0.52, name: 'Xoay' },
};
export const COMBO = ['chem', 'choc', 'xoay'];

const D = Math.PI / 180;
const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t) => 1 - (1 - t) ** 3;
const seg = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const lerp = (a, b, k) => a + (b - a) * k;

// hold: phần thời gian tay giữ ở thế vươn (tham số tay.hold của bộ, chỉ dùng cho Chém như cũ)
export function pose(kind, t, rest, hold = 0.58) {
  if (kind === 'choc') {
    // 0–0.28 rút kiếm về sau, nâng mũi · 0.28–0.46 lao tới đâm thẳng · 0.46–0.7 giữ · 0.7–1 thu về
    const back = easeOut(seg(t, 0, 0.28)), thrust = easeOut(seg(t, 0.28, 0.46)), ret = ease(seg(t, 0.7, 1));
    const aim = 92 * D, wind = rest - 25 * D;
    const ang = ret > 0 ? lerp(aim, rest, ret) : thrust > 0 ? lerp(wind, aim, thrust) : lerp(rest, wind, back);
    const push = thrust * (1 - ret);
    return { ang, gx: -0.1 * back * (1 - thrust) + 0.42 * push, gy: 0.06 * push, kk: Math.max(back * 0.4, push), sq: 0.06 * push,
      head: -0.06 * push, lean: 0.07 * push, sx: 1, hop: 0, trail: thrust > 0 && ret < 0.5 };
  }
  if (kind === 'xoay') {
    // xoay trọn vòng quanh chuôi, nhún nhảy nhẹ, thân quay một vòng (bề ngang co giãn theo cos)
    const e = ease(seg(t, 0.05, 0.9)), hop = Math.sin(Math.PI * seg(t, 0.05, 0.85));
    const turn = Math.cos(2 * Math.PI * e);
    return { ang: rest + e * 2 * Math.PI, gx: 0.05 * Math.sin(Math.PI * e), gy: -0.08 * hop, kk: Math.min(1, hop * 1.4), sq: 0.08 * (1 - hop),
      head: 0.02 * hop, lean: 0, sx: Math.sign(turn || 1) * Math.max(0.5, Math.abs(turn)), hop: 0.16 * hop, trail: e > 0.04 && e < 0.98 };
  }
  // Chém (như cũ): nửa vòng từ thế ngả xuống phía trước, thân nhún, tay vươn giữ hold
  const dip = Math.sin(Math.min(1, t * 1.4) * Math.PI);
  const kk = t < 0.12 ? ease(t / 0.12) : t < 0.12 + hold ? 1 : 1 - ease(Math.min(1, (t - 0.12 - hold) / Math.max(0.05, 0.88 - hold)));
  return { ang: rest + Math.sin(ease(t) * Math.PI) * Math.PI, gx: 0, gy: 0, kk, sq: dip * 0.14, head: -dip * 0.2, lean: 0, sx: 1, hop: 0,
    trail: t > 0.08 && t < 0.7 };
}
