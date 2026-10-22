// Kỹ năng người chơi (THỬ NGHIỆM phía máy khách): dùng chiêu, đạn bay, tự dùng chiêu khi bật Tự động.
// Thông số ở data/gameplay.json → skills. kind: bolt | strike | area_self | heal | buff; chiêu cũ (kiếm khí, khống chế,
// linh thú, lướt, nguyên anh) giữ cách riêng. Hiệu ứng v.* cắt từ tấm chủ dự án (tools/fx_sheets.py).
import { wrapDelta } from '../map/index.js';

// c: { S, me, mobs, map, pt, cds, bar, toast, say, play, fx, bolts, strike, target, buffs, recompute, heal, maxHp, now, dead, summonPet }
export function createSkills(c) {
  const { S, me, mobs, map, pt, cds, toast, say, play, fx, bolts } = c;

  function ready(id, quiet = false) {
    const s = S[id], now = c.now();
    if (c.dead()) return false;
    const off = c.bar.blocked(id);
    if (off) { if (!quiet) toast(off, 1200); return false; }
    if ((cds[id] || 0) > now) { if (!quiet) toast('Đang hồi chiêu', 900); return false; }
    if (pt.mp < (s.mp || 0)) { if (!quiet) toast('Linh lực không đủ', 1000); return false; }
    pt.spend(s.mp || 0); cds[id] = now + s.cd_s;
    return true;
  }
  const dirTo = (m) => {
    if (!m) return { dx: me.facing, dy: 0 };
    const r = mobs.rel(m, me), d = Math.hypot(r.dx, r.dy) || 1;
    if (r.dx) me.facing = r.dx > 0 ? 1 : -1;
    return { dx: r.dx / d, dy: r.dy / d };
  };
  const hitAround = (x, y, s) => {
    for (const m of mobs.within({ x, y }, s.radius_px || s.splash_px || 30)) {
      c.strike(m, s.mul, 'skill');
      if (s.stun_s && m.state !== 'dead') m.stun = Math.max(m.stun, s.stun_s);
    }
  };

  // Trả về true nếu đã dùng chiêu
  function cast(id, quiet = false) {
    const s = S[id];
    if (!s || !ready(id, quiet)) return false;
    const now = c.now();
    switch (id) {
      case 'kiem-khi': {
        const { dx, dy } = dirTo(c.target(s.range_px));
        bolts.push({ kind: 'bolt', x: me.x, y: me.y - 10, vx: dx * s.speed_px_per_s, vy: dy * s.speed_px_per_s, left: s.range_px, id });
        return true;
      }
      case 'khong-che': {
        const m = c.target(s.range_px);
        if (m) { m.stun = s.stun_s; say(m.x, m.y - m.r * 2, 'Choáng', '#ffe36a'); play('moc-troi', m.x, m.y, 30, { ground: true }); }
        else toast('Không có mục tiêu gần', 900);
        return true;
      }
      case 'linh-thu': c.summonPet(s); return true;
      case 'luot':
        c.buffs.ne = { mul: s.ne_mul, until: now + s.last_s }; c.buffs.speed = { mul: s.speed_px_per_s, until: now + s.last_s };
        c.recompute(); toast('Lăng Ba Vi Bộ', 900); return true;
      case 'nguyen-anh':
        fx.push({ kind: 'ring', x: me.x, y: me.y, r: s.radius_px, color: '#c9a6ff', t: 0.5, life: 0.5 });
        play('tho-vong', me.x, me.y + 4, s.radius_px * 1.1, { ground: true });
        for (const m of mobs.within(me, s.radius_px)) c.strike(m, s.mul, 'nguyen-anh');
        return true;
      default: break;
    }
    if (s.kind === 'bolt') {
      const { dx, dy } = dirTo(c.target(s.range_px));
      bolts.push({ kind: 'bolt', fx: s.fx, size: s.fx_size, x: me.x, y: me.y - 12, vx: dx * s.speed_px_per_s, vy: dy * s.speed_px_per_s,
        left: s.range_px, id, hit: new Set() });
    } else if (s.kind === 'strike') {
      const m = c.target(s.range_px);
      if (!m) { cds[id] = 0; pt.gain(s.mp || 0); if (!quiet) toast('Không có mục tiêu trong tầm', 900); return false; }
      dirTo(m);
      play(s.fx, m.x, m.y, s.fx_h, { ground: true });
      hitAround(m.x, m.y, s);
    } else if (s.kind === 'area_self') {
      play(s.fx, me.x, me.y + 4, s.fx_h, { ground: true });
      fx.push({ kind: 'ring', x: me.x, y: me.y, r: s.radius_px, color: '#ffe6a0', t: 0.45, life: 0.45 });
      hitAround(me.x, me.y, s);
    } else if (s.kind === 'heal') {
      play(s.fx, me.x, me.y + 4, s.fx_h, { ground: true });
      c.heal(c.maxHp() * s.heal);
    } else if (s.kind === 'buff') {
      c.buffs[s.buff] = { mul: s.buff_mul, until: now + s.last_s }; c.recompute();
      play(s.fx, me.x, me.y - 14, s.fx_h);
      toast(`${s.name}: ${s.last_s} giây`, 1000);
    }
    return true;
  }

  // Đạn bay: trúng quái thì đánh; xuyên (pierce) thì bay tiếp, nổ lan (splash_px) thì đánh cả quái quanh chỗ trúng
  function updateBolts(dt) {
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], s = S[b.id], step = Math.hypot(b.vx, b.vy) * dt;
      b.x = map.wrapX(b.x + b.vx * dt); b.y = map.wrapY(b.y + b.vy * dt); b.left -= step;
      const m = mobs.list.find((x) => x.state !== 'dead' && !b.hit?.has(x.uid)
        && Math.hypot(wrapDelta(x.x - b.x, map.width), wrapDelta(x.y - x.r - b.y, map.height)) < x.r + 6);
      if (m) {
        if (s.splash_px) { hitAround(m.x, m.y, { ...s, radius_px: s.splash_px }); } else {
          c.strike(m, s.mul, b.id === 'kiem-khi' ? 'kiem-khi' : 'skill');
          if (s.stun_s && m.state !== 'dead') { m.stun = Math.max(m.stun, s.stun_s); say(m.x, m.y - m.r * 2, 'Đóng băng', '#9fe8ff'); }
        }
        if (s.hit_fx) play(s.hit_fx, m.x, m.y, s.hit_h, { ground: true });
        b.hit?.add(m.uid);
      }
      if ((m && !s.pierce) || b.left <= 0) bolts.splice(i, 1);
    }
  }

  // Tự động: dùng chiêu đầu tiên trong ô sẵn sàng (đủ tầm). Hồi máu khi khí huyết dưới 55%. Bỏ qua Lướt / Pháp tướng / Đan.
  const SKIP = new Set(['luot', 'phap-tuong', 'dan-duoc']);
  function autoCast(ids, hpFrac) {
    for (const id of ids) {
      const s = S[id];
      if (!s || SKIP.has(id)) continue;
      if (s.kind === 'heal' ? hpFrac > 0.55 : s.kind === 'buff' ? !c.target(120) : !c.target(s.range_px || s.radius_px || 120)) continue;
      if ((c.cds[id] || 0) > c.now() || pt.mp < (s.mp || 0) || c.bar.blocked(id)) continue;
      if (cast(id, true)) return id;
    }
    return null;
  }
  return { cast, updateBolts, autoCast };
}
