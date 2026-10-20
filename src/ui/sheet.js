// Bảng nhiều thẻ dùng chung (Nhiệm vụ, Tu luyện). Giao diện tạm cùng kiểu Kho; nội dung HTML do nơi gọi dựng.
// tabs: [{ id, name }], render(tabId) → HTML, onAction(act, arg) → gọi khi bấm nút có data-act; bảng tự vẽ lại sau đó.
import { el } from './stage.js';
import { escapeHtml } from './screens.js';

export function showSheet({ title, tabs, render, onAction, note }) {
  const wrap = el('<div class="overlay modal-wrap bag-wrap"></div>');
  document.getElementById('ui').appendChild(wrap);
  const close = () => { clearInterval(timer); wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 180); };
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  const box = el(`<div class="bag sheet" role="dialog" aria-label="${escapeHtml(title)}">
    <div class="bag-head"><b>${escapeHtml(title)}</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>
    <div class="bag-tabs" role="tablist" style="grid-template-columns:repeat(${Math.min(tabs.length, 4)},1fr)">${tabs.map((t, i) =>
    `<button type="button" data-tab="${t.id}" aria-pressed="${i === 0}">${escapeHtml(t.name)}</button>`).join('')}</div>
    <div class="sheet-body"></div>
    ${note ? `<p class="bag-note">${escapeHtml(note)}</p>` : ''}
  </div>`);
  wrap.appendChild(box);
  const body = box.querySelector('.sheet-body');
  let tab = tabs[0].id;
  const paint = () => { const y = body.scrollTop; body.innerHTML = render(tab); body.scrollTop = y; };
  box.querySelector('.bag-x').addEventListener('click', close);
  box.querySelector('.bag-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    tab = b.dataset.tab; body.scrollTop = 0;
    box.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    paint();
  });
  body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    onAction(b.dataset.act, b.dataset.arg);
    paint();
  });
  const timer = setInterval(paint, 1500); // tiến độ đổi khi đang mở (quái chết sau lưng…)
  paint();
  return close;
}

// Biểu tượng tạm cho vật phẩm chưa có hình: ô bo góc màu theo nhóm + chữ đầu tên
const cache = new Map();
const GROUP_COLOR = { thao: '#3f8f4a', khoang: '#6b6f80', dacbiet: '#7a3fb0', dan: '#b8572e', nhiemvu: '#a08220' };
export function placeholderIcon(name, group) {
  const key = `${group}|${name}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = GROUP_COLOR[group] || '#555'; g.strokeStyle = '#f2c77f'; g.lineWidth = 3;
  g.beginPath(); g.roundRect(4, 4, 56, 56, 12); g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.font = 'bold 26px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(name.split(' ').map((w) => w[0]).slice(0, 2).join(''), 32, 34);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
