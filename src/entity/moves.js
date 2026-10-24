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
    // 0.3–0.44 phóng tới đâm thẳng (chuôi đi từ sau ra trước) · 0.44–0.68 giữ · 0.68–1 thu về
    const back = easeOut(seg(t, 0, 0.3)), thrust = easeOut(seg(t, 0.3, 0.44)), ret = ease(seg(t, 0.68, 1));
    const aim = 90 * D;
    const cock = 80 * D; // lúc kéo về mũi hơi chếch lên, phóng ra thì thẳng ngang
    const ang = ret > 0 ? lerp(aim, rest, ret) : thrust > 0 ? lerp(cock, aim, thrust) : lerp(rest, cock, back);
    const draw = back * (1 - thrust), push = thrust * (1 - ret);
    return { ang, gx: -0.5 * draw + 0.6 * push, gy: 0.05 * back * (1 - ret), kk: Math.max(0.5 * draw, push), sq: 0.04 * draw + 0.06 * push,
      head: -0.04 * push, lean: -0.06 * draw + 0.1 * push, sx: 1, hop: 0, trail: thrust > 0.05 && ret < 0.4 };
  }
  if (kind === 'xoay') {
    // xoay kiếm trọn một vòng quanh người: thân giữ nguyên dáng (không lật ảnh), nhún lấy đà rồi bật nhẹ,
    // tay vươn cao, lưỡi kiếm quét một vòng tròn kín · về cuối thân hạ, kiếm thu lại thế cầm
    const e = ease(seg(t, 0.08, 0.86)), hop = Math.sin(Math.PI * seg(t, 0.08, 0.86)), crouch = Math.sin(Math.PI * seg(t, 0, 0.16));
    return { ang: rest + e * 2 * Math.PI, gx: 0.06 * Math.sin(2 * Math.PI * e), gy: -0.1 * hop, kk: Math.min(1, crouch + hop * 1.3), sq: 0.12 * crouch,
      head: -0.06 * crouch + 0.02 * hop, lean: 0.03 * hop, sx: 1, hop: 0.12 * hop, trail: e > 0.03 && e < 0.98 };
  }
  // Chém (như cũ): nửa vòng từ thế ngả xuống phía trước, thân nhún, tay vươn giữ hold
  const dip = Math.sin(Math.min(1, t * 1.4) * Math.PI);
  const kk = t < 0.12 ? ease(t / 0.12) : t < 0.12 + hold ? 1 : 1 - ease(Math.min(1, (t - 0.12 - hold) / Math.max(0.05, 0.88 - hold)));
  return { ang: rest + Math.sin(ease(t) * Math.PI) * Math.PI, gx: 0, gy: 0, kk, sq: dip * 0.14, head: -dip * 0.2, lean: 0, sx: 1, hop: 0,
    trail: t > 0.08 && t < 0.7 };
}
