// Quầng sáng cộng màu (kiểu My Heroes: chiêu thức "đục sáng" nền tối). Gradient vẽ sẵn một lần mỗi màu rồi giữ lại,
// mỗi lần vẽ chỉ là một drawImage với 'lighter' — rẻ hơn nhiều so với shadowBlur khi hàng chục hiệu ứng cùng lúc trên điện thoại.
const cache = new Map(); // màu → canvas 64×64

function sprite(color) {
  if (cache.has(color)) return cache.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,0.95)'); r.addColorStop(0.18, color); r.addColorStop(0.55, color + '55'); r.addColorStop(1, color + '00');
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  cache.set(color, c);
  return c;
}

// Vầng sáng hình bầu dục tại (x, y) bán kính r (dẹt theo `flat` cho mặt đất), độ sáng a 0..1. color dạng '#rrggbb'.
export function glow(ctx, x, y, r, color, a = 1, flat = 1) {
  if (a <= 0.01 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, a);
  ctx.drawImage(sprite(color), x - r, y - r * flat, r * 2, r * 2 * flat);
  ctx.restore();
}
