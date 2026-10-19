// Thanh thông tin khu, nút cài đặt và nút chat trong game.
import { escapeHtml } from './screens.js';

export function createHud({ zoneName, line, onChat, onSettings, maxChars }) {
  const root = document.getElementById('ui');
  const hud = document.createElement('div');
  hud.className = 'hud';
  hud.innerHTML = `
    <div class="zone-tag"><b>${escapeHtml(zoneName)}</b> · T${line} <span data-online></span></div>
    <button type="button" class="icon-btn glow" data-settings aria-label="Cài đặt"><img src="assets/ui/icons/cai-dat.png" alt=""></button>`;
  root.appendChild(hud);
  const online = hud.querySelector('[data-online]');
  hud.querySelector('[data-settings]').addEventListener('click', onSettings);

  const bar = document.createElement('div');
  bar.className = 'chatbar';
  bar.innerHTML = `<input class="field framed" type="text" maxlength="${maxChars}" placeholder="Nói gì đó…" hidden>
    <button class="round-btn glow" type="button" aria-label="Chat">Chat</button>`;
  root.appendChild(bar);
  const input = bar.querySelector('input');
  const open = bar.querySelector('button');

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
    setOnline(count, max) { online.textContent = `· ${count}/${max}`; },
  };
}
