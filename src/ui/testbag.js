// Kho THỬ NGHIỆM (Mốc 4 sẽ chuyển lên máy chủ): danh sách mã vật phẩm + đồ đang mặc, lưu localStorage theo tài khoản.
const LOOK_OF = { 'trang-phuc': 'outfit', 'vu-khi': 'weapon', canh: 'wing' }; // ô Pháp tướng KHÔNG tự hiện: phải bấm kỹ năng (lookNow trong src/main.js)
export function createTestBag(userId, defs) {
  const key = `tc.bag.${userId}`;
  const byId = new Map(defs.map((d) => [d.id, d]));
  let st = { items: [], equipped: {} };
  try { st = { ...st, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch { /* hỏng thì bỏ */ }
  st.items = st.items.filter((id) => byId.has(id));
  for (const [sl, id] of Object.entries(st.equipped)) if (!byId.has(id)) delete st.equipped[sl];
  const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch { /* chặn lưu: bỏ qua */ } };
  return {
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
    unequip(slot) { if (st.equipped[slot]) { delete st.equipped[slot]; save(); } },
    grantAll() {
      const before = st.items.length;
      for (const d of defs) if (!st.items.includes(d.id)) st.items.push(d.id);
      save();
      return st.items.length - before || st.items.length;
    },
    look() {
      const l = {};
      for (const [sl, k] of Object.entries(LOOK_OF)) { const it = byId.get(st.equipped[sl]); if (it) l[k] = it.art; }
      return Object.keys(l).length ? l : null;
    },
  };
}
