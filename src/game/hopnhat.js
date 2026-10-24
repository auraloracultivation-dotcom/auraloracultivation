// THIÊN CƠ HỢP NHẤT (chủ dự án 23/10/2026): bắn liên thanh không nghỉ, hồi chiêu tối đa, linh lực hồi liên tục
// CHỈ có khi đủ cùng lúc (theo một hệ): 8 món pháp khí cùng hệ (đồ rơi hay phôi luyện đã thức tỉnh đều tính — chủ dự án 23/10 22h50)
// + 1 pháp bảo cùng hệ đang đeo + 1 Thần Phù chỉ định + 1 kỹ năng "sịn" + 1 kỹ năng "cùi" chỉ định trong ô kỹ năng.
// Khi kích: chỉ PHÁP BẢO được buff — tự phóng liên tục, không tốn linh lực; kỹ năng khác không được buff gì.
// Công thức từng hệ: data/build/dao-van.json → hop_nhat. THỬ NGHIỆM phía máy khách.
const SLOTS = ['mat-na', 'trang-phuc', 'vu-khi', 'nhan', 'canh', 'phap-tuong', 'linh-thu', 'day-chuyen'];

// c: { def (hop_nhat), bag, treasure, cards, loadout, S, learned(id), cardName(id), target(r), pt, ps(), dead(), toast }
export function createHopNhat(c) {
  const { def, bag } = c;
  let fireT = 0, wasOn = null;

  // Cách lấy từng thứ (chạm dấu ! ở Cẩm nang). Số rơi lấy thẳng từ dữ liệu (c.src) nên đổi tỷ lệ là chữ tự đổi theo.
  // Không ghi tỷ lệ rơi (chủ dự án 23/10 17h: ẩn mọi tỷ lệ để người chơi tự khám phá) — chỉ nói nguồn nào có thể rơi.
  const src = (d, k = ['boss', 'elite', 'void']) => k.filter((x) => d[x]).map((x) => ({ thuong: 'quái thường', elite: 'tinh anh', boss: 'thủ lĩnh', void: 'Âm Hư' })[x]).join(', ') || 'quái';
  const howSet = (he) => { const d = c.src?.set || {}, th = def.he?.[he]?.twin; return `${th ? 'Đồ Thiên hệ' : 'Đồ ngũ hành hệ'} ${he} có thể rơi khi hạ ${th ? `${src(d, d.thien_from || ['void'])}, hoặc qua hết Cửu Thiên Bí Cảnh (Nhiệm vụ → Bí Cảnh, mỗi ngày 1 lượt)` : src(d)} (mỗi lần ra 1 món còn thiếu). Mặc ở Kho → Pháp khí; xem món còn thiếu ở mục "Pháp khí cần mặc" bên dưới. Phôi luyện đã thức tỉnh đúng hệ cũng tính.`; };
  const howPb = (he) => { const P = c.src?.pb, names = (P?.list || []).filter((t) => t.he === he).map((t) => t.name).join(', '), d = P?.drop || {};
    if ((P?.list || []).some((t) => t.he === he && t.thien)) return `Pháp bảo hệ ${he}: ${names}. Chỉ có từ Thiên Cơ Truyền Thừa (Nhiệm vụ → Bí Cảnh, mỗi ngày 1 lượt; qua hết nhận 1 kỹ năng hoặc pháp bảo Thiên hệ). Đeo ở Kho → Pháp Bảo.`;
    return `Pháp bảo hệ ${he}: ${names || '—'}. Có từ Phôi Pháp Bảo (mua ở Vạn Bảo Lâu, hoặc có thể rơi từ ${src(d)}, nhiệm vụ Tuần / Tiến độ) → Kho → Luyện hóa → Nhận chủ (ra ngẫu nhiên, cần đúng hệ). Đeo ở Kho → Pháp Bảo.`; };
  const howCard = (id) => { const d = c.src?.cards || {}; return `${c.cardName(id)} có thể rơi khi hạ ${src(d, ['thuong', 'elite', 'boss', 'void'])} (loại phù ngẫu nhiên). Gắn ở Kho → Thần Phù (ô phù mở theo cảnh giới).`; };
  const howSkill = (id) => { if (c.S[id]?.thien) return `${c.S[id].name}: kỹ năng Thiên hệ — nhận từ Thiên Cơ Truyền Thừa (Nhiệm vụ → Bí Cảnh, mỗi ngày 1 lượt). Xếp vào ô kỹ năng ở nút ✦.`; const K = c.src?.skill || {}, rg = Object.entries(K.realm_gift || {}).find(([, s]) => s === id)?.[0];
    const rn = rg && (c.src.realms || []).find((x) => x.id === rg)?.name;
    return `${c.S[id]?.name || id}: ${rn ? `tặng sẵn khi đạt cảnh giới ${rn}.` : `lĩnh ngộ khi hạ thủ lĩnh hoặc Âm Hư (hiếm khi ngộ ra, mỗi lần 1 kỹ năng chưa có).`} Xếp vào ô kỹ năng ở nút ✦ cạnh cụm kỹ năng.`; };
  // Từng điều kiện của một hệ: [{ ok, text, how }]
  function check(he) {
    const r = def.he[he];
    if (!r) return [];
    const nSet = SLOTS.filter((sl) => bag.equippedItem(sl)?.he === he || c.forged?.(he, sl)).length; // mỗi ô tính 1 lần
    const pb = c.treasure.current?.(), cardsOn = c.cards.equippedDefs().map((x) => x.id), sk = c.loadout.ids();
    const skill = (id) => ({ ok: sk.includes(id) && c.learned(id), text: `Xếp kỹ năng: ${c.S[id]?.name}${c.learned(id) ? '' : ' (chưa lĩnh ngộ)'}`, how: howSkill(id) });
    return [
      { ok: nSet === 8, text: `8 món pháp khí hệ ${he} (đang mặc ${nSet}/8)`, how: howSet(he) },
      { ok: pb?.he === he || (!!r.twin && pb?.he === r.twin), text: `Pháp bảo hệ ${r.twin ? `${he} / ${r.twin}` : he} đang đeo${pb ? ` (đang: ${pb.name})` : ''}`, how: howPb(r.twin || he) }, // Thiên hệ: pháp bảo hệ ngũ hành song sinh
      { ok: cardsOn.includes(r.card), text: `Thần Phù: ${c.cardName(r.card)}`, how: howCard(r.card) },
      skill(r.skill_sin), skill(r.skill_cui),
    ];
  }
  // Hệ đang kích (null nếu chưa đủ)
  const active = () => Object.keys(def.he).find((he) => check(he).every((x) => x.ok)) || null;

  function update(dt) {
    const he = c.dead() ? null : active();
    if (he !== wasOn) {
      if (he) c.toast(`✦ ${def.name} — ${def.he[he].name}: pháp bảo bắn liên thanh không nghỉ!`, 3500);
      wasOn = he;
    }
    if (!he) return;
    c.pt.gain(c.ps().mp * def.mp_regen * dt); // linh lực hồi liên tục
    fireT -= dt;
    if (fireT > 0 || !c.target(def.range_px)) return;
    fireT = def.every_s;
    c.treasure.use(true, { free: true, mul: def.mul, quietName: true });
  }
  // Nút "Mặc cả bộ" (sau khi mặc đồ): đeo pháp bảo cùng hệ, gắn Thần Phù, xếp 2 kỹ năng vào ô. Thiếu thì bỏ qua (bảng vẫn ghi ✗).
  function wear(he) {
    const r = def.he[he];
    if (!r) return 0;
    let n = 0;
    if (c.treasure.wearHe(he) || (r.twin && c.treasure.wearHe(r.twin))) n++; // Thiên hệ: pháp bảo hệ ngũ hành song sinh
    if (c.cards.wear(r.card)) n++;
    const L = c.loadout, keep = new Set([r.skill_sin, r.skill_cui, 'phap-bao']);
    for (const id of [r.skill_sin, r.skill_cui]) {
      if (!c.learned(id) || L.slotOf(id) >= 0) { if (L.slotOf(id) >= 0) n++; continue; }
      const ids = L.ids();
      let i = ids.findIndex((x) => !x);
      if (i < 0) i = ids.findIndex((x) => !keep.has(x) && !(c.S[x]?.he === he));
      if (i < 0) i = ids.findIndex((x) => !keep.has(x));
      if (i >= 0) { L.set(i, id); n++; }
    }
    return n;
  }
  return { check, active, update, wear, def };
}
