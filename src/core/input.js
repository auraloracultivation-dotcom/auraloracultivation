// Điều khiển: bàn phím (WASD / mũi tên) và cần điều khiển ảo khi chạm màn hình.
// Đa chạm: cần điều khiển chỉ bắt đầu ở nửa trái màn hình (tay trái); chạm nửa phải bản đồ = chọn mục tiêu
// (tay phải), nên vừa đi vừa bấm kỹ năng / nhân vật / bản đồ được cùng lúc.
const STICK_ZONE = 0.55; // phần màn hình (từ trái) dùng cho cần điều khiển

export function createInput(canvas) {
  const taps = [];
  const keys = new Set();
  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, radius: 48 };

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  const downs = new Map(); // chạm không thuộc cần điều khiển → xét là "chạm chọn" khi nhấc tay
  canvas.addEventListener('pointerdown', (e) => {
    if (stick.active || e.clientX > window.innerWidth * STICK_ZONE) {
      downs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      return;
    }
    stick.active = true;
    stick.id = e.pointerId;
    stick.t0 = performance.now();
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    stick.dx = stick.dy = 0;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!stick.active || e.pointerId !== stick.id) return;
    let dx = e.clientX - stick.ox;
    let dy = e.clientY - stick.oy;
    const len = Math.hypot(dx, dy);
    if (len > stick.radius) { dx = (dx / len) * stick.radius; dy = (dy / len) * stick.radius; }
    stick.dx = dx;
    stick.dy = dy;
  });
  const end = (e) => {
    const d = downs.get(e.pointerId);
    if (d) {
      downs.delete(e.pointerId);
      if (e.type === 'pointerup' && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 14) taps.push({ x: e.clientX, y: e.clientY });
      return;
    }
    if (e.pointerId !== stick.id) return;
    // chạm nhanh, gần như không kéo → coi là chạm chọn (vd. khiên trên đầu, NPC bên trái)
    if (e.type === 'pointerup' && performance.now() - stick.t0 < 300 && Math.hypot(e.clientX - stick.ox, e.clientY - stick.oy) < 12) {
      taps.push({ x: e.clientX, y: e.clientY });
    }
    stick.active = false;
    stick.dx = stick.dy = 0;
  };
  // nghe cả ở window: nhấc tay trên một bảng vừa mở đè lên vẫn nhả được cần điều khiển
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
  window.addEventListener('blur', () => { stick.active = false; stick.dx = stick.dy = 0; downs.clear(); });

  return {
    stick,
    // các lần chạm chọn (toạ độ màn hình) kể từ lần gọi trước
    takeTaps() { return taps.splice(0); },
    // Vector hướng đi, độ dài 0..1
    getMove() {
      let x = 0, y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (stick.active) {
        const len = Math.hypot(stick.dx, stick.dy);
        if (len > 6) { x = stick.dx / stick.radius; y = stick.dy / stick.radius; }
      }
      const len = Math.hypot(x, y);
      return len > 1 ? { x: x / len, y: y / len } : { x, y };
    },
  };
}

// Cần điều khiển: khung tròn HUD v3 (assets/ui/frames/hud-can-dieu-khien.png) — chưa tải xong thì vẽ hình tròn mờ như cũ
const stickImg = typeof Image === 'undefined' ? null : Object.assign(new Image(), { src: 'assets/ui/frames/hud-can-dieu-khien.png' });
export function drawStick(ctx, stick, dpr) {
  if (!stick.active) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const R = stick.radius, kx = stick.ox + stick.dx, ky = stick.oy + stick.dy;
  if (stickImg?.complete && stickImg.naturalWidth) {
    ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.85;
    const s = R * 2.3; // ảnh có viền trang trí ngoài vòng
    ctx.drawImage(stickImg, stick.ox - s / 2, stick.oy - s / 2, s, s);
    ctx.globalAlpha = 0.95; // núm: vòng tím sáng
    const g = ctx.createRadialGradient(kx - 5, ky - 6, 2, kx, ky, 20);
    g.addColorStop(0, '#e2c3ff'); g.addColorStop(0.55, '#9b62e0'); g.addColorStop(1, '#5a2f93');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(kx, ky, 19, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#f2c77f'; ctx.stroke();
  } else {
    ctx.globalAlpha = 0.35; ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(stick.ox, stick.oy, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(kx, ky, 20, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
