// Kho THỬ NGHIỆM (Mốc 4 sẽ chuyển lên máy chủ): danh sách mã vật phẩm + đồ đang mặc, lưu localStorage theo tài khoản.
const LOOK_OF = { 'trang-phuc': 'outfit', 'vu-khi': 'weapon', canh: 'wing', 'mat-na': 'mask' }; // ô Pháp tướng KHÔNG tự hiện: phải bấm kỹ năng (lookNow trong src/main.js)
export function createTestBag(userId, defs) {
  const key = `tc.bag.${userId}`;
  const byId = new Map(defs.map((d) => [d.id, d]));
  let st = { items: [], equipped: {} };
  try { st = { ...st, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { /* hỏng thì bỏ */ }
  st.items = st.items.filter((id) => byId.has(id));
  for (const [sl, id] of Object.entries(st.equipped)) if (!byId.has(id)) delete st.equipped[sl];
  // Tân thủ: lần đầu vào game nhận ngẫu nhiên 1 trong 6 bộ hệ (đạo bào + pháp kiếm) và mặc sẵn
  if (!st.starter) {
    const he = 1 + Math.floor(Math.random() * 6);
    for (const kind of ['outfit', 'weapon']) {
      const id = `item.${kind}.he.${he}`, it = byId.get(id);
      if (!it) continue;
      if (!st.items.includes(id)) st.items.push(id);
      if (!st.equipped[it.slot]) st.equipped[it.slot] = id;
    }
    st.starter = he;
    st.justGot = he;
  }
  const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch { /* chặn lưu: bỏ qua */ } };
  save();
  return {
    starterGift() { const he = st.justGot; if (he) { delete st.justGot; save(); } return he ? byId.get(`item.outfit.he.${he}`) : null; },
    entries: () => st.items.map((id) => ({ item: byId.get(id), count: 1 })),
    isEquipped: (it) => st.equipped[it.slot] === it.id,
    equippedItem: (slot) => byId.get(st.equipped[slot]),
    toggle(it) {
      if (!it.slot || !st.items.includes(it.id)) return;
      if (st.equipped[it.slot] === it.id) delete st.equipped[it.slot]; else st.equipped[it.slot] = it.id;
      save();
    },
    // Vứt / phân rã: bỏ khỏi kho (đang mặc thì tháo trước)
    remove(id) {
      for (const [sl, x] of Object.entries(st.equipped)) if (x === id) delete st.equipped[sl];
      st.items = st.items.filter((x) => x !== id); save();
    },
    wipe() { st = { items: [], equipped: {} }; try { localStorage.removeItem(key); } catch { /* bỏ qua */ } }, // tọa hóa: xoá Kho (tải lại sẽ nhận quà tân thủ mới)
    unequip(slot) { if (st.equipped[slot]) { delete st.equipped[slot]; save(); } },
    // Nhận 1 món (rơi từ quái): false nếu đã có
    give(id) { if (!byId.has(id) || st.items.includes(id)) return false; st.items.push(id); save(); return true; },
    missing: (filter) => defs.filter((d) => !st.items.includes(d.id) && filter(d)).map((d) => d.id),
    grantAll(pick = () => true) { // pick(d): chỉ tặng món thoả điều kiện (mã 'thien': 48 món Thiên hệ)
      const before = st.items.length;
      for (const d of defs) if (pick(d) && !st.items.includes(d.id)) st.items.push(d.id);
      save();
      return st.items.length - before; // số món MỚI (không có thì 0)
    },
    look() {
      const l = {};
      for (const [sl, k] of Object.entries(LOOK_OF)) { const it = byId.get(st.equipped[sl]); if (it) l[k] = it.art; }
      return Object.keys(l).length ? l : null;
    },
  };
}
