// Nội dung các bảng Nhiệm vụ / Tu luyện / Kho cho phần chơi thử. Chỉ dựng HTML + gọi luật trong craft/quests.
import { showSheet, escapeHtml as E } from '../ui/index.js';
import { iconUrl } from '../entity/index.js';
import { compactNum as N } from '../core/index.js';

const GOAL = { talk: 'Nói chuyện', reach: 'Đến', collect: 'Thu thập', craft: 'Luyện', kill: 'Hạ', boss: 'Hạ boss', dodge_heavy: 'Né đòn nặng',
  discover: 'Khám phá', complete_daily: 'Hoàn thành nhiệm vụ ngày', awaken: 'Thức tỉnh trang bị', use: 'Dùng',
  discover_unique: 'Nhặt các loại linh thảo khác nhau', boss_unique: 'Hạ các boss khác nhau', kill_zone: 'Hạ', stage: 'Tu luyện tới' };
const TYPE = { main: 'Chính tuyến', daily: 'Hằng ngày', weekly: 'Hằng tuần · reset thứ Hai', ladder: 'Tiến độ · không reset', explore: 'Khám phá', craft: 'Chế tạo', combat: 'Chiến đấu', long: 'Dài hạn' };
const SLOT = { 'mat-na': 'Mặt nạ', 'trang-phuc': 'Trang phục', 'vu-khi': 'Vũ khí', nhan: 'Nhẫn', canh: 'Cánh', 'linh-thu': 'Linh thú',
  'day-chuyen': 'Dây chuyền', 'phap-tuong': 'Pháp tướng' };
const STAT = { hp: 'Khí huyết', mp: 'Linh lực (MP)', linh: 'Tấn công (Linh Lực)', def: 'Phòng thủ', xuyen: 'Xuyên giáp', chinh: 'Chính xác',
  ne: 'Né tránh', crit: 'Bạo kích %', hut: 'Hút máu %', tocdanh: 'Tốc đánh', tocchay: 'Tốc chạy', phan: 'Phản đòn %' };
const DOCK = { mau: 'hp', 'linh-khi': 'mp', 'tan-cong': 'linh', 'phong-thu': 'def', 'toc-chay': 'tocchay', 'chinh-xac': 'chinh',
  'toc-danh': 'tocdanh', 'bao-kich': 'crit', 'hut-mau': 'hut', 'phan-don': 'phan', 'ne-tranh': 'ne', 'xuyen-giap': 'xuyen' };
const ico = (id) => { const u = iconUrl(id); return u ? `<img class="ico" src="${u}" alt="">` : ''; };
const btn = (act, arg, label, on = true) => `<button type="button" class="bag-act sm" data-act="${act}" data-arg="${E(arg)}" ${on ? '' : 'disabled'}>${E(label)}</button>`;

