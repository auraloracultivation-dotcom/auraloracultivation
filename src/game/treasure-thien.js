// CHIÊU MỚI 6 PHÁP BẢO THIÊN HỆ (chủ dự án 24/10/2026: "6 bộ mới mạnh hơn, đẹp hơn 6 bộ cũ") — Quang · Lôi · Băng · Phong · Thời · Hư.
// Hoạt ảnh nhiều khung cắt từ tấm chủ dự án (tools/thien_phap_bao.py → fx tp.<hệ>.*), mọi hiệu ứng tự phát sáng (glow).
// Chiêu: luân bay xé quái (Quang), cờ sét cắm đất (Lôi), tia dài quét thẳng (Băng, Phong, Thời, Hư) + vật đứng tại chỗ.
// Số liệu ở data/build/phap-bao.json (mục "thien": true, kind t_*); file này chỉ đọc số, không viết số cứng.
import { drawEffect, fxRatio } from '../entity/index.js';
import { glow } from './glow.js';

// c: { barrage, mobs, me, map, play, heal(n), maxHp(), target(r), rewind() }
export function createThien(c) {
  const { barrage, mobs, me, map, play } = c;
  const beams = [], later = [];
  const wait = (s, fn) => later.push({ t: s, fn });
  const alive = (m) => m && m.state !== 'dead';
  // Vật kéo dài (cờ, lốc, thiên hà): Thiên Cơ Hợp Nhất tự phóng pháp bảo mỗi ~0,45 giây — không chồng thêm vật khi cái cũ còn sống (đỡ lag điện thoại)
  const busy = {}, sec = () => performance.now() / 1000;
  const claim = (k, s, auto) => { if (auto && (busy[k] || 0) > sec()) return false; busy[k] = sec() + s; return true; };
  // Điểm đặt vật: quái đang nhắm, không có thì trước mặt `far` (giữ trong màn hình điện thoại)
  const spot = (o, ang, far) => (o.tgt && alive(o.tgt) ? { x: o.tgt.x, y: o.tgt.y } : { x: map.wrapX(me.x + Math.cos(ang) * far), y: map.wrapY(me.y + Math.sin(ang) * far) });

  // ---- Tia dài: hiện dần từ gốc ra (0,15 giây), giữ, mờ dần; vẽ thêm lớp cộng sáng + vệt sáng dọc tia ----
  function beam(o) { beams.push({ life: 0.7, ...o, t: 0 }); }
  barrage.layer({
    update(dt) {
      for (let i = later.length - 1; i >= 0; i--) if ((later[i].t -= dt) <= 0) later.splice(i, 1)[0].fn();
      for (let i = beams.length - 1; i >= 0; i--) if ((beams[i].t += dt) >= beams[i].life) beams.splice(i, 1);
    },
    render(ctx, at, now) {
      for (const b of beams) {
        const p = at(b), grow = Math.min(1, b.t / 0.15), fade = Math.min(1, (b.life - b.t) / 0.25), vx = String(b.fx).startsWith('x.'), h = vx ? 48 : b.len / fxRatio(b.fx); // hiệu ứng ghép (x.*): rải từng đoạn dọc tia, không phóng một hình to bằng cả tia
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(b.ang);
        if (Math.cos(b.ang) < 0) ctx.scale(1, -1); // tia bắn sang trái: lật dọc để hình không lộn ngược
        ctx.beginPath(); ctx.rect(-8, -h, b.len * grow + 8, h * 2); ctx.clip();
        ctx.globalAlpha = fade * (0.9 + 0.1 * Math.sin(now / 50));
        if (vx) { ctx.globalAlpha *= 0.65; for (let d = h * 0.5; d < b.len; d += h * 1.05) drawEffect(ctx, b.fx, Math.min(0.99, b.t / b.life + d / b.len * 0.2), d, 0, h); } else drawEffect(ctx, b.fx, 0, b.len / 2, 0, h); // hình có "glow" → drawEffect tự cộng sáng
        ctx.restore();
        const n = 5; // quầng sáng rải dọc tia
        for (let k = 0; k < n; k++) {
          const d = (b.len * grow * (k + 0.5)) / n;
          glow(ctx, p.x + Math.cos(b.ang) * d, p.y + Math.sin(b.ang) * d + 10, h * 0.9, b.color, (vx ? 0.25 : 0.45) * fade, 0.5);
        }
      }
    },
  });

  // Quái nằm trên đoạn thẳng từ `from` theo góc ang, dài len, rộng w (tính cả bản đồ vòng)
  function inLine(from, ang, len, w) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    return mobs.within(from, len + 30).filter((m) => {
      if (!alive(m)) return false;
      const r = mobs.rel(m, from), dy = r.dy - m.r, along = r.dx * ux + dy * uy;
      return along > -10 && along < len && Math.abs(-r.dx * uy + dy * ux) < w + m.r;
    });
  }
  const angTo = (m, from) => { if (!m) return me.facing < 0 ? Math.PI : 0; const r = mobs.rel(m, from); return Math.atan2(r.dy - m.r, r.dx); };
  const pull = (m, to, k) => { const r = mobs.rel(m, to); m.x = map.wrapX(m.x - r.dx * k); m.y = map.wrapY(m.y - r.dy * k); };
  const src = () => ({ x: me.x, y: me.y - 14 }); // gốc tia: ngang ngực

  // Một tia: vẽ + đánh mọi quái trên đường; each(m, i) cho hiệu ứng riêng từng con. Trả về danh sách trúng.
  function sweep(d, fx, ang, len, mul, color, each) {
    const from = src();
    beam({ fx, x: from.x, y: from.y, ang, len, color });
    const hit = inLine(from, ang, len, d.w || 26);
    hit.forEach((m, i) => { barrage.strikeOne(m, mul, d.stun); each?.(m, i); });
    return hit;
  }

  const KINDS = {
    // Kim Dương Thiên Luân: n bánh xe vàng lao về các quái gần nhất, nghiền qua (đánh liên tục), cuối đường nổ thánh quang
    t_luan(d, o) {
      if (!o.auto) play(d.fx.trieu, me.x, me.y + 4, 74, { ground: true, glow: o.color });
      const near = mobs.within(me, 300).filter(alive).sort((a, b) => mobs.distTo(a, me) - mobs.distTo(b, me));
      for (let k = 0; k < (o.auto ? 1 : o.n); k++) {
        const m = near[k % Math.max(1, near.length)], a = m ? angTo(m, me) + (k >= near.length ? (k - near.length + 1) * 0.5 : 0) : (k / o.n) * Math.PI * 2;
        barrage.mover({ fx: d.fx.xoay, x: me.x, y: me.y, vx: Math.cos(a) * d.speed, vy: Math.sin(a) * d.speed, s: d.s, h: 42, r: d.r, mul: o.mul * d.tick,
          every: 0.12, a: 0, b: 1, tin: 0.01, loop: 3, glow: o.color, glowR: 30, glowY: 18,
          onTick: (w) => { const t = barrage.nearestTo(w, 150); if (!t) return; const r = mobs.rel(t, w), L = Math.hypot(r.dx, r.dy) || 1, sp = Math.hypot(w.vx, w.vy);
            w.vx = w.vx * 0.6 + (r.dx / L) * sp * 0.4; w.vy = w.vy * 0.6 + (r.dy / L) * sp * 0.4; },
          onEnd: (w) => { play(d.fx.no, w.x, w.y + 2, 76, { ground: true, glow: o.color }); play(d.fx.luan, w.x, w.y - 12, 84, { glow: o.color });
            barrage.hitAround(w.x, w.y, d.boom_r, o.mul * d.boom, 'skill'); } });
      }
    },
    // Cửu Thiên Lôi Đình Kỳ: cắm cờ sét, quanh cờ phóng điện; cứ `every` giây giáng sét quái gần nhất rồi lan sang `n` con
    t_ky(d, o) {
      const at = { x: map.wrapX(me.x + me.facing * 18), y: me.y };
      if (!claim('ky', d.s, o.auto)) { const m = barrage.nearestTo(me, d.r); if (m) { play(d.fx.set, m.x, m.y + 2, 72, { ground: true, glow: o.color }); barrage.strikeOne(m, o.mul, d.stun); } return; }
      play(d.fx.vong, me.x, me.y - 8, 70, { glow: o.color });
      barrage.mover({ fx: d.fx.phien, x: at.x, y: at.y, s: d.s, h: 92, r: d.aura_r, mul: o.mul * d.aura, every: 0.5, a: 8 / 15, b: 1, tin: 0.7, loop: 1.2,
        glow: o.color, glowR: 64, glowA: 0.7 });
      barrage.schedule(d.s, d.every, () => {
        let m = barrage.nearestTo(at, d.r); if (!m) return;
        const done = new Set();
        for (let k = 0; k <= o.n && m; k++) {
          done.add(m.uid); play(d.fx.set, m.x, m.y + 2, 72, { ground: true, glow: o.color });
          barrage.zap({ kind: 'zap', x: k ? m.px : at.x, y: k ? m.py : at.y - 80, x2: m.x, y2: m.y - m.r, t: 0.25, color: '#f0dcff' });
          barrage.strikeOne(m, o.mul * (k ? d.chain_mul : 1), d.stun);
          const n = barrage.nearestTo(m, 120, done); if (n) { n.px = m.x; n.py = m.y - m.r; } m = n;
        }
      });
    },
    // Huyền Băng Thiên Bôi: rót băng thành tia dài đóng băng cả đường, cuối đường mọc trụ băng nổ
    t_bang(d, o) {
      const ang = angTo(o.tgt, src());
      play(d.fx.do, me.x + me.facing * 6, me.y + 2, 60, { ground: true, glow: o.color });
      wait(0.3, () => {
        sweep(d, d.fx.tia, ang, d.len, o.mul, o.color, (m, i) => { if (i < 5) play(d.fx.no, m.x, m.y + 2, 58, { ground: true, glow: o.color }); });
        const e = spot(o, ang, 140);
        play(d.fx.tran, e.x, e.y + 4, 96, { ground: true, glow: o.color });
        barrage.hitAround(e.x, e.y, d.tran_r, o.mul * d.tran_mul, 'skill', d.stun);
      });
    },
    // Thanh Phong Thiên Phiến: quạt ra sóng gió dài hất văng quái, rồi dựng lốc xoáy hút quái vào giữa
    t_phong(d, o) {
      const ang = angTo(o.tgt, src()), ux = Math.cos(ang), uy = Math.sin(ang);
      play(d.fx.do, me.x + me.facing * 6, me.y + 2, 56, { ground: true, glow: o.color });
      wait(0.2, () => {
        sweep(d, d.fx.song, ang, d.len, o.mul, o.color, (m, i) => { m.x = map.wrapX(m.x + ux * d.push); m.y = map.wrapY(m.y + uy * d.push); if (i < 4) play(d.fx.no, m.x, m.y + 2, 54, { ground: true, glow: o.color }); });
        const e = spot(o, ang, 120); if (!claim('loc', d.s, o.auto)) return;
        barrage.mover({ fx: d.fx.loc, x: e.x, y: e.y, s: d.s, h: 96, r: d.r, mul: o.mul * d.tick, every: 0.25, a: 4 / 8, b: 1, tin: 0.5, loop: 1.6,
          glow: o.color, glowR: 56, onTick: (w) => { for (const m of mobs.within(w, d.pull_r)) if (alive(m)) pull(m, w, 0.3); } });
      });
    },
    // Thời Không Thiên Sa: mở trận thời gian (hồi khí huyết), dòng thời không quét thẳng, nơi cuối đường mở thiên hà ngưng đọng thời gian
    t_thoi(d, o) {
      const ang = angTo(o.tgt, src());
      play(d.fx.trieu, me.x, me.y + 4, 78, { ground: true, glow: o.color });
      if (claim('hoi', 6, o.auto)) { c.heal(c.maxHp() * d.heal); if (d.rewind) c.rewind?.(); } // quay ngược thời gian: làm mới hồi chiêu (trừ pháp bảo) play(d.fx.hoi, me.x, me.y + 4, 70, { ground: true, glow: '#8fe8ff', delay: 0.35 });
      wait(0.35, () => {
        sweep(d, d.fx.dong, ang, d.len, o.mul, o.color);
        const e = spot(o, ang, 130); if (!claim('ha', d.s, o.auto)) return;
        barrage.mover({ fx: d.fx.ha, x: e.x, y: e.y, s: d.s, h: 56, r: d.r, mul: o.mul * d.tick, stun: d.stop, every: 0.5, a: 0, b: 1, tin: 0.01, loop: 0.6,
          glow: o.color, glowR: d.r, glowY: 24, glowA: 0.45 });
      });
    },
    // Hư Không Phệ Bôi: n tia hư không toả quạt, xuyên tất cả, kéo quái về phía mình và hút sinh lực mỗi con trúng
    t_hu(d, o) {
      const a0 = angTo(o.tgt, src()), n = Math.min(o.n, d.max_n || 5);
      play(d.fx.do, me.x + me.facing * 6, me.y + 2, 60, { ground: true, glow: o.color });
      wait(0.3, () => {
        let got = 0;
        for (let k = 0; k < n; k++) {
          const a = a0 + (k - (n - 1) / 2) * d.spread;
          got += sweep(d, d.fx.tia, a, d.len, o.mul, o.color, (m, i) => { pull(m, me, d.pull); if (i < 3) play(d.fx.no, m.x, m.y + 2, 54, { ground: true, glow: o.color }); }).length;
        }
        if (got) c.heal(c.maxHp() * Math.min(d.drain_cap, d.drain * got));
        play(d.fx.tran, me.x, me.y + 4, 70, { ground: true, glow: o.color, delay: 0.15 });
      });
    },
  };

  // o: { mul (đã nhân cấp ôn dưỡng), n (đã cộng theo cấp), tgt (quái nhắm), color, auto (Hợp Nhất tự phóng) }
  const cast = (d, o) => { KINDS[d.kind](d, o); return true; };
  const fxIds = (d) => Object.values(d.fx || {});
  return { has: (kind) => !!KINDS[kind], cast, fxIds };
}
