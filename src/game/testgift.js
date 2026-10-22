// Mã thử nghiệm "đầy đủ" (data/codes.json → grant: 'full'): nguyên liệu, đan, đan phương / công thức / bí kíp, đồ cửa hàng,
// Linh thạch và 1 phôi mỗi ô trang bị (để thử Thức tỉnh). Chỉ vào kho trên máy (localStorage) — bản chơi thử, chưa lưu máy chủ.
export function grantFull({ progress, gift, mats, pills, recipes, shop, blanks }) {
  let n = 0;
  const add = (id, k) => { progress.add(id, k); n++; };
  for (const m of mats.materials) add(m.id, gift.materials);
  for (const p of pills.pills) add(p.id, gift.pills);
  for (const r of recipes.items) if (progress.count(r.id) < 1) add(r.id, 1);
  for (const s of shop.stock) if (!progress.count(s.id)) add(s.id, gift.shop);
  for (const b of blanks.blanks) { progress.newGear(b.slot, b.sample_names[0]); n++; }
  progress.addStone(gift.stone);
  progress.changed();
  return n;
}
