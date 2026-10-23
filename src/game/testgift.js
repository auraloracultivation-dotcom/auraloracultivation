// Mã thử nghiệm "đầy đủ" (data/codes.json → grant: 'full'): nguyên liệu, đan, đan phương / công thức / bí kíp, đồ cửa hàng,
// Linh thạch, Vàng, Tiên ngọc và 1 phôi mỗi ô trang bị (để thử Thức tỉnh). Chỉ vào kho trên máy (localStorage) — bản chơi thử, chưa lưu máy chủ.
export function grantFull({ progress, wallet, gift, mats, pills, recipes, shop, blanks }) {
  let n = 0;
  const add = (id, k) => { progress.add(id, k); n++; };
  for (const m of mats.materials) add(m.id, gift.materials);
  for (const p of pills.pills) add(p.id, gift.pills);
  for (const r of recipes.items) if (progress.count(r.id) < 1) add(r.id, 1);
  for (const s of shop.stock) if (!progress.count(s.id)) add(s.id, gift.shop);
  for (const b of blanks.blanks) { progress.newGear(b.slot, b.sample_names[0]); n++; }
  progress.addStone(gift.stone);
  if (gift.gold) wallet.add('vang', gift.gold);
  progress.changed();
  return n;
}

// Mã thử "thần" (data/codes.json → grant: 'god', chủ dự án 23/10): mọi trang bị trong Kho thức tỉnh đủ `gift.lines` dòng phẩm Đen
// (giá trị cao nhất của phẩm Đen), + `gift.void_pets` thú cưng Âm Hư đi theo (các thú khác vào nghỉ). Chỉ trên máy (localStorage).
export function grantGod({ progress, bag, awaken, gp, mdef, gift }) {
  const keys = gp.awaken.line_keys, ti = awaken.tiers.findIndex((t) => t.id === 'den');
  const line = (k) => { const v = awaken.line_ranges[k][ti][1]; return { k, v: Math.round(v * 10) / 10, t: 'den', ...(['hp', 'def', 'linh'].includes(k) ? { p: 1 } : {}) }; };
  let n = 0;
  for (const { item } of bag.entries()) {
    if (!item?.slot) continue;
    progress.state.itemAw[item.id] = { tier: 'den', lines: Array.from({ length: gift.lines }, (_, i) => line(keys[i % keys.length])), spent: 0, cap: gift.lines };
    n++;
  }
  const pets = (progress.state.pets ||= []);
  for (const p of pets) p.follow = false;
  for (const d of mdef.monsters.filter((m) => m.void).slice(0, gift.void_pets)) {
    pets.push({ uid: progress.state.uid++, mid: d.id, stage: d.stages[0], atk: d.atk[1], follow: true }); n++;
  }
  progress.changed();
  return n;
}
