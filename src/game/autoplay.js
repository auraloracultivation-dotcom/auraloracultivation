// TỰ ĐỘNG (viết lại 24/10/2026 — chủ dự án: "đang farm tự đứng lại, quái gần không đánh mà cứ đi tìm đâu";
// tách hẳn Tự farm và Tự làm nhiệm vụ). Chỉ trả về hướng đi; cần điều khiển của người chơi luôn được ưu tiên (main.js).
//
// Hai chế độ:
//  - 'farm'  : cắm neo tại chỗ bật, đánh quái gần nhất quanh neo. KHÔNG đi hái. Quanh neo hết quái quá idle_expand_s giây
//              thì đi tới con gần nhất trong search_px và dời neo theo (không còn cảnh đứng chờ mãi).
//  - 'quest' : giống farm nhưng chỉ đánh quái đúng nhiệm vụ (focus: vùng / hạng), nhiệm vụ hái thì đi hái. Do questauto.js điều khiển.
// Luật chung:
//  - Quái ĐANG ĐÁNH MÌNH trong defend_px luôn được đánh trước, bất kể vùng / neo / nhiệm vụ.
//  - Đứng đủ gần mục tiêu thì đứng yên để gameplay tự đánh; không đổi mục tiêu khi con hiện tại còn sống và trong tầm.
//  - Khí huyết dưới rest_below và không ai đánh mình: đứng nghỉ (khí huyết tự hồi sau player.regen_after_s) tới rest_until.
//  - Kẹt (cây, nước): ngự kiếm bay qua nếu được, không thì lách sang bên; vẫn kẹt thì tạm bỏ mục tiêu skip_s giây.
// Số ở data/gameplay.json → auto.
import { wrapDelta } from '../map/index.js';

const FIGHTING = new Set(['chase', 'windup', 'cast']);

