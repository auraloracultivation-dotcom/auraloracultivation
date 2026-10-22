// Đồ luyện từ phôi: khi luyện xong gắn NGẪU NHIÊN 1 hình cùng loại trong kho hình (data/equipment/art.json) — người chơi
// chỉ thấy phôi trắng, phải Thức tỉnh mới lộ hình (inventory.js). Vũ khí / cánh / pháp tướng bỏ hình 6 hệ (thuộc bộ);
// mặt nạ, nhẫn, dây chuyền, linh thú lấy cả hình 6 hệ bản 2 (tools/equip_6he.py, chủ dự án 23/10).
const LOOK_KEY = { 'trang-phuc': 'outfit', 'vu-khi': 'weapon', canh: 'wing', 'phap-tuong': 'avatar', 'mat-na': 'mask' };
const WITH_HE = new Set(['mat-na', 'nhan', 'day-chuyen', 'linh-thu']);

export function createForgedArt(artIdx, progress) {
  const pool = (slot) => (artIdx[slot] || []).filter((a) => WITH_HE.has(slot) || !/\.he\./.test(a.id));
  function ensureArt(g) {
    const p = pool(g.slot);
    if (!g.art && p.length) { g.art = p[Math.floor(Math.random() * p.length)].id; progress.changed(); }
    return g;
  }
  const artFile = (id) => { for (const l of Object.values(artIdx)) { const a = l.find((x) => x.id === id); if (a) return a.file; } return null; };
  // Hình đồ phôi đang mặc (main.js gộp với đồ Kho). avatar chỉ hiện khi bật kỹ năng Pháp tướng
  function forgedLook() {
    const l = {};
    for (const g of progress.equipped()) { ensureArt(g); if (g.art && LOOK_KEY[g.slot]) l[LOOK_KEY[g.slot]] = g.art; }
    return l;
  }
  return { ensureArt, forgedLook, artFile };
}
