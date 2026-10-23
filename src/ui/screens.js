// Màn đăng nhập + chờ vào game, tải nhân vật. Hình ảnh lấy từ assets/ui (thiết kế của chủ dự án).
// Không gọi mạng trực tiếp — nhận hàm từ main.js.
// 23/10/2026 (chủ dự án): bỏ màn tải trung gian. Chỉ còn MỘT nền đăng nhập; lúc chờ (đăng nhập, vào game)
// hiện một dòng chữ + vòng xoay ngay dưới bảng đăng nhập.
import { createStage, el, isPortrait, crispWidth } from './stage.js';

// Toạ độ đo trên từng ảnh nền (điểm ảnh gốc) — nền đăng nhập vẽ sẵn ô, nút, dấu tích.
const LOGIN = {
  land: {
    src: 'assets/ui/bg/dang-nhap-ngang.webp', w: 1672, h: 940,
    account: [705, 397, 340, 50], pass: [705, 474, 275, 50], eye: [982, 470, 66, 58],
    remember: [710, 545, 250, 40], box: [714, 548, 35, 35],
    login: [635, 600, 405, 72], up: [615, 693, 207, 52], reset: [851, 693, 207, 52],
    msg: [520, 792, 640, 46], panel: [560, 300, 560, 490],
  },
  port: {
    src: 'assets/ui/bg/dang-nhap-doc.webp', w: 941, h: 1672,
    account: [330, 910, 355, 52], pass: [330, 1000, 290, 52], eye: [625, 995, 70, 62],
    remember: [338, 1080, 265, 42], box: [343, 1083, 35, 35],
    login: [265, 1145, 415, 80], up: [242, 1253, 215, 54], reset: [487, 1253, 215, 54],
    msg: [150, 1352, 640, 50], panel: [180, 800, 590, 550],
  },
};
const LOAD = { // nền cũ, chỉ còn dùng làm phông mờ cho bảng tạo nhân vật / đổi mật khẩu
  land: { src: 'assets/ui/bg/tim-dang-tai.webp', w: 765, h: 405, bar: [117, 348, 467, 23], label: [117, 322, 467, 22] },
  port: { src: 'assets/ui/bg/tim-dang-tai-doc.webp', w: 377, h: 680, bar: [57, 616, 263, 18], label: [20, 590, 337, 22], pctCover: [110, 639, 157, 26] },
};
const layout = (set) => set[isPortrait() ? 'port' : 'land'];
const REMEMBER_KEY = 'tc.remember';

// Một sân khấu dùng chung cho chờ + đăng nhập: chuyển qua lại không chớp màn hình.
let cur = null; // { s, L, status, form, portrait, hideT }
function stage() {
  if (cur && cur.portrait !== isPortrait() && !cur.form) { cur.s.wrap.remove(); cur = null; } // xoay máy lúc đang chờ: dựng lại
  if (cur) { clearTimeout(cur.hideT); return cur; }
  const L = layout(LOGIN), s = createStage(L.src, L.w, L.h).mount();
  const cover = s.place(el('<div class="login-cover"></div>'), ...L.panel); // che bảng vẽ sẵn khi chỉ đang chờ
  const status = s.place(el('<div class="login-msg"><i class="spin"></i><span></span></div>'), ...L.msg);
  cur = { s, L, cover, status, form: null, portrait: isPortrait(), hideT: 0 };
  return cur;
}
// Dòng trạng thái: wait = có vòng xoay; ok = chữ xanh; còn lại chữ cam (lỗi)
function setStatus(t, { wait = false, ok = false } = {}) {
  const st = stage().status;
  st.querySelector('span').textContent = t || '';
  st.classList.toggle('wait', wait); st.classList.toggle('ok', ok || wait); st.hidden = !t;
}

// Giữ tên showLoading để main.js không phải đổi: chỉ là dòng chờ trên nền đăng nhập, không còn màn riêng.
export function showLoading(text = 'Đang vào Tu Chân giới…') {
  const c = stage();
  if (!c.form) c.cover.hidden = false;
  setStatus(text, { wait: true });
  return {
    set(p, t) { if (t && cur === c) setStatus(t, { wait: true }); },
    hide() { // chờ một nhịp: nếu ngay sau đó mở đăng nhập thì dùng lại nền, không chớp
      if (cur !== c) return;
      clearTimeout(c.hideT);
      c.hideT = setTimeout(() => { if (cur === c && !c.form) { cur = null; c.s.remove(); } }, 60);
    },
  };
}

