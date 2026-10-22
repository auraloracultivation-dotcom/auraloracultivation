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
const CHAR_AREA = [322, 205, 352, 535]; // cỡ thân nhân vật (chỉ đạo bào) vừa khít vùng này — to như bản đầu
const CHAR_FOOT = [497, 740]; // chân đặt giữa vòng pháp trận
const CHAR_CLIP = [92, 212, 812, 600]; // vùng trong khung (trên hai thanh tên): vũ khí/cánh được tràn ra đây
const NAME_BARS = [[392, 819, 270, 57], [392, 886, 270, 58]]; // phần chữ của 2 thanh (sau biểu tượng người / sen)

// onSlot(i): chạm ô đã có đồ → mở hộp thao tác (Tháo / Thức tỉnh / Phân rã / Vứt)
// onEmpty(i): chạm ô trống → bảng chọn đồ trong kho
export function showCharacterPanel({ name, realmName, equipment, portrait, onSlot, onEmpty }) {
  const maxW = () => Math.min(vw() * 0.96, 460, (vh() * 0.84 * CHAR_FRAME.w) / CHAR_FRAME.h);
  return openModal('modal-char', CHAR_FRAME, maxW, ({ at }) => {
    // Lớp: nền khung → nhân vật (to theo thân; vũ khí, cánh tràn ra nhưng nằm SAU các ô trang bị) → ô trang bị
    const av = at('<canvas class="char-avatar"></canvas>', 0, 0, CHAR_FRAME.w, CHAR_FRAME.h);
    const frameImg = new Image();
    frameImg.onload = () => requestAnimationFrame(() => drawCharacter(av, portrait(), frameImg));
    frameImg.src = CHAR_FRAME.src;

    SLOTS.forEach((s, i) => {
      const item = equipment[i];
      const slot = at(`<button type="button" class="eq-slot ${item ? 'filled' : ''}" aria-label="${s.name}">${item?.icon ? `<img src="${item.icon}" alt="">` : ''}</button>`, s.x, s.y, ...SLOT);
      if (item?.icon) Object.assign(slot.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
      slot.addEventListener('click', () => (item ? onSlot?.(i) : onEmpty ? onEmpty(i, s.name) : toast(`${s.name}: chưa trang bị`)));
    });
    at(`<div class="char-line gold">${escapeHtml(name)}</div>`, ...NAME_BARS[0]);
    at(`<div class="char-line">${escapeHtml(realmName)}</div>`, ...NAME_BARS[1]);
  });
}

// Vẽ nhân vật trên canvas phủ cả khung. Tỉ lệ lấy theo THÂN (body) cho vừa CHAR_AREA, rồi vẽ ảnh đầy đủ (full: có vũ khí, cánh)
// cùng tỉ lệ, chân ở CHAR_FOOT. Sau đó vẽ lại các ô trang bị từ ảnh khung đè lên → đồ tràn ra nằm sau ô.
function drawCharacter(cv, { full, body }, frameImg) {
  const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  cv.width = Math.max(1, Math.round(r.width * dpr)); cv.height = Math.max(1, Math.round(r.height * dpr));
  const g = cv.getContext('2d'), u = cv.width / CHAR_FRAME.w; // điểm ảnh canvas / điểm ảnh khung
  const k = Math.min(CHAR_AREA[2] / body.width, CHAR_AREA[3] / body.height) * u;
  const foot = full.foot || [full.width / 2, full.height];
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.save();
  g.beginPath(); g.rect(CHAR_CLIP[0] * u, CHAR_CLIP[1] * u, CHAR_CLIP[2] * u, CHAR_CLIP[3] * u); g.clip();
  g.drawImage(full, CHAR_FOOT[0] * u - foot[0] * k, CHAR_FOOT[1] * u - foot[1] * k, full.width * k, full.height * k);
  // mờ dần ở mép trên/trái/phải để đồ tràn ra không bị cắt cứng
  const [cx, cy, cw] = CHAR_CLIP.map((v) => v * u), F = 28 * u;
  g.globalCompositeOperation = 'destination-out';
  for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [
    [0, cy, 0, cy + F, cx, cy, cw, F], [cx, 0, cx + F, 0, cx, cy, F, cv.height], [cx + cw, 0, cx + cw - F, 0, cx + cw - F, cy, F, cv.height],
  ]) {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(rx, ry, rw, rh);
  }
  g.restore();
  for (const s of SLOTS) g.drawImage(frameImg, s.x, s.y, SLOT[0], SLOT[1], s.x * u, s.y * u, SLOT[0] * u, SLOT[1] * u);
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

export function showSettings({ onLogout, onRedeem, onChange, onRecall }) {
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
    if (onRedeem) codeDrawer(col, onRedeem, onRecall && (() => { close(); onRecall(); })); // khung vẽ sẵn không có chỗ → ngăn kéo vuốt lên bên dưới
  });
}

