// Vòng lặp khung hình. Máy yếu (core/device.js) giới hạn 30 khung/giây cho đỡ nóng, đỡ giật.
// Một khung lỗi không được làm đứng hình cả game: ghi lỗi rồi chạy tiếp (chủ dự án 23/10/2026).
import { lowEnd } from './device.js';

export function startLoop(update, render) {
  const minGap = lowEnd ? 1000 / 30 - 2 : 0;
  let last = performance.now(), errs = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (now - last < minGap) return;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    try { update(dt); render(); } catch (e) { if (errs++ < 5) console.error('Lỗi khung hình', e); }
  }
  requestAnimationFrame(frame);
}
