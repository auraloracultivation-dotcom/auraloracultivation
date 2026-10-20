// Kho đồ (túi trữ vật) và hộp nhập mã. Chỉ hiển thị — dữ liệu và luật do main.js truyền vào.
import { el } from './stage.js';
import { escapeHtml, toast } from './screens.js';

const SLOT_NAME = {
  'mat-na': 'Mặt nạ', 'trang-phuc': 'Trang phục', 'vu-khi': 'Vũ khí', nhan: 'Nhẫn',
  canh: 'Cánh', 'linh-thu': 'Linh thú', 'day-chuyen': 'Dây chuyền', 'phap-tuong': 'Pháp tướng',
};

function overlay(cls) {
  const wrap = el(`<div class="overlay modal-wrap ${cls}"></div>`);
  document.getElementById('ui').appendChild(wrap);
  const close = () => { wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 180); };
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  return { wrap, close };
}

// categories: [[id, tên]], getEntries(): [{ item, count }], isEquipped(item), onToggle(item) → cập nhật trạng thái
// thumb(item): đường dẫn ảnh. note: dòng ghi chú cuối kho (vd. "Đồ thử nghiệm, chỉ lưu trên máy này").
export function showBag({ categories, getEntries, isEquipped, onToggle, thumb, note }) {
  const { wrap, close } = overlay('bag-wrap');
  const box = el(`<div class="bag" role="dialog" aria-label="Kho">
    <div class="bag-head"><b>Kho</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>
    <div class="bag-tabs" role="tablist">${categories.map(([id, n], i) =>
    `<button type="button" data-cat="${id}" aria-pressed="${i === 0}">${escapeHtml(n)}</button>`).join('')}</div>
    <div class="bag-grid"></div>
    <div class="bag-detail" hidden></div>
    ${note ? `<p class="bag-note">${escapeHtml(note)}</p>` : ''}
  </div>`);
  wrap.appendChild(box);
  box.querySelector('.bag-x').addEventListener('click', close);
  const grid = box.querySelector('.bag-grid'), detail = box.querySelector('.bag-detail');
  let cat = categories[0][0], sel = null;

  const render = () => {
    const list = getEntries().filter((e) => cat === 'tat-ca' || e.item.cat === cat);
    grid.innerHTML = list.length ? list.map(({ item, count }) => `
      <button type="button" class="bag-cell ${isEquipped(item) ? 'on' : ''} ${sel === item.id ? 'sel' : ''}" data-id="${item.id}"
        aria-label="${escapeHtml(item.name)}">
        <img src="${thumb(item)}" alt="" loading="lazy">${count > 1 ? `<i>${count}</i>` : ''}${isEquipped(item) ? '<em>Đang dùng</em>' : ''}
      </button>`).join('') : '<p class="bag-empty">Chưa có vật phẩm</p>';
    const it = list.find((e) => e.item.id === sel)?.item;
    detail.hidden = !it;
    if (it) {
      const eq = isEquipped(it);
      detail.innerHTML = `<div><b>${escapeHtml(it.name)}</b><span>${escapeHtml(SLOT_NAME[it.slot] || '')}${it.he ? ` · hệ ${escapeHtml(it.he)}` : ''}</span></div>
        ${it.slot ? `<button type="button" class="bag-act">${eq ? 'Tháo ra' : 'Trang bị'}</button>` : ''}`;
      detail.querySelector('.bag-act')?.addEventListener('click', () => {
        onToggle(it);
        toast(isEquipped(it) ? `Đã trang bị ${it.name}` : `Đã tháo ${it.name}`, 1200);
        render();
      });
    }
  };
  box.querySelector('.bag-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat; sel = null;
    box.querySelectorAll('.bag-tabs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    render();
  });
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-id]');
    if (!b) return;
    sel = sel === b.dataset.id ? null : b.dataset.id;
    render();
  });
  render();
  return close;
}

// Hộp nhập mã. onSubmit(code) → Promise<string thông báo> (ném lỗi = mã sai)
export function showCodeDialog({ onSubmit }) {
  const { wrap, close } = overlay('code-wrap');
  const box = el(`<form class="bag code-box" autocomplete="off">
    <div class="bag-head"><b>Nhập mã</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>
    <input class="code-in" type="text" maxlength="40" placeholder="Nhập mã quà tặng" autocapitalize="none" autocorrect="off" spellcheck="false">
    <button type="submit" class="bag-act">Xác nhận</button>
    <p class="code-msg" role="status"></p>
  </form>`);
  wrap.appendChild(box);
  const input = box.querySelector('input'), msg = box.querySelector('.code-msg');
  box.querySelector('.bag-x').addEventListener('click', close);
  box.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = input.value.trim();
    if (!code) { msg.textContent = 'Hãy nhập mã.'; return; }
    try {
      const text = await onSubmit(code);
      toast(text, 2200);
      close();
    } catch (err) {
      msg.textContent = err.message || 'Mã không đúng.';
    }
  });
  setTimeout(() => input.focus({ preventScroll: true }), 50);
}