// Ngăn "Nhập mã" dưới bảng Cài đặt: vuốt lên trên bảng (hoặc chạm dòng gợi ý) để mở, vuốt xuống để đóng.
function codeDrawer(col, onRedeem, onRecall) {
  const d = el(`<div class="set-drawer">
    <button type="button" class="set-pull" aria-expanded="false"><i></i><span>Vuốt lên để nhập mã</span></button>
    <form class="set-code-form" autocomplete="off">
      <input class="code-in" type="text" maxlength="40" placeholder="Nhập mã quà tặng" autocapitalize="none" autocorrect="off" spellcheck="false">
      <button type="submit" class="bag-act">Xác nhận</button>
      <p class="code-msg" role="status"></p>
    </form>${onRecall ? '<button type="button" class="bag-act set-recall">Bị kẹt? Về Thanh Vân Thành</button>' : ''}</div>`);
  col.appendChild(d);
  d.querySelector('.set-recall')?.addEventListener('click', onRecall); // thoát kẹt: máy chủ đưa về trận pháp giữa thành
  const pull = d.querySelector('.set-pull'), form = d.querySelector('form'), input = d.querySelector('input'), msg = d.querySelector('.code-msg');
  const setOpen = (open) => {
    d.classList.toggle('open', open);
    pull.setAttribute('aria-expanded', String(open));
    pull.querySelector('span').textContent = open ? 'Vuốt xuống để đóng' : 'Vuốt lên để nhập mã';
    if (!open) input.blur();
  };
  pull.addEventListener('click', () => setOpen(!d.classList.contains('open')));
  // vuốt: theo dõi trên cả cột (bảng + ngăn). Vừa vuốt xong thì chặn cú "click" để không bật/tắt nhầm nút
  let y0 = null, swiped = false;
  col.addEventListener('pointerdown', (e) => { if (e.target !== input) { y0 = e.clientY; swiped = false; } });
  col.addEventListener('pointermove', (e) => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    if (Math.abs(dy) > 36) { setOpen(dy < 0); swiped = true; y0 = null; }
  });
  for (const ev of ['pointerup', 'pointercancel']) col.addEventListener(ev, () => { y0 = null; });
  col.addEventListener('click', (e) => { if (swiped) { e.stopPropagation(); e.preventDefault(); swiped = false; } }, true);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = input.value.trim();
    msg.classList.remove('ok');
    if (!code) { msg.textContent = 'Hãy nhập mã.'; return; }
    try {
      const text = await onRedeem(code);
      msg.textContent = text; msg.classList.add('ok');
      input.value = ''; input.blur();
      toast(text, 2200);
    } catch (err) {
      msg.textContent = err.message || 'Mã không đúng.';
    }
  });
}

// ---------- Bản đồ thế giới (tròn, lấy mình làm tâm vì thế giới vòng lặp) ----------
const ZOOMS = [500, 200, 70]; // bán kính hiển thị (ô): 500 = thấy trọn thế giới 1000×1000

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
