// Đạn quái (chủ dự án 24/10/2026: "skill quái thì bắn từ từ có hiệu ứng ánh sáng", kiểu My Heroes).
// Tinh anh / boss đứng xa người chơi thì bắn quả cầu sáng CHẬM (≈ 65% tốc độ chạy) — nhìn thấy và né được bằng cách đi ngang.
// Vẽ bằng code, 3 tông màu theo vùng (viền mờ · thân · lõi sáng) + vệt đuôi ngắn. Số ở data/gameplay.json → monster.orb.
import { wrapDelta } from '../map/index.js';
import { sound } from '../audio/index.js';

export function createMobOrbs({ cfg, map }) {
  const orbs = [];
  const wd = (d, n) => wrapDelta(d, n);

  // Quái đang đuổi, ngoài tầm cận chiến: tới lượt thì bắn. Trả về true nếu đã bắn.
  function tryFire(m, me, d, dt) {
    const R = cfg.ranks[m.def.rank]; if (!R || d < cfg.min_px || d > cfg.range_px) return false;
    m.orbT = (m.orbT ?? R.every_s * Math.random()) - dt;
    if (m.orbT > 0) return false;
    m.orbT = R.every_s;
    const base = Math.atan2(wd(me.y - m.y, map.height), wd(me.x - m.x, map.width));
    const step = (R.spread_deg * Math.PI) / 180;
    for (let k = 0; k < R.n; k++) {
      const a = base + (k - (R.n - 1) / 2) * step;
      orbs.push({ m, x: m.x, y: m.y - m.r, vx: Math.cos(a) * cfg.speed_px_per_s, vy: Math.sin(a) * cfg.speed_px_per_s,
        left: cfg.range_px / cfg.speed_px_per_s + 0.6, col: cfg.colors[m.def.zone] || cfg.colors.default, t: 0 });
    }
    m.atkT = 0.4; if (d < 400) sound('sfx.linh-cau');
    return true;
  }

  // env: { me, alive, inTown, hitPlayer(m, mul, name) }
  function update(dt, env) {
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      o.t += dt; o.left -= dt;
      o.x = map.wrapX(o.x + o.vx * dt); o.y = map.wrapY(o.y + o.vy * dt);
      const hit = env.alive && !env.inTown && Math.hypot(wd(env.me.x - o.x, map.width), wd(env.me.y - 10 - o.y, map.height)) < cfg.hit_px;
      if (hit) env.hitPlayer(o.m, cfg.mul, cfg.name);
      if (hit || o.left <= 0 || env.inTown) orbs.splice(i, 1);
    }
  }

  // at(o): toạ độ màn hình. Ánh sáng: cộng màu (lighter), nhấp nháy nhẹ; mờ dần lúc sắp tan.
  function draw(ctx, at, now) {
    if (!orbs.length) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const o of orbs) {
      const p = at(o), fade = Math.min(1, o.left / 0.4), pulse = 1 + 0.12 * Math.sin(now / 80 + o.t * 9), r = cfg.r_px * pulse;
      const [glow, body, core] = o.col, sp = Math.hypot(o.vx, o.vy) || 1;
      for (let k = 3; k >= 1; k--) { // vệt đuôi
        ctx.globalAlpha = 0.18 * fade * (4 - k) / 3; ctx.fillStyle = body;
        ctx.beginPath(); ctx.arc(p.x - (o.vx / sp) * k * 5, p.y - (o.vy / sp) * k * 5, r * (1 - k * 0.18), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.1, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.9 * fade; ctx.fillStyle = body; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = fade; ctx.fillStyle = core; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.45, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  return { tryFire, update, draw, clear: () => { orbs.length = 0; } };
}
