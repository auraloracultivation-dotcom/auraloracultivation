// "Cảm giác đòn" kiểu My Heroes: Dungeon Raid (chủ dự án 24/10/2026) — dùng chung một bản cho cả game.
//  - dim(s): màn hình tối dần khi gồng chiêu lớn, chỉ hiệu ứng chiêu còn sáng (vẽ trước lớp hiệu ứng)
//  - shake(amp, s): rung màn hình khi chiêu lớn nổ (main.js cộng offset() vào camera)
//  - later(s, fn): chạy fn sau s giây (gồng xong mới phóng)
// Thông số từng chiêu: data/gameplay.json → skills.<id>.charge_s / dim / shake.
let dimT = 0, dimLife = 0, dimMax = 0, shakeT = 0, shakeLife = 0, shakeAmp = 0, last = 0, stopT = 0;
const tasks = [];

export const juice = {
  dim(s, a = 0.5) { dimLife = dimT = Math.max(dimT, s); dimMax = Math.max(a, dimT > 0 ? dimMax : 0); },
  shake(amp, s = 0.25) { if (amp > shakeAmp * (shakeT / (shakeLife || 1))) { shakeAmp = amp; shakeLife = shakeT = s; } this.stop(Math.min(0.08, amp * 0.012)); },
  // khựng hình (hit-stop): thế giới gần như đứng lại vài phần trăm giây khi đòn nặng trúng — cảm giác "đã tay" kiểu My Heroes
  stop(s) { stopT = Math.max(stopT, s); },
  slow(dt) { if (stopT <= 0) return dt; stopT -= dt; return dt * 0.06; }, // main.js: game.update(juice.slow(dt))
  later(s, fn) { tasks.push({ t: s, fn }); },
  // gọi mỗi khung trong gameplay.renderAbove (trước lớp hiệu ứng): chạy hẹn giờ + phủ tối
  frame(ctx, now, cx, cy) {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now;
    for (let i = tasks.length - 1; i >= 0; i--) { tasks[i].t -= dt; if (tasks[i].t <= 0) { const { fn } = tasks.splice(i, 1)[0]; fn(); } }
    if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
    if (dimT > 0) {
      dimT = Math.max(0, dimT - dt);
      const k = dimT / (dimLife || 1), a = dimMax * Math.min(1, (1 - k) * 4, k * 3); // vào nhanh, ra từ từ
      ctx.save(); ctx.fillStyle = `rgba(6,4,18,${a.toFixed(3)})`; ctx.fillRect(cx - 1600, cy - 1600, 3200, 3200); ctx.restore();
    }
  },
  offset() { if (shakeT <= 0) return { x: 0, y: 0 }; const k = shakeAmp * (shakeT / shakeLife); return { x: (Math.random() - 0.5) * 2 * k, y: (Math.random() - 0.5) * 2 * k }; },
};
