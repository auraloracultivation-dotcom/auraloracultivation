// 5 Âm Hư từ hư vô — VẼ BẰNG CODE tới khi chủ dự án gửi ảnh (data/monsters/monsters.json → art.code = 'hu-vo', art.shape).
// Có ảnh thì đổi "art" sang { sheet, h } như quái khác, không phải sửa AI.
// Mọi hình vẽ quanh (x, y) = điểm chân; h = chiều cao (điểm thế giới).

const TAU = Math.PI * 2;

// Khe nứt hư vô dưới chân + hạt tối bay quanh — chung cho cả 5 con
function rift(ctx, x, y, h, color, t) {
  ctx.save();
  const rw = h * 0.62, rh = h * 0.2;
  const g = ctx.createRadialGradient(x, y, 1, x, y, rw);
  g.addColorStop(0, 'rgba(0,0,0,0.95)'); g.addColorStop(0.55, hexA(color, 0.55)); g.addColorStop(1, hexA(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(x, y, rw, rh, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = hexA(color, 0.8); ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) { // vết nứt tia sáng
    const a = (i / 6) * TAU + t * 0.3;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * rw * 0.25, y + Math.sin(a) * rh * 0.25);
    ctx.lineTo(x + Math.cos(a + 0.2) * rw * 0.9, y + Math.sin(a + 0.2) * rh * 0.9); ctx.stroke();
  }
  for (let i = 0; i < 14; i++) { // hạt hư vô bay lên rồi tan
    const p = (t * 0.35 + i / 14) % 1, a = i * 2.39 + t * 0.6;
    ctx.globalAlpha = (1 - p) * 0.85;
    ctx.fillStyle = i % 3 ? '#0b0612' : color;
    const r = h * 0.035 * (1 - p * 0.5);
    ctx.beginPath(); ctx.arc(x + Math.cos(a) * rw * (0.3 + p * 0.6), y - p * h * 1.1 + Math.sin(a) * rh, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function glowEye(ctx, x, y, r, color) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = r * 3;
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, TAU); ctx.fill();
  ctx.restore();
}

// Hư Không Ma Nhãn: con mắt khổng lồ lơ lửng, xúc tu bóng tối, đồng tử nhìn theo hướng
function eye(ctx, x, y, h, c, t, face) {
  const cy = y - h * 0.62 + Math.sin(t * 1.6) * h * 0.04, R = h * 0.3;
  ctx.strokeStyle = '#120818'; ctx.lineCap = 'round';
  for (let i = 0; i < 7; i++) { // xúc tu
    const a = Math.PI * 0.15 + (i / 6) * Math.PI * 0.7;
    ctx.lineWidth = R * 0.18;
    ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * R * 0.7, cy + Math.sin(a) * R * 0.7);
    for (let k = 1; k <= 4; k++) {
      const d = R * (0.7 + k * 0.32), w = Math.sin(t * 3 + i + k) * R * 0.18;
      ctx.lineTo(x + Math.cos(a) * d + w, cy + Math.sin(a) * d);
    }
    ctx.stroke();
  }
  const g = ctx.createRadialGradient(x, cy, R * 0.1, x, cy, R);
  g.addColorStop(0, '#f6eaff'); g.addColorStop(0.7, '#b9a4cf'); g.addColorStop(1, '#2a1438');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, cy, R, 0, TAU); ctx.fill();
  ctx.strokeStyle = c; ctx.lineWidth = 1.5; ctx.stroke();
  const px = x + face * R * 0.28, blink = Math.max(0.12, Math.abs(Math.sin(t * 0.7)) > 0.97 ? 0.12 : 1);
  ctx.save(); ctx.translate(px, cy); ctx.scale(1, blink);
  ctx.fillStyle = c; ctx.beginPath(); ctx.arc(0, 0, R * 0.45, 0, TAU); ctx.fill();
  ctx.fillStyle = '#05010a'; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.12, R * 0.38, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

// Âm Hư Cốt Long: rồng xương uốn lượn trong không trung
function dragon(ctx, x, y, h, c, t, face) {
  const n = 11, len = h * 1.15, base = y - h * 0.45;
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    pts.push([x - face * (u - 0.35) * len, base - Math.sin(u * 5 + t * 2.2) * h * 0.16 - (1 - u) * h * 0.22]);
  }
  for (let i = n; i >= 1; i--) { // đốt sống từ đuôi tới đầu
    const [px, py] = pts[i], r = h * (0.05 + 0.07 * (1 - i / n));
    ctx.fillStyle = '#d8d2c4'; ctx.strokeStyle = '#2b2333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(px, py, r * 1.2, r, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#d8d2c4'; ctx.lineWidth = r * 0.35; // xương sườn
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - r * 0.3, py + r * 2.2); ctx.moveTo(px, py); ctx.lineTo(px + r * 0.3, py - r * 2); ctx.stroke();
  }
  const [hx, hy] = pts[0], s = h * 0.17;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(face, 1);
  ctx.fillStyle = '#e9e4d8'; ctx.strokeStyle = '#2b2333'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-s, -s * 0.5); ctx.lineTo(s * 1.4, -s * 0.2); ctx.lineTo(s * 1.5, s * 0.25); ctx.lineTo(-s * 0.6, s * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
  const jaw = Math.abs(Math.sin(t * 2)) * s * 0.35; // hàm há
  ctx.beginPath(); ctx.moveTo(-s * 0.4, s * 0.45); ctx.lineTo(s * 1.3, s * 0.35 + jaw); ctx.lineTo(-s * 0.5, s * 0.75 + jaw * 0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#e9e4d8'; ctx.lineWidth = s * 0.18; // sừng
  ctx.beginPath(); ctx.moveTo(-s * 0.6, -s * 0.4); ctx.quadraticCurveTo(-s * 1.4, -s * 1.3, -s * 0.6, -s * 1.6); ctx.stroke();
  ctx.restore();
  glowEye(ctx, hx + face * s * 0.35, hy - s * 0.1, s * 0.16, c);
}

// Vô Tướng Ảnh Ma: bóng người cao gầy, áo choàng tan thành khói, mặt trống với 2 đốm sáng
function shade(ctx, x, y, h, c, t, face) {
  const sway = Math.sin(t * 1.3) * h * 0.04, top = y - h * 0.98;
  const g = ctx.createLinearGradient(0, top, 0, y);
  g.addColorStop(0, 'rgba(12,8,24,0.98)'); g.addColorStop(0.75, 'rgba(30,20,60,0.85)'); g.addColorStop(1, hexA(c, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x + sway, top);
  ctx.bezierCurveTo(x + h * 0.32, top + h * 0.2, x + h * 0.38, y - h * 0.25, x + h * 0.3, y);
  for (let i = 0; i <= 6; i++) { const u = i / 6; ctx.lineTo(x + h * (0.3 - 0.6 * u), y - Math.abs(Math.sin(t * 4 + i)) * h * 0.1); } // gấu áo như khói
  ctx.bezierCurveTo(x - h * 0.38, y - h * 0.25, x - h * 0.32, top + h * 0.2, x + sway, top);
  ctx.fill();
  for (const sd of [-1, 1]) { // hai cánh tay dài
    ctx.strokeStyle = 'rgba(14,10,28,0.9)'; ctx.lineWidth = h * 0.06; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x + sd * h * 0.18, top + h * 0.3);
    ctx.quadraticCurveTo(x + sd * h * 0.5, top + h * 0.5 + Math.sin(t * 2 + sd) * h * 0.08, x + sd * h * 0.42, top + h * 0.78); ctx.stroke();
  }
  ctx.fillStyle = '#05030b'; ctx.beginPath(); ctx.ellipse(x + sway, top + h * 0.16, h * 0.13, h * 0.16, 0, 0, TAU); ctx.fill();
  glowEye(ctx, x + sway + face * h * 0.03 - h * 0.05, top + h * 0.15, h * 0.025, c);
  glowEye(ctx, x + sway + face * h * 0.03 + h * 0.05, top + h * 0.15, h * 0.025, c);
}

// Tịch Diệt Huyết Liên: đoá sen máu khổng lồ xoay, nhị là con mắt đỏ
function lotus(ctx, x, y, h, c, t) {
  const cy = y - h * 0.42, R = h * 0.42;
  for (const [layer, n, k, col] of [[0, 10, 1, '#4a0b1d'], [1, 8, 0.78, '#a0173d'], [2, 6, 0.55, c]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + t * (layer % 2 ? -0.4 : 0.3) + layer;
      ctx.save(); ctx.translate(x, cy); ctx.rotate(a); ctx.scale(1, 0.62);
      ctx.fillStyle = col; ctx.strokeStyle = '#1a0309'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(R * k * 0.45, -R * k * 0.25, R * k, 0); ctx.quadraticCurveTo(R * k * 0.45, R * k * 0.25, 0, 0);
      ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  ctx.strokeStyle = '#3a0612'; ctx.lineWidth = h * 0.05; // rễ cắm xuống khe nứt
  for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(x + i * h * 0.05, cy + R * 0.2); ctx.quadraticCurveTo(x + i * h * 0.15, y - h * 0.1, x + i * h * 0.2, y); ctx.stroke(); }
  glowEye(ctx, x, cy, h * 0.07 * (1 + Math.sin(t * 3) * 0.15), '#ff2a55');
}

// Thôn Thiên Hư Thú: khối thịt hư vô khổng lồ, miệng há đầy răng, sừng cong
function beast(ctx, x, y, h, c, t, face) {
  const breathe = 1 + Math.sin(t * 2) * 0.04, cy = y - h * 0.42, R = h * 0.42 * breathe;
  const g = ctx.createRadialGradient(x - R * 0.3, cy - R * 0.4, R * 0.1, x, cy, R);
  g.addColorStop(0, hexA(c, 1)); g.addColorStop(0.6, '#2a1050'); g.addColorStop(1, '#0a0414');
  ctx.fillStyle = g; ctx.strokeStyle = '#05020a'; ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 24; i++) { const a = (i / 24) * TAU, w = 1 + Math.sin(a * 5 + t * 2) * 0.06; ctx.lineTo(x + Math.cos(a) * R * 1.1 * w, cy + Math.sin(a) * R * 0.85 * w); }
  ctx.fill(); ctx.stroke();
  for (const sd of [-1, 1]) { // sừng
    ctx.strokeStyle = '#e8dcff'; ctx.lineWidth = h * 0.05;
    ctx.beginPath(); ctx.moveTo(x + sd * R * 0.5, cy - R * 0.6); ctx.quadraticCurveTo(x + sd * R * 1.2, cy - R * 1.4, x + sd * R * 0.6, cy - R * 1.55); ctx.stroke();
  }
  const open = 0.35 + Math.abs(Math.sin(t * 1.5)) * 0.25, mx = x + face * R * 0.15, my = cy + R * 0.2;
  ctx.fillStyle = '#05010a'; ctx.beginPath(); ctx.ellipse(mx, my, R * 0.62, R * open, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#f2ecff';
  for (let i = 0; i < 9; i++) { // răng trên + dưới
    const u = -0.5 + i / 8, tx = mx + u * R * 1.1, w = R * 0.07;
    ctx.beginPath(); ctx.moveTo(tx - w, my - R * open * 0.85); ctx.lineTo(tx + w, my - R * open * 0.85); ctx.lineTo(tx, my - R * open * 0.4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(tx - w, my + R * open * 0.85); ctx.lineTo(tx + w, my + R * open * 0.85); ctx.lineTo(tx, my + R * open * 0.45); ctx.fill();
  }
  for (const [ex, ey] of [[-0.45, -0.35], [0.45, -0.35], [0, -0.55]]) glowEye(ctx, x + face * ex * R + face * R * 0.1, cy + ey * R, R * 0.07, c);
}

const SHAPES = { nhan: eye, long: dragon, anh: shade, lien: lotus, thu: beast };

// m: quái trong trận (state, hitT, facing…); t = giây
export function drawVoid(ctx, m, x, y, t) {
  const art = m.def.art, h = art.h, c = art.color || '#b06bff';
  const shake = m.atkT > 0 ? Math.sin(t * 60) * 1.2 : 0;
  rift(ctx, x, y, h, c, t);
  ctx.save();
  ctx.translate(shake, 0);
  (SHAPES[art.shape] || eye)(ctx, x, y, h, c, t, m.facing || 1);
  if (m.hitT > 0) { // loé trắng khi trúng đòn
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x, y - h * 0.5, h * 0.45, h * 0.5, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (m.stun > 0) { ctx.fillStyle = '#ffe36a'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦✦', x, y - h - 2); }
}

// Đồ giám: vẽ trong khung vuông w×h
export function drawVoidPreview(g, w, h, def, anim, t) {
  const m = { def, facing: 1, hitT: 0, stun: 0, atkT: anim === 'đánh' ? 0.3 : 0, state: 'idle' };
  const scale = (h * 0.8) / def.art.h;
  g.save(); g.translate(w / 2, h * 0.86); g.scale(scale, scale);
  drawVoid(g, m, 0, 0, t);
  g.restore();
}
