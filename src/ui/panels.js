// Các bảng mở từ HUD: Nhân vật, Cài đặt, Bản đồ thế giới. Khung là hình chủ dự án vẽ;
// nội dung (chữ, nút, ô) đặt đè theo toạ độ trên ảnh khung gốc.
import { el } from './stage.js';
import { escapeHtml, toast } from './screens.js';

const SETTINGS_KEY = 'tc.settings';

function openModal(className, frame, build) {
  const wrap = el('<div class="overlay modal-wrap"></div>');
  const box = el(`<div class="modal ${className}" style="aspect-ratio:${frame.w}/${frame.h};--fw:${frame.w}"></div>`);
  box.style.backgroundImage = `url("${new URL(frame.src, location.href).href}")`;
  const close = el('<button type="button" class="modal-close glow" aria-label="Đóng">✕</button>');
  box.appendChild(close);
  wrap.appendChild(box);
  document.getElementById('ui').appendChild(wrap);
  const done = () => { wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 180); };
  close.addEventListener('click', done);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) done(); });
  const at = (html, x, y, w, h) => {
    const n = el(html);
    Object.assign(n.style, {
      position: 'absolute', left: `${(x / frame.w) * 100}%`, top: `${(y / frame.h) * 100}%`,
      width: `${(w / frame.w) * 100}%`, height: `${(h / frame.h) * 100}%`,
    });
    box.appendChild(n);
    return n;
  };
  build({ box, at, close: done });
  return done;
}

// ---------- Nhân vật: chỉ số + trang bị đang đeo ----------
const CHAR_FRAME = { src: 'assets/ui/frames/bang-nhan-vat.png', w: 270, h: 302 };
const SLOTS = [ // [x, y] ô trang bị vẽ sẵn trên khung (44×44)
  [27, 60], [27, 109], [27, 159], [27, 208],
  [189, 60], [189, 109], [189, 159], [189, 208],
];

export function showCharacterPanel({ name, realmName, stats, equipment, drawAvatar }) {
  openModal('modal-char', CHAR_FRAME, ({ box, at }) => {
    const av = at('<canvas class="char-avatar" width="96" height="128"></canvas>', 80, 70, 110, 160);
    const ctx = av.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.translate(48, 122); ctx.scale(3.4, 3.4);
    drawAvatar(ctx);

    SLOTS.forEach(([x, y], i) => {
      const item = equipment[i];
      const slot = at(`<button type="button" class="eq-slot ${item ? 'filled' : ''}" aria-label="Ô trang bị ${i + 1}"></button>`, x, y, 46, 46);
      slot.addEventListener('click', () => toast(item ? item.name : 'Chưa trang bị'));
    });
    at(`<div class="char-line gold">${escapeHtml(name)}</div>`, 84, 245, 100, 13);
    at(`<div class="char-line">${escapeHtml(realmName)}</div>`, 84, 265, 100, 13);

    const side = el(`<div class="char-stats"><h3>Chỉ số</h3>${stats.map((s) => `
      <div class="stat"><span>${escapeHtml(s.label)}</span><b>${s.value ?? '—'}</b></div>`).join('')}
      <p class="muted">Chỉ số sẽ hiện số thật khi có bảng chỉ số nhân vật.</p></div>`);
    box.appendChild(side);
  });
}

// ---------- Cài đặt: âm thanh, nhạc nền, ngôn ngữ, đăng xuất ----------
const SET_FRAME = { src: 'assets/ui/frames/bang-cai-dat.png', w: 155, h: 148 };
const ROWS_Y = [41, 67, 93, 119]; // hàng trên khung

export function loadSettings() {
  try { return { sound: true, music: true, lang: 'vi', ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; } catch {
    return { sound: true, music: true, lang: 'vi' };
  }
}
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* trình duyệt chặn lưu: bỏ qua */ }
}

export function showSettings({ onLogout }) {
  const s = loadSettings();
  openModal('modal-settings', SET_FRAME, ({ at }) => {
    const row = (y, label, value, onClick, kind = 'toggle') => {
      at(`<div class="set-label">${escapeHtml(label)}</div>`, 48, y + 1, 62, 12);
      const btn = at(`<button type="button" class="set-${kind} glow"></button>`, 112, y, 21, 15);
      const paint = () => {
        const v = value();
        btn.textContent = kind === 'toggle' ? (v ? 'Bật' : 'Tắt') : v;
        btn.classList.toggle('off', kind === 'toggle' && !v);
      };
      btn.addEventListener('click', () => { onClick(); paint(); });
      paint();
      return btn;
    };
    row(ROWS_Y[0], 'Âm thanh', () => s.sound, () => { s.sound = !s.sound; saveSettings(s); });
    row(ROWS_Y[1], 'Nhạc nền', () => s.music, () => { s.music = !s.music; saveSettings(s); });
    row(ROWS_Y[2], 'Ngôn ngữ', () => 'VI', () => toast('Hiện chỉ có Tiếng Việt'), 'select');
    const out = at('<button type="button" class="set-logout glow">Đăng xuất</button>', 48, ROWS_Y[3], 85, 15);
    out.addEventListener('click', onLogout);
  });
}

// ---------- Bản đồ thế giới (khung tròn, xoay quanh vị trí mình vì thế giới vòng lặp) ----------
const MAP_FRAME = { src: 'assets/ui/frames/minimap-tron.png', w: 70, h: 75 };
const ZOOMS = [250, 125, 60]; // bán kính hiển thị (ô): 250 = thấy trọn thế giới 500×500

export function showWorldMap({ zoneName, draw }) {
  let raf = 0;
  let zi = 0;
  const done = openModal('modal-map', MAP_FRAME, ({ box, at }) => {
    // vòng tròn trong khung vẽ sẵn: tâm (35,40), bán kính ~27
    const cv = at('<canvas class="world-map" width="420" height="420"></canvas>', 8.4, 13.2, 53.2, 53.2);
    box.insertAdjacentHTML('afterbegin', `<div class="map-title"><span>${escapeHtml(zoneName)}</span></div>`);
    const zoom = el(`<div class="map-zoom">
      <button type="button" class="glow" data-z="1" aria-label="Phóng to">+</button>
      <button type="button" class="glow" data-z="-1" aria-label="Thu nhỏ">−</button></div>`);
    box.appendChild(zoom);
    zoom.addEventListener('click', (e) => {
      const d = Number(e.target.dataset.z || 0);
      zi = Math.max(0, Math.min(ZOOMS.length - 1, zi + d));
    });
    const frame = () => {
      draw(cv, ZOOMS[zi]);
      raf = requestAnimationFrame(frame);
    };
    frame();
  });
  const obs = new MutationObserver(() => {
    if (!document.querySelector('.modal-map')) { cancelAnimationFrame(raf); obs.disconnect(); }
  });
  obs.observe(document.getElementById('ui'), { childList: true });
  return done;
}
