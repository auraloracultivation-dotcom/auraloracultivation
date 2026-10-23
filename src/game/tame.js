// Thu phục quái (chủ dự án 23/10/2026) — THỬ NGHIỆM phía máy khách, thông số data/gameplay.json → tame.
// Hạ quái (trừ Âm Hư) có `chance` quái quy phục: vào Kho (thẻ Thú cưng, hình chính con quái), tối đa `max_follow` con đi theo
// cùng lúc. Thú đi lang thang quanh chủ, gặp quái thì chủ động xông vào cắn; quái đánh trả, thú ngã xuống thì revive_s giây sau
// hồi sinh cạnh chủ (chủ dự án 23/10). Quái chết do thú cưng vẫn tính cho người chơi (onKill).
// Lưu progress.state.pets = [{ uid, mid, stage, atk, follow }] — Mốc 4 lên máy chủ.
import { wrapDelta } from '../map/index.js';
import { drawMonster, sheetThumb } from '../entity/index.js';

const HON = 'item.dacbiet.hon-tinh.001'; // Hồn Tinh: luyện hồn thay con cùng loài

export function createTame({ cfg, progress, monsters, mdef, mobs, map, me, stats, gp, toast, say, play, onKill, placeholder, suppress = () => 1 }) {
  const defOf = new Map(monsters.map((d) => [d.id, d]));
  const pets = () => (progress.state.pets ||= []);
  const following = () => pets().filter((p) => p.follow);
  const live = new Map(); // uid → vị trí / trạng thái vẽ (không lưu)
  const stageName = (s) => mdef.stage_names?.[s] || s; // thú cưng mang bậc quái (Luyện Khí … Âm Hư), không phải cảnh giới người chơi
  // Bản lưu cũ (progress.migrateV1): công thú cưng theo bảng chỉ số quái cũ → đổi theo tỷ lệ bảng mới, giữ sức mạnh tương đối
  for (const p of pets()) if (p.rescale) { const o = gp.migrate_v2?.pet_atk?.[p.stage], n = mdef.stage_stats[p.stage]?.atk; if (o && n) p.atk = Math.max(1, Math.round(p.atk * n / o)); delete p.rescale; }

  // Gọi khi hạ quái: có quy phục không
  function tryTame(m) {
    if (m.void || m.def.void || Math.random() >= cfg.chance) return;
    if (pets().length >= cfg.max_owned) return toast(`${m.def.name} muốn quy phục nhưng Kho thú cưng đã đầy (${cfg.max_owned})`, 2200);
    const p = { uid: progress.state.uid++, mid: m.def.id, stage: m.stage, atk: m.atk, follow: following().length < cfg.max_follow };
    pets().push(p); progress.changed();
    play('vong-lua', m.x, m.y - 6, 34);
    toast(`${m.def.name} quy phục! ${p.follow ? 'Đang đi theo bạn' : `Đã vào Kho (đi theo tối đa ${cfg.max_follow} con)`}`, 3000);
  }

  // Hình nhỏ hơn quái thật, giới hạn chiều cao (boss to)
  function look(p) {
    const d = defOf.get(p.mid); if (!d) return null;
    const art = d.art && { ...d.art, h: Math.min(cfg.max_h, (d.art.h || 20) * cfg.scale) };
    return { ...d, art };
  }
  // Chỉ số chiến đấu của thú: theo tầng + cấp (thường/tinh anh/boss) lúc bắt; khí huyết × hp_mul
  const starMul = (p) => 1 + cfg.merge.per_star * (p.star || 0); // luyện hồn: mỗi sao +35% công và khí huyết
  function battle(p) {
    const d = defOf.get(p.mid), ss = mdef.stage_stats[p.stage], rm = mdef.rank_mul[d?.rank] || mdef.rank_mul.thuong;
    if (!ss) return { hp: 100, dfn: 5 };
    return { hp: Math.round(ss.hp * rm.hp * (d?.mul || 1) * cfg.hp_mul * starMul(p)), dfn: Math.round(ss.def * rm.def * (d?.mul || 1)) };
  }
  const st = (p) => {
    let s = live.get(p.uid);
    if (!s) {
      const b = battle(p);
      s = { uid: p.uid, x: me.x, y: me.y, facing: 1, moving: false, walkT: 0, atkT: 0, hitT: 0, state: 'idle', next: 0, r: 6,
        hp: b.hp, maxHp: b.hp, dfn: b.dfn, mode: 'roam', wx: me.x, wy: me.y, pause: Math.random() * 2, foe: null, deadT: 0, revive: 0 };
      live.set(p.uid, s);
    }
    return s;
  };
  const rel = (a, b) => ({ dx: wrapDelta(a.x - b.x, map.width), dy: wrapDelta(a.y - b.y, map.height) });
  const dist = (a, b) => { const r = rel(a, b); return Math.hypot(r.dx, r.dy); };
  function walk(s, tx, ty, speed, dt) {
    const { dx, dy } = rel({ x: tx, y: ty }, s), L = Math.hypot(dx, dy);
    s.moving = L > 3;
    if (!s.moving) return true;
    const k = Math.min(L, speed * dt) / L;
    s.x = map.wrapX(s.x + dx * k); s.y = map.wrapY(s.y + dy * k); s.walkT += dt;
    if (Math.abs(dx) > 1) s.facing = dx > 0 ? 1 : -1;
    return false;
  }

  let t = 0;
  function update(dt, alive) {
    t += dt;
    const list = following();
    for (const p of list) {
      const s = st(p), d = defOf.get(p.mid); if (!d) continue;
      const name = d.name;
      s.atkT = Math.max(0, s.atkT - dt); s.hitT = Math.max(0, s.hitT - dt);
      if (s.mode === 'dead') { // ngã xuống: hồi sinh sau revive_s giây cạnh chủ
        s.deadT = Math.max(0, s.deadT - dt); s.revive -= dt;
        if (s.revive <= 0) {
          Object.assign(s, { mode: 'roam', state: 'idle', hp: s.maxHp, x: map.wrapX(me.x - me.facing * 16), y: me.y + 4, foe: null, pause: 1 });
          play('vong-lua', s.x, s.y - 6, 30); say(s.x, s.y - 20, `${name} hồi sinh`, '#7dff8a');
        }
        continue;
      }
      if (dist(me, s) > cfg.leash_px) { s.x = me.x; s.y = me.y; s.foe = null; } // lạc quá xa: về cạnh chủ
      // Chủ động: quái gần thú (trong tầm nhìn của thú) và không quá xa chủ thì xông vào
      let m = s.foe && mobs.list.find((x) => x.uid === s.foe && x.state !== 'dead');
      if (m && dist(m, me) > cfg.range_px * 1.4) m = null; // đuổi xa quá thì thôi
      if (!m && alive) m = mobs.nearest(s, cfg.aggro_px, (x) => !x.void && dist(x, me) <= cfg.range_px);
      s.foe = m ? m.uid : null;
      if (m) {
        s.mode = 'fight';
        const side = Math.sign(rel(s, m).dx) || 1;
        const near = walk(s, map.wrapX(m.x + side * (m.r + 7)), m.y + 2, cfg.speed_px, dt);
        if ((near || dist(m, s) <= m.r + 14) && t >= s.next) { // cắn
          s.next = t + cfg.every_s; s.atkT = 0.5; s.facing = rel(m, s).dx >= 0 ? 1 : -1;
          const r = stats.hit(stats.monster({ atk: p.atk * cfg.atk_mul * starMul(p) * suppress(m, p), dfn: 0 }), stats.monster(m)); // thú cũng bị áp chế
          if (!r.miss) { say(m.x, m.y - (m.def.art?.h || 20) - 2, `-${r.dmg}`, '#b6ff9a'); if (mobs.damage(m, r.dmg)) { onKill(m); s.foe = null; continue; } }
          m.petFoe = s.uid;
        }
        // Quái bị thú cắn thì đánh trả (khi đứng sát thú)
        if (m.petFoe === s.uid && dist(m, s) <= m.r + 18 && t >= (m.petHitAt || 0)) {
          m.petHitAt = t + cfg.mob_hit_s; m.atkT = 0.5; m.facing = rel(s, m).dx >= 0 ? 1 : -1;
          const r = stats.hit(stats.monster(m), stats.monster({ atk: 0, dfn: s.dfn }));
          if (!r.miss) {
            s.hp -= r.dmg; s.hitT = 0.15; say(s.x, s.y - 18, `-${r.dmg}`, '#ff9a8a');
            if (s.hp <= 0) {
              Object.assign(s, { mode: 'dead', state: 'dead', deadT: 0.9, revive: cfg.revive_s, foe: null, moving: false });
              m.petFoe = null; toast(`${name} ngã xuống — hồi sinh sau ${cfg.revive_s} giây`, 1600);
            }
          }
        }
        continue;
      }
      // Tự do: đi lang thang quanh chủ, dừng nghỉ một lát rồi đi chỗ khác; chủ đi xa thì chạy theo
      s.mode = 'roam';
      const far = dist(me, s) > cfg.wander_r * 1.6;
      if (far) { walk(s, me.x - me.facing * 14, me.y + 4, cfg.speed_px + 60, dt); s.pause = 0.3; continue; }
      if (s.pause > 0) { s.pause -= dt; s.moving = false; continue; }
      if (walk(s, s.wx, s.wy, cfg.wander_speed, dt)) {
        const a = Math.random() * Math.PI * 2, r = 18 + Math.random() * cfg.wander_r;
        s.wx = map.wrapX(me.x + Math.cos(a) * r); s.wy = map.wrapY(me.y + Math.sin(a) * r * 0.6);
        if (!map.canStand(s.wx, s.wy, 3)) { s.wx = me.x; s.wy = me.y + 6; }
        s.pause = 0.8 + Math.random() * 2.2;
      }
    }
    for (const uid of live.keys()) if (!list.some((p) => p.uid === uid)) live.delete(uid);
  }

  function render(ctx, at, now) {
    for (const p of following()) {
      const s = live.get(p.uid), d = look(p); if (!s || !d) continue;
      const q = at(s), top = q.y - (d.art?.h || 12) - 2;
      if (s.mode === 'dead') { // ngã xuống: hoạt ảnh chết rồi chỉ còn số giây hồi sinh
        if (s.deadT > 0) drawMonster(ctx, { ...s, def: d, r: 5 }, q.x, q.y, now);
        ctx.fillStyle = '#c9f5d0'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(`↻ ${Math.ceil(s.revive)}s`, q.x, q.y - 6);
        continue;
      }
      drawMonster(ctx, { ...s, def: d, r: 5 }, q.x, q.y, now);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(q.x - 9, top - 1, 18, 3); // thanh máu thú
      ctx.fillStyle = '#5dff7a'; ctx.fillRect(q.x - 8.5, top - 0.5, 17 * Math.max(0, s.hp / s.maxHp), 2);
      ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; // dấu thú cưng
      ctx.fillText('♥', q.x, top - 2);
    }
  }

  // ---- Kho: thẻ Thú cưng ----
  const kin = (p) => pets().filter((q) => q !== p && q.mid === p.mid && !q.follow); // cùng loài đang nghỉ trong Kho
  function entry(p) {
    const d = defOf.get(p.mid) || { name: p.mid }, n = following().length, star = p.star || 0, mates = kin(p).length;
    const thumb = (d.art?.sheet && sheetThumb(d.art.sheet, d.art.hue || 0)) || placeholder(d.name, 'nhiemvu');
    const actions = [
      p.follow ? { id: 'pet-rest', label: 'Cho nghỉ (vào Kho)' }
        : { id: 'pet-follow', label: `Cho đi theo (${n}/${cfg.max_follow})`, disabled: n >= cfg.max_follow },
      star >= cfg.merge.max_star ? { id: 'pet-merge', label: 'Luyện hồn: đã tối đa', disabled: true }
        : mates ? { id: 'pet-merge', label: `Luyện hồn lên ${star + 1}★ (nuốt 1 ${d.name} đang nghỉ · có ${mates})`, confirm: `Nuốt hồn 1 con ${d.name} khác để lên ${star + 1}★?` }
          : { id: 'pet-merge', label: `Luyện hồn lên ${star + 1}★ bằng ${cfg.merge.hon_tinh} Hồn Tinh (có ${progress.count(HON)})`, disabled: progress.count(HON) < cfg.merge.hon_tinh },
      { id: 'pet-free', label: 'Thả về rừng', danger: true, confirm: `Thả ${d.name} đi? Không lấy lại được.` },
    ];
    return { id: `pet:${p.uid}`, key: `pet:${p.uid}`, name: `${d.name}${star ? ` ${'★'.repeat(star)}` : ''}`, cat: 'thu-cung', thumb, equipped: p.follow,
      sub: `Thú cưng · ${stageName(p.stage)}${p.follow ? ' · đang đi theo' : ''}`,
      detail: `Đi lang thang quanh bạn, gặp quái là xông vào cắn: công ${Math.round(p.atk * cfg.atk_mul * starMul(p))} mỗi ${cfg.every_s} giây · khí huyết ${battle(p).hp}. Ngã xuống thì ${cfg.revive_s} giây sau hồi sinh. Luyện hồn: nuốt 1 con cùng loài đang nghỉ → +1★ (+${Math.round(cfg.merge.per_star * 100)}% công, máu).`, actions };
  }
  const entries = () => pets().map((p) => ({ item: entry(p), count: 1 }));
  function act(key, action) {
    const p = pets().find((x) => `pet:${x.uid}` === key); if (!p) return null;
    const name = defOf.get(p.mid)?.name || 'Thú cưng';
    if (action === 'pet-follow') {
      if (following().length >= cfg.max_follow) return `Chỉ được ${cfg.max_follow} thú cưng đi theo`;
      p.follow = true; const s = st(p); s.x = me.x; s.y = me.y; progress.changed(); return `${name} đi theo bạn`;
    }
    if (action === 'pet-merge') {
      if ((p.star || 0) >= cfg.merge.max_star) return 'Đã tối đa';
      const q = kin(p)[0]; // ưu tiên nuốt con cùng loài; không có thì dùng Hồn Tinh
      if (q) progress.state.pets = pets().filter((x) => x !== q);
      else if (!progress.take(HON, cfg.merge.hon_tinh)) return `Cần 1 ${name} cùng loài đang nghỉ, hoặc ${cfg.merge.hon_tinh} Hồn Tinh`; p.star = (p.star || 0) + 1; live.delete(p.uid); progress.changed();
      play(cfg.merge.fx || 'vong-lua', me.x, me.y + 4, 56, { ground: true }); return `${name} luyện hồn thành công: ${'★'.repeat(p.star)}`;
    }
    if (action === 'pet-rest') { p.follow = false; progress.changed(); return `${name} vào Kho nghỉ`; }
    if (action === 'pet-free' || action === 'discard') { // thả đi: để lại Hồn Tinh (thêm theo sao)
      const n = cfg.merge.free_hon_tinh + (p.star || 0);
      progress.state.pets = pets().filter((x) => x !== p); progress.add(HON, n); progress.changed(); return `Đã thả ${name} về rừng · nhận ${n} Hồn Tinh`;
    }
    return null;
  }
  const healAll = (f) => { for (const s of live.values()) if (s.mode !== 'dead') s.hp = Math.min(s.maxHp, s.hp + s.maxHp * f); };
  return { healAll, tryTame, update, render, entries, act, isPet: (key) => key.startsWith('pet:'), live };
}
