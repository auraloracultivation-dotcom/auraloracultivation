// Điều khiển: bàn phím (WASD / mũi tên) và cần điều khiển ảo khi chạm màn hình.
export function createInput(canvas) {
  const keys = new Set();
  const stick = { active: false, id: null, ox: 0, oy: 0, dx: 0, dy: 0, radius: 48 };

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (e) => {
    if (stick.active) return;
    stick.active = true;
    stick.id = e.pointerId;
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
    if (e.pointerId !== stick.id) return;
    stick.active = false;
    stick.dx = stick.dy = 0;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    stick,
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

export function drawStick(ctx, stick, dpr) {
  if (!stick.active) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(stick.ox, stick.oy, stick.radius, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 0.7;
  ctx.beginPath(); ctx.arc(stick.ox + stick.dx, stick.oy + stick.dy, 20, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
