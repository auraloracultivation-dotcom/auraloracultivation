// Giao diện trong game, bố cục kiểu MOBA:
//   trên trái  — đạo hiệu + khung nhân vật (chạm ảnh đại diện mở bảng Nhân vật)
//   trên phải  — menu (Bản đồ, Túi đồ, Kỹ năng, Nhiệm vụ, Tông môn, Cài đặt), bản đồ nhỏ, tên khu
//   dưới trái  — cần điều khiển (chạm nền), nút Chat
//   dưới phải  — nút tấn công + ô kỹ năng, Phi hành, Tốc biến
// Khung lấy từ assets/ui (thiết kế chủ dự án).
import { escapeHtml, toast } from './screens.js';
import { crispWidth } from './stage.js';
import { setupRoundCanvas } from './compass.js';

// Đặt kích thước nút/khung theo bội số nguyên điểm ảnh gốc → viền sắc, đều
const crisp = (node, srcW, maxCss, square = false) => {
  const { width, pixelated } = crispWidth(srcW, maxCss);
  node.style.width = `${width}px`;
  if (square) node.style.height = `${width}px`;
  node.style.imageRendering = pixelated ? 'pixelated' : 'auto';
};

const FRAME = { w: 887, h: 394 }; // frames/khung-nhan-vat-v2.png (sinh bằng tools/hud_frame.py)
const ICON = (n) => `assets/ui/icons/${n}.png`;
// Menu góc trên phải. id 'map' / 'settings' mở bảng; còn lại chưa có hệ thống → báo "sắp có"
const MENU = [
  { id: 'map', name: 'Bản đồ', icon: 'ban-do-v2' },
  { id: 'bag', name: 'Túi đồ', icon: 'tui-do' },
  { id: 'skills', name: 'Kỹ năng', icon: 'ky-nang' },
  { id: 'quests', name: 'Nhiệm vụ', icon: 'nhiem-vu' },
  { id: 'sect', name: 'Tông môn', icon: 'tong-mon' },
  { id: 'settings', name: 'Cài đặt', icon: 'cai-dat-v2' },
];
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
      <button type="button" class="pi-avatar glow" style="${pct(80, 50, 192, 192)}" aria-label="Thông tin nhân vật">
        <canvas width="64" height="64"></canvas></button>
      <div class="pi-bar" style="${pct(382, 87, 404, 36)}"><i class="fill hp" data-hp></i><span>Khí huyết</span><b data-hp-t></b></div>
      <div class="pi-bar" style="${pct(382, 155, 404, 36)}"><i class="fill mp" data-mp></i><span>Linh lực</span><b data-mp-t></b></div>
      <div class="pi-bar" style="${pct(382, 224, 321, 38)}"><i class="fill xp" data-xp></i><span>Tu vi</span><b data-xp-t></b></div>
      <img class="pi-icon" src="${ICON('sen')}" alt="" style="${pct(317, 216, 50, 50)}">
      <button type="button" class="pi-up" style="${pct(723, 198, 84, 84)}" aria-label="Đột phá"></button>
      <div class="pi-realm" style="${pct(61, 282, 212, 39)}" data-realm></div>
    </div>`;
  root.appendChild(info);
  const portrait = window.innerHeight > window.innerWidth;
  info.style.width = `${Math.min(270, window.innerWidth * (portrait ? 0.42 : 0.3))}px`; // khung độ phân giải cao, thu nhỏ mượt
  info.querySelector('[data-name]').textContent = player.name;
  info.querySelector('[data-realm]').textContent = player.realmName;
  drawAvatar(info.querySelector('.pi-avatar canvas'), player.drawAvatar);
  info.querySelector('.pi-up').addEventListener('click', opts.onBreakthrough);
  info.querySelector('.pi-avatar').addEventListener('click', opts.onOpenCharacter);

  // ---- Trên phải: Bản đồ, Cài đặt, bản đồ nhỏ, tên khu ----
  const right = document.createElement('div');
  right.className = 'top-right';
  right.innerHTML = `
    <div class="tr-buttons">${MENU.map((m) => `
      <button type="button" class="menu-btn glow" data-menu="${m.id}" aria-label="${m.name}" title="${m.name}">
        <img src="${ICON(m.icon)}" alt=""></button>`).join('')}
    </div>
    <div class="tr-mini">
      <button type="button" class="minimap" aria-label="Mở bản đồ"><canvas></canvas></button>
      <div class="zone-tag"><b>${escapeHtml(zoneName)}</b><span>Tuyến ${line} <em data-online></em></span></div>
    </div>`;
  root.appendChild(right);
  right.querySelector('.tr-buttons').addEventListener('click', (e) => {
    const b = e.target.closest('[data-menu]');
    if (!b) return;
    const id = b.dataset.menu;
    if (id === 'map') opts.onOpenMap();
    else if (id === 'settings') opts.onSettings();
    else toast(`${b.getAttribute('aria-label')}: sắp có`);
  });
  right.querySelector('.minimap').addEventListener('click', opts.onOpenMap);
  const online = right.querySelector('[data-online]');
  const miniCanvas = setupRoundCanvas(right.querySelector('.minimap canvas'), portrait ? 78 : 84);
  crisp(right.querySelector('.zone-tag'), 308, 130);

  // ---- Dưới phải: tấn công + kỹ năng ----
  const pad = document.createElement('div');
  pad.className = 'action-pad';
  pad.innerHTML = actions.map((a) => `
    <button type="button" class="act act-${a.slot} ${a.locked ? 'locked' : ''} ${a.full ? 'full' : ''}" data-act="${a.id}" aria-label="${escapeHtml(a.name)}">
      ${a.icon || a.icons ? `<img src="${a.icon || a.icons[0]}" alt="">` : ''}
      ${a.locked ? '<img class="lock" src="assets/ui/icons/khoa.png" alt="">' : ''}
      <span>${escapeHtml(a.name)}</span>
    </button>`).join('');
  root.appendChild(pad);
  const SIZE = { attack: 92, s1: 56, s2: 56, s3: 56, fly: 58, blink: 46 };
  for (const a of actions) {
    const btn = pad.querySelector(`[data-act="${a.id}"]`);
    crisp(btn, a.full ? 164 : 84, SIZE[a.slot], true); // khung tròn frames/o-tron.png 84×84; nút ảnh đầy đủ 164
    let state = 0; // nút bật/tắt (vd. Bay lên ↔ Hạ xuống): đổi ảnh + tên theo trạng thái
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (a.locked) { toast(`${a.name}: chưa mở`); return; }
      btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
      if (a.icons) {
        state = (state + 1) % a.icons.length;
        btn.querySelector('img').src = a.icons[state];
        btn.setAttribute('aria-label', a.names[state]);
        a.onUse?.(state);
      } else a.onUse?.();
    });
  }

  // ---- Dưới trái: Chat ----
  const bar = document.createElement('div');
  bar.className = 'chatbar';
  bar.innerHTML = `<button class="round-btn glow" type="button" aria-label="Chat">Chat</button>
    <input class="field framed" type="text" maxlength="${maxChars}" placeholder="Nói gì đó…" hidden>`;
  root.appendChild(bar);
  crisp(bar.querySelector('.round-btn'), 122, 56, true);
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