export function showLogin({ onSignIn, onSignUp, onResetPassword }) {
  return new Promise((resolve) => {
    const c = stage(), { s, L } = c;
    c.cover.hidden = true; setStatus('');
    const form = el(`<form class="login-form" autocomplete="on"></form>`);
    s.stage.appendChild(form);
    const account = s.place(el(`<input class="field" name="account" type="text" placeholder="Tài khoản" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40">`), ...L.account);
    const pass = s.place(el(`<input class="field" name="password" type="password" placeholder="Mật khẩu" autocomplete="current-password">`), ...L.pass);
    form.append(account, pass);
    const eye = s.place(el(`<button type="button" class="hot eye" aria-label="Hiện mật khẩu"></button>`), ...L.eye);
    const remember = s.place(el(`<button type="button" class="hot" aria-label="Ghi nhớ đăng nhập"></button>`), ...L.remember);
    const box = s.place(el('<div class="check-cover"></div>'), ...L.box); // che dấu tích vẽ sẵn khi tắt
    const btnIn = s.place(el(`<button type="submit" class="hot glow" aria-label="Đăng nhập"></button>`), ...L.login);
    const btnUp = s.place(el(`<button type="button" class="hot glow" aria-label="Đăng ký"></button>`), ...L.up);
    const btnReset = s.place(el(`<button type="button" class="hot glow" aria-label="Quên mật khẩu"></button>`), ...L.reset);
    form.append(btnIn);
    const parts = [form, eye, remember, box, btnIn, btnUp, btnReset];
    c.form = form;

    let rememberOn = localStorage.getItem(REMEMBER_KEY) !== '0';
    const paintCheck = () => { box.hidden = rememberOn; };
    paintCheck();
    remember.addEventListener('click', () => { rememberOn = !rememberOn; paintCheck(); });
    eye.addEventListener('click', () => { const show = pass.type === 'password'; pass.type = show ? 'text' : 'password'; eye.classList.toggle('on', show); });

    // Xoay máy khi đang ở màn đăng nhập: dựng lại theo nền mới, giữ nội dung đã gõ
    const startedPortrait = isPortrait();
    const onResize = () => {
      if (isPortrait() === startedPortrait) return;
      removeEventListener('resize', onResize);
      const keep = { a: account.value, p: pass.value };
      c.s.wrap.remove(); cur = null;
      showLogin({ onSignIn, onSignUp, onResetPassword }).then(resolve);
      requestAnimationFrame(() => {
        const f = document.querySelector('.login-form');
        if (f) { f.account.value = keep.a; f.password.value = keep.p; }
      });
    };
    addEventListener('resize', onResize);

    const all = [btnIn, btnUp, btnReset, account, pass];
    const busy = (on) => { all.forEach((b) => (b.disabled = on)); form.classList.toggle('busy', on); };

    async function run(fn, waitText) {
      const e = account.value.trim(), p = pass.value;
      if (!e || p.length < 6) { setStatus('Nhập tài khoản và mật khẩu từ 6 ký tự.'); return; }
      busy(true);
      setStatus(waitText, { wait: true });
      try {
        const session = await fn(e, p);
        if (session) {
          localStorage.setItem(REMEMBER_KEY, rememberOn ? '1' : '0');
          sessionStorage.setItem('tc.tab', '1');
          removeEventListener('resize', onResize);
          parts.forEach((n) => n.remove()); c.form = null; c.cover.hidden = false; // giữ nền, dòng chờ chạy tiếp lúc vào game
          setStatus('Đang vào game…', { wait: true });
          resolve(session);
          return;
        }
        setStatus('Đã gửi thư xác nhận. Mở email, bấm xác nhận rồi đăng nhập.', { ok: true });
      } catch (err) { setStatus(err.message); }
      busy(false);
    }
    form.addEventListener('submit', (ev) => { ev.preventDefault(); account.blur(); pass.blur(); run(onSignIn, 'Đang đăng nhập…'); });
    btnUp.addEventListener('click', () => run(onSignUp, 'Đang tạo tài khoản…'));
    btnReset.addEventListener('click', async () => {
      const e = account.value.trim();
      if (!e) { setStatus('Nhập tài khoản trước rồi bấm Quên mật khẩu.'); return; }
      setStatus('Đang gửi thư…', { wait: true });
      try { await onResetPassword(e); setStatus('Đã gửi thư đặt lại mật khẩu.', { ok: true }); } catch (err) { setStatus(err.message); }
    });
  });
}

