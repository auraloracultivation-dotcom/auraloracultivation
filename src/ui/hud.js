// Thanh thông tin trên cùng và nút chat.
import { escapeHtml } from './screens.js';

export function createHud({ zoneName, line, onChat, onLogout, maxChars }) {
  const root = document.getElementById('ui');
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="tag"><b>${escapeHtml(zoneName)}</b> · Tuyến ${line}<br><span class="small" data-online></span></div>
    <button type="button" data-logout>Thoát</button>`;
  root.appendChild(hud);
  const online = hud.querySelector('[data-online]');
  hud.querySelector('[data-logout]').addEventListener('click', onLogout);

  const bar = document.createElement('div');
  bar.className = 'chatbar';
  bar.innerHTML = `<input type="text" maxlength="${maxChars}" placeholder="Nói gì đó…" hidden>
    <button class="open" type="button" aria-label="Chat">💬</button>`;
  root.appendChild(bar);
  const input = bar.querySelector('input');
  const open = bar.querySelector('.open');

  const send = () => {
    const text = input.value.trim().slice(0, maxChars);
    if (text) onChat(text);
    input.value = '';
    input.hidden = true;
    input.blur();
  };
  open.addEventListener('click', () => {
    if (input.hidden) { input.hidden = false; input.focus(); } else send();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
    if (e.key === 'Escape') { input.value = ''; input.hidden = true; }
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.hidden && document.activeElement === document.body) {
      input.hidden = false; input.focus();
    }
  });

  return {
    setOnline(count, max) { online.textContent = `${count}/${max} đạo hữu trong tuyến`; },
  };
}
