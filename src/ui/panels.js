// Các bảng mở từ HUD: Nhân vật, Cài đặt, Bản đồ thế giới. Khung là hình chủ dự án vẽ;
// nội dung (chữ, nút, ô) đặt đè theo toạ độ trên ảnh khung gốc.
// Khung hiển thị theo bội số nguyên điểm ảnh (crispWidth) để viền sắc, đều nhau.
import { el, crispWidth } from './stage.js';
import { escapeHtml, toast } from './screens.js';
import { setupRoundCanvas, drawRoundMap } from './compass.js';

const SETTINGS_KEY = 'tc.settings';
const ICON = (n) => `assets/ui/icons/${n}.png`;

// maxW(): chiều rộng CSS tối đa cho khung trên màn hiện tại
function openModal(className, frame, maxW, build) {
  const wrap = el('<div class="overlay modal-wrap"></div>');
  const col = el(`<div class="modal-col ${className}-col"></div>`);
  const box = el(`<div class="modal ${className}" style="aspect-ratio:${frame.w}/${frame.h}"></div>`);
  if (frame.src) box.style.backgroundImage = `url("${new URL(frame.src, location.href).href}")`;
  const close = el(`<button type="button" class="modal-close glow" aria-label="Đóng"><img src="${ICON('dong')}" alt=""></button>`);
  close.style.width = close.style.height = `${crispWidth(56, 38).width}px`;
  box.appendChild(close);
  col.appendChild(box);
  wrap.appendChild(col);
  document.getElementById('ui').appendChild(wrap);

  const fit = () => {
    const { width, pixelated } = crispWidth(frame.w, maxW());
    box.style.width = `${width}px`;
    box.style.imageRendering = pixelated ? 'pixelated' : 'auto';
  };
  fit();
  addEventListener('resize', fit);

  const done = () => {
    removeEventListener('resize', fit);
    wrap.classList.add('fade-out');
    setTimeout(() => wrap.remove(), 180);
  };
  close.addEventListener('click', done);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) done(); });
  const at = (html, x, y, w, h, parent = box) => {
    const n = el(html);
    Object.assign(n.style, {
      position: 'absolute', left: `${(x / frame.w) * 100}%`, top: `${(y / frame.h) * 100}%`,
      width: `${(w / frame.w) * 100}%`, height: `${(h / frame.h) * 100}%`,
    });
    parent.appendChild(n);
    return n;
  };
  build({ box, col, at, close: done });
  return done;
}

const vw = () => window.innerWidth, vh = () => window.innerHeight;

// ---------- Nhân vật: trang bị + chỉ số trượt lên trong cùng khung ----------
const CHAR_FRAME = { src: 'assets/ui/frames/bang-nhan-vat.png', w: 270, h: 302 };
const SLOT = 45;
const SLOTS = [
  [32, 60], [32, 110], [32, 160], [32, 210],
  [194, 60], [194, 110], [194, 160], [194, 210],
];
const INNER = [22, 54, 226, 228]; // lòng khung (x, y, rộng, cao) — bảng chỉ số trượt trong vùng này

export function showCharacterPanel({ name, realmName, stats, equipment, drawAvatar }) {
  const maxW = () => Math.min(vw() * 0.94, 440, (vh() * 0.82 * CHAR_FRAME.w) / CHAR_FRAME.h);
  openModal('modal-char', CHAR_FRAME, maxW, ({ box, at }) => {
    const av = at('<canvas class="char-avatar" width="96" height="128"></canvas>', 85, 66, 100, 176);
    const ctx = av.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.translate(48, 124); ctx.scale(3.2, 3.2);
    drawAvatar(ctx);

    SLOTS.forEach(([x, y], i) => {
      const item = equipment[i];
      const slot = at(`<button type="button" class="eq-slot ${item ? 'filled' : ''}" aria-label="Ô trang bị ${i + 1}"></button>`, x, y, SLOT, SLOT);
      slot.addEventListener('click', () => toast(item ? item.name : 'Chưa trang bị'));
    });
    // đè lên biểu tượng nhỏ vẽ sẵn: người = đạo hiệu, sen = cảnh giới
    at(`<img class="char-ico" src="${ICON('nguoi')}" alt="">`, 83, 245, 12, 13);
    at(`<img class="char-ico" src="${ICON('sen')}" alt="">`, 83, 265, 12, 13);
    at(`<div class="char-line gold">${escapeHtml(name)}</div>`, 98, 247, 88, 12);
    at(`<div class="char-line">${escapeHtml(realmName)}</div>`, 98, 267, 88, 12);

    // Lớp chỉ số nằm sẵn dưới đáy lòng khung; vuốt lên để trượt ra, vuốt xuống để thu lại
    const view = at('<div class="stats-view"></div>', ...INNER);
    const page = el(`<div class="stats-page">
      <h3>Chỉ số</h3>${stats.map((s) => `
      <div class="stat"><span>${escapeHtml(s.label)}</span><b>${s.value ?? '—'}</b></div>`).join('')}
      <p class="muted">Chỉ số sẽ hiện số thật khi có bảng chỉ số nhân vật.</p></div>`);
    view.appendChild(page);
    const tab = at('<button type="button" class="stats-tab glow" aria-expanded="false"><span>Chỉ số</span></button>', 100, 283, 70, 14);
    attachSlide(box, page, tab);
  });
}

