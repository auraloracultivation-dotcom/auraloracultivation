// Màn hình đăng nhập và tạo nhân vật. Không gọi mạng trực tiếp — nhận hàm từ main.js.
const root = () => document.getElementById('ui');

function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function showLogin({ onSignIn, onSignUp }) {
  return new Promise((resolve) => {
    const panel = el(`
      <form class="panel" autocomplete="on">
        <h1>Thế Giới Tu Chân</h1>
        <p>Bước vào con đường tu tiên</p>
        <input name="email" type="email" placeholder="Email" autocomplete="email" required>
        <input name="password" type="password" placeholder="Mật khẩu (ít nhất 6 ký tự)" autocomplete="current-password" minlength="6" required>
        <div class="row">
          <button class="btn" type="submit" data-act="in">Đăng nhập</button>
          <button class="btn ghost" type="button" data-act="up">Đăng ký</button>
        </div>
        <div class="msg"></div>
      </form>`);
    root().appendChild(panel);
    const msg = panel.querySelector('.msg');
    const buttons = panel.querySelectorAll('button');

    async function run(fn) {
      const email = panel.email.value.trim();
      const password = panel.password.value;
      if (!email || password.length < 6) { msg.textContent = 'Nhập email và mật khẩu từ 6 ký tự.'; return; }
      buttons.forEach((b) => (b.disabled = true));
      msg.className = 'msg'; msg.textContent = 'Đang kết nối…';
      try {
        const session = await fn(email, password);
        if (session) { panel.remove(); resolve(session); return; }
        msg.className = 'msg ok';
        msg.textContent = 'Đã gửi thư xác nhận. Mở email, bấm xác nhận rồi quay lại đăng nhập.';
      } catch (e) {
        msg.className = 'msg'; msg.textContent = e.message;
      }
      buttons.forEach((b) => (b.disabled = false));
    }
    panel.addEventListener('submit', (e) => { e.preventDefault(); run(onSignIn); });
    panel.querySelector('[data-act="up"]').addEventListener('click', () => run(onSignUp));
  });
}

export function showCreateCharacter({ onCreate }) {
  return new Promise((resolve) => {
    const panel = el(`
      <form class="panel">
        <h1>Đặt đạo hiệu</h1>
        <p>Tên nhân vật, 2–16 ký tự</p>
        <input name="name" maxlength="16" placeholder="Ví dụ: Thanh Vân Tử" required>
        <div class="row"><button class="btn" type="submit">Nhập thế</button></div>
        <div class="msg"></div>
      </form>`);
    root().appendChild(panel);
    const msg = panel.querySelector('.msg');
    const btn = panel.querySelector('button');
    panel.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = panel.name.value.trim();
      if (name.length < 2) { msg.textContent = 'Đạo hiệu cần ít nhất 2 ký tự.'; return; }
      btn.disabled = true; msg.textContent = 'Đang tạo…';
      try {
        const character = await onCreate(name);
        panel.remove();
        resolve(character);
      } catch (err) {
        msg.textContent = err.message;
        btn.disabled = false;
      }
    });
  });
}

export function showFatal(text) {
  root().appendChild(el(`<div class="panel"><h1>Có lỗi</h1><p>${escapeHtml(text)}</p>
    <div class="row"><button class="btn" onclick="location.reload()">Tải lại</button></div></div>`));
}

export function toast(text, ms = 2500) {
  const t = el(`<div class="toast">${escapeHtml(text)}</div>`);
  root().appendChild(t);
  setTimeout(() => t.remove(), ms);
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
