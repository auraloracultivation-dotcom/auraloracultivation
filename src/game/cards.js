// THẦN PHÙ (chủ dự án 23/10/2026, giống "card" của My Heroes): rơi khi hạ quái, phẩm ngẫu nhiên Lục → Đen.
// Gắn vào ô phù (mở theo cảnh giới) để đổi cách đạn bay: bắn thêm, xuyên, đuổi, tách, sét lan, liên thanh…
// Số liệu: data/build/dao-van.json → cards. Lưu progress.state.cards = [{ uid, id, tier }], progress.state.cardSlots = [uid|null].
// THỬ NGHIỆM phía máy khách (localStorage) — Mốc 4 lên máy chủ.
import { cardArt } from '../entity/index.js';

export function createCards({ def, tiers, progress, stageOk, toast, play }) {
  const C = def.cards, byId = new Map(C.list.map((c) => [c.id, c]));
  const list = () => (progress.state.cards ||= []);
  const slots = () => { const s = (progress.state.cardSlots ||= []); while (s.length < C.slots.length) s.push(null); return s; };
  const open = (i) => stageOk(C.slots[i].unlock);
  const tierName = (t) => tiers[t]?.name || '';
  const tierId = (t) => tiers[t]?.id || 'luc';

  // Giá trị hiệu ứng của một tấm theo phẩm
  function value(card) {
    const d = card.def, v = d.base + d.per_tier * card.tier;
    return d.int ? Math.max(1, Math.floor(v)) : Math.round(v * 100) / 100;
  }
  const text = (card) => { const v = value(card); return card.def.desc.replace('{v}', card.def.pct ? Math.round(v * 100) : v); };
  const equippedDefs = () => slots().map((u, i) => (u && open(i) ? list().find((c) => c.uid === u) : null)).filter(Boolean)
    .map((c) => ({ ...c, def: byId.get(c.id) })).filter((c) => c.def);
  const signature = () => slots().join(',') + '|' + list().length;

  // Hạ quái: có rơi thần phù không (theo cấp quái); phẩm bốc theo trọng số
  function onKill(m) {
    const ch = m.void ? C.drop.void : C.drop[m.def.rank] ?? C.drop.thuong;
    if (Math.random() >= ch) return;
    const w = C.tier_weights, sum = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum, t = 0;
    while ((r -= w[t]) > 0) t++;
    const d = C.list[Math.floor(Math.random() * C.list.length)];
    list().push({ uid: progress.state.uid++, id: d.id, tier: t }); progress.changed();
    play?.('vong-lua', m.x, m.y - 6, 26);
    toast(`Nhặt được Thần Phù: ${d.name} (${tierName(t)})`, 2400);
  }
  const grant = (id, tier) => { list().push({ uid: progress.state.uid++, id, tier }); progress.changed(); };

  // ---- Kho: thẻ Thần Phù (+ một ô tóm tắt Đạo Vận đang có) ----
  function entry(c) {
    const d = byId.get(c.id); if (!d) return null;
    const card = { ...c, def: d }, at = slots().indexOf(c.uid), free = slots().findIndex((u, i) => !u && open(i));
    const actions = at >= 0 ? [{ id: 'card-off', label: `Gỡ khỏi ô phù ${at + 1}` }]
      : [{ id: 'card-on', label: free >= 0 ? `Gắn vào ô phù ${free + 1}` : 'Ô phù đã đầy — gỡ bớt trước', disabled: free < 0 }];
    actions.push({ id: 'card-break', label: `Phân rã (+${C.dismantle_stone[c.tier]} LT)`, confirm: `Phân rã ${d.name}?` });
    return { id: `card:${c.uid}`, key: `card:${c.uid}`, name: d.name, cat: 'than-phu', thumb: cardArt(c.id, tierId(c.tier)), tier: tierId(c.tier),
      equipped: at >= 0, sub: `Thần Phù · phẩm ${tierName(c.tier)}${at >= 0 ? ` · ô ${at + 1}` : ''}`, detail: text(card), actions };
  }
  function summary(mods) {
    const lines = mods.sets.flatMap((s) => s.tiers.map((t) => `${s.name} (${s.he} ${t.t}/8): ${t.text}`));
    for (const st of mods.sets) { // mốc kế tiếp của bộ: đeo thêm bao nhiêu món để mở gì
      const nx = Object.keys(def.he[st.he].tiers).map(Number).find((t) => t > st.n);
      if (nx) lines.push(`→ ${st.he}: đeo thêm ${nx - st.n} món cùng hệ để mở: ${def.he[st.he].tiers[nx]._mo_ta}`);
    }
    for (const c of equippedDefs()) lines.push(`${c.def.name}: ${text(c)}`);
    const n = slots().filter((_, i) => open(i)).length;
    return { id: 'card:summary', key: 'card:summary', name: 'Đạo Vận hiện tại', cat: 'than-phu', thumb: cardArt('summary', 'den'),
      sub: `Ô phù mở ${n}/${C.slots.length} · đeo 2/4/6/8 món cùng hệ để kích bộ ngũ hành`,
      detail: lines.length ? lines.join('\n') : 'Chưa có hiệu ứng. Mặc từ 2 món đồ Kho cùng hệ, hoặc gắn Thần Phù (rơi từ quái).', actions: [] };
  }
  const entries = (mods) => [{ item: summary(mods), count: 1 }, ...list().map(entry).filter(Boolean).map((item) => ({ item, count: 1 }))];
  function act(key, action) {
    const c = list().find((x) => `card:${x.uid}` === key); if (!c) return null;
    const d = byId.get(c.id), s = slots();
    if (action === 'card-on') {
      const i = s.findIndex((u, k) => !u && open(k)); if (i < 0) return 'Ô phù đã đầy';
      s[i] = c.uid; progress.changed(); return `Gắn ${d.name} vào ô phù ${i + 1}`;
    }
    if (action === 'card-off') { const i = s.indexOf(c.uid); if (i >= 0) s[i] = null; progress.changed(); return `Gỡ ${d.name}`; }
    if (action === 'card-break' || action === 'discard') {
      const i = s.indexOf(c.uid); if (i >= 0) s[i] = null;
      progress.state.cards = list().filter((x) => x !== c); progress.addStone(C.dismantle_stone[c.tier]); progress.changed();
      return `Phân rã ${d.name}: +${C.dismantle_stone[c.tier]} Linh thạch`;
    }
    return null;
  }
  return { onKill, grant, value, text, equippedDefs, signature, entries, act, isCard: (key) => key.startsWith('card:') };
}
