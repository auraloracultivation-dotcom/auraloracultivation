// Hàng đợi hiệu ứng: số bay trên đầu (sát thương, bạo kích, né, hút máu, phản đòn…) + hiệu ứng hình. Vẽ ở entity/mobs.js → drawFx.
import { compactText } from '../core/index.js';

export function createFxQueue(fx, fxDuration) {
  // Số bay: lệch ngang ngẫu nhiên + xếp tầng theo số chữ đang bay gần đó để không đè nhau
  // heal: số hồi máu gộp lại (hút máu mỗi nhát → một số cộng dồn, không chồng chục dòng)
  const say = (x, y, text, color, big = false, heal = false) => {
    if (heal) {
      const n = Number(String(text).replace(/[^\d]/g, '')) || 0, f = fx.find((q) => q.heal && q.t > q.life - 0.5 && Math.abs(q.x - x) < 30);
      if (f) { f.val += n; f.text = compactText(`+${f.val}`); f.t = f.life; return; }
      fx.push({ kind: 'text', heal: true, val: n, x: x + 12, y: y - 22, text: compactText(text), color, big: false, t: 1.1, life: 1.1 });
      return;
    }
    if (fx.length > 220 && !big) return; // bắn hàng trăm đạn: bớt số bay cho đỡ lag
    const near = fx.filter((f) => f.kind === 'text' && Math.abs(f.x - x) < 24 && f.t > 0.5).length;
    fx.push({ kind: 'text', x: x + (Math.random() - 0.5) * 10, y: y - 16 - near * 9, // -16: bay phía trên tên + thanh máu
      text: compactText(text), color, big, t: 1.1, life: 1.1 });
  };
  // Hiệu ứng hình (data/art/sprites.json → fx). ground: mọc từ mặt đất (đáy ở chân). delay: chờ rồi mới chạy
  // glow: màu '#rrggbb' → thêm quầng sáng dưới hiệu ứng (pháp bảo Thiên hệ)
  const play = (id, x, y, h, { ground = false, delay = 0, rot = 0, glow = null } = {}) => {
    const life = fxDuration(id);
    fx.push({ kind: 'sprite', fx: id, x, y, h, lift: ground ? h / 2 : 0, rot, t: life, life, delay, glow });
  };
  // Tia lửa trúng đòn: n vệt sáng bắn toả, bay theo công thức (không cần cập nhật từng khung), vẽ cộng sáng ở drawFx
  const spark = (x, y, color, n = 7, power = 1) => {
    if (fx.length > 300) return;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (70 + Math.random() * 110) * power, life = 0.22 + Math.random() * 0.2;
      fx.push({ kind: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 30, color, t: life, life, w: 0.8 + Math.random() * 0.9 });
    }
  };
  return { say, play, spark };
}
