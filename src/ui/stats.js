// Chỉ số nhân vật ở cạnh trái màn hình (thiết kế chủ dự án):
//   thanh gọn — 2 ô (biểu tượng + số), ▲▼ để lướt qua 16 chỉ số
//   chạm vào ô → phóng to thành bảng đầy đủ 16 chỉ số; chạm lần nữa / ✕ → thu nhỏ lại
// Khung sinh bằng tools/stats_ui.py. Giá trị lấy từ getValue(id); chưa có dữ liệu thì hiện "—".
import { escapeHtml } from './screens.js';

export const STATS = [
  { id: 'mau', name: 'Máu' }, { id: 'linh-khi', name: 'Linh khí' }, { id: 'tu-vi', name: 'Tu vi' },
  { id: 'tan-cong', name: 'Tấn công' }, { id: 'phong-thu', name: 'Phòng thủ' }, { id: 'toc-chay', name: 'Tốc chạy' },
  { id: 'chinh-xac', name: 'Chính xác' }, { id: 'toc-danh', name: 'Tốc đánh' },
  { id: 'bao-kich', name: 'Bạo kích' }, { id: 'hut-mau', name: 'Hút máu' }, { id: 'phan-don', name: 'Phản đòn' },
  { id: 'ne-tranh', name: 'Né tránh' }, { id: 'tai-trong', name: 'Tải trọng' }, { id: 'toc-bay', name: 'Tốc bay' },
  { id: 'xuyen-giap', name: 'Xuyên giáp' }, { id: 'ngu-thu', name: 'Ngự thú' },
];

const GON = { src: 'assets/ui/frames/chi-so-gon.png', w: 495, h: 1329,
  slots: [[118, 161, 311, 313], [118, 539, 312, 300]], up: [132, 954, 130, 125], down: [131, 1122, 130, 122] };
const FULL = { src: 'assets/ui/frames/chi-so-day-du.png', w: 881, h: 1518,
  // tâm ô số, theo thứ tự STATS (cột trái 8, cột phải 8)
  nums: [[425, 260], [425, 401], [425, 543], [425, 691], [425, 834], [425, 982], [425, 1125], [425, 1271],
    [735, 261], [735, 401], [735, 544], [735, 691], [735, 841], [735, 986], [735, 1127], [735, 1272]] };

const pct = (f, x, y, w, h) =>
  `left:${(x / f.w) * 100}%;top:${(y / f.h) * 100}%;width:${(w / f.w) * 100}%;height:${(h / f.h) * 100}%`;
const fmt = (v) => (v === null || v === undefined ? '—' : String(v));

export function createStatsDock({ getValue = () => null } = {}) {
  const root = document.getElementById('ui');
  const dock = document.createElement('div');
  dock.className = 'stats-dock';
  dock.style.aspectRatio = `${GON.w} / ${GON.h}`;
  dock.innerHTML = `
    ${GON.slots.map((s, i) => `<button type="button" class="sd-slot" data-slot="${i}" style="${pct(GON, ...s)}">
      <img alt=""><b></b></button>`).join('')}
    <button type="button" class="sd-arrow" data-dir="-1" aria-label="Chỉ số trước" style="${pct(GON, ...GON.up)}"></button>
    <button type="button" class="sd-arrow" data-dir="1" aria-label="Chỉ số sau" style="${pct(GON, ...GON.down)}"></button>`;
  root.appendChild(dock);

  let index = 3; // bắt đầu ở Tấn công / Phòng thủ như thiết kế
  const slots = [...dock.querySelectorAll('.sd-slot')];
  const paint = () => {
    slots.forEach((el, i) => {
      const s = STATS[index + i];
      el.querySelector('img').src = `assets/ui/icons/cs-${s.id}.png`;
      el.querySelector('b').textContent = fmt(getValue(s.id));
      el.setAttribute('aria-label', `${s.name}: ${fmt(getValue(s.id))}`);
      el.title = s.name;
    });
  };
  dock.addEventListener('click', (e) => {
    const arrow = e.target.closest('.sd-arrow');
    if (arrow) {
      index = Math.max(0, Math.min(STATS.length - 2, index + Number(arrow.dataset.dir)));
      paint();
      return;
    }
    if (e.target.closest('.sd-slot')) openFull();
  });

  let full = null;
  function openFull() {
    if (full) return;
    full = document.createElement('div');
    full.className = 'stats-full-wrap';
    full.innerHTML = `<div class="stats-full" style="aspect-ratio:${FULL.w} / ${FULL.h}">
      ${STATS.map((s, i) => {
        const [cx, cy] = FULL.nums[i];
        return `<b class="sf-num" style="${pct(FULL, cx - 58, cy - 22, 116, 44)}" title="${escapeHtml(s.name)}">${fmt(getValue(s.id))}</b>`;
      }).join('')}
      <button type="button" class="sf-close" aria-label="Thu nhỏ"><img src="assets/ui/icons/ban-do-dong.png" alt=""></button>
    </div>`;
    root.appendChild(full);
    // phóng từ vị trí thanh gọn ra
    const d = dock.getBoundingClientRect();
    full.style.setProperty('--ox', `${d.left + d.width / 2}px`);
    full.style.setProperty('--oy', `${d.top + d.height / 2}px`);
    requestAnimationFrame(() => full.classList.add('open'));
    full.addEventListener('click', closeFull); // chạm bất kỳ đâu để thu nhỏ
  }
  function closeFull() {
    if (!full) return;
    const f = full;
    full = null;
    f.classList.remove('open');
    setTimeout(() => f.remove(), 220);
  }

  // Đặt kích thước: ngay dưới khung nhân vật, không đè nút Chat
  function layout() {
    const info = document.querySelector('.player-info');
    const chat = document.querySelector('.chatbar');
    const top = (info ? info.getBoundingClientRect().bottom : 100) + 8;
    const portrait = window.innerHeight > window.innerWidth;
    const bottomLimit = portrait && chat ? chat.getBoundingClientRect().top - 10 : window.innerHeight - 12;
    const h = Math.max(90, Math.min(200, bottomLimit - top));
    const w = (h * GON.w) / GON.h;
    Object.assign(dock.style, { top: `${top}px`, width: `${w}px` });
    if (chat) chat.style.left = portrait ? '' : `${dock.getBoundingClientRect().right + 8}px`; // ngang: Chat dời sang phải thanh
  }
  layout();
  requestAnimationFrame(layout);
  addEventListener('resize', layout);
  paint();
  return { refresh: paint, layout };
}
