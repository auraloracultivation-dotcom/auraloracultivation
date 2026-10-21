// Nội dung các bảng Nhiệm vụ / Tu luyện / Kho cho phần chơi thử. Chỉ dựng HTML + gọi luật trong craft/quests.
import { showSheet, escapeHtml as E } from '../ui/index.js';
import { iconUrl } from '../entity/index.js';

const GOAL = { talk: 'Nói chuyện', reach: 'Đến', collect: 'Thu thập', craft: 'Luyện', kill: 'Hạ', boss: 'Hạ boss', dodge_heavy: 'Né đòn nặng',
  discover: 'Khám phá', complete_daily: 'Hoàn thành nhiệm vụ ngày', awaken: 'Thức tỉnh trang bị', use: 'Dùng',
  discover_unique: 'Nhặt các loại linh thảo khác nhau', boss_unique: 'Hạ các boss khác nhau' };
const TYPE = { main: 'Chính tuyến', daily: 'Hằng ngày', explore: 'Khám phá', craft: 'Chế tạo', combat: 'Chiến đấu', long: 'Dài hạn' };
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
  const name = (id) => itemDefs.get(id)?.name || monNames.get(id) || `${id} (chưa có trong game)`;
  const need = (inputs) => inputs.map((i) => {
    const have = progress.count(i.id);
    return `<span class="${have >= i.count ? 'ok' : 'no'}">${E(name(i.id))} ${have}/${i.count}</span>`;
  }).join(' · ');
  const stageName = (id) => gp.player.stages.find((s) => s.id === id)?.name || id;
  const tierName = (id) => awaken.tiers.find((t) => t.id === id)?.name || id;
  const msg = (r) => { if (!r) return; toast(r.msg, 1800); if (r.event) quests.emit(...r.event); o.recompute(); };

  // ---------- Nhiệm vụ ----------
  function rewardText(r) {
    const parts = [];
    if (r.exp) parts.push(`${r.exp} tu vi`);
    if (r.spiritStone) parts.push(`${r.spiritStone} Linh thạch`);
    for (const i of r.items || []) parts.push(`${name(i.id)} ×${i.count}`);
    const later = [r.title && `danh hiệu "${r.title}"`, r.cosmetic && 'trang trí', r.choiceReward && 'rương chọn thưởng'].filter(Boolean);
    return parts.join(', ') + (later.length ? ` <i>(+ ${later.join(', ')} — chưa có hệ thống)</i>` : '');
  }
  function questRow(q, a) {
    const goals = q.goals.map((g, i) => {
      const cur = a ? a.p[i] : 0, ok = cur >= g.count;
      const what = g.target === 'any' || g.type.endsWith('unique') ? '' : ` ${E(name(g.target))}`;
      const fake = a && !ok && quests.isPlaceholder(g.target) ? btn('fake', `${q.id}|${i}`, 'Hoàn thành tạm') : '';
      return `<li class="${ok ? 'ok' : ''}">${GOAL[g.type] || g.type}${what} <b>${cur}/${g.count}</b> ${fake}</li>`;
    }).join('');
    const action = !a ? btn('accept', q.id, 'Nhận') : quests.complete(q.id) ? btn('claim', q.id, 'Nhận thưởng') : '';
    return `<div class="row"><div class="row-h"><b>${E(q.title)}</b><em>${TYPE[q.type] || q.type}</em></div>
      <p>${E(q.desc)}</p><ul>${goals}</ul><p class="rw">Thưởng: ${rewardText(q.rewards)}</p>${action}</div>`;
  }
  function openQuests() {
    showSheet({
      title: 'Nhiệm vụ', note: 'Thử nghiệm: tiến độ lưu trên máy này. "Hoàn thành tạm" dành cho NPC/địa điểm chưa có trong game.',
      tabs: [{ id: 'active', name: 'Đang làm' }, { id: 'avail', name: 'Có thể nhận' }, { id: 'done', name: 'Đã xong' }],
      render(tab) {
        const rows = tab === 'active' ? quests.active().map(({ q, a }) => questRow(q, a))
          : tab === 'avail' ? quests.available().map((q) => questRow(q, null))
            : quests.done().map((q) => `<div class="row done"><b>${E(q.title)}</b> <em>✓</em></div>`);
        return rows.join('') || '<p class="bag-empty">Trống</p>';
      },
      onAction(act, arg) {
        if (act === 'accept') quests.accept(arg);
        if (act === 'fake') { const [id, i] = arg.split('|'); quests.fakeGoal(id, +i); }
        if (act === 'claim') { const r = quests.claim(arg); if (r) { o.onReward(r); toast('Đã nhận thưởng nhiệm vụ', 1500); } }
      },
    });
  }

  // ---------- Tu luyện ----------
  function realmTab() {
    const s = progress.stageDef, next = progress.nextStageDef(), ps = o.getStats();
    let bt = 'Đã ở tầng cao nhất.';
    if (next) {
      const rid = gp.major_realm_first_stage[next.id];
      const r = rid && realms.realms.find((x) => x.id === rid);
      bt = r ? `Lên <b>${E(next.name)}</b>: đủ tu vi + ${E(name(r.breakthrough.pill))} (có ${progress.count(r.breakthrough.pill)}), tỷ lệ ${Math.round(r.breakthrough.rate * 100)}%. Bấm nút Đột phá (trên khung nhân vật).`
        : `Lên <b>${E(next.name)}</b>: đủ tu vi sẽ tự lên tầng.`;
    }
    const rows = Object.keys(STAT).map((k) => `<span>${STAT[k]}</span><b>${k === 'hp' ? `${Math.round(o.getHp())}/${ps.hp}` : ps[k]}</b>`).join('');
    return `<div class="row"><div class="row-h"><b>${E(s.name)}</b><em>${st().exp}/${s.exp_need} tu vi</em></div>
      <p>${bt}</p><p>Linh thạch: <b>${st().stone}</b></p></div><div class="row grid2">${rows}</div>
      <div class="row"><p>Kỹ năng mở theo cảnh giới: Kiếm khí + Khống chế (Trúc Cơ), Linh thú + Lướt (Kết Đan), Diện rộng (Nguyên Anh).</p></div>`;
  }
  // Chỉ hiện công thức ĐANG CÓ trong kho (đan phương / công thức phôi / bí kíp). Muốn thêm → về Vạn Bảo Lâu trong thành mua.
  const none = (what) => `<p class="bag-empty">Kho chưa có ${what} nào.<br>Về Vạn Bảo Lâu trong Thanh Vân Thành để mua (nút Tông môn khi ở trong thành), hoặc săn boss.</p>`;
  const ownedOnly = (list, html, what) => { const own = list.filter((x) => o.owns(x.id)); return own.length ? own.map(html).join('') : none(what); };
  function danTab() {
    return ownedOnly(pills.pills, (p) => {
      const inp = craft.pickInputs(p) || p.recipe.inputs, have = progress.count(p.id), usable = gp.pills[p.id], own = o.owns(p.id);
      return `<div class="row ${own ? '' : 'locked'}"><div class="row-h"><b>${ico(p.id)}${E(p.name)}</b><em>có ${have} · ${Math.round(p.recipe.rate * 100)}%</em></div>
        ${own ? '' : `<p class="lock">🔒 Cần ${E(name(o.teacher.get(p.id)))} trong kho (mua ở Vạn Bảo Lâu hoặc rơi từ boss)</p>`}
        <p class="need">${need(inp)}</p>${btn('brew', p.id, 'Luyện', own && progress.has(inp))} ${usable ? btn('use', p.id, 'Dùng', have > 0) : ''}</div>`;
    }, 'đan phương');
  }
  function phoiTab() {
    return ownedOnly(blanks.blanks, (b) => {
      const ok = craft.stageOk(b.unlock), own = o.owns(b.id);
      return `<div class="row ${own ? '' : 'locked'}"><div class="row-h"><b>${ico(`slot.${b.slot}`)}Phôi ${SLOT[b.slot]}</b><em>${ok ? `${Math.round(b.rate * 100)}%` : `mở ở ${E(stageName(b.unlock))}`}</em></div>
        ${own ? '' : `<p class="lock">🔒 Cần ${E(name(o.teacher.get(b.id)))} trong kho</p>`}
        <p class="need">${need(b.inputs)}</p>${btn('forge', b.id, 'Luyện phôi', own && ok && progress.has(b.inputs))}</div>`;
    }, 'công thức phôi');
  }
  // Dòng thức tỉnh, mỗi dòng tô màu phẩm riêng
  const linesText = (a) => `<span class="ic-lines">${craft.norm(a).lines.map((l, n) => `<i class="ln tier-${l.t}">${n + 1}. ${STAT[l.k]} +${l.v}</i>`).join('')}</span>`;
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
    const head = `<div class="row"><p>Mỗi lần thức tỉnh thêm 1 dòng, màu dòng ngẫu nhiên. Mỗi món có giới hạn 1–10 dòng không báo trước — chạm giới hạn thì nút tắt. Mỗi ô chỉ mặc một món. Linh thạch: <b>${st().stone}</b></p></div>`;
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
        <p>${E(s.desc)}${lv ? ` · +${Math.round(lv * gp.skills.cong_phap_bonus_per_level * 100)}% sát thương kỹ năng liên quan` : ''}</p>${lock}
        ${inp ? `<p class="need">${need(inp)}</p>${btn('train', s.id, lv ? 'Nâng cấp' : 'Luyện', own && ok && lv < s.max_level && progress.has(inp))}` : '<p><i>Lab chưa ghi nguyên liệu</i></p>'}</div>`;
    }, 'bí kíp công pháp');
  }
  function matsTab() {
    const rows = Object.entries(st().inv).map(([id, n]) => `<span>${ico(id)}${E(name(id))}</span><b>${n}</b>`).join('');
    return `<div class="row"><p>Linh thạch: <b>${st().stone}</b></p></div><div class="row grid2">${rows || '<span>Túi trống — hạ quái để nhặt nguyên liệu</span>'}</div>`;
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
  const today = () => new Date().toLocaleDateString('sv');
  function shopRow(s) {
    const d = itemDefs.get(s.id), n = s.stack || 1, isRecipe = !!d.teaches, owned = isRecipe && progress.count(s.id) > 0;
    const bought = st().shopDay?.date === today() ? (st().shopDay.n[s.id] || 0) : 0;
    const left = s.daily_limit ? s.daily_limit - bought : Infinity;
    const can = !owned && left > 0 && st().stone >= s.price;
    const note = owned ? 'Đã có trong kho' : s.daily_limit ? `Hôm nay còn ${left}/${s.daily_limit}` : isRecipe ? 'Giữ trong kho để luyện' : `có ${progress.count(s.id)}`;
    return `<div class="row"><div class="row-h"><b>${ico(s.id)}${E(d.name)}${n > 1 ? ` ×${n}` : ''}</b><em>${note}</em></div>
      ${btn('buy', s.id, owned ? 'Đã có' : `Mua · ${s.price} LT`, can)}</div>`;
  }
  const SHOP_TABS = { dp: (d) => d.cat === 'dan-phuong', ct: (d) => d.cat === 'phap-khi', cp: (d) => d.cat === 'cong-phap', nl: (d) => !d.teaches };
  function openShop() {
    const { shop } = o;
    showSheet({
      title: shop.name, note: `Giá tạm (Lab chưa có giá). Không bán: Hóa Thần Đan phương, công thức Cánh / Pháp tướng, Tinh Hồn Cổ, phôi Đỏ+ — chỉ rơi từ boss.`,
      tabs: [{ id: 'dp', name: 'Đan phương' }, { id: 'ct', name: 'Công thức' }, { id: 'cp', name: 'Công pháp' }, { id: 'nl', name: 'Nguyên liệu' }],
      render: (tab) => `<div class="row"><p>Linh thạch: <b>${st().stone}</b></p></div>`
        + shop.stock.filter((s) => SHOP_TABS[tab](itemDefs.get(s.id))).map(shopRow).join(''),
      onAction(act, id) {
        if (act !== 'buy') return;
        const s = shop.stock.find((x) => x.id === id), d = itemDefs.get(id);
        if (d.teaches && progress.count(id) > 0) return toast('Đã có trong kho', 1200);
        if (st().stone < s.price) return toast('Không đủ Linh thạch', 1200);
        if (st().shopDay?.date !== today()) st().shopDay = { date: today(), n: {} };
        if (s.daily_limit && (st().shopDay.n[id] || 0) >= s.daily_limit) return toast('Hết lượt mua hôm nay', 1200);
        progress.addStone(-s.price); progress.add(id, s.stack || 1);
        st().shopDay.n[id] = (st().shopDay.n[id] || 0) + 1;
        o.emit('gain', { id, n: s.stack || 1 }); progress.changed();
        toast(`Đã mua ${d.name}`, 1200);
      },
    });
  }

  return { openQuests, openCultivate, openShop, statValue, refreshDock: null };
}