// zone(): { x, y, r } khi đang ở bí cảnh — chỉ đánh quái trong vòng (thay neo). hpFrac(): khí huyết hiện / tối đa.
export function createAutoPlay({ me, mobs, gather, map, cfg, reach, canFly = () => false, zone = () => null, hpFrac = () => 1 }) {
  let mode = null, focus = null, anchor = null, goal = null, repick = 0, idleT = 0, resting = false, hungryT = 0; // hungryT: giây liền không có quái / nguyên liệu để làm
  let stuckT = 0, lx = me.x, ly = me.y, fly = false, flyT = 0, side = 1, sideT = 0;
  const skip = new Map(); // mục tiêu tạm bỏ → hết hạn lúc
  const rel = (o) => ({ dx: wrapDelta(o.x - me.x, map.width), dy: wrapDelta(o.y - me.y, map.height) });
  const far = (o, c) => Math.hypot(wrapDelta(o.x - c.x, map.width), wrapDelta(o.y - c.y, map.height));
  const area = () => zone() || anchor;
  const free = (o, now) => !(skip.get(o) > now);
  const alive = (g) => g && (g.kind === 'mob' ? g.o.state !== 'dead' : g.kind === 'spot' ? true : gather.list.includes(g.o));
  const usable = (m, now) => free(m, now) && !m.void && !map.safeAt(m.x, m.y); // không tự lao vào Âm Hư, không đánh trong thành
  const wanted = (m) => !focus || (m.def.zone === focus.zone && (!focus.rank || m.def.rank === focus.rank));
  const inArea = (o) => { const a = area(); return !a || far(o, a) < a.r; };

  function pick(now) {
    // 1) con đang đánh mình ở gần: đánh trả trước mọi thứ
    const foe = mobs.nearest(me, cfg.defend_px, (m) => usable(m, now) && FIGHTING.has(m.state));
    if (foe) return { kind: 'mob', o: foe };
    // 2) quái đúng chế độ trong vùng neo (nhiệm vụ: đúng loại trước, rồi cùng vùng)
    let m = mobs.nearest(me, cfg.search_px, (x) => usable(x, now) && inArea(x) && wanted(x));
    if (!m && focus?.rank) m = mobs.nearest(me, cfg.search_px, (x) => usable(x, now) && inArea(x) && x.def.zone === focus.zone);
    let best = m ? { kind: 'mob', o: m, d: mobs.distTo(m, me) } : null;
    if (zone()) return best || { kind: 'spot', o: { x: zone().x, y: zone().y } }; // bí cảnh: không có quái thì về giữa vòng
    // 3) nhiệm vụ hái: nguyên liệu gần hơn quái thì đi hái (chế độ farm không hái)
    if (mode === 'quest' && focus?.gather && !me.flying) for (const n of gather.list) {
      if (!free(n, now) || !inArea(n)) continue;
      const { dx, dy } = rel(n), d = Math.hypot(dx, dy);
      if (d <= cfg.search_px && (!best || d < best.d)) best = { kind: 'node', o: n, d };
    }
    if (best) { idleT = 0; return best; }
    // 4) quanh neo trống: chờ một chút, rồi đi tới con gần nhất (rộng hơn) và dời neo theo
    if (idleT > cfg.idle_expand_s) {
      const n = mobs.nearest(me, cfg.search_px * 1.6, (x) => usable(x, now) && wanted(x));
      if (n) { idleT = 0; if (anchor) { anchor.x = n.x; anchor.y = n.y; } return { kind: 'mob', o: n }; }
    }
    if (anchor && far(me, anchor) > anchor.r * cfg.anchor_idle_frac) return { kind: 'spot', o: { x: anchor.x, y: anchor.y } };
    return null;
  }

  function step(dt, now) {
    if (!mode) return null;
    repick -= dt;
    const f = hpFrac(); if (f < cfg.rest_below) resting = true; else if (f >= cfg.rest_until) resting = false;
    const hold = goal?.kind === 'mob' && alive(goal) && mobs.distTo(goal.o, me) <= reach * 1.2; // đang đứng đánh: giữ mục tiêu
    if (!alive(goal) || (!hold && repick <= 0)) {
      const g = pick(now);
      if (g?.o !== goal?.o) stuckT = 0;
      goal = g; repick = cfg.repick_s;
    }
    hungryT = goal && goal.kind !== 'spot' ? 0 : hungryT + dt;
    if (!goal) { idleT += dt; return fly ? { x: 0, y: 0, fly } : { x: 0, y: 0, idle: true }; }
    if (resting && !(goal.kind === 'mob' && FIGHTING.has(goal.o.state))) return { x: 0, y: 0, rest: true };
    if (fly) { flyT += dt; if (flyT > 1 && map.canStand(me.x, me.y, 6) && (flyT > 6 || mobs.distTo(goal.o, me) < reach * 2)) fly = false; }
    const { dx, dy } = rel(goal.o), d = Math.hypot(dx, dy) || 1;
    if (goal.kind === 'spot' && d < 30) { goal = null; return { x: 0, y: 0, fly }; }
    if (goal.kind === 'mob' && d <= reach * 0.8) { stuckT = 0; lx = me.x; ly = me.y; return { x: 0, y: 0, fly }; } // đủ gần: đứng đánh
    const moved = Math.hypot(me.x - lx, me.y - ly);
    lx = me.x; ly = me.y;
    stuckT = moved < 0.3 ? stuckT + dt : 0;
    if (stuckT > cfg.stuck_s) {
      stuckT = 0;
      if (cfg.fly_when_stuck && goal.kind !== 'node' && !me.flying && canFly()) { fly = true; flyT = 0; return { x: dx / d, y: dy / d, fly }; }
      if (goal.kind !== 'spot' && sideT <= -1) { skip.set(goal.o, now + cfg.skip_s); goal = null; return { x: 0, y: 0, fly }; }
      side = -side; sideT = 0.9; // lách sang bên một lúc rồi đi tiếp
    }
    if (sideT > -1) sideT -= dt;
    if (sideT > 0) { const a = side * 1.1, c = Math.cos(a), s = Math.sin(a); return { x: (dx * c - dy * s) / d, y: (dx * s + dy * c) / d, fly }; }
    return { x: dx / d, y: dy / d, fly };
  }

  function start(m, f = null, at = null) {
    mode = m; focus = f; anchor = { x: at?.x ?? me.x, y: at?.y ?? me.y, r: cfg.anchor_radius_px };
    resting = false; goal = null; stuckT = 0; idleT = 0; hungryT = 0; fly = false; sideT = -1; skip.clear();
  }
  return {
    step, start,
    mode: () => mode,
    hungry: () => (mode ? hungryT : 0),
    snapshot: () => (mode ? { mode, focus, at: anchor && { x: anchor.x, y: anchor.y } } : null),
    reset() { mode = null; focus = null; anchor = null; goal = null; stuckT = 0; fly = false; },
    moved() { if (anchor) { anchor.x = me.x; anchor.y = me.y; goal = null; } }, // người chơi tự kéo cần: neo đi theo
  };
}
