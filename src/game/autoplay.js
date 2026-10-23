// Nút Tự động (yêu cầu chủ dự án 21/10): tự tìm thứ GẦN NHẤT — quái hoặc linh thảo / khoáng — rồi đi tới;
// tới quái thì đứng đánh, tới nguyên liệu thì gather.js tự hái. Kẹt (vướng cây, nước) đi đánh quái thì tự ngự kiếm bay qua
// (chủ dự án 23/10), tới nơi / qua chướng ngại thì hạ xuống farm tiếp; không bay được thì tạm bỏ mục tiêu đó.
// Neo vùng farm (chủ dự án 23/10, người chơi chê "auto mà cứ chạy lung tung"): bật Tự động = cắm neo tại chỗ đứng,
// chỉ đánh / hái trong vòng anchor_radius_px (~4 màn hình iPhone); hết quái thì về gần neo đứng chờ quái hồi sinh.
// Không vẽ vòng hay cọc neo (chủ dự án 23/10 13:20): game tự biết vùng, người chơi không cần thấy.
// Kéo cần điều khiển khi đang Tự động = dời neo theo người chơi (moved()).
// Chỉ trả về hướng đi; cần điều khiển của người chơi luôn được ưu tiên (main.js). Số ở data/gameplay.json → auto.
import { wrapDelta } from '../map/index.js';

// zone(): { x, y, r } khi đang ở bí cảnh — chỉ đánh quái trong vòng, không đi hái, không có gì thì về giữa vòng (thay cho neo)
export function createAutoPlay({ me, mobs, gather, map, cfg, reach, canFly = () => false, zone = () => null }) {
  let goal = null, repick = 0, stuckT = 0, lx = me.x, ly = me.y, fly = false, flyT = 0, anchor = null;
  let focus = null; // { zone, rank, gather } khi bật từ dẫn đường nhiệm vụ: chỉ đánh quái đúng vùng (ưu tiên đúng loại), không đánh quái vùng khác
  const skip = new Map(); // mục tiêu đang tạm bỏ → hết hạn lúc
  const rel = (o) => ({ dx: wrapDelta(o.x - me.x, map.width), dy: wrapDelta(o.y - me.y, map.height) });
  const far = (o, c) => Math.hypot(wrapDelta(o.x - c.x, map.width), wrapDelta(o.y - c.y, map.height));
  const alive = (g) => g && (g.kind === 'mob' ? g.o.state !== 'dead' : g.kind === 'spot' ? false : gather.list.includes(g.o));
  const free = (o, now) => !(skip.get(o) > now);
  const area = () => zone() || anchor; // bí cảnh ưu tiên hơn neo

  function pick(now) {
    let best = null;
    const z = zone(), a = area(), inA = (o) => !a || far(o, a) < a.r;
    const ok = (x) => free(x, now) && !x.void && !map.safeAt(x.x, x.y) && inA(x); // không tự lao vào Âm Hư
    const m = focus ? mobs.nearest(me, cfg.search_px, (x) => ok(x) && x.def.zone === focus.zone && (!focus.rank || x.def.rank === focus.rank))
        || mobs.nearest(me, cfg.search_px, (x) => ok(x) && x.def.zone === focus.zone) // nhiệm vụ: đúng loại trước, rồi cùng vùng
      : mobs.nearest(me, cfg.search_px, ok);
    if (m) best = { kind: 'mob', o: m, d: mobs.distTo(m, me) };
    if (z) return best || { kind: 'spot', o: { x: z.x, y: z.y }, d: 0 }; // bí cảnh: không hái, không có quái thì về giữa vòng
    if (!me.flying && (!focus || focus.gather)) for (const n of gather.list) { // đang bay thì không hái được; nhiệm vụ đánh quái thì không đi hái
      if (!free(n, now) || !inA(n)) continue;
      const r = rel(n), d = Math.hypot(r.dx, r.dy);
      if (d <= cfg.search_px && (!best || d < best.d)) best = { kind: 'node', o: n, d };
    }
    // vùng neo trống: lạc xa neo thì đi về gần neo, đã ở gần thì đứng chờ quái hồi sinh
    if (!best && anchor && far(me, anchor) > anchor.r * cfg.anchor_idle_frac) best = { kind: 'spot', o: { x: anchor.x, y: anchor.y }, d: 0 };
    return best;
  }

  // Mỗi khung hình khi đang bật Tự động. Trả về { x, y } hướng đi (0,0 = đứng yên) hoặc null nếu không có gì quanh đây.
  function step(dt, now) {
    repick -= dt;
    const a = area(), out = goal?.kind === 'mob' && a && far(goal.o, a) > a.r + cfg.anchor_leash_px; // quái chạy ra khỏi vùng: bỏ, không đuổi theo
    if (!alive(goal) || out || repick <= 0) { const g = pick(now); if (g?.o !== goal?.o) stuckT = 0; goal = g; repick = cfg.repick_s; }
    // đang bay vượt chướng ngại: bay ≥ 1 giây rồi hạ ngay khi dưới chân đứng được và (gần mục tiêu hoặc đã bay lâu)
    if (fly) { flyT += dt; if (flyT > 1 && map.canStand(me.x, me.y, 6) && (!goal || flyT > 6 || mobs.distTo(goal.o, me) < reach * 2)) fly = false; }
    if (!goal) return fly ? { x: 0, y: 0, fly } : null;
    const { dx, dy } = rel(goal.o), d = Math.hypot(dx, dy) || 1;
    if (goal.kind === 'spot' && d < 30) { goal = null; return { x: 0, y: 0, fly }; }
    if (goal.kind === 'mob' && d <= reach * 0.8) { stuckT = 0; lx = me.x; ly = me.y; return { x: 0, y: 0, fly }; } // đủ gần: đứng đánh
    const moved = Math.hypot(me.x - lx, me.y - ly);
    lx = me.x; ly = me.y;
    stuckT = moved < 0.3 ? stuckT + dt : 0;
    if (stuckT > cfg.stuck_s) {
      stuckT = 0;
      if (cfg.fly_when_stuck && goal.kind !== 'node' && !me.flying && canFly()) { fly = true; flyT = 0; return { x: dx / d, y: dy / d, fly }; }
      if (goal.kind !== 'spot') skip.set(goal.o, now + cfg.skip_s);
      goal = null; return { x: 0, y: 0, fly };
    }
    return { x: dx / d, y: dy / d, fly };
  }

  return {
    step,
    start(f = null) { focus = f; anchor = { x: me.x, y: me.y, r: cfg.anchor_radius_px }; goal = null; stuckT = 0; fly = false; skip.clear(); },
    reset() { focus = null; anchor = null; goal = null; stuckT = 0; fly = false; },
    moved() { if (anchor) { anchor.x = me.x; anchor.y = me.y; goal = null; } }, // người chơi tự kéo cần: neo đi theo
  };
}
