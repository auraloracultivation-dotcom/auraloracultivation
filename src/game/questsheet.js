// Bảng Nhiệm vụ (thiết kế lại 24/10/2026 — chủ dự án: "nở rộng ra thì lại thấy bên trong trống, thừa thì xoá đi").
// 3 mục, chữ ngắn:
//   Đạo Tâm  — chương đang đi: thanh tiến độ, bước đang làm (thưởng + nút "Tự làm"), các bước của chương (✓ / ▶ / ·)
//   Hằng ngày — nhiệm vụ ngày / tuần: nhận, đi làm, nhận thưởng trong cùng một hàng
//   Bí Cảnh  — như cũ
// Bỏ: mục "Đã xong", ghi chú thử nghiệm, nút "Hoàn thành tạm".
import { showSheet, escapeHtml as E } from '../ui/index.js';
import { compactNum as N } from '../core/index.js';
import { sound } from '../audio/index.js';

const SLOT = { 'mat-na': 'Mặt nạ', 'trang-phuc': 'Trang phục', 'vu-khi': 'Vũ khí', nhan: 'Nhẫn', canh: 'Cánh', 'linh-thu': 'Thú hồn',
  'day-chuyen': 'Dây chuyền', 'phap-tuong': 'Pháp tướng' };
const GIFT = { 'skill:sin': 'Kỹ năng tuyệt chiêu', 'skill:cui': 'Kỹ năng phụ', card: 'Thần Phù', pb: 'Pháp bảo' };
const btn = (act, arg, text, on = true) => `<button type="button" class="bag-act sm" data-act="${act}" data-arg="${E(arg)}"${on ? '' : ' disabled'}>${text}</button>`;

// d: { daotam, he(), quests, questRow(q, a), biCanhTab(), biCanhAction(act, arg, close), name(id), onAuto(), autoOn(), goTo(id), onReward(r), toast }
export function openQuestSheet(d) {
  const { daotam: D, quests } = d;
  function dtReward(r = {}) {
    const p = [];
    if (r.gift) p.push(`<b class="qs-gift">★ ${E(r.gift.startsWith('gear:') ? `${SLOT[r.gift.slice(5)] || r.gift.slice(5)} Đạo Tâm` : GIFT[r.gift] || r.gift)}</b>`);
    if (r.exp_lv) p.push('tu vi');
    if (r.stone) p.push(`${N(r.stone)} Linh thạch`);
    if (r.gold) p.push(`${N(r.gold)} Vàng`);
    for (const [id, n] of r.items || []) p.push(`${E(d.name(id))} ×${n}`);
    return p.join(' · ');
  }
  function dtTab() {
    const steps = D.steps(), P = D.progress(), s = steps[P.i];
    if (!s) return '<div class="qs-card"><b>Đã hoàn thành Con đường Đạo Tâm!</b><p>Bộ 12 món đã đủ. Đi bí cảnh khoe Đạo Vận thôi.</p></div>';
    const chap = steps.filter((x) => x.ci === s.ci), at = chap.indexOf(s);
    const he = d.he();
    const left = s.goal.count ? ` <em>${P.p}/${s.goal.count}</em>` : '';
    return `<div class="qs-head"><b>${E(s.chapter)}</b><em>${he ? `Hệ ${E(he)} · ` : ''}bước ${P.i + 1}/${P.n}</em></div>
      <div class="qs-bar"><i style="width:${(P.i / P.n) * 100}%"></i></div>
      <div class="qs-card"><b>▶ ${E(s.title)}${left}</b>${s.tip ? `<p>${E(s.tip)}</p>` : ''}<p class="rw">Thưởng: ${dtReward(s.reward)}</p>
        ${btn('auto', '', d.autoOn() ? '■ Đang tự làm' : '▶ Tự làm nhiệm vụ')}</div>
      <ol class="qs-steps">${chap.map((x, k) => `<li class="${k < at ? 'ok' : k === at ? 'on' : ''}">${k < at ? '✓' : k === at ? '▶' : '·'} ${E(x.title)}${x.reward?.gift ? ' <b class="qs-gift">★</b>' : ''}</li>`).join('')}</ol>`;
  }
  function dailyTab() {
    const ORD = { daily: 0, weekly: 1 };
    const act = quests.active().sort((x, y) => (ORD[x.q.type] ?? 2) - (ORD[y.q.type] ?? 2)).map(({ q, a }) => d.questRow(q, a));
    const av = quests.available().map((q) => d.questRow(q, null));
    return [...act, ...av].join('') || '<p class="bag-empty">Hôm nay chưa có nhiệm vụ — quay lại sau 0h nhé.</p>';
  }
  showSheet({
    title: 'Nhiệm vụ',
    tabs: [{ id: 'dt', name: 'Đạo Tâm' }, { id: 'day', name: 'Hằng ngày' }, { id: 'bc', name: 'Bí Cảnh' }],
    render: (tab) => (tab === 'dt' ? dtTab() : tab === 'day' ? dailyTab() : d.biCanhTab()),
    onAction(act, arg, close) {
      if (act === 'auto') { d.onAuto(); close(); return; }
      if (act.startsWith('bc-')) { d.biCanhAction(act, arg, close); return; }
      if (act === 'accept') quests.accept(arg);
      if (act === 'go') { close(); d.goTo?.(arg); return; }
      if (act === 'claim') { const r = quests.claim(arg); if (r) { d.onReward(r); d.toast('Đã nhận thưởng nhiệm vụ', 1500); sound('sfx.nv.xong'); } }
    },
  });
}
