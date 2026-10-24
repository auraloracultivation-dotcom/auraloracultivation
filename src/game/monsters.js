// Quái THỬ NGHIỆM phía máy khách: sinh quanh người chơi theo vùng địa hình, đi lang thang quanh "nhà",
// thấy người chơi (thần thức) thì đuổi, không đuổi quá xa (leash), đánh thường + đòn nặng có báo trước để né.
// Mỗi máy tự có quái riêng — người chơi khác không thấy cùng con quái (Mốc 3: máy chủ quản lý quái).
import { wrapDelta } from '../map/index.js';
import { createMobSkills } from './mob-skills.js';
import { createMobOrbs } from './mob-orbs.js';
import { sound } from '../audio/index.js';

const rint = (a, b) => Math.round(a + Math.random() * (b - a));

// mdef = data/monsters/monsters.json: chỉ số thật = stage_stats[tầng] × rank_mul[cấp] × mul (luật cảnh giới 23/10, tools/gen_balance.py)
export function createMonsters({ gp, mdef, map }) {
  const P = gp.monster;
  const defs = mdef.monsters;
  const mskills = createMobSkills({ lib: mdef.skills || {}, map }); // kỹ năng boss
  const orbs = createMobOrbs({ cfg: P.orb, map }); // đạn sáng chậm của tinh anh / boss
  const byZone = {};
  for (const d of defs) if (!d.void) (byZone[d.zone] ||= { thuong: [], elite: [], boss: [], stages: [] })[d.rank].push(d);
  for (const z of Object.values(byZone)) z.stages = [...new Set(z.thuong.flatMap((d) => d.stages))]; // tầng của vùng, yếu → mạnh
  // Tạo một con quái ở tầng `stage`: lệch ngẫu nhiên ±variance
  function makeStats(def, stage) {
    const ss = mdef.stage_stats[stage], rm = mdef.rank_mul[def.void ? 'huvo' : def.rank], mul = def.mul || 1;
    const v = () => 1 + (Math.random() * 2 - 1) * mdef.variance;
    const hp = Math.round(ss.hp * rm.hp * mul * v());
    return { hp, maxHp: hp, atk: Math.round(ss.atk * rm.atk * mul * v()), dfn: Math.round(ss.def * rm.def * mul * v()),
      stage, realmName: mdef.stage_names[stage] || stage, stone: (P.stone_by_stage[stage] || 1) * (P.exp_mul[def.rank] || 1) };
  }
  const list = [];
  let uid = 1, spawnT = 0;
  // Vùng là các vành quanh tâm bản đồ: đo bán kính trong/ngoài của mỗi vùng để biết "độ sâu" 0..1 trong vành.
  // Sâu gần tâm → quái thường yếu nhất; tinh anh/boss chỉ ở phần ngoài (band trong data/gameplay.json).
  const cx = map.width / 2, cy = map.height / 2, ring = {};
  for (let a = 0; a < 64; a++) {
    for (let r = 0; r < Math.min(cx, cy); r += 16) {
      const z = map.typeAt(cx + Math.cos((a / 64) * Math.PI * 2) * r, cy + Math.sin((a / 64) * Math.PI * 2) * r).zone;
      if (!z) continue;
      const g = (ring[z] ||= { lo: [], hi: [] });
      g.lo[a] = Math.min(g.lo[a] ?? Infinity, r); g.hi[a] = Math.max(g.hi[a] ?? 0, r);
    }
  }
  const avg = (arr) => { const v = arr.filter((x) => x !== undefined); return v.reduce((s, x) => s + x, 0) / v.length; };
  for (const g of Object.values(ring)) { g.min = avg(g.lo); g.max = avg(g.hi); }
  const depth = (zone, x, y) => {
    const g = ring[zone]; if (!g || g.max <= g.min) return 0.5;
    const d = Math.hypot(wrapDelta(x - cx, map.width), wrapDelta(y - cy, map.height));
    return Math.max(0, Math.min(0.999, (d - g.min) / (g.max - g.min)));
  };

  const rel = (m, me) => ({ dx: wrapDelta(m.x - me.x, map.width), dy: wrapDelta(m.y - me.y, map.height) });
  const distTo = (m, me) => { const r = rel(m, me); return Math.hypot(r.dx, r.dy); };
  const homeDist = (m) => Math.hypot(wrapDelta(m.x - m.hx, map.width), wrapDelta(m.y - m.hy, map.height));

  function pickRank(zone, band) {
    const w = P.rank_weight, r = Math.random();
    let rank = r < w.boss ? 'boss' : r < w.boss + w.elite ? 'elite' : 'thuong';
    if (rank === 'boss' && band < P.band.boss) rank = 'elite';
    if (rank === 'elite' && band < P.band.elite) rank = 'thuong';
    if (rank === 'boss' && list.filter((m) => m.def.rank === 'boss' && !m.void).length >= P.max_boss) rank = 'elite';
    if (!zone[rank].length) rank = 'thuong';
    return rank;
  }

  function spawn(me) {
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2, d = P.spawn_min_px + Math.random() * (P.spawn_max_px - P.spawn_min_px);
      const x = map.wrapX(me.x + Math.cos(a) * d), y = map.wrapY(me.y + Math.sin(a) * d);
      const t = map.typeAt(x, y);
      if (!t.zone || !byZone[t.zone]) continue;
      if (map.safeAt(x, y) || map.safeAt(x + 80, y) || map.safeAt(x - 80, y) || map.safeAt(x, y + 80) || map.safeAt(x, y - 80)) continue; // không sinh sát thành
      const r = P.radius_px.boss;
      if (!map.canStand(x, y, r)) continue;
      const zone = byZone[t.zone];
      const band = depth(t.zone, x, y);
      const rank = pickRank(zone, band);
      // tầng quái theo độ sâu trong vành (mép trong = tầng thấp nhất của vùng), lệch ±1 tầng 25% cho đa dạng
      const n = zone.stages.length;
      let si = Math.min(n - 1, Math.floor(band * n));
      if (Math.random() < 0.25) si = Math.max(0, Math.min(n - 1, si + (Math.random() < 0.5 ? -1 : 1)));
      const stage = zone.stages[si];
      const arr = rank === 'thuong' ? zone.thuong.filter((d) => d.stages.includes(stage)) : zone[rank];
      const def = arr[Math.floor(Math.random() * arr.length)] || zone.thuong[0];
      list.push({ uid: uid++, def, x, y, hx: x, hy: y, ...makeStats(def, stage),
        r: P.radius_px[rank], state: 'idle', cd: 0, atkT: 0, moving: false, n: 0, stun: 0, facing: 1, wt: 0, tx: x, ty: y, hitT: 0, walkT: 0 });
      return;
    }
  }

  function step(m, tx, ty, speed, dt) {
    const dx = wrapDelta(tx - m.x, map.width), dy = wrapDelta(ty - m.y, map.height), d = Math.hypot(dx, dy);
    if (d < 1) { m.moving = false; return d; }
    m.moving = true;
    const s = Math.min(d, speed * dt);
    if (dx) m.facing = dx > 0 ? 1 : -1;
    const nx = m.x + (dx / d) * s, ny = m.y + (dy / d) * s;
    if (map.safeAt(nx, ny)) { m.moving = false; return d; } // quái không bước vào thành
    map.move(m, (dx / d) * s, (dy / d) * s, m.r * 0.6);
    m.walkT += dt;
    return d;
  }

  // env: { me, alive (người chơi còn sống), hitPlayer(m, mul), dodged(m) }
  function update(dt, env) {
    const { me } = env;
    const inTown = map.safeAt(me.x, me.y); // trong thành: quái coi như không thấy người chơi
    spawnT -= dt;
    if (spawnT <= 0 && list.length < P.max_alive) { spawnT = P.spawn_every_s; spawn(me); }
    orbs.update(dt, { ...env, inTown });
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      const d = distTo(m, me);
      if (m.state === 'dead') { m.deadT -= dt; if (m.deadT <= 0) list.splice(i, 1); continue; }
      if (m.void ? Date.now() > m.until : d > P.despawn_px) { list.splice(i, 1); continue; } // Âm Hư: tan biến khi hết giờ
      if (m.hitT > 0) m.hitT -= dt;
      if (m.atkT > 0) m.atkT -= dt;
      m.moving = false;
      if (m.stun > 0) { m.stun -= dt; continue; }
      const rank = m.def.rank, speed = m.speed || P.speed_px_per_s[rank];
      m.cd = Math.max(0, m.cd - dt);
      mskills.cool(m, dt);
      if (m.state === 'idle') {
        m.wt -= dt;
        if (m.wt <= 0) {
          m.wt = 1.5 + Math.random() * 3;
          const a = Math.random() * Math.PI * 2, r = Math.random() * P.wander_px;
          m.tx = map.wrapX(m.hx + Math.cos(a) * r); m.ty = map.wrapY(m.hy + Math.sin(a) * r);
        }
        step(m, m.tx, m.ty, speed * 0.35, dt);
        if (env.alive && !inTown && d < (m.aggro || P.aggro_px[rank])) m.state = 'chase';
      } else if (m.state === 'chase') {
        if (!env.alive || inTown || homeDist(m) > (m.leash || P.leash_px)) { m.state = 'return'; continue; }
        if (mskills.tryCast(m, me, d)) continue; // boss vận chiêu (vòng / dải đỏ báo trước)
        orbs.tryFire(m, me, d, dt); // tinh anh / boss: bắn linh cầu chậm khi còn xa
        if (d > P.attack_range_px + m.r * 0.5) step(m, me.x, me.y, speed, dt);
        else if (m.cd <= 0) {
          m.cd = P.attack_every_s; m.n++;
          m.atkT = 0.5;
          if (m.n % P.heavy.every_n_attacks === 0) { if (d < 360) sound('sfx.don-nang'); m.state = 'windup'; m.wind = P.heavy.windup_s; m.wx = me.x; m.wy = me.y; }
          else env.hitPlayer(m, 1);
        }
      } else if (m.state === 'windup') {
        m.wind -= dt;
        if (m.wind <= 0) {
          const off = Math.hypot(wrapDelta(me.x - m.wx, map.width), wrapDelta(me.y - m.wy, map.height));
          if (env.alive && !inTown && off < P.heavy.radius_px) env.hitPlayer(m, P.heavy.mul); else if (env.alive && !inTown) env.dodged(m);
          m.state = 'chase';
        }
      } else if (m.state === 'cast') {
        mskills.tick(m, dt, { ...env, inTown });
      } else if (m.state === 'return') {
        m.hp = Math.min(m.maxHp, m.hp + m.maxHp * 0.5 * dt);
        if (step(m, m.hx, m.hy, speed * 1.4, dt) < 4) { m.state = 'idle'; m.hp = m.maxHp; }
      }
    }
  }

  // Người chơi đánh trúng: quái bị kéo vào trận; trả về true nếu chết
  function damage(m, dmg) {
    if (m.state === 'dead') return false;
    m.hp -= dmg; m.hitT = 0.15;
    if (m.state === 'idle' || m.state === 'return') m.state = 'chase';
    if (m.hp <= 0) { m.hp = 0; m.state = 'dead'; m.deadT = 0.9; return true; }
    return false;
  }

  // Gần nhất trong bán kính (bỏ quái đã chết)
  function nearest(me, radius, filter = () => true) {
    let best = null, bd = radius;
    for (const m of list) {
      if (m.state === 'dead' || !filter(m)) continue;
      const d = distTo(m, me);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }
  const within = (me, radius) => list.filter((m) => m.state !== 'dead' && distTo(m, me) <= radius);

  // Âm Hư (src/game/void.js): đặt đúng chỗ theo lịch chung; sống tới `until` (ms, giờ máy) rồi tan
  function addVoid(def, x, y, until, key, V) {
    if (list.some((m) => m.voidKey === key)) return null;
    const m = { uid: uid++, def, x, y, hx: x, hy: y, ...makeStats(def, def.stages[0]), void: true, voidKey: key, until,
      r: V.radius_px, aggro: V.aggro_px, leash: V.leash_px, speed: V.speed_px_per_s,
      state: 'idle', cd: 0, atkT: 0, moving: false, n: 0, stun: 0, facing: 1, wt: 0, tx: x, ty: y, hitT: 0, walkT: 0 };
    list.push(m);
    return m;
  }
  // Bí cảnh (bicanh.js): sinh quái tầng `stage` tại (x, y); extra ghi đè (aggro, leash, nhân máu…)
  function spawnAt(def, stage, x, y, extra = {}) {
    const st = makeStats(def, stage), hpMul = extra.hpMul || 1;
    const m = { uid: uid++, def, x, y, hx: x, hy: y, ...st, hp: Math.round(st.hp * hpMul), maxHp: Math.round(st.maxHp * hpMul),
      r: P.radius_px[def.rank] || P.radius_px.thuong, state: 'chase', cd: 0, atkT: 0, moving: false, n: 0, stun: 0, facing: 1, wt: 0, tx: x, ty: y, hitT: 0, walkT: 0, ...extra };
    delete m.hpMul; list.push(m);
    return m;
  }
  const removeVoid = (key) => { const i = list.findIndex((m) => m.voidKey === key && m.state !== 'dead'); if (i >= 0) list.splice(i, 1); };

  return { ringOf: (z) => ring[z] && { cx, cy, min: ring[z].min, max: ring[z].max }, depth, list, update, addVoid, removeVoid, spawnAt, telegraph: mskills.telegraph, drawOrbs: orbs.draw, damage, nearest, within, distTo, rel, calmAll() { orbs.clear(); for (const m of list) if (m.state !== 'dead') { m.state = 'return'; m.cast = null; } } };
}
