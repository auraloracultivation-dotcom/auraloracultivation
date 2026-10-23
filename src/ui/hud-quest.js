// Khung Nhiệm vụ trên HUD (chủ dự án 23/10/2026): bên phải màn hình, bật/tắt bằng nút ◆ trên đầu khung
// hoặc nút cuộn giấy ở góc trên phải. Khung: assets/ui/frames/hud-khung-nhiem-vu.png (451×316).
// Mỗi dòng: [loại] tên nhiệm vụ + mục tiêu đang làm, màu theo độ hiếm / độ khó (data/quests/quests.json → tier).
// Chạm một dòng → mở bảng Nhiệm vụ đầy đủ.
import { escapeHtml } from './screens.js';

const KEY = 'tc.hud.quest';
const at = (x, y, w, h) => `left:${(x / 451) * 100}%;top:${(y / 316) * 100}%;width:${(w / 451) * 100}%;height:${(h / 316) * 100}%`;

export function createQuestBox(parent, { onOpen }) {
  const el = document.createElement('div');
  el.className = 'h3-quest';
  el.innerHTML = `<button type="button" class="h3-q-head" style="${at(10, 6, 370, 52)}" aria-label="Mở bảng Nhiệm vụ"></button>
    <button type="button" class="h3-q-tog" style="${at(384, 12, 52, 50)}" aria-label="Thu gọn / mở khung Nhiệm vụ"></button>
    <div class="h3-q-list" style="${at(34, 76, 386, 214)}"></div>`;
  parent.appendChild(el);
  const list = el.querySelector('.h3-q-list');
  let min = false;
  try { min = localStorage.getItem(KEY) === 'min'; } catch { /* bỏ qua */ }
  const apply = () => { el.classList.toggle('min', min); try { localStorage.setItem(KEY, min ? 'min' : 'open'); } catch { /* bỏ qua */ } };
  apply();
  const toggle = () => { min = !min; apply(); };
  el.querySelector('.h3-q-tog').addEventListener('click', toggle);
  el.querySelector('.h3-q-head').addEventListener('click', onOpen);
  list.addEventListener('click', onOpen);

  let key = '';
  return {
    toggle,
    // rows: [{ tag, color, title, goal, ready }] — tối đa 3 dòng
    set(rows) {
      const k = JSON.stringify(rows); if (k === key) return; key = k;
      list.innerHTML = rows.slice(0, 3).map((r) => `<div class="h3-q-row${r.ready ? ' ready' : ''}" style="--c:${r.color || '#f2c77f'}">
        <b><em>[${escapeHtml(r.tag)}]</em> ${escapeHtml(r.title)}</b><span>${r.ready ? '✓ Xong — nhận thưởng' : `· ${escapeHtml(r.goal)}`}</span></div>`).join('')
        || '<div class="h3-q-row empty"><span>Chưa nhận nhiệm vụ — chạm để xem</span></div>';
    },
  };
}