function attachSlide(area, page, tab) {
  let open = false;
  const set = (v) => {
    open = v;
    page.style.transition = '';
    page.style.transform = v ? 'translateY(0)' : 'translateY(100%)';
    tab.setAttribute('aria-expanded', String(v));
    tab.classList.toggle('open', v);
  };
  let y0 = null, moved = false;
  area.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.modal-close')) return;
    y0 = e.clientY; moved = false;
  });
  area.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    if (Math.abs(dy) < 6) return;
    moved = true;
    const h = page.offsetHeight || 1;
    page.style.transition = 'none';
    page.style.transform = `translateY(${Math.max(0, Math.min(h, (open ? 0 : h) + dy))}px)`;
  });
  const end = (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    y0 = null;
    if (!moved) return;
    if (dy < -30) set(true); else if (dy > 30) set(false); else set(open);
  };
  area.addEventListener('pointerup', end);
  area.addEventListener('pointercancel', end);
  tab.addEventListener('click', () => set(!open));
  set(false);
}

// ---------- Cài đặt: âm thanh, nhạc nền, ngôn ngữ, đăng xuất ----------
const SET_FRAME = { src: 'assets/ui/frames/bang-cai-dat.png', w: 155, h: 148 };
const ROWS_Y = [41, 67, 93, 119];

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
  const maxW = () => Math.min(vw() * 0.92, 420, (vh() * 0.8 * SET_FRAME.w) / SET_FRAME.h);
  openModal('modal-settings', SET_FRAME, maxW, ({ at }) => {
    const row = (y, icon, label, value, onClick, kind = 'toggle') => {
      at(`<img class="set-icon" src="${ICON(icon)}" alt="">`, 21, y - 2, 19, 19);
      at(`<div class="set-label">${escapeHtml(label)}</div>`, 48, y + 1, 62, 12);
      const btn = at(`<button type="button" class="set-${kind} glow"></button>`, 112, y, 21, 15);
      const paint = () => {
        const v = value();
        btn.textContent = kind === 'toggle' ? (v ? 'Bật' : 'Tắt') : v;
        btn.classList.toggle('off', kind === 'toggle' && !v);
      };
      btn.addEventListener('click', () => { onClick(); paint(); });
      paint();
    };
    row(ROWS_Y[0], 'am-thanh', 'Âm thanh', () => s.sound, () => { s.sound = !s.sound; saveSettings(s); });
    row(ROWS_Y[1], 'nhac-nen', 'Nhạc nền', () => s.music, () => { s.music = !s.music; saveSettings(s); });
    row(ROWS_Y[2], 'ngon-ngu', 'Ngôn ngữ', () => 'VI ▾', () => toast('Hiện chỉ có Tiếng Việt'), 'select');
    at(`<img class="set-icon" src="${ICON('dang-xuat')}" alt="">`, 21, ROWS_Y[3] - 2, 19, 19);
    const out = at('<button type="button" class="set-logout glow">Đăng xuất</button>', 48, ROWS_Y[3], 85, 15);
    out.addEventListener('click', onLogout);
  });
}

// ---------- Bản đồ thế giới (tròn, lấy mình làm tâm vì thế giới vòng lặp) ----------
const ZOOMS = [250, 125, 60]; // bán kính hiển thị (ô): 250 = thấy trọn thế giới 500×500

export function showWorldMap({ zoneName, draw }) {
  let raf = 0;
  let zi = 0;
  const frame = { w: 100, h: 100 };
  const maxW = () => Math.min(vw() * 0.86, vh() * 0.7, 460);
  const done = openModal('modal-map', frame, maxW, ({ box }) => {
    const cv = setupRoundCanvas(el('<canvas class="world-map"></canvas>'), parseFloat(box.style.width));
    box.appendChild(cv);
    box.insertAdjacentHTML('afterbegin', `<div class="map-title"><span>${escapeHtml(zoneName)}</span></div>`);
    const zoom = el(`<div class="map-zoom">
      <button type="button" class="glow" data-z="1" aria-label="Phóng to"><img src="${ICON('cong')}" alt=""></button>
      <button type="button" class="glow" data-z="-1" aria-label="Thu nhỏ"><img src="${ICON('tru')}" alt=""></button></div>`);
    box.appendChild(zoom);
    zoom.querySelectorAll('button').forEach((b) => { b.style.width = b.style.height = `${crispWidth(56, 40).width}px`; });
    zoom.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      zi = Math.max(0, Math.min(ZOOMS.length - 1, zi + Number(b.dataset.z)));
    });
    const tick = () => {
      drawRoundMap(cv, (off, size) => draw(off, ZOOMS[zi], size));
      raf = requestAnimationFrame(tick);
    };
    tick();
  });
  const obs = new MutationObserver(() => {
    if (!document.querySelector('.modal-map')) { cancelAnimationFrame(raf); obs.disconnect(); }
  });
  obs.observe(document.getElementById('ui'), { childList: true });
  return done;
}
