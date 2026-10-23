// CẨM NANG ĐẠO VẬN (chủ dự án 23/10/2026): nút nhỏ cạnh màn hình hiện bộ đang kích ("☯ Kim 4/8"), chạm mở bảng xem:
// mỗi hệ cần mặc món nào ở ô nào (đang mặc / có trong Kho / chưa có), mốc 2/4/6/8 sáng khi đạt, kỹ năng cùng hệ,
// trận cấm chế, nút "Mặc cả bộ"; thẻ Đang kích hoạt + Tổng quan (đếm số hiệu ứng kết hợp). Chỉ đọc data/, không đổi luật chơi.
import { showSheet, escapeHtml as E, createBuildChip } from '../ui/index.js';
import { iconUrl, fxIconUrl } from '../entity/index.js';

const SLOT_ORDER = [['mat-na', 'Mặt nạ'], ['trang-phuc', 'Áo'], ['vu-khi', 'Vũ khí'], ['canh', 'Cánh'], ['phap-tuong', 'Pháp tướng'],
  ['nhan', 'Nhẫn'], ['day-chuyen', 'Dây chuyền'], ['linh-thu', 'Linh thú']];

// c: { dvDef, ccDef, pbDef, items (items.json), S (gp.skills), dv, cards, bag, progress, loadout, stageName, art(id), equip(id), toast }
export function createGuide(c) {
  const { dvDef, S, dv, bag, progress } = c;
  const HE = dvDef.he_order;
  const pic = (src, cls = 'gd-ico') => (src ? `<img class="${cls}" src="${src}" alt="">` : '<span class="gd-ico gd-none"></span>');
  const owned = new Set(bag.entries().map((e) => e.item?.id));
  const skillIcon = (s) => s.medal || s.icon_url || (s.icon && fxIconUrl(...s.icon)) || null;
  const stageOk = (id) => !id || progress.stageIndex(id) <= progress.state.stage;
  const skOk = (id, s) => c.learn.learned(id) && stageOk(s.unlock);

  // Thiên Cơ Hợp Nhất của hệ: danh sách điều kiện ✓/✗ (hopnhat.js)
  let openHow = null; // điều kiện đang mở giải thích (chạm dấu !)
  function hopRow(he) {
    const H = c.hopNhat, r = H?.def.he[he];
    if (!r) return '';
    const list = H.check(he), on = list.every((x) => x.ok);
    return `<div class="row gd-hop ${on ? 'on' : ''}"><b class="gd-h">✦ ${E(H.def.name)}: ${E(r.name)}${on ? ' — ĐANG KÍCH' : ''}</b>
      <p>Đủ cả 5 điều kiện → pháp bảo hệ ${E(he)} tự bắn liên thanh không nghỉ, không tốn linh lực, linh lực hồi liên tục. Kỹ năng khác không được buff.</p>
      ${list.map((x, i) => `<div class="gd-cond ${x.ok ? 'ok' : ''}">${x.ok ? '✓' : '✗'} ${E(x.text)}${x.how ? ` <button type="button" class="gd-how" data-act="how" data-arg="${E(he)}|${i}" aria-label="Cách lấy">!</button>` : ''}</div>${x.how && openHow === `${he}|${i}` ? `<div class="gd-how-t">${E(x.how)}</div>` : ''}`).join('')}</div>`;
  }
  function heTab(he) {
    const h = dvDef.he[he], n = dv.counts()[he] || 0, mine = new Set(bag.entries().map((e) => e.item?.id));
    const rows = SLOT_ORDER.map(([sl, nm]) => {
      const list = c.items.filter((d) => d.he === he && d.slot === sl);
      return list.map((d) => {
        const on = bag.equippedItem(sl)?.id === d.id, have = mine.has(d.id) || owned.has(d.id);
        const st = on ? '<em class="ok">✓ Đang mặc</em>' : have ? '<em>Có trong Kho</em>' : '<em class="no">Chưa có</em>';
        return `<div class="gd-slot ${on ? 'on' : ''}">${pic(c.art(d.art))}<span><b>${E(nm)}</b>${E(d.name)}</span>${st}</div>`;
      }).join('');
    }).join('');
    const tiers = Object.entries(h.tiers).map(([t, v]) => `<div class="gd-tier ${n >= +t ? 'lit' : ''}" style="--c:${h.color}"><b>${t}/8</b><span>${E(v._mo_ta)}</span></div>`).join('');
    const skills = Object.entries(S).filter(([, s]) => s && s.he === he).map(([id, s]) =>
      `<div class="gd-skill ${skOk(id, s) ? '' : 'lock'}">${pic(skillIcon(s))}<span><b>${E(s.name)}</b>${!c.learn.learned(id) ? 'Chưa lĩnh ngộ (boss 0,5%)' : stageOk(s.unlock) ? 'Đã có' : `Mở ở ${E(c.stageName(s.unlock))}`}</span></div>`).join('');
    const cc = c.ccDef.he[he], pbs = c.pbDef.list.filter((d) => d.he === he);
    return `<div class="row"><div class="row-h"><b style="color:${h.color}">${E(h.name)}</b><em>Hệ ${E(he)} · đang mặc ${n}/8</em></div>
      <p>Mặc càng nhiều món cùng hệ, chiêu càng biến đổi. Đủ 8 = Đại Thành.</p>${tiers}
      ${c.equip ? `<button type="button" class="bag-act sm" data-act="wear" data-arg="${E(he)}">Mặc cả bộ ${E(he)} (đồ + pháp bảo + phù + kỹ năng có sẵn)</button>` : ''}</div>
      ${hopRow(he)}
      <div class="row"><b class="gd-h">Trang bị cần mặc</b>${rows}<p class="gd-note">Phôi tự luyện mang hệ ${E(he)} (thức tỉnh rồi) cũng tính vào bộ.</p></div>
      <div class="row"><b class="gd-h">Kỹ năng hệ ${E(he)}</b><div class="gd-grid">${skills || '<span>—</span>'}</div>
      <p class="gd-note">Kỹ năng bắn đạn được bộ + Thần Phù nhân lên (bắn quạt, nảy, tách…).</p></div>
      <div class="row"><b class="gd-h">Cùng hệ</b><p>Bố Cấm Chế khi mặc nhiều đồ ${E(he)} nhất: <b>${E(cc.name)}</b> — ${E(cc.desc)}.</p>
      ${pbs.length ? `<div class="gd-grid">${pbs.map((d) => `<div class="gd-skill">${pic(d.icon_url || iconUrl(d.id))}<span><b>${E(d.name)}</b>Pháp bảo</span></div>`).join('')}</div>` : ''}</div>`;
  }

  function activeTab() {
    const md = dv.mods();
    const sets = md.sets.length ? md.sets.map((s) => `<div class="gd-tier lit" style="--c:${s.color}"><b>${E(s.he)} ${s.n}/8</b><span>${E(s.name)}: ${s.tiers.map((t) => E(t.text)).join(' · ')}</span></div>`).join('')
      : '<p>Chưa kích hoạt bộ nào — mặc từ 2 món cùng hệ.</p>';
    const cards = c.cards.equippedDefs().map((x) => `<div class="gd-skill">${pic(iconUrl(`card.${x.id}`))}<span><b>${E(x.def.name)}</b>${E(c.cards.text(x))}</span></div>`).join('');
    const sk = c.loadout.ids().filter(Boolean).map((id) => S[id]).filter(Boolean).map((s) =>
      `<div class="gd-skill">${pic(skillIcon(s))}<span><b>${E(s.name)}</b>${s.he ? `Hệ ${E(s.he)}${s.he === md.he ? ' ✦ hợp bộ' : ''}` : 'Chung'}</span></div>`).join('');
    const nums = [md.multishot && `Bắn thêm ${md.multishot} viên`, md.pierce && `Xuyên ${md.pierce}`, md.bounce && `Nảy ${md.bounce}`, md.split && `Tách ${md.split}`,
      md.chain && `Sét lan ${md.chain}`, md.homing && 'Đạn tự đuổi', md.explode && 'Nổ lan', md.orbit?.n && `${md.orbit.n} phi kiếm xoay`, md.turrets?.length && 'Liên thanh tự bắn',
      md.rains?.length && `${md.rains.length} loại mưa chiêu`, md.cd_mul && md.cd_mul < 1 && `Hồi chiêu ×${md.cd_mul}`, md.mp_regen && 'Linh lực hồi liên tục'].filter(Boolean);
    return `<div class="row"><b class="gd-h">Bộ ngũ hành</b>${sets}</div>
      <div class="row"><b class="gd-h">Hiệu ứng đạn đang có</b><p>${nums.length ? nums.map(E).join(' · ') : 'Chưa có — đạn bắn từng viên.'}</p></div>
      <div class="row"><b class="gd-h">Thần Phù đang gắn</b><div class="gd-grid">${cards || '<span>Chưa gắn (Kho → Thần Phù)</span>'}</div></div>
      <div class="row"><b class="gd-h">Kỹ năng trong ô</b><div class="gd-grid">${sk || '<span>—</span>'}</div></div>`;
  }

  function overviewTab() {
    const tiers = HE.reduce((a, h) => a + Object.keys(dvDef.he[h].tiers).length, 0);
    const heSkills = Object.values(S).filter((s) => s?.he).length, allSkills = S._order.filter((id) => S[id]).length;
    const nCards = dvDef.cards.list.length, nPb = c.pbDef.list.length, nCc = Object.keys(c.ccDef.he).length;
    // cách chia 8 ô thành các bộ đạt mốc (2/4/6/8) — mỗi cách là một kiểu build khác nhau
    const parts = []; (function go(left, max, cur) { if (!left) { parts.push(cur); return; } for (const p of [8, 6, 4, 2]) if (p <= Math.min(left, max)) go(left - p, p, [...cur, p]); })(8, 8, []);
    return `<div class="row"><b class="gd-h">Đang có trong game</b>
      <div class="gd-count"><b>${HE.length}</b><span>bộ ngũ hành</span><b>${tiers}</b><span>mốc hiệu ứng bộ (2/4/6/8)</span>
      <b>${nCards}</b><span>loại Thần Phù × 7 phẩm</span><b>${nPb}</b><span>pháp bảo</span><b>${nCc}</b><span>trận cấm chế</span>
      <b>${allSkills}</b><span>kỹ năng (${heSkills} theo hệ)</span></div></div>
      <div class="row"><b class="gd-h">Cách ghép 8 ô</b><p>${parts.map((p) => p.join(' + ')).join(' · ')} — ${parts.length} kiểu chia, mỗi phần chọn 1 trong ${HE.length} hệ.
      Ví dụ 4 Kim + 4 Hỏa: kiếm khí xoè quạt + đạn nổ + đất cháy cùng lúc.</p>
      <p>Cộng thêm ${C3(nCards)} cách chọn 3 Thần Phù, ${nPb} pháp bảo và 7 ô kỹ năng → hàng chục nghìn build khác nhau.</p></div>
      <div class="row"><b class="gd-h">Mẹo</b><p>Hệ có nhiều món nhất quyết định màu đạn, trận cấm chế và kỹ năng "hợp bộ". Đồ 6 hệ rơi từ tinh anh, boss, Âm Hư và Huyết Sát Bí Cảnh.</p></div>`;
  }
  const C3 = (n) => (n * (n - 1) * (n - 2)) / 6;

  function open() {
    showSheet({
      title: 'Cẩm nang Đạo Vận', note: 'Mặc trang bị cùng hệ để kích hiệu ứng. Bảng tự cập nhật.',
      tabs: [{ id: 'on', name: 'Đang kích' }, ...HE.map((h) => ({ id: h, name: h })), { id: 'all', name: 'Tổng quan' }],
      render: (tab) => (tab === 'on' ? activeTab() : tab === 'all' ? overviewTab() : heTab(tab)),
      onAction(act, he) {
        if (act === 'how') { openHow = openHow === he ? null : he; return; } // bảng tự vẽ lại sau onAction
        if (act !== 'wear') return;
        let n = 0;
        for (const [sl] of SLOT_ORDER) {
          const d = c.items.find((x) => x.he === he && x.slot === sl && bag.entries().some((e) => e.item?.id === x.id));
          if (d && bag.equippedItem(sl)?.id !== d.id) { c.equip(d.id); n++; }
        }
        const k = c.hopNhat?.wear(he) || 0; // pháp bảo + Thần Phù + 2 kỹ năng của Thiên Cơ Hợp Nhất (thiếu thì bảng ghi ✗)
        c.toast(n || k ? `Đã mặc ${n} món hệ ${he}${k ? ` + ${k} món Hợp Nhất (pháp bảo / phù / kỹ năng)` : ''}` : 'Không có thêm đồ hệ này trong Kho', 2000);
      },
    });
  }

  // Nút nhỏ cạnh màn hình: hệ đang mạnh nhất + số món
  const chip = createBuildChip({ onOpen: open });
  let last = '';
  function tick() {
    const md = dv.mods(), top = md.sets.reduce((a, s) => (!a || s.n > a.n ? s : a), null);
    const text = 'Đạo Vận'; // chỉ ghi tên (chủ dự án 23/10): số món không phản ánh đúng điểm cần, chạm vào xem chi tiết
    if (text !== last) { last = text; chip.set(text, top?.color || '#c9b98a'); }
  }
  return { open, tick };
}
