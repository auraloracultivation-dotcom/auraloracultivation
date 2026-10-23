// Khung Chat (HUD v3, chủ dự án 23/10/2026): nút Chat góc trái — bấm mới hiện khung, chạm chỗ khác là tắt.
// Khung: assets/ui/frames/hud-khung-chat.png (665×279) — tab bên trái, ô tin nhắn, ô nhập + nút gửi vẽ sẵn.
// Tab: Tổng (mọi dòng) · Thế Giới (người chơi) · Hệ Thống (thông báo game) · Tông Môn / Đội (chưa có hệ thống).
// iPhone: lúc gõ, khung lên TRÊN CÙNG màn hình rồi mới focus (Safari khỏi đẩy trang), bàn phím hiện xong mới đặt ngay trên bàn phím.
import { escapeHtml, toast } from './screens.js';

const W = 665, H = 279;
const at = (x, y, w, h) => `left:${(x / W) * 100}%;top:${(y / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%`;
const TABS = [['all', 'Tổng', 40], ['world', 'Thế Giới', 84], ['sect', 'Tông Môn', 129], ['team', 'Đội', 174], ['sys', 'Hệ Thống', 218]];
const MAX_LINES = 60;

export function createHudChat({ root, maxChars, onSend, chatIcon, frame }) {
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'h3-side h3-chat glow'; btn.setAttribute('aria-label', 'Chat');
  btn.innerHTML = `<img src="${chatIcon}" alt="">`;
  root.appendChild(btn);

  const panel = document.createElement('form');
  panel.className = 'h3-chatbox'; panel.setAttribute('action', ''); panel.hidden = true;
  panel.innerHTML = `<img class="h3-chat-bg" src="${frame}" alt="">
    ${TABS.map(([id, n, cy]) => `<button type="button" class="h3-tab" data-tab="${id}" aria-label="${n}" style="${at(22, cy - 20, 112, 40)}"></button>`).join('')}
    <div class="h3-chat-lines" style="${at(152, 22, 470, 168)}"></div>
    <input class="h3-chat-in" type="text" maxlength="${maxChars}" placeholder="Nhập nội dung…" enterkeyhint="send" autocomplete="off" style="${at(164, 208, 338, 38)}">
    <button type="submit" class="h3-chat-send" aria-label="Gửi" style="${at(563, 200, 65, 50)}"></button>`;
  root.appendChild(panel);
  const linesEl = panel.querySelector('.h3-chat-lines'), input = panel.querySelector('input');

  // Vài dòng mới nhất nổi phía trên nút Chat khi khung đang đóng, mờ dần
  const log = document.createElement('div');
  log.className = 'chat-log';
  root.appendChild(log);

  const lines = []; // { kind: 'world' | 'sys', html }
  let tab = 'all';
  const paint = () => {
    const show = lines.filter((l) => tab === 'all' || l.kind === tab);
    linesEl.innerHTML = show.map((l) => `<div class="h3-line ${l.kind}">${l.html}</div>`).join('') || '<div class="h3-line empty">Chưa có tin nhắn</div>';
    linesEl.scrollTop = linesEl.scrollHeight;
    panel.querySelectorAll('.h3-tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  };
  const push = (kind, html) => {
    lines.push({ kind, html }); while (lines.length > MAX_LINES) lines.shift();
    if (!panel.hidden) paint();
  };

  const open = () => { panel.hidden = false; log.hidden = true; btn.classList.add('on'); paint(); };
  const close = () => {
    if (panel.hidden) return;
    input.blur(); panel.hidden = true; log.hidden = false; btn.classList.remove('on');
    panel.classList.remove('typing'); panel.style.top = ''; window.scrollTo(0, 0);
  };
  btn.addEventListener('click', () => (panel.hidden ? open() : close()));
  // chạm bất kỳ chỗ nào ngoài khung (và ngoài nút Chat) → tắt
  document.addEventListener('pointerdown', (e) => {
    if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) close();
  }, true);
  panel.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]'); if (!t) return;
    if (t.dataset.tab === 'sect' || t.dataset.tab === 'team') { toast(`${t.getAttribute('aria-label')}: sắp có`, 1200); return; }
    tab = t.dataset.tab; paint();
  });

  // Bàn phím iPhone
  const vv = window.visualViewport;
  let fullH = vv ? vv.height : window.innerHeight;
  const placeAboveKeyboard = () => {
    if (!panel.classList.contains('typing')) return;
    const h = vv ? vv.height : window.innerHeight, top = vv ? vv.offsetTop : 0;
    if (h < fullH - 80) panel.style.top = `${top + h - panel.offsetHeight - 6}px`;
  };
  vv?.addEventListener('resize', () => { if (!panel.classList.contains('typing')) fullH = Math.max(fullH * 0.5, vv.height); placeAboveKeyboard(); });
  vv?.addEventListener('scroll', placeAboveKeyboard);
  input.addEventListener('focus', () => {
    panel.style.top = ''; panel.classList.add('typing'); window.scrollTo(0, 0);
    setTimeout(placeAboveKeyboard, 350);
  });
  input.addEventListener('blur', () => { panel.classList.remove('typing'); panel.style.top = ''; window.scrollTo(0, 0); });

  const send = () => {
    const text = input.value.trim().slice(0, maxChars);
    if (text) onSend(text);
    input.value = '';
  };
  panel.querySelector('.h3-chat-send').addEventListener('pointerdown', (e) => e.preventDefault()); // giữ bàn phím khi bấm gửi
  panel.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; close(); }
    if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) { // bộ gõ tiếng Việt: chờ ghép chữ xong mới gửi
      e.preventDefault();
      input.addEventListener('compositionend', () => setTimeout(send, 0), { once: true });
    }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && panel.hidden && document.activeElement === document.body) { open(); input.focus(); }
  });
  // Thông báo game (toast) vào tab Hệ Thống
  window.addEventListener('tc-toast', (e) => push('sys', escapeHtml(e.detail)));

  return {
    addLine(name, text, self = false) {
      const html = `<b class="${self ? 'self' : ''}">${escapeHtml(name)}:</b> ${escapeHtml(text)}`;
      push('world', html);
      const line = document.createElement('div');
      line.className = `chat-line${self ? ' self' : ''}`; line.innerHTML = html;
      log.appendChild(line);
      while (log.children.length > 4) log.firstChild.remove();
      setTimeout(() => line.classList.add('fade'), 10000);
      setTimeout(() => line.remove(), 11000);
    },
  };
}
