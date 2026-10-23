// 50 NPC (data/npcs.json) do máy khách tự chạy: đi lại quanh nhà, tán gẫu, luyện kiếm; có cảnh giới + khí huyết như người chơi.
// Đánh nhau (yêu cầu chủ dự án 21/10): ngoài thành, ai TẮT khiên bảo vệ thì đánh được nhau (NPC ↔ NPC, NPC ↔ người chơi);
// vừa hồi sinh được bảo vệ một lúc. Vung vào quái chỉ là hình. Chạm NPC: đánh được thì chọn làm mục tiêu, không thì NPC chào.
import { wrapDelta } from '../map/index.js';

export function createNpcs({ def, map, mobs, stats, stages }) {
  const T = map.town;
  const list = def.npcs.map((d, i) => {
    let hx = (T?.cx ?? map.width / 2) + d.home.dx, hy = (T?.cy ?? map.height / 2) + d.home.dy;
    ({ x: hx, y: hy } = map.nearestStand(map.wrapX(hx), map.wrapY(hy), 4, 10));
    const stage = Math.min(stages.length - 1, d.stage ?? (i * 7) % (d.home.area === 'town' ? 13 : 11));
    const n = { ...d, stage, realm: stages[stage].name, x: hx, y: hy, hx, hy, tx: hx, ty: hy, facing: Math.random() < 0.5 ? -1 : 1, state: 'idle',
      wait: Math.random() * 4, walkT: 0, t: Math.random() * 9, moving: false, swingT: 0, swingCd: 0, chat: null, chatUntil: 0, talk: null,
      shield: d.shield ?? !(d.home.area === 'road' && d.brave && i % 3 === 0), guardUntil: 0, foe: null, dead: 0, hitT: 0 };
    n.st = stats.player(stages[stage], []); n.hp = n.st.hp;
    return n;
  });
  const dist = (a, b) => Math.hypot(wrapDelta(a.x - b.x, map.width), wrapDelta(a.y - b.y, map.height));
  let clock = 0;
  const canFight = (n) => !n.dead && !n.shield && clock >= n.guardUntil && !map.safeAt(n.x, n.y);

  function say(n, text, s = def.talk_line_s) { n.chat = text; n.chatUntil = performance.now() + s * 1000; }

  function walkTo(n, x, y, dt) {
    const dx = wrapDelta(x - n.x, map.width), dy = wrapDelta(y - n.y, map.height), d = Math.hypot(dx, dy);
    if (d < 3) { n.moving = false; return true; }
    const s = Math.min(d, def.speed_px_per_s * dt), ox = n.x, oy = n.y;
    if (dx) n.facing = dx > 0 ? 1 : -1;
    map.move(n, (dx / d) * s, (dy / d) * s, 4);
    n.moving = true; n.walkT += dt;
    if (n.x === ox && n.y === oy) { n.moving = false; return true; } // vướng cây / tường: bỏ đích
    return false;
  }

  function startTalk(a, b) {
    const lines = def.chat[Math.floor(Math.random() * def.chat.length)];
    a.state = b.state = 'talk';
    a.talk = { with: b, lines, i: 0, next: 0 }; b.talk = { with: a, lines, passive: true };
    a.facing = wrapDelta(b.x - a.x, map.width) > 0 ? 1 : -1; b.facing = -a.facing;
  }

  // NPC trúng đòn; trả về true nếu gục. by = 'me' hoặc NPC khác → bị đánh thì đánh trả
  function damage(n, dmg, by) {
    if (n.dead) return false;
    n.hp -= dmg; n.hitT = 0.15;
    if (by) { n.foe = by; if (n.state === 'talk') { n.talk.with.state = 'idle'; n.talk.with.talk = null; n.state = 'idle'; n.talk = null; } }
    if (n.hp <= 0) { n.hp = 0; n.dead = def.respawn_s; n.foe = null; n.state = 'idle'; say(n, 'Ta… sẽ quay lại!', 2); return true; }
    return false;
  }

  // ctx: { me, playerCanFight(), hitPlayer(n) }
  function update(dt, ctx) {
    clock += dt;
    const { me } = ctx;
    for (const n of list) {
      if (dist(n, me) > def.active_range_px) continue; // xa người chơi: đứng yên cho nhẹ máy
      n.t += dt;
      if (n.hitT > 0) n.hitT -= dt;
      if (n.swingT > 0) n.swingT -= dt;
      if (n.swingCd > 0) n.swingCd -= dt;
      if (n.dead) { // gục: hồi sinh ở nhà, được bảo vệ một lúc
        n.dead -= dt;
        if (n.dead <= 0) { n.dead = 0; n.x = n.hx; n.y = n.hy; n.hp = n.st.hp; n.guardUntil = clock + def.revive_guard_s; }
        continue;
      }
      if (n.state === 'talk') {
        const k = n.talk;
        if (k && !k.passive && clock >= k.next) {
          if (k.i >= k.lines.length) { n.state = k.with.state = 'idle'; n.wait = k.with.wait = 3 + Math.random() * 5; n.talk = k.with.talk = null; continue; }
          say(k.i % 2 === 0 ? n : k.with, k.lines[k.i]); k.i++; k.next = clock + def.talk_line_s;
        }
        continue;
      }
      // Đối thủ thật: bị đánh thì đánh trả; NPC tắt khiên tự tìm người/NPC tắt khiên gần đó
      let foe = n.foe;
      if (foe === 'me' && (!ctx.playerCanFight() || dist(n, me) > def.fight_range_px * 2.5)) foe = n.foe = null;
      if (foe && foe !== 'me' && (!canFight(foe) || dist(n, foe) > def.fight_range_px * 2.5)) foe = n.foe = null;
      if (foe && !canFight(n)) foe = n.foe = null;
      if (!foe && canFight(n)) {
        if (ctx.playerCanFight() && dist(n, me) < def.fight_range_px) foe = n.foe = 'me';
        else foe = n.foe = list.find((o) => o !== n && canFight(o) && dist(o, n) < def.fight_range_px) || null;
      }
      const tgt = foe === 'me' ? me : foe || (n.brave && !map.safeAt(n.x, n.y) ? mobs.nearest(n, def.fight_range_px) : null);
      if (tgt) {
        n.state = 'fight';
        if (dist(n, tgt) > 18) walkTo(n, tgt.x - 12 * Math.sign(wrapDelta(tgt.x - n.x, map.width) || 1), tgt.y, dt);
        else {
          n.moving = false; n.facing = wrapDelta(tgt.x - n.x, map.width) > 0 ? 1 : -1;
          if (n.swingCd <= 0) {
            n.swingT = 0.35; n.swingCd = def.swing_every_s;
            if (foe === 'me') ctx.hitPlayer(n);
            else if (foe) { const r = stats.hit(n.st, foe.st); if (!r.miss) damage(foe, r.dmg, n); }
            else tgt.hitT = 0.12; // quái: chỉ hình
          }
        }
        continue;
      }
      if (n.state === 'fight') { n.state = 'idle'; n.wait = 1; }
      if (n.state === 'walk') { if (walkTo(n, n.tx, n.ty, dt)) { n.state = 'idle'; n.wait = 2 + Math.random() * 6; } continue; }
      n.moving = false;
      n.wait -= dt;
      if (n.wait > 0) continue;
      const mate = Math.random() < 0.45 && list.find((o) => o !== n && o.state === 'idle' && !o.dead && dist(o, n) < def.talk_range_px);
      if (mate) { startTalk(n, mate); continue; }
      if (Math.random() < 0.12) { n.swingT = 0.35; n.wait = 1.5; continue; } // luyện kiếm tại chỗ
      const a = Math.random() * Math.PI * 2, r = Math.random() * n.wander_px;
      n.tx = map.wrapX(n.hx + Math.cos(a) * r); n.ty = map.wrapY(n.hy + Math.sin(a) * r); n.state = 'walk';
    }
  }

  // NPC ở điểm chạm (toạ độ đã quy về gần người chơi bằng at)
  function at(wx, wy, toNear) {
    return list.find((n) => { const p = toNear(n); return !n.dead && Math.abs(p.x - wx) < 7 && wy < p.y + 2 && wy > p.y - def.height_px - 2; });
  }
  const stLines = new Map((T?.stations || []).map((s) => [s.id, s.lines || []])); // canh giữ trận nhãn chào bằng lời riêng của trạm
  function greet(n, wx) { n.facing = wx > n.x ? 1 : -1; const L = (n.guard && stLines.get(n.guard)?.length) ? stLines.get(n.guard) : def.greet; say(n, L[Math.floor(Math.random() * L.length)], 3.5); }
  const nearestFoe = (me, range) => list.filter((n) => canFight(n) && dist(n, me) <= range).sort((a, b) => dist(a, me) - dist(b, me))[0] || null;
  const guarded = (n) => n.shield || clock < n.guardUntil;
  return { list, update, damage, at, greet, canFight, guarded, nearestFoe, dist, height: def.height_px };
}
