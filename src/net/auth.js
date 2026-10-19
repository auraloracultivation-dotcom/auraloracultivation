import { supabase, openedFromRecovery } from './client.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// Đăng nhập bằng TÊN TÀI KHOẢN; email chỉ là thứ ẩn bên dưới (xem supabase/functions/dang-ky).
// Vẫn nhận email đầy đủ cho các tài khoản tạo bằng email trước đây.
const HIDDEN_DOMAIN = 'nguoichoi.invalid'; // đồng bộ với hàm dang-ky
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function normalize(account) {
  return String(account || '').trim().toLowerCase();
}

function toEmail(account) {
  const a = normalize(account);
  if (a.includes('@')) return a;
  if (!USERNAME_RE.test(a)) throw new Error('Tài khoản gồm 3–20 ký tự: chữ không dấu, số hoặc _.');
  return `${a}@${HIDDEN_DOMAIN}`;
}

export function isEmailAccount(account) {
  return normalize(account).includes('@');
}

export async function signIn(account, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(account), password });
  if (error) throw translate(error);
  return data.session;
}

// Tạo tài khoản qua hàm máy chủ (không cần email, không cần xác nhận), rồi đăng nhập luôn.
export async function signUp(account, password) {
  const username = normalize(account);
  if (username.includes('@')) throw new Error('Đăng ký bằng tên tài khoản, không cần email.');
  toEmail(username); // kiểm tra định dạng
  if (password.length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự.');
  const { data, error } = await supabase.functions.invoke('dang-ky', { body: { username, password } });
  if (error) {
    let code = '';
    try { code = (await error.context.json()).error; } catch { /* không đọc được thân lỗi */ }
    if (code === 'USERNAME_TAKEN') throw new Error('Tên tài khoản đã có người dùng.');
    if (code === 'USERNAME_INVALID') throw new Error('Tài khoản gồm 3–20 ký tự: chữ không dấu, số hoặc _.');
    if (code === 'PASSWORD_INVALID') throw new Error('Mật khẩu cần 6–72 ký tự.');
    throw new Error('Không tạo được tài khoản, thử lại sau.');
  }
  if (!data?.ok) throw new Error('Không tạo được tài khoản, thử lại sau.');
  return signIn(username, password);
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function requestPasswordReset(account) {
  if (!isEmailAccount(account)) {
    throw new Error('Tài khoản không gắn email. Liên hệ quản trị để lấy lại mật khẩu.');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(normalize(account), {
    redirectTo: location.origin + location.pathname,
  });
  if (error) throw translate(error);
}

export async function updatePassword(password) {
  if (!password || password.length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự.');
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw translate(error);
}

// Người dùng mở link "đặt lại mật khẩu" trong email
export function isPasswordRecovery() {
  return openedFromRecovery;
}

function translate(error) {
  const m = (error.message || '').toLowerCase();
  if (m.includes('invalid login')) return new Error('Sai tài khoản hoặc mật khẩu.');
  if (m.includes('email not confirmed')) return new Error('Email chưa xác nhận. Mở hộp thư để xác nhận.');
  if (m.includes('already registered')) return new Error('Email này đã có tài khoản. Hãy đăng nhập.');
  if (m.includes('password')) return new Error('Mật khẩu cần ít nhất 6 ký tự.');
  if (m.includes('rate limit')) return new Error('Thử quá nhiều lần, đợi một lát rồi thử lại.');
  return new Error(error.message);
}
