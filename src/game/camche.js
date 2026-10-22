// CẤM CHẾ (chủ dự án 23/10/2026, Tiên Nghịch × My Heroes) — kỹ năng "Bố Cấm Chế" đặt trận dưới mục tiêu (hoặc dưới chân).
// Loại trận theo hệ chủ đạo của Đạo Vận; mạnh thêm theo số món cùng hệ. Số liệu: data/build/cam-che.json.
// Mọi sát thương đi qua barrage.hitAround → strike (áp chế cảnh giới, tu vi, rơi đồ như thường).
import { drawEffect } from '../entity/index.js';

// c: { def, dv, barrage, me, mobs, target(r), play, toast, heal(n), maxHp(), dead() }
export function createCamChe(c) {
  const { def, dv, barrage, me, mobs, play } = c;
  const list = [];
  let T = 0;

  function cast(s) {
    const md = dv.mods(), he = md.he, d = def.he[he] || def.he.Kim, n = dv.counts()[he] || 0;
    const m = c.target(s.range_px || 200), at = m ? { x: m.x, y: m.y } : { x: me.x, y: me.y };
    if (list.length >= def.max_active) list.shift(); // đủ 3 trận: trận cũ nhất tan
    list.push({ ...d, he, x: at.x, y: at.y, left: d.s, tick: 0, mul: d.mul * (1 + def.set_bonus * n), color: dv.heOf(he).color, born: T });
    play('v.tran-phap', at.x, at.y + 6, d.r * 1.1, { ground: true });
    c.toast(`${d.name}${n ? ` (bộ ${he} ${n}/8)` : ''}`, 1000);
    return true;
  }

  function update(dt) {
    T += dt;
    for (let i = list.length - 1; i >= 0; i--) {
      const z = list[i];
      z.left -= dt; z.tick -= dt;
      if (z.left <= 0) { list.splice(i, 1); continue; }
      if (z.tick > 0) continue;
      z.tick = def.tick_s;
      const inside = mobs.within(z, z.r).filter((m) => m.state !== 'dead');
      if (!inside.length) continue;
      barrage.hitAround(z.x, z.y, z.r, z.mul, 'skill', z.stun);
      const m = inside[Math.floor(Math.random() * inside.length)];
      play(z.fx, m.x, m.y, 22, { ground: z.fx !== 'chem-x' });
      if (z.drain && !c.dead()) c.heal(c.maxHp() * z.drain * inside.length);
      if (z.heal && !c.dead() && Math.hypot(me.x - z.x, me.y - z.y) < z.r) c.heal(c.maxHp() * z.heal);
    }
  }

  // Vẽ trận dưới đất: vòng phù văn xoay theo màu hệ, mờ dần khi sắp tan
  function render(ctx, at, now) {
    if (!list.length) return;
    const k = now / 1000;
    ctx.save();
    for (const z of list) {
      const p = at(z), fade = Math.min(1, z.left / 1.5, (T - z.born) * 4), r = z.r;
      ctx.globalAlpha = 0.55 * fade; ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, r);
      g.addColorStop(0, z.color + '55'); g.addColorStop(1, z.color + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = z.color; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([3, 5]); ctx.lineDashOffset = k * 20;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r * 0.72, r * 0.32, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 6; i++) { // 6 ấn phù văn xoay
        const a = k * 0.8 + (i / 6) * Math.PI * 2, x = p.x + Math.cos(a) * r * 0.86, y = p.y + Math.sin(a) * r * 0.39;
        ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = z.color; ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      ctx.globalAlpha = 0.5 * fade; drawEffect(ctx, 'v.tran-phap', (k * 0.5) % 1, p.x, p.y + r * 0.2, r * 0.9);
    }
    ctx.restore();
  }
  return { cast, update, render, count: () => list.length };
}
