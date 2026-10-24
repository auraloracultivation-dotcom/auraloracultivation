// TRUYỀN THỪA (chủ dự án 24/10/2026): phó bản mỗi ngày 2 lượt (data/build/bi-canh.json → extra "truyen-thua-nh"),
// vượt hết 10 đợt nhận 1 Mảnh Truyền Thừa. Đủ mảnh: Kho → chạm mảnh → "Ghép bộ Đạo Vận" → chọn hệ → nhận trọn bộ
// 8 pháp khí + kỹ năng sịn + kỹ năng cùi + Thần Phù + pháp bảo của hệ đó (chưa thức tỉnh — vẫn phải cày thức tỉnh).
// Ghép tốn Vàng (chỗ tiêu Vàng cho người chơi cuối game). Số ở items → item.nhiemvu.manh-truyen-thua.001 → combine.
const SET = ['vu-khi', 'trang-phuc', 'mat-na', 'nhan', 'canh', 'linh-thu', 'day-chuyen', 'phap-tuong'].map((s) => `gear:${s}`).concat(['skill:sin', 'skill:cui', 'card', 'pb']);

// c: { itemDefs, progress, wallet, daotam, chooseHe(o), toast, recompute }
export function createTruyenThua(c) {
  const { progress, wallet, toast } = c;
  const fragOf = (id) => c.itemDefs.get(id)?.combine;
  // Nút trong Kho: { label, disabled } hoặc null nếu món không ghép được
  function action(id) {
    const k = fragOf(id); if (!k) return null;
    const have = progress.count(id), gold = wallet.get('vang');
    return { id: 'combine', label: `Ghép bộ Đạo Vận (${have}/${k.count} mảnh · ${k.gold.toLocaleString('vi')} Vàng)`, disabled: have < k.count || gold < k.gold };
  }
  function combine(id) {
    const k = fragOf(id); if (!k) return null;
    if (progress.count(id) < k.count) return `Cần ${k.count} mảnh (đang có ${progress.count(id)})`;
    if (wallet.get('vang') < k.gold) return `Cần ${k.gold.toLocaleString('vi')} Vàng`;
    c.chooseHe({ list: c.daotam.heList(), onPick: (he) => {
      if (!he || progress.count(id) < k.count || wallet.get('vang') < k.gold) return;
      progress.take(id, k.count); wallet.add('vang', -k.gold);
      const res = SET.map((g) => c.daotam.giveFor(he, g)), got = res.filter(Boolean), dup = res.length - got.length;
      if (dup) progress.addStone(dup * k.dup_stone); // món đã có sẵn: đổi Linh thạch, không mất công
      progress.changed(); c.recompute();
      toast(`Truyền Thừa hệ ${he}: nhận ${got.length} món${dup ? ` · ${dup} món đã có đổi ${(dup * k.dup_stone).toLocaleString('vi')} Linh thạch` : ''}`, 4500);
    } });
    return '';
  }
  return { action, combine };
}
