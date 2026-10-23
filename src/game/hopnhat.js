// THIÊN CƠ HỢP NHẤT (chủ dự án 23/10/2026): bắn liên thanh không nghỉ, hồi chiêu tối đa, linh lực hồi liên tục
// CHỈ có khi đủ cùng lúc (theo một hệ): 8 món trang bị chỉ định của hệ (đồ có tên, phôi luyện không tính)
// + 1 pháp bảo cùng hệ đang đeo + 1 Thần Phù chỉ định + 1 kỹ năng "sịn" + 1 kỹ năng "cùi" chỉ định trong ô kỹ năng.
// Khi kích: chỉ PHÁP BẢO được buff — tự phóng liên tục, không tốn linh lực; kỹ năng khác không được buff gì.
// Công thức từng hệ: data/build/dao-van.json → hop_nhat. THỬ NGHIỆM phía máy khách.
const SLOTS = ['mat-na', 'trang-phuc', 'vu-khi', 'nhan', 'canh', 'phap-tuong', 'linh-thu', 'day-chuyen'];

// c: { def (hop_nhat), bag, treasure, cards, loadout, S, learned(id), cardName(id), target(r), pt, ps(), dead(), toast }
export function createHopNhat(c) {
  const { def, bag } = c;
  let fireT = 0, wasOn = null;

  // Từng điều kiện của một hệ: [{ ok, text }]
  function check(he) {
    const r = def.he[he];
    if (!r) return [];
    const nSet = SLOTS.filter((sl) => bag.equippedItem(sl)?.he === he).length;
    const pb = c.treasure.current?.(), cardsOn = c.cards.equippedDefs().map((x) => x.id), sk = c.loadout.ids();
    return [
      { ok: nSet === 8, text: `8 món trang bị hệ ${he} (đang mặc ${nSet}/8, phôi luyện không tính)` },
      { ok: pb?.he === he, text: `Pháp bảo hệ ${he} đang đeo${pb ? ` (đang: ${pb.name})` : ''}` },
      { ok: cardsOn.includes(r.card), text: `Thần Phù: ${c.cardName(r.card)}` },
      { ok: sk.includes(r.skill_sin) && c.learned(r.skill_sin), text: `Kỹ năng sịn trong ô: ${c.S[r.skill_sin]?.name}${c.learned(r.skill_sin) ? '' : ' (chưa lĩnh ngộ)'}` },
      { ok: sk.includes(r.skill_cui) && c.learned(r.skill_cui), text: `Kỹ năng cùi trong ô: ${c.S[r.skill_cui]?.name}${c.learned(r.skill_cui) ? '' : ' (chưa lĩnh ngộ)'}` },
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
    if (c.treasure.wearHe(he)) n++;
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
