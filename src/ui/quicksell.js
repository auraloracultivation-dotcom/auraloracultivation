// Kho → Bán nhanh (chủ dự án 24/10/2026): chọn vòng thức tỉnh (Chưa thức tỉnh / Lục / Lam / Tím / Cam / Vàng),
// xem trước số món + tiền nhận, bấm Bán. Đồ đang mặc, Tiên khí, vòng Đỏ / Đen không bao giờ bị bán (luật ở src/game/inventory.js).
// qs: { tiers: [{ id, name, on }], run(tierIds, dry) → { n, gold, stone, msg } }; onDone(): vẽ lại Kho.
import { el } from './stage.js';
import { escapeHtml as E, showConfirm, toast } from './screens.js';
import { sound } from '../audio/index.js';

const N = (v) => Number(v).toLocaleString('vi');

export function quickSellPanel(qs, onDone) {
  const pick = new Set(qs.tiers.filter((t) => t.on).map((t) => t.id));
  const box = el(`<div class="qs-sell"><b>Bán nhanh pháp khí</b>
    <p class="qs-sell-note">Chọn vòng muốn bán. Đồ đang mặc, Tiên khí, vòng Đỏ / Đen giữ lại.</p>
    <div class="qs-chips">${qs.tiers.map((t) => `<button type="button" class="qs-chip tier-${t.id}" data-t="${E(t.id)}">${E(t.name)}</button>`).join('')}</div>
    <p class="qs-sum"></p><button type="button" class="bag-act qs-go">Bán</button></div>`);
  const paint = () => {
    box.querySelectorAll('[data-t]').forEach((b) => b.setAttribute('aria-pressed', pick.has(b.dataset.t)));
    const r = qs.run([...pick], true);
    box.querySelector('.qs-sum').textContent = r.n ? `${r.n} món → +${N(r.gold)} Vàng${r.stone ? ` · +${N(r.stone)} Linh thạch` : ''}` : 'Không có món nào thuộc vòng đã chọn';
    box.querySelector('.qs-go').disabled = !r.n;
  };
  box.addEventListener('click', async (e) => {
    const c = e.target.closest('[data-t]');
    if (c) { if (pick.has(c.dataset.t)) pick.delete(c.dataset.t); else pick.add(c.dataset.t); paint(); return; }
    if (!e.target.closest('.qs-go')) return;
    const pre = qs.run([...pick], true); if (!pre.n) return;
    if (!(await showConfirm('Bán nhanh', `Bán ${pre.n} món pháp khí? Không lấy lại được.`, { yes: 'Bán', no: 'Thôi' }))) return;
    toast(qs.run([...pick]).msg, 2200); sound('sfx.vang'); paint(); onDone();
  });
  paint();
  return box;
}
