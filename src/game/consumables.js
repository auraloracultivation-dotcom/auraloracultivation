// Vật phẩm dùng được trong Kho (data/items/misc.json + phôi pháp bảo): mở túi / rương ra tiền, vẽ Thần Phù từ Phù Chỉ Trống,
// Huyết Sát Lệnh (+1 lượt Bí Cảnh), luyện hóa phôi pháp bảo; Ngũ Hành Linh Thạch đổi hệ phôi luyện đã thức tỉnh.
// THỬ NGHIỆM phía máy khách — Mốc 4 lên máy chủ.
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

// c: { itemDefs, progress, wallet, cards, cardDef, treasure, biCanh, heOrder, play, me, recompute }
export function createConsumables(c) {
  const { itemDefs, progress, wallet } = c;
  function open(id) {
    const d = itemDefs.get(id);
    if (!d?.opens) return null;
    if (d.opens === 'phap-bao') return c.treasure.openBlank(id);
    if (!progress.take(id, 1)) return `Hết ${d.name}`;
    let msg = '';
    if (d.opens === 'gold' || d.opens === 'stone') { // Tiên ngọc KHÔNG bao giờ mở ra từ vật phẩm (chỉ có khi nạp)
      const n = rint(...d.amount), k = { gold: 'vang', stone: 'linh-thach' }[d.opens];
      wallet.add(k, n); msg = `Mở ${d.name}: +${n.toLocaleString('vi-VN')} ${wallet.name(k)}`;
    } else if (d.opens === 'card') {
      const C = c.cardDef, w = C.tier_weights, sum = w.reduce((a, b) => a + b, 0);
      let r = Math.random() * sum, t = 0;
      while ((r -= w[t]) > 0) t++;
      const cd = C.list[Math.floor(Math.random() * C.list.length)];
      c.cards.grant(cd.id, t); msg = `Vẽ thành Thần Phù: ${cd.name} (phẩm ${t + 1}/7) — Kho → Thần Phù`;
    } else if (d.opens === 'bicanh') { c.biCanh.addTry(); msg = 'Thêm 1 lượt Huyết Sát Bí Cảnh hôm nay'; }
    c.play('vong-lua', c.me.x, c.me.y - 8, 34);
    progress.changed();
    return msg;
  }
  // Ngũ Hành Linh Thạch: đổi phôi luyện đã thức tỉnh sang một hệ khác (ngẫu nhiên)
  const STONE = 'item.khoang.ngu-hanh.001';
  function rerollHe(uid) {
    const g = progress.gear(uid);
    if (!g?.tier) return 'Phôi phải thức tỉnh trước';
    if (!progress.take(STONE, 1)) return `Cần ${itemDefs.get(STONE).name} (Vạn Bảo Lâu → Tiên Bảo)`;
    const others = c.heOrder.slice(0, 6).filter((h) => h !== g.he); // chỉ đổi trong ngũ hành
    g.he = others[Math.floor(Math.random() * others.length)];
    c.recompute(); progress.changed();
    return `${g.name} đổi sang hệ ${g.he}`;
  }
  // Thao tác thêm cho phôi luyện trong Kho
  const gearAction = (g) => (g.tier ? { id: 'doi-he', label: `Đổi hệ ngũ hành (có ${progress.count(STONE)} Ngũ Hành Linh Thạch)`, disabled: !progress.count(STONE) } : null);
  return { open, rerollHe, gearAction };
}
