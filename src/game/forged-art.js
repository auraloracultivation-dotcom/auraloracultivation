// Đồ luyện từ phôi: khi luyện xong gắn NGẪU NHIÊN 1 hình cùng loại — người chơi chỉ thấy phôi trắng, phải Thức tỉnh
// mới lộ hình (inventory.js). "Nhân phẩm": mở ra hệ nào thì mang hình của bộ hệ đó.
// Chủ dự án 23/10/2026: chỉ dùng hình 6 bộ ngũ hành tự thiết kế (8 món mỗi hệ) — kho hình tạm cũ (giống đồ NPC) đã xoá.
//   Đạo bào / kiếm / cánh / pháp tướng: art.<loại>.he.1–6 (data/equipment/he6.json, vẽ bằng rig)
//   Mặt nạ / nhẫn / dây chuyền / linh thú: data/equipment/art.json (linh thú 12 hình: he.N và he.N+6 cùng hệ)
const LOOK_KEY = { 'trang-phuc': 'outfit', 'vu-khi': 'weapon', canh: 'wing', 'phap-tuong': 'avatar', 'mat-na': 'mask' };
const RIG = { 'trang-phuc': 'outfit', 'vu-khi': 'weapon', canh: 'wing', 'phap-tuong': 'avatar' };

export function createForgedArt(artIdx, progress, heOrder = ['Kim', 'Ám', 'Thủy', 'Hỏa', 'Mộc', 'Thổ']) {
  const heOfArt = (id) => { const n = id?.match(/\.he\.(\d+)$/)?.[1]; return n ? heOrder[(+n - 1) % 6] : null; };
  const pool = (slot) => (RIG[slot] ? [1, 2, 3, 4, 5, 6].map((n) => ({ id: `art.${RIG[slot]}.he.${n}` }))
    : (artIdx[slot] || []).filter((a) => { const n = +a.id.match(/\.he\.(\d+)$/)?.[1]; return n && n <= (slot === 'linh-thu' ? 12 : 6); })); // phôi chỉ ra hình ngũ hành (Thiên hệ chỉ rơi từ Âm Hư)
  function ensureArt(g) {
    const p = pool(g.slot);
    if (g.art && !p.some((x) => x.id === g.art)) g.art = null; // hình tạm cũ đã xoá → bốc lại theo hệ của phôi
    if (!g.art && p.length) {
      const same = g.he ? p.filter((x) => heOfArt(x.id) === g.he) : [];
      const from = same.length ? same : p;
      g.art = from[Math.floor(Math.random() * from.length)].id; progress.changed();
    }
    const he = heOfArt(g.art);
    if (he && g.he !== he) { g.he = he; progress.changed(); } // hệ của phôi = hệ của hình (tính vào bộ Đạo Vận)
    if (!g.he) { g.he = heOrder[Math.floor(Math.random() * 6)]; progress.changed(); }
    return g;
  }
  const artFile = (id) => { for (const l of Object.values(artIdx)) { const a = l.find((x) => x.id === id); if (a) return a.file; } return null; };
  // Hình đồ phôi đang mặc (main.js gộp với đồ Kho). avatar chỉ hiện khi bật kỹ năng Pháp tướng
  function forgedLook() {
    const l = {};
    for (const g of progress.equipped()) { ensureArt(g); if (g.art && LOOK_KEY[g.slot]) l[LOOK_KEY[g.slot]] = g.art; }
    return l;
  }
  return { ensureArt, forgedLook, artFile, poolSize: (slot) => pool(slot).length };
}