// Không chọn "Ghi nhớ" thì đóng trình duyệt là phải đăng nhập lại.
export function shouldForgetSession() {
  return localStorage.getItem(REMEMBER_KEY) === '0' && !sessionStorage.getItem('tc.tab');
}

// Khung mây frames/bang-may.png (323×194) hiển thị theo bội số nguyên điểm ảnh cho sắc nét
function crispPanel(panel) {
  const max = Math.min(460, window.innerWidth * 0.92, (window.innerHeight * 0.8 * 323) / 194);
  const { width, pixelated } = crispWidth(323, max);
  panel.style.width = `${width}px`;
  panel.style.padding = `${width * 0.17}px ${width * 0.12}px ${width * 0.11}px`; // % sẽ tính theo màn hình, nên đặt bằng px
  panel.style.imageRendering = pixelated ? 'pixelated' : 'auto';
}

// overlay = true: chỉ hiện khung đè lên màn hình hiện tại (trong game), không thay nền.
function framedPanel(title, bodyHtml, { overlay = false } = {}) {
  if (overlay) {
    const wrap = el('<div class="overlay confirm-wrap"></div>'); // luôn nằm trên mọi bảng khác
    document.getElementById('ui').appendChild(wrap);
    const panel = el(`<div class="frame-panel"><h2>${escapeHtml(title)}</h2>${bodyHtml}<div class="panel-msg"></div></div>`);
    wrap.appendChild(panel);
    crispPanel(panel);
    const back = { remove() { wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 200); } };
    return { back, panel, msg: panel.querySelector('.panel-msg') };
  }
  const L = layout(LOAD);
  const back = createStage(L.src, L.w, L.h).mount();
  back.wrap.classList.add('dim');
  back.place(el('<div class="bar-cover"></div>'), ...L.bar); // che thanh 73% vẽ sẵn
  if (L.pctCover) back.place(el('<div class="pct-cover"></div>'), ...L.pctCover);
  const panel = el(`<div class="frame-panel"><h2>${escapeHtml(title)}</h2>${bodyHtml}<div class="panel-msg"></div></div>`);
  back.wrap.appendChild(panel);
  crispPanel(panel);
  return { back, panel, msg: panel.querySelector('.panel-msg') };
}

export function showCreateCharacter({ onCreate }) {
  return new Promise((resolve) => {
    const { back, panel, msg } = framedPanel('Đặt đạo hiệu', `
      <form><input class="field framed" name="name" maxlength="16" placeholder="2–16 ký tự">
      <button class="btn-gold" type="submit">Nhập thế</button></form>`);
    const form = panel.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = form.name.value.trim();
      if (name.length < 2) { msg.textContent = 'Đạo hiệu cần ít nhất 2 ký tự.'; return; }
      form.querySelector('button').disabled = true;
      msg.textContent = 'Đang tạo…';
      try { const c = await onCreate(name); back.remove(); resolve(c); } catch (err) {
        msg.textContent = err.message;
        form.querySelector('button').disabled = false;
      }
    });
  });
}

export function showNewPassword({ onSave }) {
  return new Promise((resolve) => {
    const { back, panel, msg } = framedPanel('Mật khẩu mới', `
      <form><input class="field framed" name="pw" type="password" minlength="6" placeholder="Ít nhất 6 ký tự">
      <button class="btn-gold" type="submit">Lưu</button></form>`);
    const form = panel.querySelector('form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { await onSave(form.pw.value); back.remove(); resolve(); } catch (err) { msg.textContent = err.message; }
    });
  });
}

export function showConfirm(title, text, { yes = 'Đồng ý', no = 'Ở lại', overlay = true } = {}) {
  return new Promise((resolve) => {
    const { back, panel } = framedPanel(title, `<p>${escapeHtml(text)}</p>
      <div class="btn-row"><button class="btn-dark" data-v="0">${escapeHtml(no)}</button><button class="btn-gold" data-v="1">${escapeHtml(yes)}</button></div>`, { overlay });
    panel.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      back.remove(); resolve(b.dataset.v === '1');
    }));
  });
}

export function showFatal(text) {
  const { panel } = framedPanel('Có lỗi', `<p>${escapeHtml(text)}</p>
    <div class="btn-row"><button class="btn-gold">Tải lại</button></div>`);
  panel.querySelector('button').addEventListener('click', () => location.reload());
}

export function toast(text, ms = 2500) {
  const t = el(`<div class="toast">${escapeHtml(text)}</div>`);
  document.getElementById('ui').appendChild(t);
  setTimeout(() => t.remove(), ms);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
