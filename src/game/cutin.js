// Khoảnh khắc tuyệt kỹ kiểu My Heroes (chủ dự án 25/10/2026): khi tự tay tung chiêu "sịn" của hệ —
// tối màn, dải mực quét ngang ghi tên chiêu, tranh pháp tướng / nhân vật lướt qua, rồi chiêu nổ (khựng nhẹ).
// Chiêu "sịn": data/build/dao-van.json → hop_nhat.he.<hệ>.skill_sin. Thông số: data/gameplay.json → cutin.
// Vẽ trong toạ độ màn hình (main.js gọi cutin.render sau cùng, trước cần điều khiển).
import { juice } from './juice.js';

let cur = null, lastAt = -1e9, band = null;
const cfg = { dur: 1.15, gap_s: 12, dim: 0.55 };

// Dải mực: đa giác mép răng cưa ngẫu nhiên (dựng một lần), cỡ 1000×160 rồi co giãn theo màn
function inkBand() {
  if (band) return band;
  const c = document.createElement('canvas'); c.width = 1000; c.height = 160;
  const g = c.getContext('2d');
  const edge = (y0, amp, n) => Array.from({ length: n + 1 }, (_, i) => [i * 1000 / n, y0 + (Math.random() - 0.5) * amp * (i % 3 ? 1 : 2.2)]);
  const top = edge(34, 18, 46), bot = edge(126, 18, 46).reverse();
  g.fillStyle = 'rgba(6,4,12,0.94)'; g.beginPath();
  [...top, ...bot].forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fill();
  for (let i = 0; i < 70; i++) { const x = Math.random() * 1000, y = Math.random() < 0.5 ? 20 + Math.random() * 18 : 124 + Math.random() * 18; g.beginPath(); g.arc(x, y, 1 + Math.random() * 4, 0, Math.PI * 2); g.fill(); } // vẩy mực
  return (band = c);
}

export const cutin = {
  portrait: () => null, // main.js gán: () => ảnh pháp tướng / chân dung nhân vật
  setup(c) { if (c) Object.assign(cfg, c); },
  // name: tên chiêu, color: '#rrggbb' màu hệ. Trả về true nếu đã chiếu (cách nhau ít nhất gap_s giây)
  show(name, color) {
    const now = performance.now() / 1000;
    if (now - lastAt < cfg.gap_s) return false;
    lastAt = now; cur = { name, color: color || '#ffe6a0', t0: now, img: cutin.portrait() };
    juice.dim(cfg.dur, cfg.dim);
    return true;
  },
  render(ctx, W, H, dpr) {
    if (!cur) return;
    const t = performance.now() / 1000 - cur.t0, D = cfg.dur;
    if (t > D) { cur = null; return; }
    const sweep = Math.min(1, t / 0.18), out = Math.max(0, (t - D + 0.28) / 0.28), a = 1 - out;
    const bh = Math.min(H * 0.2, 150 * dpr), by = H * 0.36 - bh / 2;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a;
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W * sweep, H); ctx.clip(); // mực quét từ trái sang
    ctx.drawImage(inkBand(), -W * 0.05, by, W * 1.1, bh);
    ctx.fillStyle = cur.color; ctx.globalAlpha = a * 0.9; ctx.fillRect(0, by + bh * 0.8, W, Math.max(2, 2 * dpr)); // vệt màu hệ
    ctx.restore();
    if (cur.img) { // tranh lướt từ phải vào, dừng, rồi trôi tiếp
      const ih = bh * 1.9, iw = ih * (cur.img.width / cur.img.height), slide = t < 0.22 ? 1 - (1 - t / 0.22) ** 3 : 1 + (t - 0.22) * 0.06;
      ctx.globalAlpha = a; ctx.drawImage(cur.img, W - iw * 0.95 * slide - W * 0.02, by + bh - ih * 0.92, iw, ih);
    }
    const fs = Math.round(Math.min(bh * 0.3, W * 0.072)), tx = W * 0.06 + (1 - sweep) * -40 * dpr; // tên chiêu
    ctx.globalAlpha = a * Math.min(1, Math.max(0, (t - 0.1) / 0.15));
    ctx.font = `900 ${fs}px "Times New Roman", serif`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.lineJoin = 'round';
    ctx.lineWidth = fs * 0.16; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.strokeText(cur.name, tx, by + bh * 0.5);
    ctx.fillStyle = '#fff6dc'; ctx.fillText(cur.name, tx, by + bh * 0.5);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= 0.5; ctx.fillStyle = cur.color; ctx.fillText(cur.name, tx, by + bh * 0.5);
    ctx.restore();
  },
};
