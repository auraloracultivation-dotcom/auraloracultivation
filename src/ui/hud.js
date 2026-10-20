// Giao diện trong game: khung thông tin nhân vật (trên trái), tên khu (trên giữa),
// cài đặt + đăng xuất (trên phải), chat (dưới phải). Khung lấy từ assets/ui (thiết kế chủ dự án).
import { escapeHtml } from './screens.js';

// Toạ độ trong ảnh khung gốc frames/khung-nhan-vat.png (495×190) → đổi ra %
const FRAME = { w: 495, h: 190 };
const pct = (x, y, w, h) =>
  `left:${(x / FRAME.w) * 100}%;top:${(y / FRAME.h) * 100}%;width:${(w / FRAME.w) * 100}%;height:${(h / FRAME.h) * 100}%`;

export function createHud({ zoneName, line, player, onChat, onSettings, onLogout, maxChars }) {
  const root = document.getElementById('ui');

  // ---- Khung thông tin nhân vật ----
  const info = document.createElement('div');
  info.className = 'player-info';
  info.innerHTML = `
    <canvas class="pi-avatar" width="64" height="64" style="${pct(52, 22, 120, 120)}"></canvas>
    <div class="pi-bar pi-name" style="${pct(204, 56, 244, 21)}"><span data-name></span></div>
    <div class="pi-bar" style="${pct(204, 94, 244, 22)}"><i class="fill hp" data-hp></i><span>Khí huyết</span></div>
    <div class="pi-bar" style="${pct(204, 132, 244, 20)}"><i class="fill mp" data-mp></i><span>Linh lực</span></div>
    <div class="pi-realm" style="${pct(30, 160, 164, 26)}" data-realm></div>`;
  root.appendChild(info);
  info.querySelector('[data-name]').textContent = player.name;
  info.querySelector('[data-realm]').textContent = player.realmName;
  drawAvatar(info.querySelector('.pi-avatar'), player.drawAvatar);

  // ---- Tên khu ----
  const zone = document.createElement('div');
  zone.className = 'zone-tag';
  zone.innerHTML = `<b>${escapeHtml(zoneName)}</b><span>T${line} <em data-online></em></span>`;
  root.appendChild(zone);
  const online = zone.querySelector('[data-online]');

  // ---- Cài đặt + Đăng xuất ----
  const right = document.createElement('div');
  right.className = 'top-right';
  right.innerHTML = `
    <button type="button" class="btn-small glow" data-logout>Đăng xuất</button>
    <button type="button" class="icon-btn glow" data-settings aria-label="Cài đặt"><img src="assets/ui/icons/cai-dat.png" alt=""></button>`;
  root.appendChild(right);
  right.querySelector('[data-settings]').addEventListener('click', onSettings);
  right.querySelector('[data-logout]').addEventListener('click', onLogout);

  // ---- Chat ----
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

  const hp = info.querySelector('[data-hp]'), mp = info.querySelector('[data-mp]');
  return {
    setOnline(count, max) { online.textContent = `· ${count}/${max}`; },
    // ratio 0..1 — chỉ số thật sẽ nối vào khi có dữ liệu chỉ số nhân vật
    setBars(hpRatio, mpRatio) {
      hp.style.width = `${Math.max(0, Math.min(1, hpRatio)) * 100}%`;
      mp.style.width = `${Math.max(0, Math.min(1, mpRatio)) * 100}%`;
    },
  };
}

function drawAvatar(canvas, draw) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.save();
  ctx.translate(32, 62);
  ctx.scale(1.9, 1.9);
  draw(ctx);
  ctx.restore();
}
