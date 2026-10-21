// Thông tin một vật phẩm cho người chơi: tác dụng + nơi có (dùng ở Kho và Vạn Bảo Lâu). Chỉ dựng chữ từ data/.
const ZONE = { xanh: 'Vùng Xanh (đồng cỏ quanh thành)', cam: 'Vùng Cam (cát vàng, đá lát cổ)', trang: 'Vùng Trắng (băng tuyết)',
  xam: 'Vùng Xám (sỏi đá)', than: 'Vùng Than (hắc thổ, dung nham)' };
const RANK = { thuong: 'quái thường', elite: 'tinh anh', boss: 'boss' };

export function createItemInfo({ monsters, shop, pills }) {
  const sold = new Set(shop.stock.map((s) => s.id));
  const pillById = new Map(pills.pills.map((p) => [p.id, p]));
  const monName = new Map(monsters.map((m) => [m.id, m.name]));
  const effect = (d) => {
    if (d.use) return d.use;
    if (d.teaches) return 'Giữ trong kho để luyện / tu luyện (không mất khi dùng)';
    const p = pillById.get(d.id);
    if (p) return `Đan dược · dùng lúc: ${p.when}`;
    return '';
  };
  function source(d) {
    const where = [];
    if (d.group === 'thao') where.push(`Mọc trong rừng / đồng cỏ ${ZONE[d.zone] || ''}; rơi từ quái vùng này`);
    else if (d.group === 'khoang') where.push(`Mỏ khoáng ở bãi đá ${ZONE[d.zone] || ''}; rơi từ quái vùng này`);
    else if (d.group === 'dacbiet') where.push(`Rơi từ tinh anh / boss ${ZONE[d.zone] || ''} (thường rất hiếm)`);
    if (pillById.has(d.id)) where.push('Luyện ở Lò luyện đan (Tu luyện → Luyện đan), cần Đan phương');
    if (d.drop?.from) where.push(`Rơi từ ${monName.get(d.drop.from) || 'quái'}${d.drop.only_when_quest ? ' khi đang làm nhiệm vụ' : ''}`);
    if (d.drop?.zone) where.push(`Rơi từ ${RANK[d.drop.rank] || ''} ${ZONE[d.drop.zone] || ''}`);
    else if (d.drop?.from_rank) where.push(`Rơi từ ${RANK[d.drop.from_rank]} bất kỳ`);
    if (sold.has(d.id)) where.push('Bán ở Vạn Bảo Lâu (Thanh Vân Thành)');
    return where.join(' · ');
  }
  return { effect, source, text: (d) => [effect(d), source(d) && `Nơi có: ${source(d)}`].filter(Boolean).join('\n') };
}
