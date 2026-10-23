// Kỹ năng boss (chủ dự án 23/10: Nguyên Anh 1, Hóa Thần 2, Anh Biến 2, Vấn Đỉnh 3, Âm Hư 3) — THỬ NGHIỆM phía máy khách.
// Thông số: data/monsters/monsters.json → skills (sinh bằng tools/gen_balance.py), quái nào có gì: monster.skills.
// Boss đứng vận chiêu windup_s giây, vùng trúng hiện đỏ trên đất (vòng / dải) — chạy ra khỏi vùng là né.
import { wrapDelta } from '../map/index.js';

export function createMobSkills({ lib, map }) {
  const wd = (d, n) => wrapDelta(d, n);

  // Đang đuổi người chơi: có chiêu sẵn sàng + trong tầm thì bắt đầu vận. Trả về true nếu đã bắt đầu.
  function tryCast(m, me, d) {
    const ids = m.def.skills;
    if (!ids?.length || m.gcd > 0 || m.sealed > 0) return false; // bị Cấm Chế Phong Ấn: không vận chiêu
    m.scd ||= {};
    for (const id of ids) {
      const s = lib[id];
      if (!s || (m.scd[id] || 0) > 0 || d > s.range_px) continue;
      const cast = { id, s, t: s.windup_s, spots: [], line: null };
      if (s.kind === 'target') cast.spots.push({ x: me.x, y: me.y });
      else if (s.kind === 'self') cast.spots.push({ x: m.x, y: m.y });
      else if (s.kind === 'multi') {
        cast.spots.push({ x: me.x, y: me.y });
        for (let k = 1; k < s.n; k++) {
          const a = Math.random() * Math.PI * 2, r = s.spread * (0.4 + Math.random() * 0.6);
          cast.spots.push({ x: map.wrapX(me.x + Math.cos(a) * r), y: map.wrapY(me.y + Math.sin(a) * r * 0.7) });
        }
      } else if (s.kind === 'line') {
        const dx = wd(me.x - m.x, map.width), dy = wd(me.y - m.y, map.height), L = Math.hypot(dx, dy) || 1;
        cast.line = { x: m.x, y: m.y, ux: dx / L, uy: dy / L };
      }
      m.cast = cast; m.state = 'cast'; m.moving = false;
      if (cast.line?.ux) m.facing = cast.line.ux > 0 ? 1 : -1;
      return true;
    }
    return false;
  }

  // Người chơi có đứng trong vùng chiêu không
  function inside(c, me) {
    const s = c.s;
    if (c.line) {
      const dx = wd(me.x - c.line.x, map.width), dy = wd(me.y - c.line.y, map.height);
      const along = dx * c.line.ux + dy * c.line.uy, across = Math.abs(-dx * c.line.uy + dy * c.line.ux);
      return along >= 0 && along <= s.len && across <= s.w / 2;
    }
    return c.spots.some((p) => Math.hypot(wd(me.x - p.x, map.width), (wd(me.y - p.y, map.height)) / 0.7) < s.r);
  }

  // Mỗi khung hình khi quái đang vận chiêu. env: { me, alive, inTown, hitPlayer(m, mul), dodged(m), fx(id, x, y, h, ground), stunPlayer(s) }
  function tick(m, dt, env) {
    const c = m.cast;
    c.t -= dt;
    if (c.t > 0) return;
    const s = c.s;
    if (c.line) {
      for (let k = 1; k <= 3; k++) env.fx(s.fx, map.wrapX(c.line.x + c.line.ux * s.len * k / 3), map.wrapY(c.line.y + c.line.uy * s.len * k / 3) - 14, s.fx_h, false, Math.atan2(c.line.uy, c.line.ux));
    } else for (const p of c.spots) env.fx(s.fx, p.x, p.y, s.fx_h, true);
    if (env.alive && !env.inTown) {
      if (inside(c, env.me)) { env.hitPlayer(m, s.mul, s.name); if (s.stun_s) env.stunPlayer(s.stun_s); } else env.dodged(m, s.name);
    }
    m.scd[c.id] = s.cd_s; m.gcd = 2.5; m.atkT = 0.5; m.cast = null; m.state = 'chase';
  }
  function cool(m, dt) {
    if (m.gcd > 0) m.gcd -= dt;
    if (m.sealed > 0) m.sealed -= dt;
    if (m.scd) for (const k in m.scd) if (m.scd[k] > 0) m.scd[k] -= dt;
  }

  // Hình báo trước (toạ độ màn hình qua at()) — mobs.js vẽ
  function telegraph(m, at) {
    const c = m.cast; if (!c) return null;
    const p = 1 - c.t / c.s.windup_s;
    if (c.line) { const a = at(c.line); return { p, line: { x: a.x, y: a.y, ang: Math.atan2(c.line.uy, c.line.ux), len: c.s.len, w: c.s.w } }; }
    return { p, circles: c.spots.map((s) => ({ ...at(s), r: c.s.r })) };
  }
  return { tryCast, tick, cool, telegraph };
}
