// Đồ luyện từ phôi chưa có hình riêng → gắn tạm 1 hình cùng loại trong kho hình (data/equipment/art.json, bỏ hình 6 hệ)
// để mặc lên người được (kiếm hiện trên lưng, ngự kiếm được). Chủ dự án có hình riêng cho phôi thì thay ở đây.
const LOOK_KEY = { 'trang-phuc': 'outfit', 'vu-khi': 'weapon', canh: 'wing', 'phap-tuong': 'avatar' };

export function createForgedArt(artIdx, progress) {
  function ensureArt(g) {
    const pool = (artIdx[g.slot] || []).filter((a) => !/\.he\./.test(a.id));
    if (!g.art && LOOK_KEY[g.slot] && pool.length) { g.art = pool[(g.uid * 7919) % pool.length].id; progress.changed(); }
    return g;
  }
  // Hình đồ phôi đang mặc (main.js gộp với đồ Kho). avatar chỉ hiện khi bật kỹ năng Pháp tướng
  function forgedLook() {
    const l = {};
    for (const g of progress.equipped()) { ensureArt(g); if (g.art && LOOK_KEY[g.slot]) l[LOOK_KEY[g.slot]] = g.art; }
    return l;
  }
  return { ensureArt, forgedLook };
}
