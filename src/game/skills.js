// Kỹ năng người chơi (THỬ NGHIỆM phía máy khách): dùng chiêu, đạn bay, tự dùng chiêu khi bật Tự động.
// Thông số ở data/gameplay.json → skills. kind: bolt | strike | area_self | heal | buff; chiêu cũ (kiếm khí, khống chế,
// thú hồn, lướt, nguyên anh) giữ cách riêng. Hiệu ứng v.* cắt từ tấm chủ dự án (tools/fx_sheets.py).

// c: { S, me, mobs, map, pt, cds, bar, toast, say, play, fx, bolts, strike, target, buffs, recompute, heal, maxHp, now, dead, summonPet,
//      mods() (Đạo Vận: hồi chiêu, linh lực), fire(spec) + maybeEcho(fn) (barrage.js: đạn xoè quạt, nảy, tách…) }
import { juice } from './juice.js';

export function createSkills(c) {
  const { S, me, mobs, pt, cds, toast, say, play, fx } = c;

  function ready(id, quiet = false) {
    const s = S[id], now = c.now();
    if (c.dead()) return false;
    const off = c.bar.blocked(id);
    if (off) { if (!quiet) toast(off, 1200); return false; }
    if ((cds[id] || 0) > now) { if (!quiet) toast('Đang hồi chiêu', 900); return false; }
    const md = c.mods(), hop = id === 'phap-bao' && c.hopOn?.(), cost = hop ? 0 : (s.mp || 0) * (md.mp_mul ?? 1); // Hợp Nhất: pháp bảo không tốn linh lực, hồi chiêu tối đa
    if (pt.mp < cost) { if (!quiet) toast('Linh lực không đủ', 1000); return false; }
    pt.spend(cost); cds[id] = now + (s.cd_s || 0) * (hop ? 0.1 : md.cd_mul ?? 1); // Đạo Vận đại thành: hồi chiêu ×0,15, tốn linh lực ×0,5
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

  const ECHO = new Set(['kiem-khi', 'nguyen-anh']); // chiêu đánh: Liên Hoàn Phù có thể tự phát lại
  // Trả về true nếu đã dùng chiêu
  function cast(id, quiet = false) {
    const s = S[id];
    if (!s || !ready(id, quiet)) return false;
    if (s.charge_s && !(['strike', 'blink'].includes(s.kind) && !c.target(s.range_px))) { // gồng kiểu My Heroes: hiệu ứng tụ khí + tối màn hình, rồi mới phóng (nổ thì rung màn hình)
      if (s.charge_fx) play(s.charge_fx, me.x, me.y + 4, s.charge_h || 56, { ground: true });
      if (s.dim) juice.dim(s.charge_s + 0.7, s.dim);
      juice.later(s.charge_s, () => { if (!c.dead() && perform(id, s, true) && s.shake) juice.later(s.shake_at ?? 0.12, () => juice.shake(s.shake, 0.28)); });
      return true;
    }
    const ok = perform(id, s, quiet);
    if (ok && s.shake) juice.later(s.shake_at ?? 0.12, () => juice.shake(s.shake, 0.25));
    if (ok && (ECHO.has(id) || ['bolt', 'strike', 'area_self'].includes(s.kind))) c.maybeEcho(() => perform(id, s, true));
    return ok;
  }
  function perform(id, s, quiet) {
    const now = c.now();
    switch (id) {
      case 'kiem-khi': {
        const { dx, dy } = dirTo(c.target(s.range_px));
        c.fire({ id, x: me.x, y: me.y - 10, dx, dy, speed: s.speed_px_per_s, range: s.range_px, fx: 'kiem-bang-bay', size: 22, mul: s.mul, base: s, label: 'kiem-khi' });
        return true;
      }
      case 'khong-che': {
        const m = c.target(s.range_px);
        if (m) { m.stun = s.stun_s; say(m.x, m.y - m.r * 2, 'Choáng', '#ffe36a'); play('moc-troi', m.x, m.y, 30, { ground: true }); }
        else toast('Không có mục tiêu gần', 900);
        return true;
      }
      case 'linh-thu': c.summonPet(s); return true;
      case 'phap-bao': return c.useTreasure(quiet); // pháp bảo đang đeo (treasure.js)
      case 'cam-che': return c.camChe(s); // trận cấm chế theo hệ chủ đạo (camche.js)
      case 'luot':
        c.buffs.ne = { mul: s.ne_mul, until: now + s.last_s }; c.buffs.speed = { mul: s.speed_px_per_s, until: now + s.last_s };
        c.recompute(); toast('Lăng Ba Vi Bộ', 900); return true;
      case 'nguyen-anh':
        fx.push({ kind: 'ring', x: me.x, y: me.y, r: s.radius_px, color: '#c9a6ff', t: 0.5, life: 0.5 });
        play('k.bao-tho', me.x, me.y + 4, s.radius_px * 1.1, { ground: true }); // tho-vong cũ bị lẹm khung (chủ dự án 23/10)
        for (const m of mobs.within(me, s.radius_px)) c.strike(m, s.mul, 'nguyen-anh');
        return true;
      default: break;
    }
    if (s.kind === 'volley') { // Vạn Kiếm Triều Tông: kiếm mọc từ đất rồi xoè quạt bay về phía trước
      const { dx, dy } = dirTo(c.target(s.range_px)), a0 = Math.atan2(dy, dx);
      play(s.cast_fx, me.x, me.y + 4, 46, { ground: true });
      for (let j = 0; j < s.n; j++) {
        const a = a0 + (j / (s.n - 1) - 0.5) * s.spread;
        c.fire({ id, x: me.x, y: me.y - 12, dx: Math.cos(a), dy: Math.sin(a), speed: s.speed_px_per_s, range: s.range_px, fx: s.fx, size: s.fx_size, mul: s.mul, base: s, child: true });
      }
      return true;
    }
    if (s.kind === 'wave') { // sóng / đất nứt quét thẳng phía trước: mọi quái trong dải dài len, rộng w
      const { dx, dy } = dirTo(c.target(s.len)), w = s.w / 2;
      for (let j = 1; j <= 3; j++) play(s.fx, me.x + dx * s.len * j / 3.3, me.y + dy * s.len * j / 3.3 + 4, s.fx_h, { ground: true, delay: j * 0.08 });
      for (const m of mobs.within(me, s.len + 20)) {
        const r = mobs.rel(m, me), along = r.dx * dx + r.dy * dy, across = Math.abs(-r.dx * dy + r.dy * dx);
        if (along < -10 || along > s.len || across > w) continue;
        c.strike(m, s.mul, 'skill'); if (s.stun_s && m.state !== 'dead') m.stun = Math.max(m.stun || 0, s.stun_s);
        if (s.push && m.state !== 'dead') { m.x += dx * s.push; m.y += dy * s.push; }
      }
      return true;
    }
    if (s.kind === 'tornado') { // lốc lửa đi về phía mục tiêu, cháy mọi quái nó đi qua
      const { dx, dy } = dirTo(c.target(240));
      c.mover({ fx: s.fx, h: s.fx_h, x: me.x + dx * 20, y: me.y + dy * 20, vx: dx * s.speed, vy: dy * s.speed, s: s.last_s, r: s.radius_px, mul: s.mul, every: 0.3, loop: 2 });
      return true;
    }
    if (s.kind === 'storm') { // thiên kiếp: sét đánh liên tục quái ngẫu nhiên quanh mình
      c.schedule(s.last_s, s.every, () => {
        const near = mobs.within(me, s.radius_px).filter((m) => m.state !== 'dead'); if (!near.length) return;
        const m = near[Math.floor(Math.random() * near.length)];
        play(s.fx, m.x, m.y + 2, s.fx_h, { ground: true }); hitAround(m.x, m.y, { ...s, radius_px: 26 });
      });
      return true;
    }
    if (s.kind === 'blink') { // hư không thuấn di: ra sau lưng mục tiêu, chém
      const m = c.target(s.range_px); if (!m) { cds[id] = 0; if (!quiet) toast('Không có mục tiêu', 900); return false; }
      play(s.fx, me.x, me.y - 12, s.fx_h);
      const side = mobs.rel(m, me).dx >= 0 ? 1 : -1;
      me.x = m.x + side * (m.r + 14); me.y = m.y; me.facing = -side;
      play(s.fx, me.x, me.y - 12, s.fx_h, { delay: 0.1 });
      c.strike(m, s.mul, 'skill');
      return true;
    }
    if (s.kind === 'clone') { // nguyên thần xuất khiếu: phân thân đứng cạnh, tự bắn đạn đạo pháp
      c.mover({ fx: s.fx, h: s.fx_h, follow: true, ox: -22, oy: -4, x: me.x, y: me.y, s: s.last_s, mul: s.mul, every: s.every, shoot: c.mods().bolt, loop: 0.8, alpha: 0.9 });
      return true;
    }
    if (s.kind === 'seal') { // cấm chế phong ấn: khoá quái (cả tinh anh / boss) — choáng + không vận chiêu
      const m = c.target(s.range_px); if (!m) { cds[id] = 0; if (!quiet) toast('Không có mục tiêu', 900); return false; }
      play(s.fx, m.x, m.y + 4, s.fx_h, { ground: true });
      m.stun = Math.max(m.stun || 0, s.stun_s); m.sealed = s.seal_s; m.cast = null; if (m.state === 'cast') m.state = 'chase';
      c.strike(m, s.mul, 'skill'); say(m.x, m.y - (m.def.art?.h || 20) - 6, 'Phong ấn', '#ff6a6a');
      return true;
    }
    if (s.kind === 'pull') { // U Minh Quỷ Trảo: kéo quái quanh mình về trước mặt, đánh + choáng
      const near = mobs.within(me, s.radius_px); if (!near.length) { if (!quiet) toast('Không có quái quanh đây', 900); }
      const fx0 = { x: me.x + me.facing * 34, y: me.y };
      for (const m of near) { m.x += (fx0.x - m.x) * 0.7; m.y += (fx0.y - m.y) * 0.7; }
      play(s.fx, fx0.x, fx0.y - 10, s.fx_h, { rot: me.facing < 0 ? Math.PI : 0 });
      hitAround(fx0.x, fx0.y, { ...s, radius_px: 50 });
      return true;
    }
    if (s.kind === 'bolt') {
      const { dx, dy } = dirTo(c.target(s.range_px));
      if (s.cast_fx) play(s.cast_fx, me.x + dx * 26, me.y - 12 + dy * 26, 44, { rot: Math.atan2(dy, dx) });
      c.fire({ id, x: me.x, y: me.y - 12, dx, dy, speed: s.speed_px_per_s, range: s.range_px, fx: s.fx, size: s.fx_size, mul: s.mul, base: s });
    } else if (s.kind === 'strike') {
      const m = c.target(s.range_px);
      if (!m) { cds[id] = 0; pt.gain((s.mp || 0) * (c.mods().mp_mul ?? 1)); if (!quiet) toast('Không có mục tiêu trong tầm', 900); return false; }
      dirTo(m);
      play(s.fx, m.x, m.y, s.fx_h, { ground: true });
      if (s.drain) c.heal(c.maxHp() * s.drain * mobs.within(m, s.radius_px).length); // Phệ Hồn Ma Diễm: hút máu
      hitAround(m.x, m.y, s);
    } else if (s.kind === 'area_self') {
      play(s.fx, me.x, me.y + 4, s.fx_h, { ground: true });
      fx.push({ kind: 'ring', x: me.x, y: me.y, r: s.radius_px, color: '#ffe6a0', t: 0.45, life: 0.45 });
      hitAround(me.x, me.y, s);
    } else if (s.kind === 'heal') {
      play(s.fx, me.x, me.y + 4, s.fx_h, { ground: true });
      if (s.pets) c.healPets?.(s.heal);
      c.heal(c.maxHp() * s.heal);
    } else if (s.kind === 'buff') {
      c.buffs[s.buff] = { mul: s.buff_mul, until: now + s.last_s }; c.recompute();
      play(s.fx, me.x, me.y - 14, s.fx_h);
      toast(`${s.name}: ${s.last_s} giây`, 1000);
    }
    return true;
  }

  // Tự động: dùng chiêu đầu tiên trong ô sẵn sàng (đủ tầm). Hồi máu khi khí huyết dưới 55%. Bỏ qua Lướt / Pháp tướng / Đan.
  const SKIP = new Set(['luot', 'phap-tuong', 'dan-duoc']);
  function autoCast(ids, hpFrac) {
    for (const id of ids) {
      const s = S[id];
      if (!s || SKIP.has(id)) continue;
      if (s.kind === 'heal' ? hpFrac > 0.55 : s.kind === 'buff' ? !c.target(120) : !c.target(s.range_px || s.radius_px || 120)) continue;
      if ((c.cds[id] || 0) > c.now() || pt.mp < (s.mp || 0) * (c.mods().mp_mul ?? 1) || c.bar.blocked(id)) continue;
      if (cast(id, true)) return id;
    }
    return null;
  }
  return { cast, autoCast };
}
