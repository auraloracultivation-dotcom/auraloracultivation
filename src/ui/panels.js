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
  // Khung có sẵn nút ✕ vẽ trong ảnh (frame.close) → đặt nút bấm trong suốt đè lên; không thì dùng icon ✕
  const close = frame.close
    ? el('<button type="button" class="modal-close hot-close" aria-label="Đóng"></button>')
    : el(`<button type="button" class="modal-close glow" aria-label="Đóng"><img src="${ICON('dong')}" alt=""></button>`);
  if (frame.close) {
    const [cx, cy, cw, ch] = frame.close;
    Object.assign(close.style, {
      left: `${(cx / frame.w) * 100}%`, top: `${(cy / frame.h) * 100}%`,
      width: `${(cw / frame.w) * 100}%`, height: `${(ch / frame.h) * 100}%`, right: 'auto',
    });
  } else close.style.width = close.style.height = `${crispWidth(56, 38).width}px`;
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

export function showCharacterPanel({ name, realmName, equipment, drawAvatar }) {
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

  });
}

// ---------- Cài đặt: khung + nút vẽ sẵn của chủ dự án (frames/bang-cai-dat-v2.png, tách bằng tools/panel_from_mockup.py) ----------
// Toạ độ trên ảnh khung 920×894. Nút "Bật" vẽ sẵn; khi tắt thì phủ một nút "Tắt" lên đúng chỗ đó.
const SET_FRAME = { src: 'assets/ui/frames/bang-cai-dat-v2.png', w: 920, h: 894, close: [825, 34, 88, 88] };
const SET_SPOTS = {
  sound: [621, 244, 148, 82],
  music: [621, 398, 148, 81],
  lang: [619, 553, 156, 81],
  logout: [275, 704, 513, 97],
};

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
  const maxW = () => Math.min(vw() * 0.94, 460, (vh() * 0.8 * SET_FRAME.w) / SET_FRAME.h);
  openModal('modal-settings', SET_FRAME, maxW, ({ at, close }) => {
    const toggle = (key, label) => {
      const btn = at(`<button type="button" class="set-hot" aria-label="${label}"><span>Tắt</span></button>`, ...SET_SPOTS[key]);
      const paint = () => {
        btn.classList.toggle('off', !s[key]);
        btn.setAttribute('aria-pressed', String(s[key]));
      };
      btn.addEventListener('click', () => { s[key] = !s[key]; saveSettings(s); paint(); });
      paint();
    };
    toggle('sound', 'Âm thanh');
    toggle('music', 'Nhạc nền');
    at('<button type="button" class="set-hot" aria-label="Ngôn ngữ"></button>', ...SET_SPOTS.lang)
      .addEventListener('click', () => toast('Hiện chỉ có Tiếng Việt'));
    at('<button type="button" class="set-hot" aria-label="Đăng xuất"></button>', ...SET_SPOTS.logout)
      .addEventListener('click', () => { close(); onLogout(); }); // đóng Cài đặt trước để hộp xác nhận hiện trên cùng
  });
}

// ---------- Bản đồ thế giới (tròn, lấy mình làm tâm vì thế giới vòng lặp) ----------
const ZOOMS = [250, 125, 60]; // bán kính hiển thị (ô): 250 = thấy trọn thế giới 500×500

export function showWorldMap({ zoneName, draw }) {
  let raf = 0;
  let zi = 0;
  const frame = { w: 995, h: 980, close: null };
  const maxW = () => Math.min(vw() * 0.96 - 52, vh() * 0.72, 520); // chừa chỗ cột +/− bên phải
  const done = openModal('modal-map', frame, maxW, ({ box, col }) => {
    const cv = setupRoundCanvas(el('<canvas class="world-map"></canvas>'), parseFloat(box.style.width));
    box.appendChild(cv);
    box.insertAdjacentHTML('afterbegin', `<div class="map-title"><span>${escapeHtml(zoneName)}</span></div>`);
    const zoom = el(`<div class="map-zoom">
      <button type="button" class="glow" data-z="1" aria-label="Phóng to"><img src="${ICON('ban-do-cong')}" alt=""></button>
      <button type="button" class="glow" data-z="-1" aria-label="Thu nhỏ"><img src="${ICON('ban-do-tru')}" alt=""></button></div>`);
    col.appendChild(zoom); // cột +/− nằm bên phải khung
    zoom.querySelectorAll('button').forEach((b) => { b.style.width = b.style.height = '42px'; });
    const x = box.querySelector('.modal-close img');
    if (x) x.src = ICON('ban-do-dong'); // nút ✕ cùng bộ với khung bản đồ
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
