// Canvas sắc nét theo mật độ điểm ảnh; tự chọn độ phóng để pixel art to rõ trên điện thoại.
export function createScreen(canvas) {
  const ctx = canvas.getContext('2d');
  const screen = { canvas, ctx, width: 0, height: 0, scale: 2, dpr: 1 };

  function resize() {
    screen.dpr = Math.min(window.devicePixelRatio || 1, 3);
    screen.width = window.innerWidth;
    screen.height = window.innerHeight;
    canvas.width = Math.round(screen.width * screen.dpr);
    canvas.height = Math.round(screen.height * screen.dpr);
    canvas.style.width = screen.width + 'px';
    canvas.style.height = screen.height + 'px';
    screen.scale = Math.max(2, Math.min(4, Math.round(Math.min(screen.width, screen.height) / 180)));
  }
  window.addEventListener('resize', resize);
  resize();
  return screen;
}
