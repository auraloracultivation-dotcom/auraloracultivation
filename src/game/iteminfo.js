// Thông tin một vật phẩm cho người chơi: tác dụng + nơi có (dùng ở Kho và Vạn Bảo Lâu). Chỉ dựng chữ từ data/.
const ZONE = { xanh: 'Vùng Xanh (đồng cỏ quanh thành)', cam: 'Vùng Cam (cát vàng, đá lát cổ)', xam: 'Vùng Xám Khói (sỏi đá)',
  trang: 'Vùng Trắng (băng tuyết)', than: 'Vùng Xám Than (hắc thổ, dung nham)', den: 'Vùng Đen (hắc thạch)', tim: 'Vùng Tím (tử vực)',
  huvo: 'Âm Hư từ hư vô' };
const RANK = { thuong: 'quái thường', elite: 'tinh anh', boss: 'boss' };

const SLOT = { 'mat-na': 'Mặt nạ', 'trang-phuc': 'Trang phục', 'vu-khi': 'Vũ khí', nhan: 'Nhẫn', canh: 'Cánh', 'linh-thu': 'Thú hồn', 'day-chuyen': 'Dây chuyền', 'phap-tuong': 'Pháp tướng' };
const BUFF = { linh: 'Tấn công', def: 'Phòng thủ', pt_drain: 'Tiêu hao Pháp tướng' };

export function createItemInfo({ monsters, shop, pills, blanks, realms, gp, cpText }) {
  const blankById = new Map(blanks.blanks.map((b) => [b.id, b]));
  const btOf = new Map(realms.realms.filter((r) => r.breakthrough).map((r) => [r.breakthrough.pill, r]));
  // Công dụng của một viên đan (từ data/gameplay.json → pills, realms.json → đột phá)
  function pillUse(p) {
    const r = btOf.get(p.id);
    if (r) return `Đột phá lên ${r.name} khi tu vi đã đến đỉnh — thành bại tùy vận khí`;
    const e = gp.pills[p.id] || {};
    if (e.life_add) return `Thọ nguyên tối đa +${e.life_add} năm — mỗi ngày chỉ dùng 1 viên`;
    if (e.heal_hp) return `Hồi ${Math.round(e.heal_hp * 100)}% khí huyết`;
    if (e.heal_mp) return `Hồi ${Math.round(e.heal_mp * 100)}% linh lực`;
    if (e.buff === 'pt_drain') return `Pháp tướng tiêu hao linh lực giảm ${Math.round((1 - e.mul) * 100)}% trong ${e.s} giây`;
    if (e.buff) return `${BUFF[e.buff] || e.buff} +${Math.round((e.mul - 1) * 100)}% trong ${e.s} giây`;
    return p.when;
  }
  const sold = new Set(shop.stock.map((s) => s.id));
  const pillById = new Map(pills.pills.map((p) => [p.id, p]));
  const monName = new Map(monsters.map((m) => [m.id, m.name]));
  const effect = (d) => {
    if (d.use) return d.use;
    if (d.teaches) { // đan phương / công thức / bí kíp: nói thứ nó dạy làm được gì
      const p = pillById.get(d.teaches);
      if (p) return `Luyện ${p.name}: ${pillUse(p)}`;
      const b = blankById.get(d.teaches);
      if (b) return `Luyện phôi ${SLOT[b.slot]} — thức tỉnh để có chỉ số`;
      return cpText(d.teaches) || '';
    }
    const p = pillById.get(d.id);
    if (p) return pillUse(p);
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
  return { effect, source, cpText, text: (d) => [effect(d), source(d) && `Nơi có: ${source(d)}`].filter(Boolean).join('\n') };
}
