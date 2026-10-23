// Giao diện trong game — bộ HUD v3 (chủ dự án 23/10/2026, ảnh GPT: assets/ui/_source/hud-v3-gpt.png):
//   trên trái  — khung nhân vật (chạm ảnh = bảng trang bị), 3 ô tiền Vàng / Linh thạch / Tiên ngọc, băng "Tự động"
//   trên phải  — bản đồ nhỏ, 6 nút (menu, bản đồ, đồ giám, nhiệm vụ, cửa hàng, cài đặt),
//                4 nút tròn: Đạo Vận · Nhân Vật (bảng chỉ số) · Pháp bảo · Thần phù, khung nhiệm vụ bật/tắt
//   dưới trái  — Kho, Chat (bấm mới hiện khung chat, chạm chỗ khác thì tắt) — src/ui/hud-chat.js
//   dưới phải  — nút đánh + ô kỹ năng + Tự động + Đan (vị trí ở src/game/hud-actions.js)
// Mảnh ảnh: assets/ui/frames/hud-*.png, assets/ui/icons/hud-*.png. Toạ độ dưới đây là điểm ảnh trên từng mảnh.
import { escapeHtml, toast } from './screens.js';
import { setupRoundCanvas } from './compass.js';
import { compactNum } from '../core/index.js';
import { createHudChat } from './hud-chat.js';
import { createQuestBox } from './hud-quest.js';

const F = (n) => `assets/ui/frames/hud-${n}.png`;
const I = (n) => `assets/ui/icons/hud-${n}.png`;
const box = (W, H, x, y, w, h) => `left:${(x / W) * 100}%;top:${(y / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%`;
const NV = (x, y, w, h) => box(615, 241, x, y, w, h); // khung nhân vật 615×241
// 6 nút góc phải: icon game cũ (chủ dự án 23/10 thích icon cũ hơn) — assets/ui/icons/<icon>.png
const MENU = [
  { id: 'rank', name: 'Bảng xếp hạng', icon: 'bxh' },
  { id: 'map', name: 'Bản đồ', icon: 'ban-do-v2' },
  { id: 'skills', name: 'Đồ giám', icon: 'ky-nang' },
  { id: 'quests', name: 'Nhiệm vụ', icon: 'nhiem-vu' },
  { id: 'sect', name: 'Vạn Bảo Lâu', icon: 'tong-mon' },
  { id: 'settings', name: 'Cài đặt', icon: 'cai-dat-v2' },
];
// Nút tròn: Đạo Vận thay chỗ Túi (guide.js gắn chữ + màu vào [data-r="dv"]), Nhân Vật giữ ảnh gốc
const ROUND = [ // nút Đạo Vận / Pháp Bảo / Thần Phù hiện ẢNH VẬT PHẨM như ô Kho (setRoundIcon, chủ dự án 23/10); glyph chỉ dự phòng
  { id: 'dv', name: 'Đạo Vận', glyph: '☯\uFE0E' },
  { id: 'stats', name: 'Nhân Vật', img: I('nut-nhan-vat') },
  { id: 'pb', name: 'Pháp Bảo', glyph: '❖' },
  { id: 'phu', name: 'Thần Phù', glyph: '✧' },
];

