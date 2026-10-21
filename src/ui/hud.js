// Giao diện trong game, bố cục kiểu MOBA:
//   trên trái  — đạo hiệu + khung nhân vật (chạm ảnh đại diện mở bảng Nhân vật)
//   trên phải  — menu (Bản đồ, Kỹ năng, Nhiệm vụ, Tông môn, Cài đặt), bản đồ nhỏ, tên khu
//   dưới trái  — cần điều khiển (chạm nền), nút Chat, nút Kho ngay dưới
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
  { id: 'skills', name: 'Đồ giám', icon: 'ky-nang' },
  { id: 'quests', name: 'Nhiệm vụ', icon: 'nhiem-vu' },
  { id: 'sect', name: 'Tông môn', icon: 'tong-mon' },
  { id: 'settings', name: 'Cài đặt', icon: 'cai-dat-v2' },
];
const pct = (x, y, w, h) =>
  `left:${(x / FRAME.w) * 100}%;top:${(y / FRAME.h) * 100}%;width:${(w / FRAME.w) * 100}%;height:${(h / FRAME.h) * 100}%`;

export function createHud(opts) {
  const { zoneName, line, player, maxChars, actions, blankIcon } = opts; // blankIcon: ô trống xám (chưa mở / chưa có)
  const root = document.getElementById('ui');

  // ---- Trên trái: khung nhân vật ----
  const info = document.createElement('div');
  info.className = 'player-info';
  info.innerHTML = `
    <div class="pi-name" data-name></div>
    <div class="pi-frame">
      <button type="button" class="pi-avatar glow" style="${pct(80, 50, 192, 192)}" aria-label="Thông tin nhân vật">
        <canvas width="128" height="128"></canvas></button>
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
    else if (opts.onMenu?.(id)) return; // Nhiệm vụ, Kỹ năng (Tu luyện)… do main.js quyết
    else toast(`${b.getAttribute('aria-label')}: sắp có`);
  });
  right.querySelector('.minimap').addEventListener('click', opts.onOpenMap);
  const online = right.querySelector('[data-online]');
  const miniCanvas = setupRoundCanvas(right.querySelector('.minimap canvas'), portrait ? 86 : 92);
  crisp(right.querySelector('.zone-tag'), 308, 130);

  // ---- Dưới phải: bộ kỹ năng hình quạt kiểu MOBA ----
  // Mỗi nút đặt theo (dx, dy) tính từ TÂM nút Tấn công (góc dưới phải), cỡ `size` (px). Ảnh nút: assets/ui/skills/*.png
  // (đã gồm khung tròn của chủ dự án, 256×256). Xem bố cục ở FAN_LAYOUT trong src/main.js.
  const pad = document.createElement('div');
  pad.className = 'action-pad';
  pad.innerHTML = actions.map((a) => `
    <button type="button" class="act ${a.locked ? 'locked' : ''}" data-act="${a.id}" aria-label="${escapeHtml(a.name)}"
      style="width:${a.size}px;height:${a.size}px;left:${a.dx - a.size / 2}px;top:${a.dy - a.size / 2}px">
      <img class="act-base" src="${a.locked && blankIcon ? blankIcon : a.icon || a.icons[0]}" alt=""><img class="act-art" alt="" hidden><b class="act-badge"></b><i class="act-cd" hidden><em></em></i><span>${escapeHtml(a.name)}</span>
    </button>`).join('');
  root.appendChild(pad);
  for (const a of actions) {
    const btn = pad.querySelector(`[data-act="${a.id}"]`);
    let state = 0; // nút bật/tắt (vd. Bay ↔ Chạy): đổi ảnh + tên theo trạng thái
    a.setState = (s) => { state = s; btn.querySelector('.act-base').src = a.icons[s]; btn.setAttribute('aria-label', a.names[s]); };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (btn.classList.contains('locked')) { toast(a.offHint ? `${a.name}: ${a.offHint}` : `${a.name}: chưa mở${a.lockedHint ? ` — ${a.lockedHint}` : ''}`, 1600); return; }
      btn.classList.remove('pulse'); void btn.offsetWidth; btn.classList.add('pulse');
      if (a.icons) {
        const prev = state;
        state = (state + 1) % a.icons.length;
        if (a.onUse?.(state) === 'keep') state = prev; // không đổi được (vd. đang bay trên nước) → giữ nguyên
        btn.querySelector('.act-base').src = a.icons[state];
        btn.setAttribute('aria-label', a.names[state]);
      } else a.onUse?.();
    });
  }

  // ---- Dưới trái: Chat ----
  // iPhone: khi ô nhập ở sát đáy, Safari đẩy cả trang lên để tránh bàn phím (màn game giật lên rồi bị kéo về).
  // Cách tránh: lúc mở, đưa thanh chat lên TRÊN CÙNG màn hình rồi mới focus → Safari không cần đẩy trang;
  // khi bàn phím hiện xong (visualViewport đổi cỡ) mới đặt thanh chat ngay trên mép bàn phím. Game không bị động tới.
  const bar = document.createElement('form');
  bar.className = 'chatbar';
  bar.setAttribute('action', '');
  bar.innerHTML = `<button class="round-btn glow" type="button" aria-label="Chat">Chat</button>
    <input class="field framed" type="text" maxlength="${maxChars}" placeholder="Nói gì đó…" enterkeyhint="send" autocomplete="off" hidden>
    <button class="chat-send glow" type="submit" aria-label="Gửi"><img src="assets/ui/icons/gui.png" alt=""></button>`;
  root.appendChild(bar);
  crisp(bar.querySelector('.round-btn'), 122, 56, true);
  const input = bar.querySelector('input');
  const open = bar.querySelector('.round-btn');
  const sendBtn = bar.querySelector('.chat-send');
  sendBtn.addEventListener('pointerdown', (e) => e.preventDefault()); // không làm ô nhập mất tiêu điểm trước khi gửi
  const vv = window.visualViewport;
  let fullH = vv ? vv.height : window.innerHeight; // chiều cao khi chưa có bàn phím
  const placeAboveKeyboard = () => {
    if (!bar.classList.contains('typing')) return;
    const h = vv ? vv.height : window.innerHeight;
    const top = vv ? vv.offsetTop : 0;
    if (h < fullH - 80) bar.style.top = `${top + h - bar.offsetHeight - 8}px`; // bàn phím đang mở
  };
  vv?.addEventListener('resize', () => {
    if (!bar.classList.contains('typing')) fullH = Math.max(fullH * 0.5, vv.height);
    placeAboveKeyboard();
  });
  vv?.addEventListener('scroll', placeAboveKeyboard);
  const startTyping = () => {
    input.hidden = false;
    bar.style.top = '';
    bar.classList.add('typing'); // CSS: thanh chat nằm trên cùng màn hình
    input.focus({ preventScroll: true });
    window.scrollTo(0, 0);
    setTimeout(placeAboveKeyboard, 350); // phòng khi trình duyệt không báo đổi cỡ
  };
  const close = () => {
    input.hidden = true;
    bar.classList.remove('typing');
    bar.style.top = '';
    input.blur();
    window.scrollTo(0, 0); // phòng khi Safari đã lỡ cuộn
  };
  const send = () => {
    const text = input.value.trim().slice(0, maxChars);
    if (text) opts.onChat(text);
    input.value = '';
    close();
  };
  // giữ tiêu điểm ở ô nhập khi chạm nút Chat (nếu không, ô nhập mất tiêu điểm và tự đóng trước khi kịp gửi)
  open.addEventListener('pointerdown', (e) => { if (!input.hidden) e.preventDefault(); });
  open.addEventListener('click', () => { if (input.hidden) startTyping(); else send(); });
  bar.addEventListener('submit', (e) => { e.preventDefault(); send(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { input.value = ''; close(); }
    // bộ gõ tiếng Việt: Enter lúc đang ghép chữ đôi khi không tạo submit → tự gửi khi ghép xong
    if (e.key === 'Enter' && (e.isComposing || e.keyCode === 229)) {
      e.preventDefault();
      input.addEventListener('compositionend', () => setTimeout(send, 0), { once: true });
    }
  });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) close(); }, 0));
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.hidden && document.activeElement === document.body) startTyping();
  });

  // Kho (túi trữ vật): ngay dưới nút Chat (yêu cầu chủ dự án 2026-10-21)
  const bagBtn = document.createElement('button');
  bagBtn.type = 'button';
  bagBtn.className = 'bag-btn glow';
  bagBtn.setAttribute('aria-label', 'Kho');
  bagBtn.innerHTML = `<img src="${ICON('tui-do')}" alt=""><span>Kho</span>`;
  bagBtn.addEventListener('click', () => (opts.onOpenBag ? opts.onOpenBag() : toast('Kho: sắp có')));
  root.appendChild(bagBtn);

  // Nhật ký chat: vài dòng gần nhất phía trên nút Chat, mờ dần sau một lúc
  const log = document.createElement('div');
  log.className = 'chat-log';
  root.appendChild(log);
  const addChatLine = (name, text, self = false) => {
    const line = document.createElement('div');
    line.className = `chat-line${self ? ' self' : ''}`;
    line.innerHTML = `<b>${escapeHtml(name)}:</b> ${escapeHtml(text)}`;
    log.appendChild(line);
    while (log.children.length > 5) log.firstChild.remove();
    setTimeout(() => line.classList.add('fade'), 12000);
    setTimeout(() => line.remove(), 13000);
  };

  const els = Object.fromEntries(['hp', 'mp', 'xp'].map((k) => [k, {
    fill: info.querySelector(`[data-${k}]`), text: info.querySelector(`[data-${k}-t]`),
  }]));
  return {
    miniCanvas,
    addChatLine,
    // Ảnh đại diện: lấy nửa trên của chân dung (đầu + vai), cắt tròn trong khung
    setPortrait(img) {
      const cv = info.querySelector('.pi-avatar canvas'), g = cv.getContext('2d'), S = cv.width;
      g.clearRect(0, 0, S, S);
      g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
      const cropH = img.height * 0.62, k = Math.min(S / img.width, S / cropH) * 1.05;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, img.width, cropH, (S - img.width * k) / 2, S - cropH * k + S * 0.04, img.width * k, cropH * k);
      g.restore();
    },
    setOnline(count, max) { online.textContent = `· ${count}/${max}`; },
    // Đặt trạng thái nút bật/tắt từ ngoài (vd. hết linh lực → tự hạ cánh)
    setToggle(id, s) { actions.find((a) => a.id === id)?.setState?.(s); },
    setRealm(text) { info.querySelector('[data-realm]').textContent = text; },
    // Khoá / mở nút kỹ năng theo cảnh giới
    // hint: lý do riêng (vd. "chưa đeo linh thú"); bỏ trống = chưa mở theo cảnh giới (lockedHint)
    setLocked(id, on, hint) {
      const a = actions.find((x) => x.id === id), btn = pad.querySelector(`[data-act="${id}"]`);
      if (!a || !btn) return;
      a.offHint = hint; btn.classList.toggle('locked', !!on);
      if (blankIcon) btn.querySelector('.act-base').src = on ? blankIcon : a.icon || a.icons[0]; // khoá → ô trống xám, không lộ hình
    },
    // Hình thứ đang dùng trong ô (đan, linh thú, pháp tướng); null = hình mặc định của ô
    setArt(id, url) { const i = pad.querySelector(`[data-act="${id}"] .act-art`); if (i) { i.hidden = !url; if (url) i.src = url; } },
    setBadge(id, text) { const b = pad.querySelector(`[data-act="${id}"] .act-badge`); if (b) b.textContent = text ?? ''; },
    // Hồi chiêu: bóng tối quét theo phần còn lại + số giây
    setCooldown(id, left, total) {
      const c = pad.querySelector(`[data-act="${id}"] .act-cd`); if (!c) return;
      c.hidden = !(left > 0); if (c.hidden) return;
      c.style.setProperty('--p', `${Math.min(100, (left / total) * 100)}%`);
      c.firstChild.textContent = left >= 1 ? Math.ceil(left) : left.toFixed(1);
    },
    // Nút đang bật (vd. pháp tướng đang hiện): sáng viền
    setActive(id, on) { pad.querySelector(`[data-act="${id}"]`)?.classList.toggle('on', !!on); },
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
  ctx.translate(64, 124);
  ctx.scale(3.8, 3.8);
  draw(ctx);
  ctx.restore();
}

