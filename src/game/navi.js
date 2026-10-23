// DẪN ĐƯỜNG (chủ dự án 23/10/2026: map rộng, người chơi không biết đi đâu).
// - Mũi tên vàng quanh nhân vật chỉ tới nơi làm nhiệm vụ đang theo (game.naviGoal): vùng quái / vùng nguyên liệu, hoặc về thành.
// - Chạm một dòng ở khung Nhiệm vụ → tự đi (ngự kiếm nếu được) tới đúng vành vùng; tới nơi thì bật Tự động farm tại chỗ.
// - Kéo cần điều khiển là huỷ tự đi. Vùng là các vành quanh tâm bản đồ (monsters.ringOf), Thanh Vân Thành ở tâm.
import { wrapDelta } from '../map/index.js';

const BAND = { thuong: 0.35, elite: 0.62, boss: 0.82 }; // độ sâu trong vành nơi loại quái đó xuất hiện (gameplay.json → monster.band)
const ZN = { xanh: 'Đồng cỏ', cam: 'Cát vàng', xam: 'Sỏi đá xám', trang: 'Băng tuyết', than: 'Hắc thổ', den: 'Hắc thạch', tim: 'Tử vực', huvo: 'Hư Vô' };

export function createNavi({ map, me, game, flight, toast }) {
  let fixed = false; // đang đi theo questauto.go (không lấy đích từ khung Nhiệm vụ)
  let flyTry = 0, travel = false, stuckT = 0, side = 0, sideT = 0, lx = 0, ly = 0, goal = null, target = null, refresh = 0;

  // Điểm đích: cùng hướng từ tâm bản đồ tới người chơi, ở đúng độ sâu trong vành vùng
  function aim(g) {
    if (!g) return null;
    if (g.point) return { x: g.point.x, y: g.point.y, label: g.label || 'Nơi cần tới', point: true }; // NPC / trận nhãn (daotam.js)
    const cx = map.width / 2, cy = map.height / 2;
    if (g.town) return { x: cx, y: cy + 40, label: 'Thanh Vân Thành', town: true };
    const R = game.zoneRing(g.zone); if (!R) return null;
    // Vành vùng không tròn đều (ảnh bản đồ vẽ tay): dò thật trên bản đồ một điểm ĐÚNG vùng, đứng được, gần độ sâu cần,
    // bắt đầu từ hướng của người chơi rồi xoay dần sang hai bên — không chỉ vào chỗ trống / chỗ nước như trước.
    let a0 = Math.atan2(wrapDelta(me.y - cy, map.height), wrapDelta(me.x - cx, map.width));
    if (!Number.isFinite(a0)) a0 = Math.PI / 2;
    const want = R.min + (R.max - R.min) * (BAND[g.rank] ?? 0.35), span = R.max - R.min;
    for (let k = 0; k <= 72; k++) {
      const a = a0 + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 36); // 0, ±5°, ±10° …
      for (const f of [0, 0.08, -0.08, 0.16, -0.16, 0.25, -0.25, 0.35]) {
        const r = want + f * span, x = map.wrapX(cx + Math.cos(a) * r), y = map.wrapY(cy + Math.sin(a) * r);
        if (map.typeAt(x, y).zone === g.zone && map.canStand(x, y, 8))
          return { x, y, zone: g.zone, rank: g.rank, gather: g.gather, label: ZN[g.zone] || g.zone };
      }
    }
    return null;
  }
  function arrived(t) {
    if (!t) return true;
    if (t.town) return map.safeAt(me.x, me.y);
    if (t.point) return Math.hypot(wrapDelta(t.x - me.x, map.width), wrapDelta(t.y - me.y, map.height)) < 50;
    if (Math.hypot(wrapDelta(t.x - me.x, map.width), wrapDelta(t.y - me.y, map.height)) < 60) return true; // tới đúng điểm đã dò
    const z = map.typeAt(me.x, me.y).zone; if (z !== t.zone) return false;
    const R = game.zoneRing(t.zone), cx = map.width / 2, cy = map.height / 2;
    const dep = (Math.hypot(wrapDelta(me.x - cx, map.width), wrapDelta(me.y - cy, map.height)) - R.min) / (R.max - R.min || 1);
    return dep >= (BAND[t.rank] ?? 0.35) - 0.05; // đi vào đúng độ sâu (tinh anh / boss chỉ ở phần ngoài vành), không dừng ở mép vùng
  }

  // Tới nơi: bật Tự động NHẮM nhiệm vụ — chỉ đánh quái vùng đó (đúng loại trước), nhiệm vụ hái thì mới đi hái
  function startQuestAuto() {
    game.setAuto('quest', { zone: target.zone, rank: target.rank, gather: !!target.gather });
  }
  function start(id) {
    goal = id ? game.track(id) : game.naviGoal(); target = aim(goal);
    if (!target) { toast('Nhiệm vụ này không cần đi đâu — mở bảng Nhiệm vụ để xem', 1800); return; }
    if (arrived(target)) { travel = false; if (!target.town) startQuestAuto(); toast(target.town ? 'Đang ở trong thành' : `Đã ở ${target.label} — tự động farm tại đây`, 1800); return; }
    travel = true; stuckT = 0; lx = me.x; ly = me.y;
    toast(`Dẫn đường: tới ${target.label}${goal.title ? ` (${goal.title})` : ''} — kéo cần để huỷ`, 2200);
    if (game.isAuto()) game.setAuto(null); // tắt farm để đi, tới nơi bật lại
  }

  // Mỗi khung hình. stick: cần điều khiển đang kéo. Trả về hướng đi khi đang tự đi, không thì null.
  function update(dt, stick) {
    refresh -= dt;
    if (refresh <= 0 && !fixed) { refresh = 0.5; const g = game.naviGoal(); if (!travel && (g?.id !== goal?.id || !target || g?.zone !== target.zone)) target = aim(g); goal = g; }
    if (!travel) return null;
    if (stick || game.dead) { travel = false; fixed = false; toast('Đã huỷ dẫn đường', 900); return null; }
    if (arrived(target)) {
      travel = false; fixed = false; flight.set(false, true);
      if (!target.town && !target.point) startQuestAuto();
      toast(target.town || target.point ? `Đã tới ${target.label}` : `Tới ${target.label} — tự động farm tại đây`, 1800);
      return null;
    }
    flyTry -= dt; if (!me.flying && flyTry <= 0) { flyTry = 2; flight.set(true, true); } // ngự kiếm nếu được (cầm kiếm + đủ linh lực): nhanh, qua sông hồ
    let dx = wrapDelta(target.x - me.x, map.width), dy = wrapDelta(target.y - me.y, map.height);
    const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const moved = Math.hypot(me.x - lx, me.y - ly); lx = me.x; ly = me.y;
    stuckT = moved < 0.5 ? stuckT + dt : 0;
    if (stuckT > 0.6) { stuckT = 0; side = side >= 0 ? -1 : 1; sideT = 0.8; } // vướng cây đá: lách sang bên một lúc
    if (sideT > 0) { sideT -= dt; const a = side * 1.1, c = Math.cos(a), s = Math.sin(a); [dx, dy] = [dx * c - dy * s, dx * s + dy * c]; }
    return { x: dx, y: dy };
  }

  // Mũi tên quanh nhân vật (toạ độ thế giới) khi chưa tới nơi
  function render(ctx, t) {
    if (!target || arrived(target)) return;
    const dx = wrapDelta(target.x - me.x, map.width), dy = wrapDelta(target.y - me.y, map.height), a = Math.atan2(dy, dx);
    const R = 30 + Math.sin(t / 220) * 2, px = me.x + Math.cos(a) * R, py = me.y - 10 + Math.sin(a) * R * 0.75;
    ctx.save();
    ctx.translate(px, py); ctx.rotate(a);
    ctx.globalAlpha = travel ? 1 : 0.85;
    ctx.fillStyle = '#ffd56a'; ctx.strokeStyle = '#3a2207'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.rotate(-a);
    const km = Math.hypot(dx, dy) / 32 / 10; // 10 ô = 1 dặm
    const txt = `${target.label} ${km >= 1 ? km.toFixed(0) : km.toFixed(1)} dặm`;
    ctx.font = 'bold 6px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.fillStyle = '#ffe9a8';
    const ty = Math.sin(a) > 0 ? 12 : -9;
    ctx.strokeText(txt, 0, ty); ctx.fillText(txt, 0, ty);
    ctx.restore();
  }
  // Tự làm nhiệm vụ (questauto.js): đi tới một nơi cho sẵn ({ zone, rank, gather } hoặc { point, label }), không cần id nhiệm vụ
  function go(pl) {
    goal = pl; target = aim(pl);
    if (!target) return;
    if (arrived(target)) { if (!target.point && !target.town) startQuestAuto(); return; }
    travel = true; stuckT = 0; lx = me.x; ly = me.y; fixed = true;
    if (game.isAuto()) game.setAuto(null);
  }
  const cancel = () => { travel = false; fixed = false; };
  return { start, go, cancel, update, render, active: () => travel, traveling: () => travel };
}