export function createHud(opts) {
  const { zoneName, line, player, maxChars, actions, blankIcon } = opts;
  const root = document.getElementById('ui');
  const add = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); const n = t.content.firstElementChild; root.appendChild(n); return n; };

  // ---- Trên trái: khung nhân vật + ô tiền + băng Tự động ----
  const me = add(`<div class="h3-left">
    <div class="h3-me">
      <button type="button" class="h3-avatar" style="${NV(37, 37, 152, 152)}" aria-label="Bảng trang bị"><canvas width="128" height="128"></canvas></button>
      <div class="h3-name" style="${NV(210, 52, 330, 38)}"><b data-name></b></div>
      ${['hp', 'mp', 'xp'].map((k, i) => `<div class="h3-bar ${k}" style="${NV(252, [99, 133, 170][i], 285, [23, 26, 25][i])}"><i data-${k}></i><b data-${k}-t></b></div>`).join('')}
      <b class="h3-lv" style="${NV(175, 183, 0, 35)}" data-life title="Thọ nguyên (năm)" hidden></b>
      <button type="button" class="h3-up" style="${NV(531, 153, 70, 67)}" aria-label="Đột phá"></button>
    </div>
    <small class="h3-realm" data-realm></small>
    <div class="h3-wallet" data-wallet></div>
    <div class="h3-auto" hidden><b>● Tự động</b><span data-rate></span></div>
  </div>`);
  me.querySelector('[data-name]').textContent = player.name;
  me.querySelector('[data-realm]').textContent = player.realmName;
  me.querySelector('.h3-up').addEventListener('click', opts.onBreakthrough);
  me.querySelector('.h3-avatar').addEventListener('click', opts.onOpenCharacter);
  drawAvatar(me.querySelector('.h3-avatar canvas'), player.drawAvatar);
  const walletEl = me.querySelector('[data-wallet]');
  walletEl.addEventListener('click', (e) => { if (e.target.closest('.h3-plus')) opts.onShop?.(); });

  // ---- Trên phải: bản đồ nhỏ, nút menu, nút tròn, nhiệm vụ ----
  const right = add(`<div class="h3-right">
    <div class="h3-mini">
      <button type="button" class="h3-map" aria-label="Mở bản đồ"><canvas></canvas></button><img class="h3-mini-frame" src="${F('ban-do-nho')}" alt="">
      <div class="h3-zone"><b>${escapeHtml(zoneName)}</b> · T${line} <em data-online></em></div>
    </div>
    <div class="h3-menu">${MENU.map((m) => `<button type="button" class="glow" data-menu="${m.id}" aria-label="${m.name}" title="${m.name}"><img src="assets/ui/icons/${m.icon}.png" alt=""></button>`).join('')}</div>
    <div class="h3-round">${ROUND.map((r) => `<button type="button" class="glow" data-r="${r.id}" aria-label="${r.name}">
      ${r.img ? `<img src="${r.img}" alt="">` : `<img src="${F('nut-tron')}" alt=""><i>${r.glyph}</i><img class="h3-r-ic" alt="" hidden><span>${r.name}</span>`}</button>`).join('')}</div>
  </div>`);
  right.querySelector('.h3-menu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-menu]'); if (!b) return;
    const id = b.dataset.menu;
    if (id === 'map') opts.onOpenMap();
    else if (id === 'settings') opts.onSettings();
    else if (id === 'quests') quest.toggle();
    else if (!opts.onMenu?.(id)) toast(`${b.getAttribute('aria-label')}: sắp có`);
  });
  right.querySelector('.h3-round').addEventListener('click', (e) => {
    const b = e.target.closest('[data-r]'); if (!b) return;
    const id = b.dataset.r;
    if (id === 'stats') opts.onStats?.();
    else if (id === 'pb') opts.onTreasure?.();
    else if (id === 'phu') opts.onCards?.();
    else if (id === 'dv') b._open?.(); // guide.js gắn hàm mở Cẩm nang
  });
  right.querySelector('.h3-map').addEventListener('click', opts.onOpenMap);
  const online = right.querySelector('[data-online]');
  const miniCanvas = setupRoundCanvas(right.querySelector('.h3-map canvas'), 76, true);
  const quest = createQuestBox(root, { onOpen: () => opts.onMenu?.('quests'), onTrack: (id) => opts.onTrack?.(id) }); // khung riêng: dọc nằm cột trái

  // ---- Dưới phải: nút đánh + ô kỹ năng (dx, dy tính từ tâm nút đánh) ----
  const pad = add(`<div class="action-pad">${actions.map((a) => `
    <button type="button" class="act ${a.locked ? 'locked' : ''} ${a.cls || ''}" data-act="${a.id}" aria-label="${escapeHtml(a.name)}"
      style="width:${a.size}px;height:${a.size}px;left:${a.dx - a.size / 2}px;top:${a.dy - a.size / 2}px">
      <img class="act-base" src="${a.locked && blankIcon ? blankIcon : a.icon || a.icons[0]}" alt=""><img class="act-art" alt="" hidden><b class="act-badge"></b><i class="act-cd" hidden><em></em></i><span>${escapeHtml(a.name)}</span>
    </button>`).join('')}</div>`);
  for (const a of actions) {
    const btn = pad.querySelector(`[data-act="${a.id}"]`);
    let state = 0; // nút bật/tắt (vd. Bay ↔ Chạy): đổi ảnh + tên theo trạng thái
    a.setState = (s) => { state = s; btn.querySelector('.act-base').src = a.icons[s]; btn.setAttribute('aria-label', a.names[s]); };
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      if (btn.classList.contains('locked') && a.onLocked?.()) return; // ô kỹ năng trống → mở bảng Kỹ năng
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

  // ---- Dưới trái: Kho + Chat ----
  const bagBtn = add(`<button type="button" class="h3-side h3-kho glow" aria-label="Kho"><img src="${I('nut-kho')}" alt=""></button>`);
  bagBtn.addEventListener('click', () => opts.onOpenBag?.());
  const chat = createHudChat({ root, maxChars, onSend: opts.onChat, chatIcon: I('nut-chat'), frame: F('khung-chat') });

  // ---- Tu vi / phút khi Tự động: cộng phần tu vi tăng trong 60 giây gần nhất ----
  const autoEl = me.querySelector('.h3-auto'), rateEl = me.querySelector('[data-rate]');
  let lastXp = null, gains = [], autoOn = false;
  const noteXp = (v) => {
    const t = performance.now();
    if (lastXp !== null && v > lastXp) gains.push([t, v - lastXp]);
    lastXp = v;
    while (gains.length && t - gains[0][0] > 60000) gains.shift();
    if (autoOn) { const sum = gains.reduce((s, g) => s + g[1], 0); rateEl.textContent = sum ? ` · +${compactNum(sum)} tu vi/phút` : ''; }
  };

  const els = Object.fromEntries(['hp', 'mp', 'xp'].map((k) => [k, { fill: me.querySelector(`[data-${k}]`), text: me.querySelector(`[data-${k}-t]`) }]));
  let walletKey = '';
  return {
    miniCanvas,
    addChatLine: chat.addLine,
    setPortrait(img) { // nửa trên chân dung (đầu + vai), cắt tròn trong khung
      const cv = me.querySelector('.h3-avatar canvas'), g = cv.getContext('2d'), S = cv.width;
      g.clearRect(0, 0, S, S);
      g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); g.clip();
      const cropH = img.height * 0.62, k = Math.min(S / img.width, S / cropH) * 1.05;
      g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, img.width, cropH, (S - img.width * k) / 2, S - cropH * k + S * 0.04, img.width * k, cropH * k);
      g.restore();
    },
    setOnline(count, max) { online.textContent = `· ${count}/${max}`; },
    setToggle(id, s) { actions.find((a) => a.id === id)?.setState?.(s); },
    setRealm(text) { // "Kết Đan Sơ kỳ (Thọ nguyên 43/102 năm)" → cảnh giới dòng dưới khung, "43/102" vào ô nhỏ cạnh ảnh (chủ dự án 23/10)
      const i = text.indexOf(' ('), life = i < 0 ? '' : (/(\d+\s*\/\s*\d+)/.exec(text.slice(i)) || [])[1] || '';
      me.querySelector('[data-realm]').textContent = i < 0 ? text : text.slice(0, i);
      const b = me.querySelector('[data-life]'); b.textContent = life.replace(/\s/g, ''); b.hidden = !life;
    },
    setRoundIcon(id, url) { // ảnh thật cho nút tròn (Pháp Bảo, Thần Phù…); null = chữ dự phòng
      const b = right.querySelector(`[data-r="${id}"]`), im = b?.querySelector('.h3-r-ic'); if (!im) return;
      im.hidden = !url; if (url && im.getAttribute('src') !== url) im.src = url; b.classList.toggle('has-ic', !!url);
    },
    setLocked(id, on, hint) {
      const a = actions.find((x) => x.id === id), btn = pad.querySelector(`[data-act="${id}"]`);
      if (!a || !btn) return;
      a.offHint = hint; btn.classList.toggle('locked', !!on);
      if (blankIcon) btn.querySelector('.act-base').src = on ? blankIcon : a.icon || a.icons[0];
    },
    setArt(id, url) { const i = pad.querySelector(`[data-act="${id}"] .act-art`); if (i) { i.hidden = !url; if (url) i.src = url; } },
    setBadge(id, text) { const b = pad.querySelector(`[data-act="${id}"] .act-badge`); if (b) b.textContent = text ?? ''; },
    setCooldown(id, left, total) {
      const c = pad.querySelector(`[data-act="${id}"] .act-cd`); if (!c) return;
      c.hidden = !(left > 0); if (c.hidden) return;
      c.style.setProperty('--p', `${Math.min(100, (left / total) * 100)}%`);
      c.firstChild.textContent = left >= 1 ? Math.ceil(left) : left.toFixed(1);
    },
    setActive(id, on) {
      pad.querySelector(`[data-act="${id}"]`)?.classList.toggle('on', !!on);
      if (id === 'auto') { autoOn = !!on; autoEl.hidden = !on; gains = []; rateEl.textContent = ''; }
    },
    setBar(kind, value, max) {
      const e = els[kind];
      const r = max > 0 ? Math.max(0, Math.min(1, value / max)) : (kind === 'xp' ? 0 : 1);
      e.fill.style.width = `${r * 100}%`;
      e.text.textContent = max > 0 ? (kind === 'xp' ? `${Math.floor(r * 100)}%` : `${compactNum(value)} / ${compactNum(max)}`) : '';
      if (kind === 'xp') noteXp(value);
    },
    // Ví: [{ k, img, name, text }] (game.wallet.list) — Vàng, Linh thạch, Tiên ngọc
    setWallet(list) {
      const key = list.map((c) => c.text).join('|'); if (key === walletKey) return; walletKey = key;
      walletEl.innerHTML = list.map((c) => `<div class="h3-coin" title="${escapeHtml(c.name)}"><img src="${F('o-tien')}" alt="" class="h3-coin-bg">
        ${c.img ? `<img src="${c.img}" alt="" class="h3-coin-ic">` : ''}<b>${escapeHtml(c.text)}</b><button type="button" class="h3-plus" aria-label="Vạn Bảo Lâu"></button></div>`).join('');
    },
    setQuests: quest.set, // [{ tag, kind, title, goal, ready }]
  };
}

function drawAvatar(canvas, draw) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.save(); ctx.translate(64, 124); ctx.scale(3.8, 3.8); draw(ctx); ctx.restore();
}
