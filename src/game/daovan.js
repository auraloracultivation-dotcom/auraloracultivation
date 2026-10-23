// ĐẠO VẬN (chủ dự án 23/10/2026): build làm đổi cách chiêu hoạt động — bộ ngũ hành (2/4/6/8 món đồ Kho cùng hệ đang mặc)
// + Thần Phù gắn ở ô phù (cards.js). Gộp mọi hiệu ứng thành một bảng `mods` cho barrage.js (đạn, bị động) và chỉ số.
// Số liệu: data/build/dao-van.json. Bảng mods chỉ tính lại khi đồ đang mặc / ô phù đổi.
const SLOTS = ['mat-na', 'trang-phuc', 'vu-khi', 'nhan', 'canh', 'phap-tuong', 'linh-thu', 'day-chuyen'];
const OBJ_SUM = { orbit: ['n'], shock: ['r', 'stun'], burn: ['mul'] };
const TURRET_SUM = ['n', 'every_s']; // khoá cộng dồn; khoá khác lấy lớn nhất

export function createDaoVan({ def, bag, cards, progress }) {
  let sig = '', cache = null;
  const counts = () => {
    const c = {};
    for (const sl of SLOTS) { const he = bag.equippedItem(sl)?.he; if (he) c[he] = (c[he] || 0) + 1; }
    for (const g of progress.equipped()) if (g.he && g.tier) c[g.he] = (c[g.he] || 0) + 1; // phôi luyện đã thức tỉnh mang hệ
    return c;
  };
  function add(m, k, v, he, src = he) {
    if (k.startsWith('_')) return;
    if (k === 'rain') { m.rains.push({ ...v, he }); return; }
    if (k === 'turret') { add(m.turretBy, src, v, he); return; } // mỗi nguồn (hệ / phù) một khẩu liên thanh riêng
    if (k === 'stat') { for (const [s, x] of Object.entries(v)) m.stat[s] = s === 'hut' || s === 'crit' || s === 'phan' ? (m.stat[s] || 0) + x : (m.stat[s] || 1) * x; return; }
    if (k === 'cd_mul' || k === 'mp_mul') { m[k] = (m[k] ?? 1) * v; return; } // nhân dồn
    if (typeof v === 'number') { m[k] = (m[k] || 0) + v; return; }
    const o = (m[k] ||= {});
    const sum = m.turretBy ? OBJ_SUM[k] || [] : TURRET_SUM; // m không có turretBy = đang gộp vào bảng liên thanh
    for (const [kk, x] of Object.entries(v)) o[kk] = sum.includes(kk) ? (o[kk] || 0) + x : Math.max(o[kk] ?? -Infinity, x);
    if (!o.he) o.he = he;
  }
  function compute() {
    const c = counts(), m = { rains: [], stat: {}, sets: [], turretBy: {} };
    for (const [he, n] of Object.entries(c)) {
      const h = def.he[he]; if (!h) continue;
      const on = Object.keys(h.tiers).map(Number).filter((t) => n >= t).sort((a, b) => a - b);
      if (on.length) m.sets.push({ he, name: h.name, n, tiers: on.map((t) => ({ t, text: h.tiers[t]._mo_ta })), color: h.color });
      for (const t of on) for (const [k, v] of Object.entries(h.tiers[t])) add(m, k, v, he);
    }
    for (const card of cards.equippedDefs()) {
      const v = cards.value(card);
      add(m, card.def.mod, card.def.obj ? { ...card.def.obj, [card.def.key]: v } : v, null, `phu:${card.uid}`);
    }
    m.turrets = Object.values(m.turretBy).map((t) => ({ ...t, every_s: Math.max(def.limits.turret_min_s, t.every_s || 1) })); // liên thanh nhanh nhất 0,6 giây/loạt (không nghỉ chỉ ở Hợp Nhất)
    // hệ chủ đạo (nhiều món nhất): hình + màu đạn đạo pháp (đánh thường bắn thêm, liên thanh)
    const top = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
    m.he = top && def.he[top[0]] ? top[0] : 'Kim';
    m.bolt = def.he[m.he].bolt; m.color = def.he[m.he].color;
    return m;
  }
  // Bảng hiệu ứng hiện tại (tính lại khi đồ / phù đổi)
  function mods() {
    const s = SLOTS.map((sl) => bag.equippedItem(sl)?.id || '').join('|') + '#' + progress.equipped().map((g) => g.uid).join(',') + '#' + cards.signature();
    if (s !== sig || !cache) { sig = s; cache = compute(); }
    return cache;
  }
  const heOf = (he) => def.he[he] || def.he.Kim;
  // Hạ quái: rơi đồ Kho 6 hệ (chưa có thì vào Kho, có rồi đổi Linh thạch)
  function onKill(m, toast) {
    const D = def.set_drop, ch = m.void ? D.void : D[m.def.rank] || 0;
    if (Math.random() >= ch) return;
    // Thiên hệ (6 hệ mới, chủ dự án 23/10 21h) chỉ rơi từ nguồn trong thien_from (Âm Hư); còn lại chỉ rơi đồ ngũ hành
    const thien = (D.thien_from || []).includes(m.void ? 'void' : m.def.rank);
    let miss = bag.missing((d) => d.he && d.slot && !!d.thien === thien);
    if (!miss.length && thien) miss = bag.missing((d) => d.he && d.slot);
    if (!miss.length) { progress.addStone(D.dup_stone); toast(`Đồ ${thien ? 'Thiên hệ' : 'ngũ hành'} rơi ra nhưng đã đủ bộ: +${D.dup_stone} Linh thạch`, 2000); return; }
    const id = miss[Math.floor(Math.random() * miss.length)]; bag.give(id);
    toast('Nhặt được đồ ngũ hành! Xem Kho → Trang bị', 2600);
  }
  return { mods, heOf, counts, onKill, limits: def.limits, fx: def.fx };
}
