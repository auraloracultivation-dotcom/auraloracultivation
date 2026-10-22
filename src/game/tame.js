// Thu phục quái (chủ dự án 23/10/2026) — THỬ NGHIỆM phía máy khách, thông số data/gameplay.json → tame.
// Hạ quái (trừ Âm Hư) có `chance` quái quy phục: vào Kho (thẻ Thú cưng, hình chính con quái), tối đa `max_follow` con đi theo
// cùng lúc. Thú đi theo tự đánh quái gần người chơi; quái chết do thú cưng vẫn tính cho người chơi (onKill).
// Lưu progress.state.pets = [{ uid, mid, stage, atk, follow }] — Mốc 4 lên máy chủ.
import { wrapDelta } from '../map/index.js';
import { drawMonster, sheetThumb } from '../entity/index.js';

export function createTame({ cfg, progress, monsters, mobs, map, me, stats, gp, toast, say, play, onKill, placeholder, suppress = () => 1 }) {
  const defOf = new Map(monsters.map((d) => [d.id, d]));
  const pets = () => (progress.state.pets ||= []);
  const following = () => pets().filter((p) => p.follow);
  const live = new Map(); // uid → vị trí / trạng thái vẽ (không lưu)
  const stageName = (s) => gp.player.stages.find((x) => x.id === s)?.name || s;

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
  const st = (p) => {
    let s = live.get(p.uid);
    if (!s) { s = { uid: p.uid, x: me.x, y: me.y, facing: 1, moving: false, walkT: 0, atkT: 0, hitT: 0, state: 'idle', next: 0, r: 6 }; live.set(p.uid, s); }
    return s;
  };

  let t = 0;
  function update(dt, alive) {
    t += dt;
    const list = following();
    list.forEach((p, i) => {
      const s = st(p), d = defOf.get(p.mid); if (!d) return;
      s.atkT = Math.max(0, s.atkT - dt);
      // mục tiêu: quái gần người chơi trong tầm
      const m = alive && mobs.nearest(me, cfg.range_px);
      let tx, ty;
      if (m) { tx = m.x - Math.sign(wrapDelta(m.x - s.x, map.width) || 1) * (m.r + 8); ty = m.y + 2; }
      else { // đội hình vòng cung sau lưng
        const a = Math.PI * (0.55 + (i / Math.max(1, list.length - 1 || 1)) * 0.9) * (me.facing > 0 ? 1 : -1);
        tx = me.x + Math.cos(a) * 30 - me.facing * 6; ty = me.y + Math.sin(Math.abs(a)) * 10 - 4 + (i % 2) * 6;
      }
      let dx = wrapDelta(tx - s.x, map.width), dy = wrapDelta(ty - s.y, map.height);
      const dist = Math.hypot(dx, dy);
      if (Math.hypot(wrapDelta(me.x - s.x, map.width), wrapDelta(me.y - s.y, map.height)) > cfg.leash_px) { s.x = me.x; s.y = me.y; dx = dy = 0; } // lạc xa: dịch tới chủ
      const step = Math.min(dist, (cfg.speed_px + (dist > 60 ? 120 : 0)) * dt);
      s.moving = dist > 4;
      if (s.moving) { s.x = map.wrapX(s.x + (dx / dist) * step); s.y = map.wrapY(s.y + (dy / dist) * step); s.walkT += dt; if (Math.abs(dx) > 1) s.facing = dx > 0 ? 1 : -1; }
      if (m && mobs.distTo(m, s) <= m.r + 16 && t >= s.next) { // cắn
        s.next = t + cfg.every_s; s.atkT = 0.5; s.facing = wrapDelta(m.x - s.x, map.width) >= 0 ? 1 : -1;
        const r = stats.hit(stats.monster({ atk: p.atk * cfg.atk_mul * suppress(m, p), dfn: 0 }), stats.monster(m)); // thú cũng bị áp chế
        if (r.miss) return;
        say(m.x, m.y - (m.def.art?.h || 20) - 2, `-${r.dmg}`, '#b6ff9a');
        if (mobs.damage(m, r.dmg)) onKill(m);
      }
    });
    for (const uid of live.keys()) if (!list.some((p) => p.uid === uid)) live.delete(uid);
  }

  function render(ctx, at, now) {
    for (const p of following()) {
      const s = live.get(p.uid), d = look(p); if (!s || !d) continue;
      const q = at(s);
      drawMonster(ctx, { ...s, def: d, r: 5, hp: 1, maxHp: 1 }, q.x, q.y, now);
      ctx.fillStyle = '#7dff8a'; ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; // dấu thú cưng
      ctx.fillText('♥', q.x, q.y - (d.art?.h || 12) - 2);
    }
  }

  // ---- Kho: thẻ Thú cưng ----
  function entry(p) {
    const d = defOf.get(p.mid) || { name: p.mid }, n = following().length;
    const thumb = (d.art?.sheet && sheetThumb(d.art.sheet, d.art.hue || 0)) || placeholder(d.name, 'nhiemvu');
    const actions = [
      p.follow ? { id: 'pet-rest', label: 'Cho nghỉ (vào Kho)' }
        : { id: 'pet-follow', label: `Cho đi theo (${n}/${cfg.max_follow})`, disabled: n >= cfg.max_follow },
      { id: 'pet-free', label: 'Thả về rừng', danger: true, confirm: `Thả ${d.name} đi? Không lấy lại được.` },
    ];
    return { id: `pet:${p.uid}`, key: `pet:${p.uid}`, name: d.name, cat: 'thu-cung', thumb, equipped: p.follow,
      sub: `Thú cưng · ${stageName(p.stage)}${p.follow ? ' · đang đi theo' : ''}`,
      detail: `Tự đánh quái gần bạn: công ${Math.round(p.atk * cfg.atk_mul)} mỗi ${cfg.every_s} giây. Không mất máu.`, actions };
  }
  const entries = () => pets().map((p) => ({ item: entry(p), count: 1 }));
  function act(key, action) {
    const p = pets().find((x) => `pet:${x.uid}` === key); if (!p) return null;
    const name = defOf.get(p.mid)?.name || 'Thú cưng';
    if (action === 'pet-follow') {
      if (following().length >= cfg.max_follow) return `Chỉ được ${cfg.max_follow} thú cưng đi theo`;
      p.follow = true; const s = st(p); s.x = me.x; s.y = me.y; progress.changed(); return `${name} đi theo bạn`;
    }
    if (action === 'pet-rest') { p.follow = false; progress.changed(); return `${name} vào Kho nghỉ`; }
    if (action === 'pet-free' || action === 'discard') { progress.state.pets = pets().filter((x) => x !== p); progress.changed(); return `Đã thả ${name} về rừng`; }
    return null;
  }
  return { tryTame, update, render, entries, act, isPet: (key) => key.startsWith('pet:') };
}
