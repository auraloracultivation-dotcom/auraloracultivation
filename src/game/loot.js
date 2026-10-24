// Đồ rơi khi hạ quái (data/gameplay.json → loot; vật phẩm nhiệm vụ; đan phương / bí kíp hiếm từ boss).
// Chỉ quyết định rơi gì; gameplay cộng vào kho. Trả về [{ id, n, label }].
const rint = (a, b) => Math.round(a + Math.random() * (b - a));

export function createLoot({ gp, mats, qItems, recipes, progress }) {
  return function roll(m) {
    const rank = m.def.rank, out = [];
    const zoneMats = mats.materials.filter((x) => x.zone === m.def.zone);
    for (const [grp, key] of [['thao', 'herb'], ['khoang', 'ore'], ['dacbiet', 'special']]) {
      const [p, a, b] = gp.loot[rank][key];
      const pool = zoneMats.filter((x) => x.group === grp);
      if (!pool.length || Math.random() > p) continue;
      const it = pool[Math.floor(Math.random() * pool.length)], n = rint(a, b);
      out.push({ id: it.id, n, label: `${it.name} ×${n}` });
    }
    for (const q of qItems.items) {
      const d = q.drop; if (!d) continue; // Mảnh Truyền Thừa: chỉ từ phó bản
      const match = d.from ? d.from === m.def.id : d.from_rank === rank;
      if (match && (!d.only_when_quest || progress.state.quests.active[d.only_when_quest]) && Math.random() < d.chance) out.push({ id: q.id, n: 1, label: q.name });
    }
    for (const r of recipes.items) { // chỉ khi chưa có
      const d = r.drop;
      if (d && d.zone === m.def.zone && d.rank === rank && progress.count(r.id) === 0 && Math.random() < d.chance) out.push({ id: r.id, n: 1, label: r.name });
    }
    return out;
  };
}
