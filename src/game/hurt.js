// Quái / NPC đánh người chơi (tách khỏi gameplay.js 24/10/2026 để gameplay.js dưới 400 dòng).
// env: đối tượng monsters.js dùng mỗi khung (hitPlayer, dodged, fx, stunPlayer; alive do gameplay.js gán).
// c: { me, stats, S, pt, mobs, npcs, quests, say, play, toast, HEAD, onKill(m), die(), get() → { hp, dead, ps }, setHp(v), hurt(), stun(s) }
export function createHurt(c) {
  const { me, stats, S, pt, mobs, say, play, HEAD } = c;
  const defMul = () => (pt.active ? S['phap-tuong'].def_mul : 1);
  const env = {
    me, alive: true,
    hitPlayer(m, mul, skillName) {
      const { dead, ps, hp } = c.get();
      if (dead) return; const r = stats.hit(stats.monster(m), ps, { atkMul: mul, defMul: defMul() });
      c.hurt();
      if (r.miss) { say(me.x, me.y - HEAD, 'Né', '#9fe8ff'); return; }
      c.setHp(hp - r.dmg);
      say(me.x, me.y - HEAD, `${skillName ? `${skillName} ` : mul > 1 ? 'Đòn nặng ' : r.crit ? 'Bạo kích ' : ''}-${r.dmg}`, mul > 1 ? '#ff5a3a' : '#ff9a8a', mul > 1 || r.crit);
      if (mul > 1 && !skillName) play(m.def.rank === 'boss' ? 'hoa-cot' : 'sao-den', me.x, me.y, m.def.rank === 'boss' ? 46 : 34, { ground: m.def.rank === 'boss' });
      else play('cham-mau', me.x, me.y - 12, 16);
      if (r.reflect) { say(m.x, m.y - (m.def.art?.h || m.r * 2) - 4, `Phản đòn -${r.reflect}`, '#c58cff'); if (mobs.damage(m, r.reflect)) c.onKill(m); }
      if (c.get().hp <= 0) c.die();
    },
    dodged(m, skillName) { say(me.x, me.y - HEAD, skillName ? `Né ${skillName}!` : 'Né đòn nặng!', '#7dff8a', true); c.quests.emit('dodge'); },
    fx: (id, x, y, h, ground, rot = 0) => play(id, x, y, h, { ground, rot }), // hiệu ứng chiêu boss
    stunPlayer(s) { c.stun(s); say(me.x, me.y - HEAD - 10, 'Bị trói!', '#ffe36a', true); },
  };
  function hitByNpc(n) {
    const { dead, ps, hp } = c.get();
    if (dead) return; const r = stats.hit(n.st, ps, { defMul: defMul() });
    c.hurt();
    if (r.miss) { say(me.x, me.y - HEAD, 'Né', '#9fe8ff'); return; }
    c.setHp(hp - r.dmg); say(me.x, me.y - HEAD, `${r.crit ? 'Bạo kích ' : ''}-${r.dmg}`, '#ff9a8a', r.crit); play('cham-mau', me.x, me.y - 12, 16);
    if (r.reflect) { say(n.x, n.y - HEAD, `Phản đòn -${r.reflect}`, '#c58cff'); c.npcs.damage(n, r.reflect, 'me'); }
    if (c.get().hp <= 0) { c.die(); c.toast(`Bị ${n.name} hạ gục`, 2500); }
  }
  return { env, hitByNpc };
}
