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

// ---------- Nhân vật: trang bị đang đeo (khung v3 của chủ dự án, sinh bằng tools/char_panel.py) ----------
// Ô trống hiện biểu tượng mờ vẽ sẵn (chưa đeo). Thứ tự ô: trái mũ, áo, vũ khí, nhẫn; phải cánh, pháp tướng, linh thú, dây chuyền.
const CHAR_FRAME = { src: 'assets/ui/frames/bang-nhan-vat-v3.png', w: 996, h: 1103, close: [886, 101, 86, 78] };
const SLOT = [178, 162];
const SLOTS = [
  { x: 122, y: 258, name: 'Mũ' }, { x: 122, y: 429, name: 'Áo giáp' }, { x: 122, y: 604, name: 'Vũ khí' },
  { x: 122, y: 776, name: 'Nhẫn' }, { x: 696, y: 258, name: 'Cánh' }, { x: 696, y: 429, name: 'Pháp tướng' },
  { x: 696, y: 604, name: 'Linh thú' }, { x: 696, y: 776, name: 'Dây chuyền' },
];
const CHAR_AREA = [322, 205, 352, 600]; // vùng giữa giữa hai cột ô, dưới tiêu đề, trên hai thanh tên
const NAME_BARS = [[392, 819, 270, 57], [392, 886, 270, 58]]; // phần chữ của 2 thanh (sau biểu tượng người / sen)

export function showCharacterPanel({ name, realmName, equipment, portrait }) {
  const maxW = () => Math.min(vw() * 0.96, 460, (vh() * 0.84 * CHAR_FRAME.w) / CHAR_FRAME.h);
  openModal('modal-char', CHAR_FRAME, maxW, ({ at }) => {
    // Lớp: nền khung (dưới cùng) → nhân vật (giới hạn trong vùng giữa, không tràn ra khung) → ô trang bị (trên cùng)
    const av = at('<canvas class="char-avatar"></canvas>', CHAR_AREA[0], CHAR_AREA[1], CHAR_AREA[2], CHAR_AREA[3]);
    requestAnimationFrame(() => fitPortrait(av, portrait()));

    SLOTS.forEach((s, i) => {
      const item = equipment[i];
      const slot = at(`<button type="button" class="eq-slot ${item ? 'filled' : ''}" aria-label="${s.name}">${item?.icon ? `<img src="${item.icon}" alt="">` : ''}</button>`, s.x, s.y, ...SLOT);
      if (item?.icon) Object.assign(slot.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
      slot.addEventListener('click', () => toast(item ? item.name : `${s.name}: chưa trang bị`));
    });
    at(`<div class="char-line gold">${escapeHtml(name)}</div>`, ...NAME_BARS[0]);
    at(`<div class="char-line">${escapeHtml(realmName)}</div>`, ...NAME_BARS[1]);
  });
}

// Vẽ ảnh nhân vật vừa khít canvas (giữ tỉ lệ, chân đặt ở đáy, căn giữa), nét theo mật độ điểm ảnh
function fitPortrait(cv, img) {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  const g = cv.getContext('2d');
  const k = Math.min(cv.width / img.width, cv.height / img.height);
  const w = img.width * k, h = img.height * k;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(img, (cv.width - w) / 2, cv.height - h, w, h);
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

export function showSettings({ onLogout, onCode, onChange }) {
  const s = loadSettings();
  const maxW = () => Math.min(vw() * 0.94, 460, (vh() * 0.8 * SET_FRAME.w) / SET_FRAME.h);
  openModal('modal-settings', SET_FRAME, maxW, ({ at, close, col }) => {
    const toggle = (key, label) => {
      const btn = at(`<button type="button" class="set-hot" aria-label="${label}"><span>Tắt</span></button>`, ...SET_SPOTS[key]);
      const paint = () => {
        btn.classList.toggle('off', !s[key]);
        btn.setAttribute('aria-pressed', String(s[key]));
      };
      btn.addEventListener('click', () => { s[key] = !s[key]; saveSettings(s); paint(); onChange?.(s); });
      paint();
    };
    toggle('sound', 'Âm thanh');
    toggle('music', 'Nhạc nền');
    at('<button type="button" class="set-hot" aria-label="Ngôn ngữ"></button>', ...SET_SPOTS.lang)
      .addEventListener('click', () => toast('Hiện chỉ có Tiếng Việt'));
    at('<button type="button" class="set-hot" aria-label="Đăng xuất"></button>', ...SET_SPOTS.logout)
      .addEventListener('click', () => { close(); onLogout(); }); // đóng Cài đặt trước để hộp xác nhận hiện trên cùng
    if (onCode) { // mục Nhập mã: nút dưới khung (khung vẽ sẵn không có chỗ cho nút này)
      const b = el('<button type="button" class="set-code">Nhập mã</button>');
      b.addEventListener('click', onCode);
      col.appendChild(b);
    }
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
