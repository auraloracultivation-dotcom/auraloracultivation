import { lowEnd } from './device.js';
// Canvas sắc nét theo mật độ điểm ảnh; tự chọn độ phóng để pixel art to rõ trên điện thoại.
// zoom: hệ số camera từ data/config.json (camera.zoom); < 1 là thu nhỏ, thấy rộng hơn
export function createScreen(canvas, zoom = 1) {
  const ctx = canvas.getContext('2d');
  const screen = { canvas, ctx, width: 0, height: 0, scale: 2, dpr: 1 };

  function resize() {
    screen.dpr = lowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 3); // máy yếu: vẽ 1×, nhẹ GPU gấp 4 lần ở màn 2×
    screen.width = window.innerWidth;
    screen.height = window.innerHeight;
    canvas.width = Math.round(screen.width * screen.dpr);
    canvas.height = Math.round(screen.height * screen.dpr);
    canvas.style.width = screen.width + 'px';
    canvas.style.height = screen.height + 'px';
    screen.scale = Math.max(2, Math.min(4, Math.round(Math.min(screen.width, screen.height) / 180))) * zoom;
    screen.textScale = Math.max(1, 2 / screen.scale); // chữ trên đầu giữ cỡ như lúc phóng 2×
  }
  window.addEventListener('resize', resize);
  resize();
  return screen;
}
