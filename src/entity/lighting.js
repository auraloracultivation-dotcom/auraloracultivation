// Ánh sáng cảnh kiểu My Heroes (chủ dự án 25/10/2026): viền màn tối nhẹ để mắt dồn vào giữa trận,
// và vùng sáng loang trên mặt đất dưới hiệu ứng cộng sáng. Thông số: data/terrain.json → lighting.
const vig = { w: 0, h: 0, c: null, key: '' };
export const LIGHT = { on: false, a: 0.5, r: 0.8 }; // vùng sáng loang (mobs.js → drawFx đọc)
export function setLighting(cfg) { if (cfg?.ground_light) Object.assign(LIGHT, cfg.ground_light, { on: true }); }

// Viền tối: một ảnh dựng sẵn theo cỡ màn (chỉ dựng lại khi đổi cỡ), mỗi khung vẽ 1 lần — gần như không tốn gì
export function drawVignette(ctx, w, h, cfg) {
  if (!cfg?.vignette) return;
  const key = `${w}x${h}|${cfg.vignette}|${cfg.vignette_color}`;
  if (vig.key !== key) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'), r = Math.hypot(w, h) / 2;
    const gr = g.createRadialGradient(w / 2, h * 0.47, r * (cfg.vignette_inner ?? 0.45), w / 2, h * 0.47, r);
    const col = cfg.vignette_color || '10,6,24';
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${cfg.vignette})`);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    Object.assign(vig, { w, h, c, key });
  }
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(vig.c, 0, 0); ctx.restore();
}

// Vùng sáng loang trên đất: elip dẹt cộng sáng, màu hiệu ứng. k: 0..1 độ mạnh theo thời gian
const dots = new Map();
function dot(color) {
  if (dots.has(color)) return dots.get(color);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, `rgba(${color},0.9)`); r.addColorStop(0.35, `rgba(${color},0.45)`); r.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); dots.set(color, c);
  return c;
}
export function groundLight(ctx, x, y, rx, color, k) {
  if (!color || k <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k);
  ctx.drawImage(dot(color), x - rx, y - rx * 0.36, rx * 2, rx * 0.72); ctx.restore();
}