export function createViews(o) {
  const { progress, quests, craft, itemDefs, pills, blanks, awaken, cp, realms, gp, toast } = o;
  const st = () => progress.state;
  const monNames = new Map(o.monsters.map((m) => [m.id, m.name]));
  const name = (id) => (id === 'equipment.blank_item' ? 'phôi trang bị bất kỳ' : itemDefs.get(id)?.name || monNames.get(id) || `${id} (chưa có trong game)`);
  const need = (inputs) => inputs.map((i) => {
    const have = progress.count(i.id);
    return `<span class="${have >= i.count ? 'ok' : 'no'}">${E(name(i.id))} ${have}/${i.count}</span>`;
  }).join(' · ');
  const stageName = (id) => gp.player.stages.find((s) => s.id === id)?.name || id;
  const tierName = (id) => awaken.tiers.find((t) => t.id === id)?.name || id;
  // Thọ nguyên trong bảng Cảnh giới
  const lifeLine = () => { const L = o.life, ate = st().life?.pillDay === L.today();
    const left = o.gapR.dailyLeft(progress.stageDef.exp_need, progress.stageDef.id);
    return `<p>Linh khí hôm nay: <b>${left > 0.6 ? 'dồi dào' : left > 0.3 ? 'loãng dần' : left > 0.1 ? 'thưa thớt' : 'gần cạn'}</b> — càng hạ nhiều quái tu vi nhận càng ít, qua 0h giờ VN hồi lại.</p><p>Thọ nguyên: <b>${L.age()}/${L.max()} năm</b> (còn ${L.left()} năm · mỗi ngày +1 tuổi theo giờ Việt Nam). Trường Sinh Đan hôm nay: ${ate ? 'đã dùng' : '<b>chưa dùng</b>'}.</p>`; };
  const msg = (r) => { if (!r) return; toast(r.msg, 1800); if (r.event) quests.emit(...r.event); o.recompute(); };

  // ---------- Nhiệm vụ ----------
  function rewardText(r) {
    const parts = [];
    if (r.exp) parts.push(`${N(r.exp)} tu vi`);
    if (r.spiritStone) parts.push(`${r.spiritStone} Linh thạch`);
    if (r.gold) parts.push(`${N(r.gold)} Vàng`);
    for (const i of r.items || []) parts.push(`${name(i.id)} ×${i.count}`);
    const later = [r.title && `danh hiệu "${r.title}"`, r.cosmetic && 'trang trí', r.choiceReward && 'rương chọn thưởng'].filter(Boolean);
    return parts.join(', ') + (later.length ? ` <i>(+ ${later.join(', ')} — chưa có hệ thống)</i>` : '');
  }
  function questRow(q, a) {
    const goals = q.goals.map((g, i) => {
      const cur = a ? a.p[i] : 0, ok = cur >= g.count;
      const what = g.label ? ` ${E(g.label)}` : g.target === 'any' || g.type.endsWith('unique') ? '' : ` ${E(name(g.target))}`;
      const fake = a && !ok && quests.isPlaceholder(g.target) ? btn('fake', `${q.id}|${i}`, 'Hoàn thành tạm') : '';
      return `<li class="${ok ? 'ok' : ''}">${GOAL[g.type] || g.type}${what} <b>${cur}/${g.count}</b> ${fake}</li>`;
    }).join('');
    const action = !a ? btn('accept', q.id, 'Nhận') : quests.complete(q.id) ? btn('claim', q.id, 'Nhận thưởng')
      : goalPlace(q, a) ? btn('go', q.id, '➤ Đi tới — tự động làm') : ''; // dẫn đường từ bảng đầy đủ (giống chạm dòng ở khung nhỏ)
    return `<div class="row"><div class="row-h"><b style="color:${QCOL[q.tier] || ''}">${E(q.title)}</b><em>${TYPE[q.type] || q.type}</em></div>
      <p>${E(q.desc)}</p><ul>${goals}</ul><p class="rw">Thưởng: ${rewardText(q.rewards)}</p>${action}</div>`;
  }
  // Khung Nhiệm vụ trên HUD: tối đa 3 nhiệm vụ đang làm (chính tuyến trước), mục tiêu chưa xong đầu tiên, màu theo tier (độ hiếm / khó)
  const QCOL = { luc: '#6fdc76', lam: '#6aa8ff', tim: '#c58cff', cam: '#ffa94d', vang: '#ffd84a', do: '#ff5a4a', den: '#ff4f7a' };
  // Dẫn đường (chủ dự án 23/10: map rộng, không biết đi đâu): nhiệm vụ đang theo → { zone, rank } hoặc { town } (luyện / dùng đồ ở thành)
  const monById = new Map(o.monsters.map((m) => [m.id, m]));
  const matZone = (id) => o.mats.materials.find((m) => m.id === id)?.zone;
  const MZ = ['xanh', 'cam', 'xam', 'trang', 'than', 'den', 'tim'];
  let tracked = null, goTo = null; // goTo(id): main.js gắn dẫn đường (navi.start)
  function goalPlace(q, a) {
    const i = Math.max(0, q.goals.findIndex((g, k) => a.p[k] < g.count)), g = q.goals[i];
    if (g.type === 'kill_zone') return { zone: g.target, rank: g.rank || 'thuong' };
    if ((g.type === 'kill' || g.type === 'boss') && monById.has(g.target)) { const m = monById.get(g.target); return { zone: m.zone, rank: m.rank }; }
    if (g.type === 'boss_unique') return { zone: MZ[o.realmMajor()] || 'xanh', rank: 'boss' };
    if (g.type === 'collect' && matZone(g.target)) return { zone: matZone(g.target), rank: 'thuong', gather: true };
    if (g.type === 'collect' || g.type === 'discover_unique') return { zone: MZ[o.realmMajor()] || 'xanh', rank: 'thuong', gather: true };
    if (g.type === 'craft' || g.type === 'use' || g.type === 'awaken') return { town: true };
    return null;
  }
  const order = () => {
    const ORD = { main: 0, ladder: 1, daily: 2, weekly: 3 }, rank = (x) => (quests.complete(x.q.id) ? -1 : ORD[x.q.type] ?? 4); // xong rồi (chờ nhận thưởng) lên đầu
    return quests.active().sort((x, y) => rank(x) - rank(y));
  };
  function naviGoal() {
    const list = order().filter((x) => !quests.complete(x.q.id));
    const cur = list.find((x) => x.q.id === tracked && goalPlace(x.q, x.a)) || list.find((x) => goalPlace(x.q, x.a));
    if (!cur) return null;
    const pl = goalPlace(cur.q, cur.a);
    return pl && { ...pl, id: cur.q.id, title: cur.q.title };
  }
  const track = (id) => { tracked = id; return naviGoal(); };
  function questBrief() {
    for (const q of quests.available()) if (q.auto) quests.accept(q.id); // chuỗi Tầm Bảo: đủ cảnh giới là tự nhận
    const tag = (q) => ({ main: 'Chính', daily: 'Ngày', weekly: 'Tuần', ladder: `Tiến độ ${quests.ladderStep()}` }[q.type] || 'Phụ');
    const nav = naviGoal()?.id;
    return order().slice(0, 3).map(({ q, a }) => {
      const i = Math.max(0, q.goals.findIndex((g, k) => a.p[k] < g.count)), g = q.goals[i];
      const what = g.label ? ` ${g.label}` : g.target === 'any' || g.type.endsWith('unique') ? '' : ` ${name(g.target)}`;
      return { id: q.id, tag: tag(q), title: q.title, color: QCOL[q.tier] || (q.type === 'main' ? '#f7cf6b' : q.type === 'daily' ? '#7fe08a' : '#7fb4ff'),
        goal: `${GOAL[g.type] || g.type}${what} (${a.p[i]}/${g.count})`, ready: quests.complete(q.id), tracked: q.id === nav, nav: !!goalPlace(q, a) };
    });
  }
  // Đan dùng nhanh: đan đang có trong kho dùng được (data/gameplay.json → pills)
  const pillChoices = () => Object.keys(gp.pills).filter((id) => typeof gp.pills[id] === 'object' && progress.count(id) > 0)
    .map((id) => ({ key: id, name: `${name(id)} ×${progress.count(id)}`, thumb: iconUrl(id) || '' }));
  function openQuests() {
    showSheet({
      title: 'Nhiệm vụ', note: 'Thử nghiệm: tiến độ lưu trên máy này. "Hoàn thành tạm" dành cho NPC/địa điểm chưa có trong game.',
      tabs: [{ id: 'active', name: 'Đang làm' }, { id: 'avail', name: 'Có thể nhận' }, { id: 'done', name: 'Đã xong' }, { id: 'bc', name: 'Bí Cảnh' }],
      render(tab) {
        if (tab === 'bc') return biCanhTab();
        const ORD = { ladder: 0, daily: 1, weekly: 2, main: 3 };
        const rows = tab === 'active' ? quests.active().sort((x, y) => (ORD[x.q.type] ?? 4) - (ORD[y.q.type] ?? 4)).map(({ q, a }) => questRow(q, a))
          : tab === 'avail' ? quests.available().map((q) => questRow(q, null))
            : quests.done().map((q) => `<div class="row done"><b>${E(q.title)}</b> <em>✓</em></div>`);
        return rows.join('') || '<p class="bag-empty">Trống</p>';
      },
      onAction(act, arg, close) {
        if (act === 'bc-start') { const e = o.biCanh.start(); if (e) toast(e, 1800); else close(); return; }
        if (act === 'bc-quit') { o.biCanh.quit(); return; }
        if (act === 'accept') quests.accept(arg);
        if (act === 'fake') { const [id, i] = arg.split('|'); quests.fakeGoal(id, +i); }
        if (act === 'go') { close(); goTo?.(arg); return; }
        if (act === 'claim') { const r = quests.claim(arg); if (r) { o.onReward(r); toast('Đã nhận thưởng nhiệm vụ', 1500); } }
      },
    });
  }

  // ---------- Bí cảnh (bicanh.js) ----------
  function biCanhTab() {
    const b = o.biCanh.panel(), d = b.def, R = d.reward;
    const s = b.status;
    return `<div class="row"><div class="row-h"><b>${E(b.name)}</b><em>Hôm nay còn ${b.tries}/${b.max} lượt</em></div>
      <p>Đứng ngoài thành rồi bấm Bắt đầu: vòng cấm chế đỏ hiện quanh chỗ đứng, ${d.waves} đợt quái cảnh giới của bạn ùa vào (đợt ${d.elite_wave} có tinh anh, đợt ${d.boss_wave} có boss). Mỗi đợt ${d.wave_time_s} giây. Thua khi ngã xuống, ra khỏi vòng hoặc hết giờ.</p>
      <p>Thưởng mỗi đợt qua: ${R.stone_per_wave} Linh thạch + ${R.gold_per_wave} Vàng. Qua đợt ${R.card_at.join(' / ')}: Thần Phù (càng sâu phẩm càng cao). Qua hết: Phôi Pháp Bảo + cơ hội đồ ngũ hành.</p>
      <p>Đây là nơi khoe Đạo Vận: bộ ngũ hành + Thần Phù + pháp bảo càng hợp, quét quái càng nhanh.</p>
      ${s ? `<p><b>Đang ở đợt ${s.wave}/${s.waves}</b> · còn ${s.left} giây · ${s.mobs} quái</p>${btn('bc-quit', '', 'Bỏ cuộc')}` : btn('bc-start', '', 'Bắt đầu', b.tries > 0)}</div>`;
  }

  // ---------- Tu luyện ----------
  function realmTab() {
    const s = progress.stageDef, next = progress.nextStageDef(), ps = o.getStats();
    let bt = 'Đã ở tầng cao nhất.';
    if (next) {
      const rid = gp.major_realm_first_stage[next.id];
      const r = rid && realms.realms.find((x) => x.id === rid);
      bt = r ? `Lên <b>${E(next.name)}</b>: đủ tu vi + ${E(name(r.breakthrough.pill))} (có ${progress.count(r.breakthrough.pill)}). Thành hay bại tùy vận khí — thất bại mất đan và một nửa tu vi. Bấm nút Đột phá (trên khung nhân vật).`
        : `Lên <b>${E(next.name)}</b>: đủ tu vi sẽ tự lên tầng.`;
    }
    const rows = Object.keys(STAT).map((k) => `<span>${STAT[k]}</span><b>${k === 'hp' ? `${Math.round(o.getHp())}/${ps.hp}` : ps[k]}</b>`).join('');
    return `<div class="row"><div class="row-h"><b>${E(s.name)}</b><em>${N(st().exp)}/${N(s.exp_need)} tu vi</em></div>
      <p>${bt}</p>${lifeLine()}</div>${o.wallet.html()}<div class="row grid2">${rows}</div>
      <div class="row"><p>Kỹ năng mở theo cảnh giới: Kiếm khí + Khống chế (Trúc Cơ), Linh thú + Lướt (Kết Đan), Diện rộng (Nguyên Anh).</p></div>`;
  }
  // Chỉ hiện công thức ĐANG CÓ trong kho (đan phương / công thức phôi / bí kíp). Muốn thêm → về Vạn Bảo Lâu trong thành mua.
  const none = (what) => `<p class="bag-empty">Kho chưa có ${what} nào.<br>Về Vạn Bảo Lâu trong Thanh Vân Thành để mua (nút Tông môn khi ở trong thành), hoặc săn boss.</p>`;
  const ownedOnly = (list, html, what) => { const own = list.filter((x) => o.owns(x.id)); return own.length ? own.map(html).join('') : none(what); };
  function danTab() {
    return ownedOnly(pills.pills, (p) => {
      const inp = craft.pickInputs(p) || p.recipe.inputs, have = progress.count(p.id), usable = gp.pills[p.id], own = o.owns(p.id);
      return `<div class="row ${own ? '' : 'locked'}"><div class="row-h"><b>${ico(p.id)}${E(p.name)}</b><em>có ${have}</em></div>
        ${own ? '' : `<p class="lock">🔒 Cần ${E(name(o.teacher.get(p.id)))} trong kho (mua ở Vạn Bảo Lâu hoặc rơi từ boss)</p>`}
        <p class="need">${need(inp)}</p>${btn('brew', p.id, 'Luyện', own && progress.has(inp))} ${usable ? btn('use', p.id, 'Dùng', have > 0) : ''}</div>`;
    }, 'đan phương');
  }
  function phoiTab() {
    return ownedOnly(blanks.blanks, (b) => {
      const ok = craft.stageOk(b.unlock), own = o.owns(b.id);
      return `<div class="row ${own ? '' : 'locked'}"><div class="row-h"><b>${ico(`slot.${b.slot}`)}Phôi ${SLOT[b.slot]}</b><em>${ok ? '' : `mở ở ${E(stageName(b.unlock))}`}</em></div>
        ${own ? '' : `<p class="lock">🔒 Cần ${E(name(o.teacher.get(b.id)))} trong kho</p>`}
        <p class="need">${need(b.inputs)}</p>${btn('forge', b.id, 'Luyện phôi', own && ok && progress.has(b.inputs))}</div>`;
    }, 'công thức phôi');
  }
  // Dòng thức tỉnh, mỗi dòng tô màu phẩm riêng
  const linesText = (a) => `<span class="ic-lines">${craft.norm(a).lines.map((l, n) => `<i class="ln tier-${l.t}">${n + 1}. ${STAT[l.k]} +${l.v}${l.p ? '%' : ''}</i>`).join('')}</span>`;
  const awakenBtn = (act, arg, a) => { const c = craft.awakenCost(a); return c === null ? btn(act, arg, 'Đã đạt giới hạn', false) : btn(act, arg, `Thức tỉnh dòng ${a.lines.length + 1} (${c} LT)`, st().stone >= c); };
  // Đồ trong Kho (6 hệ, có hình): thức tỉnh để có chỉ số, mặc/tháo như trong Kho
  function bagGearRows() {
    return o.bag.entries().map((e) => e.item).filter((it) => it.slot).map((it) => {
      const a = st().itemAw[it.id] || { tier: null, lines: [], spent: 0 }, eq = o.bag.isEquipped(it);
      return `<div class="row ${a.tier ? `tier-${a.tier}` : ''}"><div class="row-h"><b>${E(it.name)}</b><em>${SLOT[it.slot]}${a.tier ? ` · ${tierName(a.tier)}` : ''}${eq ? ' · đang mặc' : ''}</em></div>
        <p>${a.tier ? linesText(a) : 'Chưa thức tỉnh — chưa có chỉ số'}</p>${awakenBtn('awakenItem', it.id, a)}
        ${btn('wearItem', it.id, eq ? 'Tháo' : 'Mặc')}</div>`;
    }).join('');
  }
  function gearTab() {
    const list = st().gear, kho = bagGearRows();
    const head = `<div class="row"><p>Mỗi lần thức tỉnh thêm 1 dòng, màu dòng ngẫu nhiên. Mỗi món có giới hạn 1–10 dòng không báo trước — chạm giới hạn thì nút tắt. Mỗi ô chỉ mặc một món.</p>${o.wallet.html()}</div>`;
    if (!list.length && !kho) return `${head}<p class="bag-empty">Chưa có trang bị. Nhập mã quà trong Cài đặt để nhận đồ 6 hệ, hoặc luyện phôi.</p>`;
    return head + kho + list.map((g) => {
      const eq = st().eq[g.slot] === g.uid;
      const lines = g.lines.length ? linesText(g) : 'Phôi trắng — chưa có chỉ số';
      return `<div class="row ${g.tier ? `tier-${g.tier}` : ''}"><div class="row-h"><b>${ico(`slot.${g.slot}`)}${E(g.name)}</b><em>${SLOT[g.slot]}${g.tier ? ` · ${tierName(g.tier)}` : ''}${eq ? ' · đang mặc' : ''}</em></div>
        <p>${lines}</p>${awakenBtn('awaken', g.uid, g)}
        ${g.tier ? btn('equip', g.uid, eq ? 'Tháo' : 'Trang bị') : ''} ${btn('dismantle', g.uid, 'Rã')}</div>`;
    }).join('');
  }
  function cpTab() {
    return ownedOnly(cp.skills, (s) => {
      const lv = st().cp[s.id] || 0, ok = craft.stageOk(s.unlock), own = o.owns(s.id);
      const lock = own ? '' : `<p class="lock">🔒 Cần ${E(name(o.teacher.get(s.id)))} trong kho</p>`;
      const inp = s.learn && s.learn.inputs.map((i) => ({ id: i.id, count: i.count * (lv + 1) }));
      return `<div class="row"><div class="row-h"><b>${ico(s.id)}${E(s.name)}</b><em>cấp ${lv}/${s.max_level}${ok ? '' : ` · mở ở ${E(stageName(s.unlock))}`}</em></div>
        <p>${E(s.desc)}<br>${E(o.info.cpText(s.id))}</p>${lock}
        ${inp ? `<p class="need">${need(inp)}</p>${btn('train', s.id, lv ? 'Nâng cấp' : 'Luyện', own && ok && lv < s.max_level && progress.has(inp))}` : '<p><i>Lab chưa ghi nguyên liệu</i></p>'}</div>`;
    }, 'bí kíp công pháp');
  }
  function matsTab() {
    const rows = Object.entries(st().inv).map(([id, n]) => `<span>${ico(id)}${E(name(id))}</span><b>${n}</b>`).join('');
    return `<div class="row">${o.wallet.html()}</div><div class="row grid2">${rows || '<span>Túi trống — hạ quái để nhặt nguyên liệu</span>'}</div>`;
  }
  function openCultivate(start) {
    const tabs = [{ id: 'realm', name: 'Cảnh giới' }, { id: 'dan', name: 'Luyện đan' }, { id: 'phoi', name: 'Luyện phôi' },
      { id: 'gear', name: 'Thức tỉnh' }, { id: 'cp', name: 'Công pháp' }, { id: 'mats', name: 'Nguyên liệu' }];
    if (start) tabs.unshift(...tabs.splice(tabs.findIndex((t) => t.id === start), 1));
    showSheet({
      title: 'Tu luyện', tabs, note: 'Thử nghiệm phía máy khách: lưu trên máy này, chưa lưu máy chủ.',
      render: (tab) => ({ realm: realmTab, dan: danTab, phoi: phoiTab, gear: gearTab, cp: cpTab, mats: matsTab }[tab])(),
      onAction(act, arg) {
        if (act === 'brew') msg(craft.brewPill(arg));
        if (act === 'use') o.usePill(arg);
        if (act === 'forge') msg(craft.forgeBlank(arg));
        if (act === 'awaken') msg(craft.awakenGear(+arg));
        if (act === 'equip') {
          const g = progress.gear(+arg);
          if (progress.toggleEquip(+arg)) { o.bag.unequip(g.slot); o.onLook(); }
          o.recompute();
        }
        if (act === 'awakenItem') msg(craft.awakenItem(arg));
        if (act === 'wearItem') {
          const it = o.bag.entries().map((e) => e.item).find((x) => x.id === arg);
          o.bag.toggle(it);
          if (o.bag.isEquipped(it)) progress.unequipSlot(it.slot);
          o.onLook(); o.recompute();
        }
        if (act === 'dismantle') msg(craft.dismantle(+arg));
        if (act === 'train') msg(craft.trainSkill(arg));
        progress.changed();
      },
    });
  }

  // ---------- Kho + thanh chỉ số ----------
  function statValue(id) {
    const ps = o.getStats();
    if (!ps) return null;
    if (id === 'mau') return Math.round(o.getHp());
    if (id === 'tu-vi') return st().exp;
    if (id === 'toc-bay') return null;
    const k = DOCK[id];
    return k ? ps[k] : null;
  }
  // ---------- Vạn Bảo Lâu (cửa hàng) ----------
  const today = () => String(o.life.today()); // ngày theo giờ Việt Nam (giờ máy chủ) — giới hạn mua mỗi ngày
  // Vạn Bảo Lâu: chỉ nói công dụng + giá. Công thức / bí kíp: "Đã có" (xanh) / "Chưa có" (xám). Nguyên liệu: số đang có.
  const W = o.wallet, CUR = (s) => s.currency || 'linh-thach';
  function shopRow(s) {
    const d = itemDefs.get(s.id), n = s.stack || 1, isRecipe = !!d.teaches, owned = false, uses = isRecipe && o.ru ? o.ru.total(s.id) : 0; // công thức mua thêm được (có số lần dùng)
    const bought = st().shopDay?.date === today() ? (st().shopDay.n[s.id] || 0) : 0;
    const left = s.daily_limit ? s.daily_limit - bought : Infinity;
    const stageOk = !s.min_stage || craft.stageOk(s.min_stage), itemsOk = !s.cost_items || progress.has(s.cost_items);
    const ok = !owned && left > 0 && stageOk && itemsOk;
    const need = [s.min_stage && `<span class="${stageOk ? 'ok' : ''}">Cần ${E(stageName(s.min_stage))}</span>`,
      ...(s.cost_items || []).map((i) => `<span class="${progress.count(i.id) >= i.count ? 'ok' : ''}">${E(itemDefs.get(i.id)?.name || i.id)} ${progress.count(i.id)}/${i.count}</span>`)].filter(Boolean).join(' · ');
    const note = isRecipe ? (uses ? `<em class="own yes">Còn ${uses} lần</em>` : '<em class="own">Chưa có</em>')
      : `<em>${s.daily_limit ? `Hôm nay còn ${left}/${s.daily_limit}` : `có ${progress.count(s.id)}`}</em>`;
    // Nút mua: tiền gốc của món + Tiên ngọc (mua được mọi món)
    const pays = [...new Set([CUR(s), 'tien-ngoc'])];
    const btns = pays.map((k) => btn('buy', `${k}|${s.id}`, `${k === CUR(s) ? 'Mua · ' : ''}${W.label(k, W.price(s, k))}`, ok && W.can(s, k))).join(' ');
    return `<div class="row"><div class="row-h"><b>${ico(s.id)}${E(d.name)}${n > 1 ? ` ×${n}` : ''}</b>${note}</div>
      <p class="src">${E(o.info.effect(d))}${isRecipe && o.ru ? ` · mỗi cuốn dùng ${o.ru.max(s.id)} lần` : ''}</p>${need && !owned ? `<p class="need">${need}</p>` : ''}
      ${owned ? '' : btns}</div>`;
  }
  const isLT = (s) => CUR(s) === 'linh-thach';
  const SHOP_TABS = { dp: (s, d) => isLT(s) && d.cat === 'dan-phuong', ct: (s, d) => isLT(s) && d.cat === 'phap-khi', cp: (s, d) => isLT(s) && d.cat === 'cong-phap',
    nl: (s, d) => isLT(s) && !d.teaches, pp: (s) => CUR(s) === 'vang', tb: (s) => CUR(s) === 'tien-ngoc' };
  // Tiên khí (trang bị tiên giới): cần Vấn Đỉnh trở lên — người chơi hiện dừng ở Hóa Thần nên chỉ báo trước
  const celestialRow = () => `<div class="row"><div class="row-h"><b>${ico('cur.tien-ngoc')}Tiên khí — trang bị tiên giới</b><em class="own">Chưa mở</em></div>
    <p class="src">Chỉ bán bằng Tiên ngọc. Từ Vấn Đỉnh đến Âm Hư mới chạm được một phần tiên khí.</p>${btn('none', '', 'Cần cảnh giới Vấn Đỉnh', false)}</div>`;
  function openShop() {
    const { shop } = o;
    showSheet({
      title: shop.name, note: 'Giá tạm. Tiên ngọc mua được mọi món — sau này chỉ có khi nạp.',
      tabs: [{ id: 'dp', name: 'Đan phương' }, { id: 'ct', name: 'Công thức' }, { id: 'cp', name: 'Công pháp' }, { id: 'nl', name: 'Nguyên liệu' },
        { id: 'pp', name: 'Phàm phẩm' }, { id: 'tb', name: 'Tiên Bảo' }],
      render: (tab) => `<div class="row">${W.html()}</div>`
        + shop.stock.filter((s) => SHOP_TABS[tab](s, itemDefs.get(s.id))).map(shopRow).join('') + (tab === 'tb' ? celestialRow() : ''),
      onAction(act, arg) {
        if (act !== 'buy') return;
        const [k, id] = arg.split('|');
        const s = shop.stock.find((x) => x.id === id), d = itemDefs.get(id);
        if (!s || W.price(s, k) === null) return;
        // công thức mua thêm được: mỗi cuốn có số lần dùng (recipe-uses.js)
        if (!W.can(s, k)) return toast(`Không đủ ${W.name(k)}`, 1200);
        if (s.min_stage && !craft.stageOk(s.min_stage)) return toast(`Cần cảnh giới ${stageName(s.min_stage)}`, 1500);
        if (s.cost_items && !progress.has(s.cost_items)) return toast('Thiếu vật phẩm đổi', 1500);
        if (st().shopDay?.date !== today()) st().shopDay = { date: today(), n: {} };
        if (s.daily_limit && (st().shopDay.n[id] || 0) >= s.daily_limit) return toast('Hết lượt mua hôm nay', 1200);
        for (const i of s.cost_items || []) progress.take(i.id, i.count);
        W.pay(s, k); progress.add(id, s.stack || 1);
        st().shopDay.n[id] = (st().shopDay.n[id] || 0) + 1;
        o.emit('gain', { id, n: s.stack || 1 }); progress.changed();
        toast(`Đã mua ${d.name} (−${W.label(k, W.price(s, k))})`, 1400);
      },
    });
  }

  return { setGo: (fn) => { goTo = fn; }, openQuests, questBrief, naviGoal, track, pillChoices, openCultivate, openShop, statValue, refreshDock: null };
}
