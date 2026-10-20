// Màn hình tải, đăng nhập, tạo nhân vật. Hình ảnh lấy từ assets/ui (thiết kế của chủ dự án).
// Không gọi mạng trực tiếp — nhận hàm từ main.js.
import { createStage, el, isPortrait, crispWidth } from './stage.js';

// Toạ độ đo trên từng ảnh nền (điểm ảnh gốc). Màn dọc dùng bộ nền dọc của chủ dự án.
const LOGIN = {
  land: {
    src: 'assets/ui/bg/tim-dang-nhap.webp', w: 764, h: 405,
    account: [292, 165, 216, 26], pass: [292, 206, 216, 27], remember: [304, 250, 122, 20], box: [307, 253, 15, 14],
    login: [252, 287, 265, 46], up: [185, 346, 118, 32], reset: [320, 346, 123, 32], server: [459, 346, 118, 32],
    msg: [200, 384, 380, 18],
  },
  port: {
    src: 'assets/ui/bg/tim-dang-nhap-doc.webp', w: 398, h: 840,
    account: [100, 440, 230, 32], pass: [100, 487, 230, 31], remember: [110, 539, 150, 20], box: [112, 540, 18, 17],
    login: [70, 582, 260, 50], up: [21, 651, 109, 39], reset: [141, 651, 116, 39], server: [268, 651, 109, 39],
    msg: [24, 700, 350, 24],
  },
};
const LOAD = {
  land: { src: 'assets/ui/bg/tim-dang-tai.webp', w: 765, h: 405, bar: [117, 348, 467, 23], label: [117, 322, 467, 22] },
  port: {
    src: 'assets/ui/bg/tim-dang-tai-doc.webp', w: 377, h: 680, bar: [57, 616, 263, 18], label: [20, 590, 337, 22],
    pctCover: [110, 639, 157, 26], // che chữ "73%" vẽ sẵn
  },
};
const layout = (set) => set[isPortrait() ? 'port' : 'land'];
const REMEMBER_KEY = 'tc.remember';

export function showLoading(text = 'Đang mở thế giới…') {
  const L = layout(LOAD);
  const s = createStage(L.src, L.w, L.h).mount();
  // Che thanh tiến độ vẽ sẵn (73%) bằng thanh thật
  if (L.pctCover) s.place(el('<div class="pct-cover"></div>'), ...L.pctCover);
  const bar = s.place(el(`<div class="load-bar"><div class="load-fill"></div><span class="load-pct">0%</span></div>`), ...L.bar);
  const label = s.place(el(`<div class="load-text"></div>`), ...L.label);
  const fill = bar.querySelector('.load-fill');
  const pct = bar.querySelector('.load-pct');
  label.textContent = text;
  return {
    set(p, t) {
      const v = Math.max(0, Math.min(100, Math.round(p)));
      fill.style.width = v + '%';
      pct.textContent = v + '%';
      if (t) label.textContent = t;
    },
    hide() { s.remove(); },
  };
}

export function showLogin({ onSignIn, onSignUp, onResetPassword }) {
  return new Promise((resolve) => {
    const L = layout(LOGIN);
    const s = createStage(L.src, L.w, L.h).mount();
    const form = el(`<form class="login-form" autocomplete="on"></form>`);
    s.stage.appendChild(form);
    const account = s.place(el(`<input class="field" name="account" type="text" placeholder="Tài khoản" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" maxlength="40">`), ...L.account);
    const pass = s.place(el(`<input class="field" name="password" type="password" placeholder="Mật khẩu" autocomplete="current-password">`), ...L.pass);
    form.append(account, pass);
    const remember = s.place(el(`<button type="button" class="hot" aria-label="Ghi nhớ đăng nhập"></button>`), ...L.remember);
    const box = s.place(el('<div class="check-cover"></div>'), ...L.box); // che dấu tích vẽ sẵn khi tắt
    const btnIn = s.place(el(`<button type="submit" class="hot glow" aria-label="Đăng nhập"></button>`), ...L.login);
    const btnUp = s.place(el(`<button type="button" class="hot glow" aria-label="Đăng ký"></button>`), ...L.up);
    const btnReset = s.place(el(`<button type="button" class="hot glow" aria-label="Quên mật khẩu"></button>`), ...L.reset);
    const btnServer = s.place(el(`<button type="button" class="hot glow" aria-label="Chọn máy chủ"></button>`), ...L.server);
    form.append(btnIn);
    const msg = s.place(el(`<div class="login-msg"></div>`), ...L.msg);

    let rememberOn = localStorage.getItem(REMEMBER_KEY) !== '0';
    const paintCheck = () => { box.hidden = rememberOn; };
    paintCheck();
    remember.addEventListener('click', () => { rememberOn = !rememberOn; paintCheck(); });

    // Xoay máy khi đang ở màn đăng nhập: dựng lại theo nền mới, giữ nội dung đã gõ
    const startedPortrait = isPortrait();
    const onResize = () => {
      if (isPortrait() === startedPortrait) return;
      removeEventListener('resize', onResize);
      const keep = { a: account.value, p: pass.value };
      s.wrap.remove();
      showLogin({ onSignIn, onSignUp, onResetPassword }).then(resolve);
      requestAnimationFrame(() => {
        const f = document.querySelector('.login-form');
        if (f) { f.account.value = keep.a; f.password.value = keep.p; }
      });
    };
    addEventListener('resize', onResize);

    const say = (t, ok = false) => { msg.textContent = t; msg.classList.toggle('ok', ok); };
    const all = [btnIn, btnUp, btnReset, btnServer];

    async function run(fn) {
      const e = account.value.trim(), p = pass.value;
      if (!e || p.length < 6) { say('Nhập tài khoản và mật khẩu từ 6 ký tự.'); return; }
      all.forEach((b) => (b.disabled = true));
      say('Đang kết nối…', true);
      try {
        const session = await fn(e, p);
        if (session) {
          localStorage.setItem(REMEMBER_KEY, rememberOn ? '1' : '0');
          sessionStorage.setItem('tc.tab', '1');
          removeEventListener('resize', onResize);
          s.remove();
          resolve(session);
          return;
        }
        say('Đã gửi thư xác nhận. Mở email, bấm xác nhận rồi đăng nhập.', true);
      } catch (err) { say(err.message); }
      all.forEach((b) => (b.disabled = false));
    }
    form.addEventListener('submit', (ev) => { ev.preventDefault(); run(onSignIn); });
    btnUp.addEventListener('click', () => run(onSignUp));
    btnReset.addEventListener('click', async () => {
      const e = account.value.trim();
      if (!e) { say('Nhập tài khoản trước rồi bấm Quên mật khẩu.'); return; }
      try { await onResetPassword(e); say('Đã gửi thư đặt lại mật khẩu.', true); } catch (err) { say(err.message); }
    });
    btnServer.addEventListener('click', () => say('Máy chủ: Thanh Vân (hiện chỉ có một máy chủ).', true));
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
