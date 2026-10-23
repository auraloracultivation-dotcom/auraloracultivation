// CON ĐƯỜNG ĐẠO TÂM (chủ dự án 24/10/2026 03:55): chuỗi nhiệm vụ chính cầm tay chỉ việc từ con số 0 tới đủ bộ Đạo Tâm
// 12 món cùng hệ (8 trang bị + kỹ năng sịn + kỹ năng cùi + Thần Phù + pháp bảo) — đủ thì kích Thiên Cơ Hợp Nhất.
// Người chơi tự chọn 1 hệ ở bước 2, chỉ nhận 1 bộ. Có NPC trong thành trò chuyện giải thích game, đi thắp sáng trận nhãn các vùng.
// Dữ liệu: data/quests/dao-tam.json. Lưu progress.state.dt = { he, i (bước), p (đếm), talked }. THỬ NGHIỆM phía máy khách.
// Mục tiêu "sự kiện" (kill, gather, obtain, use) đếm qua emit(); mục tiêu "trạng thái" (level, wear, awaken, skill, card, pb,
// station, hopnhat, choose_he, talk) tự kiểm mỗi 0,4 giây — không lệ thuộc người chơi bấm đúng lúc.
import { wrapDelta } from '../map/index.js';

const TALK_PX = 70;

// NPC nhiệm vụ đứng cạnh công trình trong thành (thêm vào data/npcs.json lúc tải)
export function questNpcDefs(def, props) {
  return Object.entries(def.npcs).map(([key, n]) => {
    const p = props.find((x) => x.id === n.prop) || { dx: 0, dy: 0 };
    return { id: `npc.q.${key}`, quest: key, name: n.name, outfit: n.outfit, weapon: n.weapon, stage: 55,
      home: { area: 'town', dx: p.dx + n.dx, dy: p.dy + n.dy }, wander_px: 0, brave: false, shield: true };
  });
}

