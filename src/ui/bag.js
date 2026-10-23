// Kho đồ (túi trữ vật) và hộp nhập mã. Chỉ hiển thị — dữ liệu và luật do main.js truyền vào.
import { el } from './stage.js';
import { escapeHtml, showConfirm, toast } from './screens.js';

function overlay(cls) {
  const wrap = el(`<div class="overlay modal-wrap ${cls}"></div>`);
  document.getElementById('ui').appendChild(wrap);
  const close = () => { wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 180); };
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  return { wrap, close };
}

// Kho: categories [[id, tên]]; getEntries() → [{ item, count }]; mỗi item có key, name, cat, thumb, sub, detail, equipped,
// actions [{ id, label, disabled, danger, confirm }]. onAction(item, actionId) → Promise | void (luật do nơi gọi xử lý).
// Giao diện Kho kiểu bảng trong (chủ dự án 23/10/2026): nền mờ trong suốt nhìn thấy thế giới phía sau, chỉ ô đồ đậm;
// mục có icon (tabIcons[id] = ảnh), ví 3 loại tiền + nút + (onShop), lưới 5 cột lật trang 25 ô / trang.
const PER_PAGE = 25;
export function showBag({ categories, getEntries, onAction, note, wallet, tab, tabIcons = {}, onShop }) { // tab: mở sẵn mục (vd. 'linh-dan')
  const { wrap, close } = overlay('bag-wrap');
  const box = el(`<div class="bag bag-v2" role="dialog" aria-label="Kho">
    <div class="bag-head"><b>Kho</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>
    <div class="bag-tabs" role="tablist">${categories.map(([id, n], i) =>
    `<button type="button" data-cat="${id}" aria-pressed="${tab ? id === tab : i === 0}">${tabIcons[id] ? `<img src="${tabIcons[id]}" alt="">` : ''}<span>${escapeHtml(n)}</span></button>`).join('')}</div>
    ${wallet ? '<div class="wallet"></div>' : ''}
    <div class="bag-grid"></div>
    <div class="bag-pager"><button type="button" class="bag-pg" data-pg="-1" aria-label="Trang trước">‹</button><b></b><button type="button" class="bag-pg" data-pg="1" aria-label="Trang sau">›</button></div>
    <div class="bag-detail" hidden></div>
    ${note ? `<p class="bag-note">${escapeHtml(note)}</p>` : ''}
  </div>`);
  wrap.appendChild(box);
  box.querySelector('.bag-x').addEventListener('click', close);
  const grid = box.querySelector('.bag-grid'), detail = box.querySelector('.bag-detail');
  let cat = categories.some(([id]) => id === tab) ? tab : categories[0][0], sel = null, page = 0;
  const pager = box.querySelector('.bag-pager');
  pager.addEventListener('click', (e) => { const b = e.target.closest('[data-pg]'); if (b) { page += Number(b.dataset.pg); sel = null; render(); } });
  // vuốt ngang trên lưới để lật trang
  let sx = null;
  grid.addEventListener('pointerdown', (e) => { sx = e.clientX; });
  grid.addEventListener('pointerup', (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 50) { page += e.clientX < sx ? 1 : -1; sel = null; render(); } sx = null; });
  if (onShop && wallet) box.querySelector('.wallet').addEventListener('click', (e) => { if (e.target.closest('.w-plus')) { close(); onShop(); } });

  const render = () => {
    if (wallet) box.querySelector('.wallet').innerHTML = wallet().map((c) => `<span title="${escapeHtml(c.name)}">${c.img ? `<img src="${c.img}" alt="">` : ''}<b>${escapeHtml(c.text)}</b><i>${escapeHtml(c.name)}</i>${onShop ? '<button type="button" class="w-plus" aria-label="Vạn Bảo Lâu">+</button>' : ''}</span>`).join('');
    const list = getEntries().filter((e) => cat === 'tat-ca' || e.item.cat === cat);
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    if (sel) { const at = list.findIndex((e) => e.item.key === sel); if (at >= 0) page = Math.floor(at / PER_PAGE); } // món đang chọn luôn ở trang đang xem
    page = Math.max(0, Math.min(pages - 1, page));
    pager.querySelector('b').textContent = `${page + 1} / ${pages}`;
    pager.querySelectorAll('[data-pg]').forEach((b) => { b.disabled = (b.dataset.pg < 0 && page === 0) || (b.dataset.pg > 0 && page === pages - 1); });
    const shown = list.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE);
    grid.innerHTML = shown.length ? shown.map(({ item, count }) => `
      <button type="button" class="bag-cell ${item.equipped ? 'on' : ''} ${item.tier ? `tier-${item.tier}` : ''} ${sel === item.key ? 'sel' : ''}" data-key="${escapeHtml(item.key)}"
        aria-label="${escapeHtml(item.name)}">
        <img src="${item.thumb || ''}" alt="" loading="lazy">${count > 1 ? `<i>${count}</i>` : ''}${item.equipped ? '<em>Đang dùng</em>' : ''}
      </button>`).join('') : '<p class="bag-empty">Chưa có vật phẩm</p>';
    const it = list.find((e) => e.item.key === sel)?.item;
    detail.hidden = !it;
    if (it) { // thẻ chi tiết: có nút đóng, cuộn được khi dài (đồ 10 dòng) — không che hết lưới đồ
      const x = el('<button type="button" class="bag-detail-x" aria-label="Đóng chi tiết">✕</button>');
      x.addEventListener('click', () => { sel = null; render(); });
      detail.replaceChildren(x, itemCard(it, async (a) => { await onAction(it, a); render(); }));
    }
  };
  box.querySelector('.bag-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('[data-cat]');
    if (!b) return;
    cat = b.dataset.cat; sel = null; page = 0;
    box.querySelectorAll('.bag-tabs button').forEach((x) => x.setAttribute('aria-pressed', x === b));
    render();
  });
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('[data-key]');
    if (!b) return;
    sel = sel === b.dataset.key ? null : b.dataset.key;
    render();
  });
  render();
  return close;
}

