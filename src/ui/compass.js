// Bản đồ tròn kiểu la bàn, vẽ bằng code nên sắc nét ở mọi kích thước (bản đồ nhỏ và bản đồ thế giới
// dùng chung một kiểu viền). Màu theo bảng màu khung của chủ dự án: xanh đêm, vàng, tím.
const NAVY = '#10192d', GOLD = '#f2c77f', GOLD_DARK = '#b8894a', PURPLE = '#7a5cc4';

export function setupRoundCanvas(canvas, cssSize) {
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = canvas.style.height = `${cssSize}px`;
  canvas.width = canvas.height = Math.round(cssSize * dpr);
  return canvas;
}

// drawMap(offCtx, size): vẽ bản đồ vào ô vuông size×size; hàm này cắt tròn và thêm viền + N/E/S/W
export function drawRoundMap(canvas, drawMap) {
  const S = canvas.width;
  const off = (canvas._off ||= document.createElement('canvas'));
  const inner = Math.round(S * 0.78);
  if (off.width !== inner) { off.width = off.height = inner; }
  drawMap(off, inner);

  const ctx = canvas.getContext('2d');
  const c = S / 2, R = S * 0.42, ring = Math.max(2, S * 0.035);
  ctx.clearRect(0, 0, S, S);
  ctx.save();
  ctx.beginPath(); ctx.arc(c, c, R, 0, Math.PI * 2); ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(off, c - R, c - R, R * 2, R * 2);
  ctx.restore();

  // viền: xanh đêm dày, chỉ vàng, chỉ tím bên trong
  ctx.lineWidth = ring * 1.8; ctx.strokeStyle = NAVY;
  ctx.beginPath(); ctx.arc(c, c, R + ring * 0.6, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = ring * 0.55; ctx.strokeStyle = GOLD;
  ctx.beginPath(); ctx.arc(c, c, R + ring * 0.6, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = Math.max(1, ring * 0.35); ctx.strokeStyle = PURPLE;
  ctx.beginPath(); ctx.arc(c, c, R - ring * 0.1, 0, Math.PI * 2); ctx.stroke();

  // chữ hướng trong ô tròn nhỏ
  const badge = Math.max(6, S * 0.06);
  ctx.font = `800 ${Math.round(badge * 1.15)}px system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [t, a] of [['N', -Math.PI / 2], ['E', 0], ['S', Math.PI / 2], ['W', Math.PI]]) {
    const x = c + Math.cos(a) * (R + ring * 0.6), y = c + Math.sin(a) * (R + ring * 0.6);
    ctx.fillStyle = NAVY; ctx.strokeStyle = GOLD_DARK; ctx.lineWidth = Math.max(1, ring * 0.4);
    ctx.beginPath(); ctx.arc(x, y, badge, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.fillText(t, x, y + badge * 0.05);
  }
}
