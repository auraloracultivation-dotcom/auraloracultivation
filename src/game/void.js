// 5 Âm Hư từ hư vô (THỬ NGHIỆM phía máy khách). Lịch tính từ GIỜ MÁY CHỦ nên mọi máy thấy cùng một con,
// cùng chỗ, cùng lúc — không tốn tin nhắn mạng. Mỗi con: xuất hiện mỗi cycle_s giây (lệch nhau cycle_s/5), sống life_s giây rồi tan.
// Chỗ xuất hiện: bốc ngẫu nhiên CỐ ĐỊNH theo (seed, con, lượt) ở bất kỳ đâu đứng được, ngoài vùng quanh thành.
// Giới hạn hiện tại: máu Âm Hư chưa chung giữa người chơi (mỗi máy đánh con của mình) — Mốc 3 chuyển lên máy chủ.
import { wrapDelta } from '../map/index.js';
import { sound } from '../audio/index.js';

// PRNG cố định theo số hạt giống (mọi máy ra cùng dãy số)
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const DIRS = ['Đông', 'Đông Nam', 'Nam', 'Tây Nam', 'Tây', 'Tây Bắc', 'Bắc', 'Đông Bắc'];

export function createVoid({ mdef, mobs, map, progress, toast, me, serverNow = () => Date.now() }) {
  const V = mdef.void, defs = mdef.monsters.filter((d) => d.void);
  const killed = new Set(progress.state.voidKills || []);
  const cx = map.width / 2, cy = map.height / 2;
  const places = new Map(); // key → {x, y}
  let timer = 0;
  const announced = new Set();

  // Chỗ xuất hiện của con thứ k ở lượt `slot`
  function placeOf(k, slot) {
    const key = `${k}:${slot}`;
    if (places.has(key)) return places.get(key);
    const r = rng(V.seed ^ (k * 7919) ^ (slot * 104729));
    let p = null;
    for (let i = 0; i < 60 && !p; i++) {
      const x = r() * map.width, y = r() * map.height;
      const far = Math.hypot(wrapDelta(x - cx, map.width), wrapDelta(y - cy, map.height)) > V.avoid_town_px;
      if (far && !map.safeAt(x, y) && map.canStand(x, y, V.radius_px * 0.6) && map.typeAt(x, y).walk) p = { x, y };
    }
    p ||= { x: map.wrapX(cx + V.avoid_town_px * 1.2), y: cy };
    places.set(key, p);
    return p;
  }

  // Các con đang xuất hiện lúc này (giờ máy chủ)
  function active() {
    const t = serverNow() / 1000, out = [];
    defs.forEach((def, k) => {
      const off = (k * V.cycle_s) / defs.length;
      const slot = Math.floor((t - off) / V.cycle_s), start = slot * V.cycle_s + off, left = V.life_s - (t - start);
      if (left > 0) out.push({ def, k, slot, key: `${def.id}@${slot}`, left, ...placeOf(k, slot) });
    });
    return out;
  }

  function dirText(x, y) {
    const dx = wrapDelta(x - me.x, map.width), dy = wrapDelta(y - me.y, map.height);
    const a = Math.round(((Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
    return `hướng ${DIRS[a]}, cách ${Math.round(Math.hypot(dx, dy) / 32)} trượng`;
  }

  function update(dt) {
    for (const m of mobs.list) { // vừa trảm một Âm Hư: ghi lại để tải lại trang không sinh lại con đó
      if (m.void && m.state === 'dead' && !killed.has(m.voidKey)) {
        killed.add(m.voidKey);
        progress.state.voidKills = [...killed].slice(-30);
        progress.state.voidKillCount = (progress.state.voidKillCount || 0) + 1; // tổng số Âm Hư đã trảm (bảng xếp hạng)
        progress.changed();
        toast(`Đã trảm ${m.def.name}! Âm Hư tan về hư vô`, 3000);
      }
    }
    timer -= dt;
    if (timer > 0) return;
    timer = 1;
    const now = active(), keys = new Set(now.map((a) => a.key));
    for (const m of [...mobs.list]) if (m.void && !keys.has(m.voidKey) && m.state !== 'dead') {
      mobs.removeVoid(m.voidKey);
      if (Math.hypot(wrapDelta(m.x - me.x, map.width), wrapDelta(m.y - me.y, map.height)) < 900) toast(`${m.def.name} đã tan biến vào hư vô`, 2400);
    }
    for (const a of now) {
      if (killed.has(a.key)) continue;
      mobs.addVoid(a.def, a.x, a.y, Date.now() + a.left * 1000, a.key, V);
      if (!announced.has(a.key)) {
        announced.add(a.key);
        sound('sfx.am-hu'); toast(`⚠ Âm Hư xuất thế: ${a.def.name} — ${dirText(a.x, a.y)} · còn ${Math.ceil(a.left / 60)} phút`, 4200);
      }
    }
  }

  // Dấu tím trên bản đồ nhỏ / bản đồ thế giới
  const markers = () => mobs.list.filter((m) => m.void && m.state !== 'dead').map((m) => ({ x: m.x, y: m.y, color: '#c77dff', big: true }));
  return { update, markers, active };
}
