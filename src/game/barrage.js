// Đạn + bị động của ĐẠO VẬN (daovan.js): bắn xoè quạt, xuyên, nảy, tách, sét lan, tự đuổi, nổ, cháy đất,
// phi kiếm xoay quanh người, mưa kiếm / thiên hỏa / địa thứ, liên thanh tự bắn. Vẽ thêm vệt sáng, sét, vùng cháy.
// Mọi sát thương đi qua c.strike (áp chế cảnh giới, tu vi, rơi đồ như đánh thường). Giới hạn số đạn: dao-van.json → limits.
import { wrapDelta } from '../map/index.js';
import { drawEffect } from '../entity/index.js';

// c: { dv, S, me, mobs, map, bolts, strike(m, mul, label), heal(n), maxHp(), play, say, dead() }
export function createBarrage(c) {
  const { dv, me, mobs, map, bolts, play } = c;
  const L = dv.limits;
  const zones = [], zaps = [], echoes = [], timers = {};
  const orbitHit = new Map(); // uid quái → lúc phi kiếm được chém tiếp
  let T = 0, orbitA = 0;
  const rel = (a, b) => ({ dx: wrapDelta(a.x - b.x, map.width), dy: wrapDelta(a.y - b.y, map.height) });
  const alive = (m) => m && m.state !== 'dead';
  const nearestTo = (p, r, skip) => {
    let best = null, bd = r;
    for (const m of mobs.list) { if (!alive(m) || skip?.has(m.uid)) continue; const d = Math.hypot(rel(m, p).dx, rel(m, p).dy - m.r); if (d < bd) { bd = d; best = m; } }
    return best;
  };
  const hitAround = (x, y, r, mul, label, stun) => {
    for (const m of mobs.within({ x, y }, r)) { c.strike(m, mul, label); if (stun && alive(m)) m.stun = Math.max(m.stun || 0, stun); }
  };

  // ---- Bắn: spec { id, x, y, dx, dy, speed, range, fx, size, mul, base (thông số chiêu), label, child } ----
  function fire(spec) {
    const md = dv.mods(), n = spec.child ? 1 : 1 + (md.multishot || 0);
    const a0 = Math.atan2(spec.dy, spec.dx), step = n > 1 ? Math.min(0.26, 1.3 / n) : 0;
    for (let k = 0; k < n && bolts.length < L.max_bolts; k++) {
      const a = a0 + (k - (n - 1) / 2) * step;
      bolts.push({ kind: 'bolt', id: spec.id, fx: spec.fx, size: spec.size || 22, x: spec.x, y: spec.y, vx: Math.cos(a) * spec.speed, vy: Math.sin(a) * spec.speed,
        left: spec.range, mul: spec.mul, base: spec.base || {}, label: spec.label || 'skill', child: !!spec.child, hit: new Set(),
        pierce: spec.child ? 0 : (md.pierce || 0) + (spec.base?.pierce ? 99 : 0), bounce: spec.child ? 0 : md.bounce || 0,
        homing: md.homing || spec.homing || 0, color: spec.color || md.color, trail: [] });
    }
  }
  // Chiêu vừa dùng: có tỷ lệ tự phát lại (Liên Hoàn Phù)
  const maybeEcho = (fn) => { const e = dv.mods().echo || 0; if (e > 0 && Math.random() < e) echoes.push({ t: 0.18, fn }); };

  // Đánh thường: bắn thêm đạn đạo pháp + sóng chấn
  function basic(m) {
    const md = dv.mods(); if (!m || c.dead()) return;
    if (md.basic_shot) {
      const r = rel(m, me), d = Math.hypot(r.dx, r.dy - 10) || 1;
      for (let k = 0; k < md.basic_shot; k++) {
        const j = (k - (md.basic_shot - 1) / 2) * 0.18;
        const dx = r.dx / d, dy = (r.dy - 10) / d;
        fire({ id: 'dao', x: me.x, y: me.y - 12, dx: dx * Math.cos(j) - dy * Math.sin(j), dy: dx * Math.sin(j) + dy * Math.cos(j), speed: 430, range: 240,
          fx: md.bolt, size: 18, mul: L.basic_shot_mul, label: 'skill' });
      }
    }
    if (md.shock) {
      play('tho-vong', m.x, m.y + 2, md.shock.r * 1.6, { ground: true });
      zaps.push({ kind: 'ring', x: m.x, y: m.y, r: md.shock.r, t: 0.35, color: dv.heOf('Thổ').color });
      hitAround(m.x, m.y, md.shock.r, md.shock.mul || 0.6, 'skill', md.shock.stun);
    }
  }

  // ---- Trúng đạn ----
  function onHit(b, m, md) {
    const base = b.base;
    const boom = (base.splash_px || 0) + (b.child ? 0 : md.explode || 0);
    if (boom) { hitAround(m.x, m.y, boom, b.mul, b.label, base.stun_s); if (md.explode && !base.hit_fx) play('v.no-hoa', m.x, m.y, Math.min(60, boom * 1.3), { ground: true }); }
    else { c.strike(m, b.mul, b.label); if (base.stun_s && alive(m)) m.stun = Math.max(m.stun || 0, base.stun_s); }
    if (base.hit_fx) play(base.hit_fx, m.x, m.y, base.hit_h, { ground: true });
    if (md.heal_on_hit) c.heal(c.maxHp() * md.heal_on_hit);
    if (md.burn && !b.child && zones.length < 24) zones.push({ x: m.x, y: m.y, r: md.burn.r || 24, mul: md.burn.mul, t: md.burn.s || 3, tick: 0 });
    if (md.chain) { // sét lan
      const done = new Set([m.uid]); let from = m;
      for (let k = 0; k < md.chain; k++) {
        const n = nearestTo(from, 120, done); if (!n) break;
        done.add(n.uid); zaps.push({ kind: 'zap', x: from.x, y: from.y - from.r, x2: n.x, y2: n.y - n.r, t: 0.22, color: '#bfe8ff' });
        c.strike(n, b.mul * L.chain_mul, 'skill'); from = n;
      }
    }
    if (md.split && !b.child) { // tách đạn nhỏ toả tròn
      for (let k = 0; k < md.split; k++) {
        const a = (k / md.split) * Math.PI * 2 + Math.random() * 0.4;
        fire({ id: b.id, x: m.x, y: m.y - m.r, dx: Math.cos(a), dy: Math.sin(a), speed: 300, range: 110, fx: b.fx, size: b.size * 0.7, mul: b.mul * L.split_mul, label: 'skill', child: true });
      }
    }
  }

  function updateBolts(dt) {
    const md = dv.mods();
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], sp = Math.hypot(b.vx, b.vy);
      if (b.homing) { // bẻ lái về quái gần nhất trước mặt
        const t = nearestTo(b, 170, b.hit);
        if (t) {
          const r = rel(t, b), want = Math.atan2(r.dy - t.r, r.dx), cur = Math.atan2(b.vy, b.vx);
          let d = want - cur; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
          const a = cur + Math.max(-1, Math.min(1, d)) * Math.min(1, b.homing * 7 * dt);
          b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp;
        }
      }
      if (b.trail.length > 5) b.trail.shift();
      b.trail.push({ x: b.x, y: b.y });
      b.x = map.wrapX(b.x + b.vx * dt); b.y = map.wrapY(b.y + b.vy * dt); b.left -= sp * dt;
      const m = mobs.list.find((x) => alive(x) && !b.hit.has(x.uid)
        && Math.hypot(wrapDelta(x.x - b.x, map.width), wrapDelta(x.y - x.r - b.y, map.height)) < x.r + 6);
      if (m) {
        b.hit.add(m.uid); onHit(b, m, md);
        if (b.bounce > 0) { // nảy sang quái khác
          const n = nearestTo(m, L.bounce_px, b.hit);
          if (n) { b.bounce--; const r = rel(n, b), d = Math.hypot(r.dx, r.dy - n.r) || 1; b.vx = r.dx / d * sp; b.vy = (r.dy - n.r) / d * sp; b.left = Math.max(b.left, L.bounce_px); continue; }
        }
        if (b.pierce > 0) { b.pierce--; continue; }
        bolts.splice(i, 1); continue;
      }
      if (b.left <= 0) bolts.splice(i, 1);
    }
  }

  // ---- Bị động mỗi khung hình ----
  function passives(dt) {
    const md = dv.mods();
    if (md.orbit?.n) { // phi kiếm xoay quanh người
      orbitA += dt * 3.2;
      const n = Math.min(12, md.orbit.n), r = md.orbit.r || 26;
      for (let k = 0; k < n; k++) {
        const a = orbitA + (k / n) * Math.PI * 2, p = { x: map.wrapX(me.x + Math.cos(a) * r), y: map.wrapY(me.y - 10 + Math.sin(a) * r * 0.55) };
        for (const m of mobs.within(p, 10)) {
          if ((orbitHit.get(m.uid) || 0) > T) continue;
          orbitHit.set(m.uid, T + L.orbit_hit_s); c.strike(m, md.orbit.mul || 0.5, 'skill');
        }
      }
    }
    for (const [k, r] of md.rains.entries()) { // mưa kiếm / thiên hỏa / sóng / địa thứ
      const key = `rain${k}${r.he}`;
      if ((timers[key] ??= T + r.every_s) > T) continue;
      timers[key] = T + r.every_s;
      const near = mobs.list.filter((m) => alive(m) && Math.hypot(rel(m, me).dx, rel(m, me).dy) < L.rain_range_px)
        .sort(() => Math.random() - 0.5).slice(0, r.n);
      near.forEach((m, j) => setTimeout(() => {
        if (!alive(m)) return;
        play(r.fx, m.x, m.y + 2, r.h || 44, { ground: true });
        hitAround(m.x, m.y, r.radius || 26, r.mul, 'skill', r.stun);
      }, j * 90));
    }
    for (const [k, tr] of md.turrets.entries()) { // liên thanh tự bắn
      const key = `turret${k}`;
      if ((timers[key] ??= T + tr.every_s) > T) continue;
      timers[key] = T + tr.every_s;
      const m = nearestTo(me, L.turret_range_px); if (!m) continue;
      const he = dv.heOf(tr.he || md.he), r = rel(m, me), d = Math.hypot(r.dx, r.dy - 10) || 1;
      for (let j = 0; j < (tr.n || 1); j++) {
        const a = (j - ((tr.n || 1) - 1) / 2) * 0.22, dx = r.dx / d, dy = (r.dy - 10) / d;
        fire({ id: 'dao', x: me.x, y: me.y - 14, dx: dx * Math.cos(a) - dy * Math.sin(a), dy: dx * Math.sin(a) + dy * Math.cos(a), speed: 460, range: L.turret_range_px + 30,
          fx: he.bolt, size: 16, mul: tr.mul || 0.45, homing: 0.6, color: he.color });
      }
    }
  }

  // Báo khi bộ ngũ hành lên / xuống mốc (đổi đồ): "Kích hoạt Vạn Kiếm Quy Tông 8/8 — ĐẠI THÀNH"
  let lastMods = null, lastTop = {};
  function announce() {
    const md = dv.mods(); if (md === lastMods) return;
    const first = lastMods === null; lastMods = md;
    const now = {}; for (const st of md.sets) now[st.he] = st.tiers[st.tiers.length - 1].t;
    if (!first) for (const st of md.sets) if ((lastTop[st.he] || 0) < now[st.he]) {
      const t = now[st.he]; c.toast?.(`${t === 8 ? '✦ ĐẠI THÀNH ✦ ' : 'Kích hoạt '}${st.name} ${t}/8`, t === 8 ? 3200 : 2000);
      if (t === 8) { play('vong-lua', me.x, me.y - 6, 60); zaps.push({ kind: 'ring', x: me.x, y: me.y, r: 70, t: 0.9, color: st.color }); }
    }
    lastTop = now;
  }
  function update(dt) {
    T += dt; announce();
    for (let i = echoes.length - 1; i >= 0; i--) { echoes[i].t -= dt; if (echoes[i].t <= 0) { const e = echoes.splice(i, 1)[0]; e.fn(); } }
    updateBolts(dt);
    if (!c.dead()) passives(dt);
    for (let i = zones.length - 1; i >= 0; i--) { // đất cháy: 0,5 giây một nhịp
      const z = zones[i]; z.t -= dt; z.tick -= dt;
      if (z.tick <= 0) { z.tick = 0.5; hitAround(z.x, z.y, z.r, z.mul * 0.5, 'skill'); }
      if (z.t <= 0) zones.splice(i, 1);
    }
    for (let i = zaps.length - 1; i >= 0; i--) { zaps[i].t -= dt; if (zaps[i].t <= 0) zaps.splice(i, 1); }
    if (orbitHit.size > 200) orbitHit.clear();
  }

  // ---- Vẽ (toạ độ màn hình qua at()) — gọi trước drawFx đạn ----
  function render(ctx, at, now) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const z of zones) { // đất cháy
      const p = at(z), a = Math.min(1, z.t) * (0.35 + 0.15 * Math.sin(now / 90 + z.x));
      const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, z.r);
      g.addColorStop(0, `rgba(255,170,60,${a})`); g.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, z.r, z.r * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of bolts) { // vệt sáng sau đạn
      if (b.trail.length < 2) continue;
      ctx.strokeStyle = b.color || '#bfe8ff'; ctx.lineCap = 'round';
      for (let k = 1; k < b.trail.length; k++) {
        const p0 = at(b.trail[k - 1]), p1 = at(b.trail[k]);
        ctx.globalAlpha = (k / b.trail.length) * 0.55; ctx.lineWidth = (b.child ? 2 : 3.5) * (k / b.trail.length);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
    }
    for (const z of zaps) {
      ctx.globalAlpha = Math.min(1, z.t * 5); ctx.strokeStyle = z.color; ctx.lineWidth = z.kind === 'zap' ? 2 : 3;
      const p = at(z);
      if (z.kind === 'ring') { ctx.beginPath(); ctx.ellipse(p.x, p.y, z.r * (1.3 - z.t), z.r * 0.5 * (1.3 - z.t), 0, 0, Math.PI * 2); ctx.stroke(); continue; }
      const q = { x: p.x + wrapDelta(z.x2 - z.x, map.width), y: p.y + (z.y2 - z.y) };
      ctx.beginPath(); ctx.moveTo(p.x, p.y);
      for (let k = 1; k < 6; k++) ctx.lineTo(p.x + (q.x - p.x) * k / 6 + (Math.random() - 0.5) * 8, p.y + (q.y - p.y) * k / 6 + (Math.random() - 0.5) * 8);
      ctx.lineTo(q.x, q.y); ctx.stroke();
    }
    ctx.restore();
    const md = dv.mods();
    if (md.orbit?.n && !c.dead()) { // phi kiếm xoay quanh người
      const n = Math.min(12, md.orbit.n), r = md.orbit.r || 26, he = dv.heOf(md.orbit.he || md.he), p0 = at(me);
      for (let k = 0; k < n; k++) {
        const a = orbitA + (k / n) * Math.PI * 2, x = p0.x + Math.cos(a) * r, y = p0.y - 10 + Math.sin(a) * r * 0.55;
        drawEffect(ctx, he.bolt, 0, x, y, 16, a + Math.PI / 2);
      }
    }
  }
  // Hào quang dưới chân theo mốc bộ cao nhất: 6/8 vòng mờ, 8/8 (đại thành) hai vòng phù văn xoay + đốm sáng bay lên
  function renderGround(ctx, at, now) {
    const md = dv.mods(); if (c.dead() || !md.sets.length) return;
    const top = md.sets.reduce((a, s) => (s.tiers.at(-1).t > (a?.tiers.at(-1).t || 0) ? s : a), null), t = top.tiers.at(-1).t;
    if (t < 6) return;
    const p = at(me), k = now / 1000, col = top.color;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, t === 8 ? 34 : 24);
    g.addColorStop(0, col + (t === 8 ? '88' : '44')); g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y, t === 8 ? 34 : 24, t === 8 ? 15 : 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 1.2;
    for (const [r, sp, a] of t === 8 ? [[26, 0.8, 0.8], [33, -0.5, 0.5]] : [[22, 0.5, 0.4]]) {
      ctx.globalAlpha = a; ctx.setLineDash([5, 4]); ctx.lineDashOffset = -k * sp * 30;
      ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.setLineDash([]);
    if (t === 8) for (let i = 0; i < 10; i++) { // đốm linh khí bay lên
      const ph = (k * 0.6 + i / 10) % 1, a = i * 2.4 + k * 0.3;
      ctx.globalAlpha = (1 - ph) * 0.9; ctx.fillStyle = col;
      ctx.fillRect(p.x + Math.cos(a) * 24 * (1 - ph * 0.4), p.y + Math.sin(a) * 9 - ph * 46, 1.6, 1.6);
    }
    ctx.restore();
  }
  return { fire, basic, maybeEcho, update, render, renderGround, hitAround };
}
