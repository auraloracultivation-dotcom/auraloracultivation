// Vòng lặp khung hình. dt tính bằng giây, giới hạn để tab ngủ dậy không làm nhân vật nhảy xa.
export function startLoop(update, render) {
  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
