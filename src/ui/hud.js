// Giao diện trong game, bố cục kiểu MOBA:
//   trên trái  — đạo hiệu + khung nhân vật (chạm ảnh đại diện mở bảng Nhân vật)
//   trên phải  — nút Bản đồ, Cài đặt, bản đồ nhỏ, tên khu
//   dưới trái  — cần điều khiển (chạm nền), nút Chat
//   dưới phải  — nút tấn công + ô kỹ năng, Phi hành, Tốc biến
// Khung lấy từ assets/ui (thiết kế chủ dự án).
import { escapeHtml, toast } from './screens.js';

const FRAME = { w: 495, h: 190 }; // frames/khung-nhan-vat.png
const pct = (x, y, w, h) =>
  `left:${(x / FRAME.w) * 100}%;top:${(y / FRAME.h) * 100}%;width:${(w / FRAME.w) * 100}%;height:${(h / FRAME.h) * 100}%`;

export function createHud(opts) {
  const { zoneName, line, player, maxChars, actions } = opts;
  const root = document.getElementById('ui');

  // ---- Trên trái: khung nhân vật ----
  const info = document.createElement('div');
  info.className = 'player-info';
  info.innerHTML = `
    <div class="pi-name" data-name></div>
    <div class="pi-frame">
      <button type="button" class="pi-avatar glow" style="${pct(52, 22, 120, 120)}" aria-label="Thông tin nhân vật">
        <canvas width="64" height="64"></canvas></button>
      <div class="pi-bar" style="${pct(204, 56, 244, 21)}"><i class="fill hp" data-hp></i><span>Khí huyết</span><b data-hp-t></b></div>
      <div class="pi-bar" style="${pct(204, 94, 244, 22)}"><i class="fill mp" data-mp></i><span>Linh lực</span><b data-mp-t></b></div>
      <div class="pi-bar" style="${pct(204, 132, 244, 20)}"><i class="fill xp" data-xp></i><span>Tu vi</span><b data-xp-t></b></div>
      <div class="pi-realm" style="${pct(30, 160, 164, 26)}" data-realm></div>
    </div>`;
  root.appendChild(info);
  info.querySelector('[data-name]').textContent = player.name;
  info.querySelector('[data-realm]').textContent = player.realmName;
  drawAvatar(info.querySelector('.pi-avatar canvas'), player.drawAvatar);
  info.querySelector('.pi-avatar').addEventListener('click', opts.onOpenCharacter);

  // ---- Trên phải: Bản đồ, Cài đặt, bản đồ nhỏ, tên khu ----
  const right = document.createElement('div');
  right.className = 'top-right';
  right.innerHTML = `
    <div class="tr-buttons">
      <button type="button" class="icon-round glow" data-map aria-label="Bản đồ"><img src="assets/ui/icons/ban-do.png" alt=""></button>
      <button type="button" class="icon-btn glow" data-settings aria-label="Cài đặt"><img src="assets/ui/icons/cai-dat.png" alt=""></button>
    </div>
    <div class="tr-mini">
      <button type="button" class="minimap" aria-label="Mở bản đồ"><canvas width="96" height="96"></canvas></button>
      <div class="zone-tag"><b>${escapeHtml(zoneName)}</b><span>Tuyến ${line} <em data-online></em></span></div>
    </div>`;
  root.appendChild(right);
  right.querySelector('[data-settings]').addEventListener('click', opts.onSettings);
  right.querySelector('[data-map]').addEventListener('click', opts.onOpenMap);
  right.querySelector('.minimap').addEventListener('click', opts.onOpenMap);
  const online = right.querySelector('[data-online]');
  const miniCanvas = right.querySelector('.minimap canvas');

  // ---- Dưới phải: tấn công + kỹ năng ----
  const pad = document.createElement('div');
  pad.className = 'action-pad';
  pad.innerHTML = actions.map((a) => `
    <button type="button" class="act act-${a.slot} ${a.locked ? 'locked' : ''}" data-act="${a.id}" aria-label="${escapeHtml(a.name)}">
      ${a.icon ? `<img src="${a.icon}" alt="">` : ''}
      ${a.locked ? '<img class="lock" src="assets/ui/icons/khoa.png" alt="">' : ''}
      <span>${escapeHtml(a.name)}</span>
    </button>`).join('');
  root.appendChild(pad);
  for (const a of actions) {
    const btn = pad.querySelector(`[data-act="${a.id}"]`);
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (a.locked) { toast(`${a.name}: chưa mở`); return; }
      btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
      a.onUse?.();
    });
  }

  // ---- Dưới trái: Chat ----
  const bar = document.createElement('div');
  bar.className = 'chatbar';
  bar.innerHTML = `<button class="round-btn glow" type="button" aria-label="Chat">Chat</button>
    <input class="field framed" type="text" maxlength="${maxChars}" placeholder="Nói gì đó…" hidden>`;
  root.appendChild(bar);
  const input = bar.querySelector('input');
  const open = bar.querySelector('button');
  const send = () => {
    const text = input.value.trim().slice(0, maxChars);
    if (text) opts.onChat(text);
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

  const els = Object.fromEntries(['hp', 'mp', 'xp'].map((k) => [k, {
    fill: info.querySelector(`[data-${k}]`), text: info.querySelector(`[data-${k}-t]`),
  }]));
  return {
    miniCanvas,
    setOnline(count, max) { online.textContent = `· ${count}/${max}`; },
    // value/max: số thật khi có dữ liệu chỉ số; chưa có thì max = 0 → hiện thanh đầy, không ghi số
    setBar(kind, value, max) {
      const e = els[kind];
      const r = max > 0 ? Math.max(0, Math.min(1, value / max)) : (kind === 'xp' ? 0 : 1);
      e.fill.style.width = `${r * 100}%`;
      e.text.textContent = max > 0 ? `${value}/${max}` : '';
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
