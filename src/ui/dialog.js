// Hội thoại NPC + bảng chọn hệ Đạo Tâm (chủ dự án 24/10/2026: "có npc để chat với người chơi", chữ ngắn).
// Hội thoại: khung dưới màn hình, từng câu một, chạm để sang câu tiếp; auto = tự sang câu sau 2,6 giây.
import { escapeHtml as E } from './screens.js';

const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };

export function showDialog({ name, lines, auto = false, onClose }) {
  const ui = document.getElementById('ui');
  const box = el(`<div class="npc-talk" role="dialog" aria-label="${E(name)}"><b>${E(name)}</b><p></p><em>Chạm để tiếp ▸</em></div>`);
  ui.appendChild(box);
  let i = 0, timer = 0;
  const show = () => {
    if (i >= lines.length) { clearTimeout(timer); box.remove(); onClose?.(); return; }
    box.querySelector('p').textContent = lines[i];
    box.querySelector('em').textContent = i === lines.length - 1 ? 'Chạm để đóng ✓' : 'Chạm để tiếp ▸';
    clearTimeout(timer); if (auto) timer = setTimeout(() => { i++; show(); }, 2600);
  };
  box.addEventListener('pointerdown', (e) => { e.stopPropagation(); i++; show(); });
  if (!lines.length) { box.remove(); onClose?.(); return; }
  show();
}

// list: [{ he, name, color, desc }]; onPick(he | null)
export function showHeChooser({ list, onPick }) {
  const wrap = el('<div class="overlay modal-wrap he-wrap"></div>');
  const box = el(`<div class="he-pick" role="dialog" aria-label="Chọn Đạo Tâm">
    <b class="he-title">Chọn Đạo Tâm</b><p class="he-note">Cả bộ 12 món nhiệm vụ tặng sẽ theo hệ này. Chọn rồi không đổi.</p>
    <div class="he-grid">${list.map((o) => `<button type="button" class="he-opt" data-he="${E(o.he)}" style="--c:${o.color}">
      <i>${E(o.he)}</i><b>${E(o.name)}</b><small>${E(o.desc)}</small></button>`).join('')}</div></div>`);
  wrap.appendChild(box); document.getElementById('ui').appendChild(wrap);
  let picked = null;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-he]'); if (!b) return;
    if (picked !== b.dataset.he) { picked = b.dataset.he; box.querySelectorAll('.he-opt').forEach((x) => x.classList.toggle('on', x === b)); b.querySelector('small').textContent = 'Chạm lần nữa để chọn'; return; }
    wrap.remove(); onPick(picked);
  });
}