// Thẻ chi tiết + hàng nút thao tác (dùng chung cho Kho và ô trang bị bảng Nhân vật)
function itemCard(it, run) {
  const card = el(`<div class="item-card"><div class="ic-info"><b>${escapeHtml(it.name)}</b>
    <span>${escapeHtml(it.sub || '')}</span>${it.detail ? `<small>${escapeHtml(it.detail)}</small>` : ''}
    ${it.lines?.length ? `<div class="ic-lines">${it.lines.map((l, n) => `<i class="ln tier-${l.tier}">${n + 1}. ${escapeHtml(l.text)}</i>`).join('')}</div>` : ''}</div>
    <div class="ic-acts">${(it.actions || []).map((a) => `<button type="button" class="bag-act sm ${a.danger ? 'danger' : ''}" data-a="${a.id}" ${a.disabled ? 'disabled' : ''}>${escapeHtml(a.label)}</button>`).join('')}</div></div>`);
  card.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]');
    if (!b || b.disabled) return;
    const a = it.actions.find((x) => x.id === b.dataset.a);
    if (a.confirm && !(await showConfirm(a.label, a.confirm, { yes: a.label.split(' (')[0], no: 'Thôi' }))) return;
    run(a.id);
  });
  return card;
}

// Hộp thao tác một món (chạm ô trang bị ở bảng Nhân vật). getItem() lấy lại món sau mỗi thao tác; trả null thì đóng.
export function showItemActions({ getItem, onAction }) {
  const { wrap, close } = overlay('code-wrap');
  const box = el('<div class="bag code-box item-pop" role="dialog"></div>');
  wrap.appendChild(box);
  const paint = () => {
    const it = getItem();
    if (!it) { close(); return; }
    box.replaceChildren(el('<div class="bag-head"><b>Trang bị</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>'),
      itemCard(it, async (a) => { await onAction(it, a); paint(); }));
    box.querySelector('.bag-x').addEventListener('click', close);
  };
  paint();
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

// Bảng nhỏ nằm ngang chọn đồ trong kho cho một ô trống (bảng Nhân vật). items: [{ key, name, thumb, sub, tier }]
export function showSlotPicker({ title, items, onPick }) {
  const { wrap, close } = overlay('code-wrap');
  const box = el(`<div class="bag code-box slot-pick" role="dialog">
    <div class="bag-head"><b>${escapeHtml(title)}</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>
    ${items.length ? `<div class="pick-row">${items.map((it) => `<button type="button" class="pick ${it.tier ? `tier-${it.tier}` : ''}" data-key="${escapeHtml(it.key)}">
      <img src="${it.thumb || ''}" alt=""><span>${escapeHtml(it.name)}</span></button>`).join('')}</div>`
    : '<p class="bag-empty">Kho chưa có món nào cho ô này</p>'}
  </div>`);
  wrap.appendChild(box);
  box.querySelector('.bag-x').addEventListener('click', close);
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-key]');
    if (!b) return;
    close(); onPick(b.dataset.key);
  });
  return close;
}
