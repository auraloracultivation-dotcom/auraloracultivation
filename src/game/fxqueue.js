// Hàng đợi hiệu ứng: số bay trên đầu (sát thương, bạo kích, né, hút máu, phản đòn…) + hiệu ứng hình. Vẽ ở entity/mobs.js → drawFx.
export function createFxQueue(fx, fxDuration) {
  // Số bay: lệch ngang ngẫu nhiên + xếp tầng theo số chữ đang bay gần đó để không đè nhau
  const say = (x, y, text, color, big = false) => {
    const near = fx.filter((f) => f.kind === 'text' && Math.abs(f.x - x) < 24 && f.t > 0.5).length;
    fx.push({ kind: 'text', x: x + (Math.random() - 0.5) * 10, y: y - 16 - near * 9, // -16: bay phía trên tên + thanh máu
      text, color, big, t: 1.1, life: 1.1 });
  };
  // Hiệu ứng hình (data/art/sprites.json → fx). ground: mọc từ mặt đất (đáy ở chân). delay: chờ rồi mới chạy
  const play = (id, x, y, h, { ground = false, delay = 0, rot = 0 } = {}) => {
    const life = fxDuration(id);
    fx.push({ kind: 'sprite', fx: id, x, y, h, lift: ground ? h / 2 : 0, rot, t: life, life, delay });
  };
  return { say, play };
}
