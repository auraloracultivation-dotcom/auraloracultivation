// Bảng hồi sinh khi đang là linh hồn (yêu cầu chủ dự án 21/10): nằm trên cùng màn hình, KHÔNG che cần điều khiển
// để linh hồn vẫn đi lại được. Hai nút: về thành hồi sinh (miễn phí) / hồi sinh tại chỗ (trả Linh thạch).
import { escapeHtml } from './screens.js';

export function showRevive({ cost, stone, townName, onTown, onHere }) {
  const box = document.createElement('div');
  box.className = 'revive-box';
  const enough = stone >= cost;
  box.innerHTML = `<b>Đã hoá thành linh hồn</b>
    <p>Linh hồn chỉ đi lại được. Chọn cách hồi sinh:</p>
    <div class="revive-btns">
      <button type="button" class="bag-act" data-r="town">Về ${escapeHtml(townName)} hồi sinh</button>
      <button type="button" class="bag-act" data-r="here" ${enough ? '' : 'disabled'}>Hồi sinh tại đây · ${cost} LT</button>
    </div>
    ${enough ? '' : `<p class="revive-note">Không đủ Linh thạch (có ${stone})</p>`}`;
  document.body.appendChild(box);
  const close = () => box.remove();
  box.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('[data-r]');
    if (!b || b.disabled) return;
    e.preventDefault(); e.stopPropagation();
    close();
    (b.dataset.r === 'town' ? onTown : onHere)();
  });
  return close;
}