// c: { def, hop (dao-van.json → hop_nhat.he), items (items.json), itemDefs, shop, progress, bag, learn, loadout, cards, treasure,
//      hopNhat, npcs, map, me, wallet, addExp, itemAction(key, act), breakthrough(), toast, play, dialog(o), chooseHe(o), heColor(he) }
export function createDaoTam(c) {
  const { def, progress, bag, map, me, toast } = c;
  const steps = def.chapters.flatMap((ch, ci) => ch.steps.map((s) => ({ ...s, chapter: ch.name, ci })));
  const S = () => (progress.state.dt ||= { he: null, i: 0, p: 0, talked: {} });
  const cur = () => steps[S().i] || null;
  const recipe = () => c.hop[S().he] || {};
  const zoneNow = () => def.zones[progress.stageDef.major ?? 0] || def.zones[0];
  const gearOf = (slot) => c.items.find((d) => d.he === S().he && d.slot === slot && !d.thien);
  const dist = (o) => Math.hypot(wrapDelta(o.x - me.x, map.width), wrapDelta(o.y - me.y, map.height));
  const npcOf = (key) => c.npcs.list.find((n) => n.quest === key);
  const station = (id) => map.town?.stations?.find((s) => s.id === id);
  const worn = (slot) => { const it = bag.equippedItem(slot); return it && it.he === S().he ? it : null; };
  const capOf = (it) => progress.state.itemAw?.[it?.id]?.cap || Infinity;
  const lines = (it) => progress.state.itemAw?.[it?.id]?.lines?.length || 0;
  let checkT = 0, talking = false, auto = false;

  // ---------- Kiểm mục tiêu ----------
  function satisfied(s) {
    const g = s.goal, st = S(), r = recipe(), ids = c.loadout.ids();
    switch (g.type) {
      case 'choose_he': return !!st.he;
      case 'talk': return !!st.talked[s.id];
      case 'level': return progress.state.stage + 1 >= g.lv;
      case 'wear': return !!worn(g.slot);
      case 'awaken': return lines(worn(g.slot)) >= Math.min(g.lines, capOf(worn(g.slot))); // món chạm giới hạn ẩn = xong, không kẹt
      case 'skill': { const id = r[`skill_${g.which}`]; return !!id && c.learn.learned(id) && ids.includes(id); }
      case 'card': return c.cards.equippedDefs().some((x) => x.id === r.card);
      case 'pb': return c.treasure.current()?.he === st.he && ids.includes('phap-bao');
      case 'station': return !!progress.state.stations?.[g.id];
      case 'hopnhat': return c.hopNhat.active() === st.he;
      default: return st.p >= (g.count || 1); // kill, gather, obtain, use
    }
  }
  function emit(type, e = {}) {
    const s = cur(); if (!s || !S().he && s.goal.type !== 'choose_he' && s.goal.type !== 'talk') return;
    const g = s.goal; let n = 0;
    if (type === 'kill' && g.type === 'kill' && e.zone === (g.zone === 'realm' ? zoneNow() : g.zone) && (!g.rank || g.rank === e.rank)) n = 1;
    else if (type === 'gain' && g.type === 'gather' && c.itemDefs.get(e.id)?.group === g.group) n = e.n || 1;
    else if (type === 'gain' && g.type === 'obtain' && e.id === g.item) n = e.n || 1;
    else if (type === 'use' && g.type === 'use' && e.id === g.item) n = 1;
    if (n) { S().p = Math.min(g.count || 1, S().p + n); progress.changed(); }
  }

  // ---------- Thưởng + sang bước sau ----------
  function give(gift) {
    const st = S(), r = recipe();
    if (gift.startsWith('gear:')) { const d = gearOf(gift.slice(5)); if (d) { c.bag.give(d.id); return d.name; } }
    if (gift.startsWith('skill:')) { const id = r[`skill_${gift.slice(6)}`]; if (id) { c.learn.grant(id); return `kỹ năng ${c.S[id]?.name || id}`; } }
    if (gift === 'card' && r.card) { c.cards.grant(r.card, 2); return 'Thần Phù hệ ' + st.he; }
    if (gift === 'pb') { const p = c.pbList.find((x) => x.he === st.he); if (p) { c.treasure.grant(p.id); return p.name; } }
    return null;
  }
  function finish(s) {
    const w = s.reward || {}, got = [];
    if (w.exp_lv) { c.addExp(Math.round(progress.stageDef.exp_need * w.exp_lv)); got.push('tu vi'); }
    if (w.stone) { progress.addStone(w.stone); got.push(`${w.stone} Linh thạch`); }
    if (w.gold) { c.wallet.add('vang', w.gold); got.push(`${w.gold} Vàng`); }
    for (const [id, n] of w.items || []) { progress.add(id, n); got.push(`${c.itemDefs.get(id)?.name || id} ×${n}`); }
    if (w.gift) { const g = give(w.gift); if (g) got.push(`✦ ${g}`); }
    const st = S(); st.i++; st.p = 0; progress.changed();
    c.play('vong-lua', me.x, me.y - 8, 40);
    toast(`✔ ${s.title}${got.length ? ` — nhận ${got.join(', ')}` : ''}`, 3200);
    const nx = cur();
    if (nx?.tip) setTimeout(() => toast(`➜ ${nx.title}: ${nx.tip}`, 4200), 3300);
    if (s.goal.type === 'station' && s.say) say(s.say, station(s.goal.id)?.name || 'Trận nhãn');
  }
  function say(linesArr, name, done) {
    talking = true;
    c.dialog({ name, lines: linesArr, auto, onClose: () => { talking = false; done?.(); } });
  }

  // ---------- Mỗi khung ----------
  function tick(dt) {
    const s = cur(); if (!s || talking) return;
    if (s.goal.type === 'talk' && !S().talked[s.id]) { // tới gần NPC thì tự mở hội thoại; nói xong là xong bước
      const n = npcOf(s.goal.npc);
      if (n && dist(n) < TALK_PX) return say(s.say || [], n.name, () => { S().talked[s.id] = true; progress.changed(); if (cur() === s) finish(s); });
    }
    checkT -= dt; if (checkT > 0) return; checkT = 0.4;
    if (satisfied(s)) finish(s);
  }
  function chooseHe() {
    if (S().he) return;
    const list = Object.keys(c.hop).slice(0, 6).map((he) => ({ he, color: c.heColor(he), name: c.hop[he].name,
      desc: `${c.S[c.hop[he].skill_sin]?.name || ''} · ${c.S[c.hop[he].skill_cui]?.name || ''}` }));
    talking = true;
    c.chooseHe({ list, onPick: (he) => { talking = false; if (!he) return; S().he = he; progress.changed(); toast(`Đạo Tâm hệ ${he} — cả bộ 12 món theo hệ này`, 3000); } });
  }

  // ---------- Dẫn đường / tự làm ----------
  // Nơi cần đến của bước hiện tại (navi.js): điểm NPC / trận nhãn, hoặc vùng quái; null = làm tại chỗ (mặc đồ, thức tỉnh…)
  function place() {
    const s = cur(); if (!s) return null;
    const g = s.goal;
    if (g.type === 'talk') { const n = npcOf(g.npc); return n && { point: { x: n.x, y: n.y + 20 }, label: n.name }; }
    if (g.type === 'station' && !satisfied(s)) { const t = station(g.id); return t && { point: { x: t.x, y: t.y + 30 }, label: t.name }; }
    if (g.type === 'kill') return { zone: g.zone === 'realm' ? zoneNow() : g.zone, rank: g.rank || 'thuong' };
    if (g.type === 'gather') return { zone: zoneNow(), rank: 'thuong', gather: true };
    if (g.type === 'level' && !(progress.atPeak() && progress.nextStageDef())) return { zone: zoneNow(), rank: 'thuong' };
    return null;
  }
  // Tự làm nhiệm vụ: việc làm tại chỗ. Trả về true nếu đã làm gì đó (hoặc đang chờ người chơi chọn).
  function doHere() {
    const s = cur(); if (!s || talking) return true;
    const g = s.goal, r = recipe();
    if (g.type === 'choose_he') { chooseHe(); return true; }
    if (g.type === 'wear') { const d = gearOf(g.slot); if (d && bag.equippedItem(g.slot)?.id !== d.id) c.itemAction(`bag:${d.id}`, 'equip'); return true; }
    if (g.type === 'awaken') { const it = worn(g.slot); if (it) c.itemAction(`bag:${it.id}`, 'awaken'); return true; }
    if (g.type === 'skill' || g.type === 'card' || g.type === 'pb' || g.type === 'hopnhat') { c.hopNhat.wear(S().he); if (g.type === 'pb' || g.type === 'hopnhat') slotIn('phap-bao'); return true; }
    if (g.type === 'obtain') { buy(g.item); return true; }
    if (g.type === 'use') { c.usePill(g.item); return true; }
    if (g.type === 'level' && progress.atPeak() && progress.nextStageDef()) { c.breakthrough(); return true; }
    return !!r && false;
  }
  // Xếp một kỹ năng vào ô: ô trống trước, hết thì thay ô không thuộc bộ Đạo Tâm
  function slotIn(id) {
    const L = c.loadout, ids = L.ids(), r = recipe(); if (ids.includes(id)) return;
    const keep = new Set([r.skill_sin, r.skill_cui, 'phap-bao']);
    let i = ids.findIndex((x) => !x); if (i < 0) i = ids.findIndex((x) => !keep.has(x));
    if (i >= 0) L.set(i, id);
  }
  function buy(id) {
    const s = c.shop.stock.find((x) => x.id === id), W = c.wallet;
    if (!s) return;
    const k = ['vang', 'linh-thach'].find((x) => W.price(s, x) !== null && W.can(s, x));
    if (!k) return toast('Chưa đủ tiền mua — đánh quái kiếm thêm Vàng', 1800);
    W.pay(s, k); progress.add(id, s.stack || 1); emit('gain', { id, n: s.stack || 1 }); progress.changed();
    toast(`Đã mua ${c.itemDefs.get(id)?.name || id}`, 1400);
  }

  // Dấu "!" vàng trên đầu NPC / trận nhãn cần tới
  function render(ctx, at, t) {
    const pl = place(); if (!pl?.point) return;
    const p = at({ x: pl.point.x, y: pl.point.y - 20 }), y = p.y - 70 + Math.sin(t / 220) * 4;
    ctx.save(); ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 4;
    ctx.strokeStyle = '#3a2400'; ctx.fillStyle = '#ffd23a'; ctx.strokeText('!', p.x, y); ctx.fillText('!', p.x, y); ctx.restore();
  }
  // Dòng trên khung Nhiệm vụ
  function brief() {
    const s = cur(); if (!s) return null;
    const g = s.goal, cnt = g.count ? ` (${S().p}/${g.count})` : g.type === 'level' ? ` (${progress.state.stage + 1}/${g.lv})` : '';
    return { id: 'dt', tag: 'Đạo Tâm', title: s.title, goal: `${s.tip || s.title}${cnt}`.slice(0, 80), color: '#ffd23a', ready: false, nav: !!place() };
  }
  return { tick, emit, place, doHere, chooseHe, render, brief, cur, he: () => S().he, done: () => !cur(), setAuto: (v) => { auto = v; },
    talking: () => talking, progress: () => ({ i: S().i, n: steps.length, chapter: cur()?.chapter }) };
}
