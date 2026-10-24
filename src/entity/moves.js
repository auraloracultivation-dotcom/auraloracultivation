// Đòn đánh thường (chủ dự án 25/10/2026: "nhân vật có hồn hơn — thêm chọc, xoay, không chỉ chém xuống").
// Hàm thuần: cho loại đòn + tiến độ t (0..1) → tư thế. Dùng chung cho game (rig.js) và Tủ Đồ Tu Chân (nạp file này).
// Góc: 0 = chĩa lên, dương = theo chiều kim đồng hồ (nhìn sang phải thì +90° = chĩa thẳng về trước).
// Trả về: ang (góc kiếm, rad), gx / gy (dời chuôi, theo CH), kk (tay vươn 0..1), sq (nén thân), head (đầu hạ, theo CH),
//         lean (thân nhô về trước / ngả sau, theo CH), sx (luôn 1: không lật ảnh thân), hop (nhảy, theo CH), trail (có vệt chém)
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
    // 0–0.3 kéo kiếm về sau hông: lưỡi nằm ngang chĩa về trước, thân ngả ra sau lấy đà
    // 0.26–0.5 phóng tới đâm thẳng (chuôi đi từ sau ra trước) · 0.5–0.66 giữ · 0.66–1 thu về
    const back = ease(seg(t, 0, 0.3)), thrust = easeOut(seg(t, 0.26, 0.5)), ret = ease(seg(t, 0.66, 1));
    const aim = 90 * D;
    const cock = 80 * D; // lúc kéo về mũi hơi chếch lên, phóng ra thì thẳng ngang
    const ang = ret > 0 ? lerp(aim, rest, ret) : thrust > 0 ? lerp(cock, aim, thrust) : lerp(rest, cock, back);
    const draw = back * (1 - thrust), push = thrust * (1 - ret);
    return { ang, gx: -0.36 * draw + 0.46 * push, gy: 0.05 * back * (1 - ret), kk: Math.max(0.5 * draw, push), sq: 0.04 * draw + 0.06 * push,
      head: -0.04 * push, lean: -0.04 * draw + 0.07 * push, sx: 1, hop: 0, trail: thrust > 0.05 && ret < 0.4 };
  }
  if (kind === 'xoay') {
    // xoay kiếm trọn một vòng quanh người: thân giữ nguyên dáng (không lật ảnh), nhún lấy đà rồi bật nhẹ,
    // tay vươn cao, lưỡi kiếm quét một vòng tròn kín · về cuối thân hạ, kiếm thu lại thế cầm
    const e = ease(seg(t, 0.08, 0.86)), hop = Math.sin(Math.PI * seg(t, 0.08, 0.86)), crouch = Math.sin(Math.PI * seg(t, 0, 0.16));
    return { ang: rest + e * 2 * Math.PI, gx: 0.06 * Math.sin(2 * Math.PI * e), gy: -0.1 * hop, kk: Math.min(1, crouch + hop * 1.3), sq: 0.07 * crouch,
      head: -0.04 * crouch + 0.01 * hop, lean: 0.02 * hop, sx: 1, hop: 0.06 * hop, trail: e > 0.03 && e < 0.98 };
  }
  // Chém (như cũ): nửa vòng từ thế ngả xuống phía trước, thân nhún, tay vươn giữ hold
  const dip = Math.sin(Math.min(1, t * 1.4) * Math.PI);
  const kk = t < 0.12 ? ease(t / 0.12) : t < 0.12 + hold ? 1 : 1 - ease(Math.min(1, (t - 0.12 - hold) / Math.max(0.05, 0.88 - hold)));
  return { ang: rest + Math.sin(ease(t) * Math.PI) * Math.PI, gx: 0, gy: 0, kk, sq: dip * 0.14, head: -dip * 0.2, lean: 0, sx: 1, hop: 0,
    trail: t > 0.08 && t < 0.7 };
}

// ---- Cho đòn nối đòn mượt (chủ dự án: "giật, khựng; đánh nhanh thì nhún nhảy một chỗ trông ngốc") ----
const BODY = ['sq', 'head', 'lean', 'hop'];
// Thời lượng & độ nhún theo nhịp đánh: đòn co cho kịp nhịp (không ngắn hơn 0.28 s — nhanh hơn thì đòn sau pha tiếp từ đòn dở);
// đánh càng nhanh thân càng ít nhún, lao người ngắn lại (chỉ tay + kiếm làm việc)
export function tempo(kind, gap) {
  const dur = MOVES[kind]?.dur || 0.42;
  if (!(gap > 0)) return { dur, calm: 1 };
  return { dur: Math.min(dur, Math.max(0.28, gap * 0.9)), calm: Math.min(1, Math.max(0.2, (gap - 0.2) / 0.35)) };
}
// Thân bớt nhún theo calm
export function calmPose(pz, calm) {
  if (calm >= 1) return pz;
  const o = { ...pz };
  for (const k of BODY) o[k] *= calm;
  o.gx *= 0.45 + 0.55 * calm;
  return o;
}
// Pha từ tư thế đòn trước sang đòn mới (k 0..1) — góc đi đường ngắn nhất, không quay ngược cả vòng
export function blendPose(from, to, k) {
  if (!from || k >= 1) return to;
  const o = { ...to };
  for (const key of ['gx', 'gy', 'kk', ...BODY]) o[key] = lerp(from[key], to[key], k);
  let d = (to.ang - from.ang) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI; else if (d < -Math.PI) d += 2 * Math.PI;
  o.ang = to.ang - d * (1 - k);
  return o;
}
export const BLEND = 0.22; // phần đầu đòn dùng để pha từ đòn trước
export const easeBlend = (t) => ease(Math.min(1, t / BLEND));
