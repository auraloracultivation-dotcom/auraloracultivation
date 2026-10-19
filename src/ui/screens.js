// Màn hình tải, đăng nhập, tạo nhân vật. Hình ảnh lấy từ assets/ui (thiết kế của chủ dự án).
// Không gọi mạng trực tiếp — nhận hàm từ main.js.
import { createStage, el } from './stage.js';

const BG_LOGIN = { src: 'assets/ui/bg/tim-dang-nhap.webp', w: 764, h: 405 };
const BG_LOAD = { src: 'assets/ui/bg/tim-dang-tai.webp', w: 765, h: 405 };
const REMEMBER_KEY = 'tc.remember';

export function showLoading(text = 'Đang mở thế giới…') {
  const s = createStage(BG_LOAD.src, BG_LOAD.w, BG_LOAD.h).mount();
  // Che thanh tiến độ vẽ sẵn (73%) bằng thanh thật
  const bar = s.place(el(`<div class="load-bar"><div class="load-fill"></div><span class="load-pct">0%</span></div>`), 117, 348, 467, 23);
  const label = s.place(el(`<div class="load-text"></div>`), 117, 322, 467, 22);
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
    const s = createStage(BG_LOGIN.src, BG_LOGIN.w, BG_LOGIN.h).mount();
    const form = el(`<form class="login-form" autocomplete="on"></form>`);
    s.stage.appendChild(form);
    const email = s.place(el(`<input class="field" name="email" type="email" placeholder="Email" autocomplete="email">`), 292, 165, 216, 26);
    const pass = s.place(el(`<input class="field" name="password" type="password" placeholder="Mật khẩu" autocomplete="current-password">`), 292, 206, 216, 27);
    form.append(email, pass);
    const remember = s.place(el(`<button type="button" class="hot check" aria-label="Ghi nhớ đăng nhập"></button>`), 304, 250, 122, 20);
    const btnIn = s.place(el(`<button type="submit" class="hot glow" aria-label="Đăng nhập"></button>`), 252, 287, 265, 46);
    const btnUp = s.place(el(`<button type="button" class="hot glow" aria-label="Đăng ký"></button>`), 185, 346, 118, 32);
    const btnReset = s.place(el(`<button type="button" class="hot glow" aria-label="Quên mật khẩu"></button>`), 320, 346, 123, 32);
    const btnServer = s.place(el(`<button type="button" class="hot glow" aria-label="Chọn máy chủ"></button>`), 459, 346, 118, 32);
    form.append(btnIn);
    const msg = s.place(el(`<div class="login-msg"></div>`), 200, 384, 380, 18);

    let rememberOn = localStorage.getItem(REMEMBER_KEY) !== '0';
    const paintCheck = () => remember.classList.toggle('off', !rememberOn);
    paintCheck();
    remember.addEventListener('click', () => { rememberOn = !rememberOn; paintCheck(); });

    const say = (t, ok = false) => { msg.textContent = t; msg.classList.toggle('ok', ok); };
    const all = [btnIn, btnUp, btnReset, btnServer];

    async function run(fn) {
      const e = email.value.trim(), p = pass.value;
      if (!e || p.length < 6) { say('Nhập email và mật khẩu từ 6 ký tự.'); return; }
      all.forEach((b) => (b.disabled = true));
      say('Đang kết nối…', true);
      try {
        const session = await fn(e, p);
        if (session) {
          localStorage.setItem(REMEMBER_KEY, rememberOn ? '1' : '0');
          sessionStorage.setItem('tc.tab', '1');
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
      const e = email.value.trim();
      if (!e) { say('Nhập email trước rồi bấm Quên mật khẩu.'); return; }
      try { await onResetPassword(e); say('Đã gửi thư đặt lại mật khẩu.', true); } catch (err) { say(err.message); }
    });
    btnServer.addEventListener('click', () => say('Máy chủ: Thanh Vân (hiện chỉ có một máy chủ).', true));
  });
}

// Không chọn "Ghi nhớ" thì đóng trình duyệt là phải đăng nhập lại.
export function shouldForgetSession() {
  return localStorage.getItem(REMEMBER_KEY) === '0' && !sessionStorage.getItem('tc.tab');
}

function framedPanel(title, bodyHtml) {
  const back = createStage(BG_LOAD.src, BG_LOAD.w, BG_LOAD.h).mount();
  back.wrap.classList.add('dim');
  back.place(el('<div class="bar-cover"></div>'), 117, 348, 467, 23); // che thanh 73% vẽ sẵn
  const panel = el(`<div class="frame-panel"><h2>${escapeHtml(title)}</h2>${bodyHtml}<div class="panel-msg"></div></div>`);
  back.wrap.appendChild(panel);
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

export function showConfirm(title, text) {
  return new Promise((resolve) => {
    const { back, panel } = framedPanel(title, `<p>${escapeHtml(text)}</p>
      <div class="btn-row"><button class="btn-dark" data-v="0">Ở lại</button><button class="btn-gold" data-v="1">Đồng ý</button></div>`);
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
