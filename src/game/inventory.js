// Kho thống nhất cho bảng Kho và ô trang bị ở bảng Nhân vật:
//   đồ có hình (6 hệ, src/ui/testbag.js) + đồ luyện từ phôi + nguyên liệu, đan, đan phương, công thức, bí kíp.
// Mỗi món có danh sách thao tác: Sử dụng / Tháo / Thức tỉnh / Phân rã / Vứt (trang bị), Dùng (đan), Luyện (công thức).
// THỬ NGHIỆM phía máy khách (localStorage) — Mốc 4 chuyển lên máy chủ.
const SLOT = { 'mat-na': 'Mặt nạ', 'trang-phuc': 'Trang phục', 'vu-khi': 'Vũ khí', nhan: 'Nhẫn', canh: 'Cánh', 'linh-thu': 'Linh thú',
  'day-chuyen': 'Dây chuyền', 'phap-tuong': 'Pháp tướng' };
const STAT = { hp: 'Khí huyết', linh: 'Tấn công', def: 'Phòng thủ', xuyen: 'Xuyên giáp', crit: 'Bạo kích %', hut: 'Hút máu %', phan: 'Phản đòn %' };

export function createInventory({ recipes, info, progress, bag, craft, itemDefs, awaken, gp, art, icon, fallbackIcon, onLook, recompute, usePill, breakthrough, btPills, openCultivate }) {
  const st = () => progress.state;
  const tierName = (id) => awaken.tiers.find((t) => t.id === id)?.name || '';
  // Dòng chỉ số kèm màu phẩm của từng dòng (bag.js tô màu)
  // Công thức dạy bởi một cuốn trong kho: { kind, def, inputs, rate, label }
  const nm = (id) => itemDefs.get(id)?.name || id;
  function recipeOf(teaches) {
    const p = recipes.pills.find((x) => x.id === teaches);
    if (p) { const inputs = craft.pickInputs(p) || p.recipe.inputs; return { kind: 'pill', def: p, inputs, rate: p.recipe.rate, label: 'Luyện đan' }; }
    const b = recipes.blanks.find((x) => x.id === teaches);
    if (b) return { kind: 'blank', def: b, inputs: b.inputs, rate: b.rate, label: 'Luyện phôi', locked: !craft.stageOk(b.unlock) };
    const s = recipes.skills.find((x) => x.id === teaches);
    if (s) {
      const lv = progress.state.cp[s.id] || 0;
      if (!s.learn) return { kind: 'skill', def: s, inputs: [], label: 'Lab chưa ghi nguyên liệu', none: true };
      return { kind: 'skill', def: s, lv, inputs: s.learn.inputs.map((i) => ({ id: i.id, count: i.count * (lv + 1) })),
        label: lv >= s.max_level ? 'Đã tối đa' : lv ? `Tu luyện lên cấp ${lv + 1}` : 'Tu luyện cấp 1', max: lv >= s.max_level, locked: !craft.stageOk(s.unlock) };
    }
    return null;
  }
  const needText = (inputs) => inputs.map((i) => `${nm(i.id)} ${progress.count(i.id)}/${i.count}`).join(' · ');
  const lines = (a) => (craft.norm(a)?.lines || []).map((l) => ({ text: `${STAT[l.k] || l.k} +${l.v}`, tier: l.t }));

  // Thao tác chung cho một món trang bị. a = dữ liệu thức tỉnh (tier, lines, spent)
  function gearActions(a, equipped) {
    const cost = craft.awakenCost(a), refund = craft.dismantleRefund(a);
    return [
      { id: 'equip', label: equipped ? 'Tháo' : 'Sử dụng' },
      cost === null ? { id: 'awaken', label: 'Thức tỉnh: đã đạt giới hạn', disabled: true }
        : { id: 'awaken', label: `Thức tỉnh dòng ${a.lines.length + 1} (${cost} LT)`, disabled: st().stone < cost },
      { id: 'dismantle', label: `Phân rã (+${refund} LT)`, confirm: `Phân rã món này, hoàn ${refund} Linh thạch?` },
      { id: 'discard', label: 'Vứt', danger: true, confirm: 'Vứt bỏ vĩnh viễn món này?' },
    ];
  }

  function bagGear(it) {
    const a = st().itemAw[it.id] || { tier: null, lines: [], spent: 0 }, eq = bag.isEquipped(it);
    return { ...it, key: `bag:${it.id}`, thumb: art(it.art) || '', equipped: eq, tier: a.tier,
      sub: `${SLOT[it.slot] || ''}${it.he ? ` · hệ ${it.he}` : ''}${a.tier ? ` · ${tierName(a.tier)}` : ' · chưa thức tỉnh'}`,
      detail: a.tier ? '' : 'Chưa có chỉ số — thức tỉnh để có', lines: lines(a), actions: gearActions(a, eq) };
  }
  function forgedGear(g) {
    const eq = st().eq[g.slot] === g.uid;
    return { id: `gear:${g.uid}`, key: `gear:${g.uid}`, name: g.name, cat: 'trang-bi', slot: g.slot, thumb: art(g.art) || icon(`slot.${g.slot}`) || fallbackIcon(g.name, 'khoang'),
      equipped: eq, tier: g.tier, sub: `${SLOT[g.slot]} · ${g.tier ? tierName(g.tier) : 'phôi trắng'}`,
      detail: g.tier ? '' : 'Phôi chưa thức tỉnh — chưa mặc được', lines: lines(g), actions: gearActions(g, eq) };
  }
  function stackItem(id, count) {
    const d = itemDefs.get(id);
    const actions = [];
    if (gp.pills[id]) actions.push({ id: 'use', label: 'Dùng' });
    if (btPills.has(id)) actions.push({ id: 'breakthrough', label: 'Dùng để đột phá' }); // đan đột phá: dùng ngay trong kho
    const rc = d.teaches && recipeOf(d.teaches);
    if (rc) actions.push({ id: 'craft', label: rc.label + (rc.rate ? ` (${Math.round(rc.rate * 100)}%)` : ''),
      disabled: rc.none || rc.max || rc.locked || !progress.has(rc.inputs) });
    actions.push({ id: 'discard', label: count > 1 ? `Vứt (${count})` : 'Vứt', danger: true, confirm: `Vứt bỏ ${d.name}${count > 1 ? ` ×${count}` : ''}?` });
    const src = info.source(d);
    if (rc) { // cuốn công thức: hiện thứ luyện ra + nguyên liệu cần, luyện ngay trong kho
      const what = rc.kind === 'skill' ? `${rc.def.name} — cấp ${rc.lv || 0}/${rc.def.max_level}` : rc.kind === 'pill' ? `Luyện ra: ${rc.def.name} (có ${progress.count(rc.def.id)})` : 'Luyện ra: phôi (thức tỉnh để có chỉ số)';
      return { ...d, key: `item:${id}`, thumb: icon(id) || fallbackIcon(d.name, 'nhiemvu'), count, sub: what,
        detail: [`Công dụng: ${info.effect(d)}`, rc.inputs.length && `Cần: ${needText(rc.inputs)}`, rc.locked && 'Cảnh giới chưa đủ', src && `Nơi có: ${src}`].filter(Boolean).join('\n'), actions };
    }
    return { ...d, key: `item:${id}`, thumb: icon(id) || fallbackIcon(d.name, d.group || 'nhiemvu'), count, sub: `Tác dụng: ${info.effect(d) || '—'}`,
      detail: src ? `Nơi có: ${src}` : '', actions };
  }

  function entries() {
    const out = bag.entries().map((e) => e.item).filter(Boolean).map((it) => ({ item: it.slot ? bagGear(it) : { ...it, key: `bag:${it.id}`, thumb: art(it.art) || '', actions: [] }, count: 1 }));
    for (const g of st().gear) out.push({ item: forgedGear(g), count: 1 });
    for (const [id, n] of Object.entries(st().inv)) if (itemDefs.has(id)) out.push({ item: stackItem(id, n), count: n });
    return out;
  }
  const find = (key) => entries().find((e) => e.item.key === key)?.item;

  // Món đang mặc ở một ô (cho bảng Nhân vật)
  function slotItem(slot) {
    const uid = st().eq[slot];
    if (uid) { const g = progress.gear(uid); if (g) return forgedGear(g); }
    const it = bag.equippedItem(slot);
    return it ? bagGear(it) : null;
  }

  // Thực hiện thao tác; trả về câu thông báo
  function act(key, action) {
    const [kind, ref] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
    if (kind === 'item') {
      const d = itemDefs.get(ref);
      if (action === 'use') return usePill(ref) ? '' : null;
      if (action === 'breakthrough') { breakthrough(); return ''; }
      if (action === 'craft') { // luyện ngay trong kho
        const rc = recipeOf(d.teaches);
        const r = rc.kind === 'pill' ? craft.brewPill(rc.def.id) : rc.kind === 'blank' ? craft.forgeBlank(rc.def.id) : craft.trainSkill(rc.def.id);
        recompute(); return r;
      }
      if (action === 'discard') { progress.take(ref, progress.count(ref)); progress.changed(); return `Đã vứt ${d.name}`; }
    }
    if (kind === 'bag') {
      const it = bag.entries().map((e) => e.item).find((x) => x.id === ref);
      if (!it) return null;
      if (action === 'equip') {
        bag.toggle(it);
        if (bag.isEquipped(it)) progress.unequipSlot(it.slot);
        onLook(); recompute();
        return bag.isEquipped(it) ? `Đã sử dụng ${it.name}` : `Đã tháo ${it.name}`;
      }
      if (action === 'awaken') { const r = craft.awakenItem(ref); recompute(); return r; }
      if (action === 'dismantle' || action === 'discard') {
        const back = action === 'dismantle' ? craft.dismantleRefund(st().itemAw[ref]) : 0;
        bag.remove(ref); progress.dropItemAw(ref); progress.addStone(back); onLook(); recompute(); progress.changed();
        return action === 'dismantle' ? `Đã phân rã ${it.name}: +${back} Linh thạch` : `Đã vứt ${it.name}`;
      }
    }
    if (kind === 'gear') {
      const uid = +ref, g = progress.gear(uid);
      if (!g) return null;
      if (action === 'equip') {
        if (!g.tier) return 'Phôi chưa thức tỉnh — thức tỉnh trước khi mặc';
        if (progress.toggleEquip(uid)) bag.unequip(g.slot);
        onLook(); recompute();
        return st().eq[g.slot] === uid ? `Đã sử dụng ${g.name}` : `Đã tháo ${g.name}`;
      }
      if (action === 'awaken') { const r = craft.awakenGear(uid); recompute(); return r; }
      if (action === 'dismantle') { const r = craft.dismantle(uid); recompute(); return r.msg; }
      if (action === 'discard') { progress.removeGear(uid); recompute(); progress.changed(); return `Đã vứt ${g.name}`; }
    }
    return null;
  }
  // Đồ trong kho mặc được vào ô `slot` (đồ phôi phải thức tỉnh rồi)
  const slotCandidates = (slot) => entries().map((e) => e.item).filter((it) => it.slot === slot && !it.equipped && (it.key.startsWith('bag:') || it.tier));
  return { entries, find, slotItem, slotCandidates, act };
}
