// Nút Tự động (yêu cầu chủ dự án 21/10): tự tìm thứ GẦN NHẤT — quái hoặc linh thảo / khoáng — rồi đi tới;
// tới quái thì đứng đánh, tới nguyên liệu thì gather.js tự hái. Kẹt (vướng cây, nước) đi đánh quái thì tự ngự kiếm bay qua
// (chủ dự án 23/10), tới nơi / qua chướng ngại thì hạ xuống farm tiếp; không bay được thì tạm bỏ mục tiêu đó.
// Chỉ trả về hướng đi; cần điều khiển của người chơi luôn được ưu tiên (main.js). Số ở data/gameplay.json → auto.
import { wrapDelta } from '../map/index.js';

// zone(): { x, y, r } khi đang ở bí cảnh — chỉ đánh quái trong vòng, không đi hái, không có gì thì về giữa vòng
export function createAutoPlay({ me, mobs, gather, map, cfg, reach, canFly = () => false, zone = () => null }) {
  let goal = null, repick = 0, stuckT = 0, lx = me.x, ly = me.y, fly = false, flyT = 0;
  const skip = new Map(); // mục tiêu đang tạm bỏ → hết hạn lúc
  const rel = (o) => ({ dx: wrapDelta(o.x - me.x, map.width), dy: wrapDelta(o.y - me.y, map.height) });
  const alive = (g) => g && (g.kind === 'mob' ? g.o.state !== 'dead' : g.kind === 'spot' ? false : gather.list.includes(g.o));
  const free = (o, now) => !(skip.get(o) > now);

  function pick(now) {
    let best = null;
    const z = zone(), inZ = (o) => !z || Math.hypot(wrapDelta(o.x - z.x, map.width), wrapDelta(o.y - z.y, map.height)) < z.r;
    const m = mobs.nearest(me, cfg.search_px, (x) => free(x, now) && !x.void && !map.safeAt(x.x, x.y) && inZ(x)); // không tự lao vào Âm Hư
    if (m) best = { kind: 'mob', o: m, d: mobs.distTo(m, me) };
    if (z) return best || { kind: 'spot', o: { x: z.x, y: z.y }, d: 0 }; // bí cảnh: không hái, không có quái thì về giữa vòng
    if (!me.flying) for (const n of gather.list) { // đang bay thì không hái được
      if (!free(n, now)) continue;
      const r = rel(n), d = Math.hypot(r.dx, r.dy);
      if (d <= cfg.search_px && (!best || d < best.d)) best = { kind: 'node', o: n, d };
    }
    return best;
  }

  // Mỗi khung hình khi đang bật Tự động. Trả về { x, y } hướng đi (0,0 = đứng yên) hoặc null nếu không có gì quanh đây.
  function step(dt, now) {
    repick -= dt;
    if (!alive(goal) || repick <= 0) { const g = pick(now); if (g?.o !== goal?.o) stuckT = 0; goal = g; repick = cfg.repick_s; }
    // đang bay vượt chướng ngại: bay ≥ 1 giây rồi hạ ngay khi dưới chân đứng được và (gần mục tiêu hoặc đã bay lâu)
    if (fly) { flyT += dt; if (flyT > 1 && map.canStand(me.x, me.y, 6) && (!goal || flyT > 6 || mobs.distTo(goal.o, me) < reach * 2)) fly = false; }
    if (!goal) return fly ? { x: 0, y: 0, fly } : null;
    const { dx, dy } = rel(goal.o), d = Math.hypot(dx, dy) || 1;
    if (goal.kind === 'spot' && d < 30) return { x: 0, y: 0, fly };
    if (goal.kind === 'mob' && d <= reach * 0.8) { stuckT = 0; lx = me.x; ly = me.y; return { x: 0, y: 0, fly }; } // đủ gần: đứng đánh
    const moved = Math.hypot(me.x - lx, me.y - ly);
    lx = me.x; ly = me.y;
    stuckT = moved < 0.3 ? stuckT + dt : 0;
    if (stuckT > cfg.stuck_s) {
      stuckT = 0;
      if (cfg.fly_when_stuck && goal.kind === 'mob' && !me.flying && canFly()) { fly = true; flyT = 0; return { x: dx / d, y: dy / d, fly }; }
      skip.set(goal.o, now + cfg.skip_s); goal = null; return { x: 0, y: 0, fly };
    }
    return { x: dx / d, y: dy / d, fly };
  }
  return { step, reset() { goal = null; stuckT = 0; fly = false; } };
}
