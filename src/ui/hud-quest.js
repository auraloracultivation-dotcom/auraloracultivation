// Khung Nhiệm vụ trên HUD (chủ dự án 23/10/2026). Màn dọc: cột trái dưới ô tiền; màn ngang: cạnh trái.
// Bật/tắt bằng nút ◆ trên đầu khung hoặc nút cuộn giấy góc phải. Khung: assets/ui/frames/hud-khung-nhiem-vu.png (451×316).
// Mỗi dòng: [loại] tên + mục tiêu đang làm, màu theo độ hiếm / độ khó (data/quests/quests.json → tier).
// Chạm đầu khung → bảng Nhiệm vụ đầy đủ. Chạm một dòng → DẪN ĐƯỜNG tới nơi làm nhiệm vụ đó (src/game/navi.js).
import { escapeHtml } from './screens.js';

const KEY = 'tc.hud.quest';
const at = (x, y, w, h) => `left:${(x / 451) * 100}%;top:${(y / 316) * 100}%;width:${(w / 451) * 100}%;height:${(h / 316) * 100}%`;
// đầu khung: chiều dọc tính theo bề rộng (cqw) — khung thu gọn thấp hơn nhiều nhưng nút vẫn nằm đúng chỗ vẽ
const head = (x, y, w, h) => `left:${(x / 451) * 100}%;top:${(y / 451) * 100}cqw;width:${(w / 451) * 100}%;height:${(h / 451) * 100}cqw`;

export function createQuestBox(parent, { onOpen, onTrack }) {
  const el = document.createElement('div');
  el.className = 'h3-quest';
  el.innerHTML = `<button type="button" class="h3-q-head" style="${head(10, 6, 370, 52)}" aria-label="Mở bảng Nhiệm vụ"></button>
    <button type="button" class="h3-q-tog" style="${head(384, 8, 52, 50)}" aria-label="Thu gọn / mở khung Nhiệm vụ"></button>
    <div class="h3-q-list" style="${at(30, 74, 394, 220)}"></div>`;
  parent.appendChild(el);
  const list = el.querySelector('.h3-q-list');
  let min = false;
  try { min = localStorage.getItem(KEY) === 'min'; } catch { /* bỏ qua */ }
  const apply = () => { el.classList.toggle('min', min); try { localStorage.setItem(KEY, min ? 'min' : 'open'); } catch { /* bỏ qua */ } };
  apply();
  const toggle = () => { min = !min; apply(); };
  el.querySelector('.h3-q-tog').addEventListener('click', toggle);
  el.querySelector('.h3-q-head').addEventListener('click', onOpen);
  list.addEventListener('click', (e) => {
    const r = e.target.closest('[data-q]');
    if (r?.dataset.q && !r.classList.contains('ready')) onTrack(r.dataset.q); else onOpen(); // xong rồi → mở bảng để nhận thưởng
  });

  let key = '';
  return {
    toggle,
    // rows: [{ id, tag, color, title, goal, ready, tracked, nav }] — tối đa 3 dòng; nav = có chỗ để dẫn đường
    set(rows) {
      const k = JSON.stringify(rows); if (k === key) return; key = k;
      list.innerHTML = rows.slice(0, 3).map((r) => `<div data-tap class="h3-q-row${r.ready ? ' ready' : ''}${r.tracked ? ' on' : ''}" data-q="${escapeHtml(r.id || '')}" style="--c:${r.color || '#f2c77f'}">
        <b><em>[${escapeHtml(r.tag)}]</em> ${escapeHtml(r.title)}</b><span>${r.ready ? '✓ Xong — chạm nhận thưởng' : `${r.nav ? '➤ ' : '· '}${escapeHtml(r.goal)}`}</span></div>`).join('')
        || '<div class="h3-q-row empty"><span>Chưa nhận nhiệm vụ — chạm để xem</span></div>';
    },
  };
}
