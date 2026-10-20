// 50 NPC trang trí (data/npcs.json) do máy khách tự chạy: đi lại quanh nhà, đứng tán gẫu với nhau,
// ra đánh quái gần (chỉ hình — không gây sát thương, không cướp thưởng), chạm vào thì chào người chơi.
import { wrapDelta } from '../map/index.js';

export function createNpcs({ def, map, mobs }) {
  const T = map.town;
  const list = def.npcs.map((d) => {
    let hx, hy;
    if (d.home.area === 'town' && T) { hx = T.cx + d.home.dx; hy = T.cy + d.home.dy; } else { hx = (T?.cx ?? map.width / 2) + d.home.dx; hy = (T?.cy ?? map.height / 2) + d.home.dy; }
    ({ x: hx, y: hy } = map.nearestStand(map.wrapX(hx), map.wrapY(hy), 4, 10));
    return { ...d, x: hx, y: hy, hx, hy, tx: hx, ty: hy, facing: Math.random() < 0.5 ? -1 : 1, state: 'idle', wait: Math.random() * 4,
      walkT: 0, t: Math.random() * 9, moving: false, swingT: 0, swingCd: 0, chat: null, chatUntil: 0, talk: null };
  });
  const dist = (a, b) => Math.hypot(wrapDelta(a.x - b.x, map.width), wrapDelta(a.y - b.y, map.height));
  let clock = 0;

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
    a.talk = { with: b, lines, i: 0, next: 0, me: 0 }; b.talk = { with: a, lines, i: 0, next: 0, me: 1, passive: true };
    a.facing = wrapDelta(b.x - a.x, map.width) > 0 ? 1 : -1; b.facing = -a.facing;
  }

  function update(dt, me) {
    clock += dt;
    for (const n of list) {
      if (dist(n, me) > def.active_range_px) continue; // xa người chơi: đứng yên cho nhẹ máy
      n.t += dt;
      if (n.swingT > 0) n.swingT -= dt;
      if (n.swingCd > 0) n.swingCd -= dt;
      if (n.state === 'talk') {
        const k = n.talk;
        if (!k.passive && clock >= k.next) {
          if (k.i >= k.lines.length) { n.state = k.with.state = 'idle'; n.wait = k.with.wait = 3 + Math.random() * 5; n.talk = k.with.talk = null; continue; }
          say(k.i % 2 === 0 ? n : k.with, k.lines[k.i]); k.i++; k.next = clock + def.talk_line_s;
        }
        continue;
      }
      // NPC gan dạ: quái gần (ngoài thành) → chạy tới vung vũ khí (chỉ hình)
      const foe = n.brave && !map.safeAt(n.x, n.y) ? mobs.nearest(n, def.fight_range_px) : null;
      if (foe) {
        n.state = 'fight';
        if (dist(n, foe) > 20) walkTo(n, foe.x - 14 * Math.sign(wrapDelta(foe.x - n.x, map.width) || 1), foe.y, dt);
        else {
          n.moving = false; n.facing = wrapDelta(foe.x - n.x, map.width) > 0 ? 1 : -1;
          if (n.swingCd <= 0) { n.swingT = 0.35; n.swingCd = def.swing_every_s; foe.hitT = 0.12; }
        }
        continue;
      }
      if (n.state === 'fight') { n.state = 'idle'; n.wait = 1; }
      if (n.state === 'walk') { if (walkTo(n, n.tx, n.ty, dt)) { n.state = 'idle'; n.wait = 2 + Math.random() * 6; } continue; }
      n.moving = false;
      n.wait -= dt;
      if (n.wait > 0) continue;
      const mate = Math.random() < 0.45 && list.find((o) => o !== n && o.state === 'idle' && dist(o, n) < def.talk_range_px);
      if (mate) { startTalk(n, mate); continue; }
      if (Math.random() < 0.12) { n.swingT = 0.35; n.wait = 1.5; continue; } // luyện kiếm tại chỗ
      const a = Math.random() * Math.PI * 2, r = Math.random() * n.wander_px;
      n.tx = map.wrapX(n.hx + Math.cos(a) * r); n.ty = map.wrapY(n.hy + Math.sin(a) * r); n.state = 'walk';
    }
  }

  // Chạm vào NPC: chào người chơi
  function tap(wx, wy, at) {
    for (const n of list) {
      const p = at(n);
      if (Math.abs(p.x - wx) < 9 && wy < p.y + 2 && wy > p.y - def.height_px) {
        n.facing = wx > p.x ? 1 : -1;
        say(n, def.greet[Math.floor(Math.random() * def.greet.length)], 3.5);
        return true;
      }
    }
    return false;
  }
  return { list, update, tap, height: def.height_px };
}
