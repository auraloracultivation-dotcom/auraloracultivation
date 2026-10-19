import { supabase, openedFromRecovery } from './client.js';

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw translate(error);
  return data.session;
}

// Trả về session; null nếu Supabase đang bật "xác nhận email".
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw translate(error);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
  if (m.includes('invalid login')) return new Error('Sai email hoặc mật khẩu.');
  if (m.includes('email not confirmed')) return new Error('Email chưa xác nhận. Mở hộp thư để xác nhận.');
  if (m.includes('already registered')) return new Error('Email này đã có tài khoản. Hãy đăng nhập.');
  if (m.includes('password')) return new Error('Mật khẩu cần ít nhất 6 ký tự.');
  if (m.includes('rate limit')) return new Error('Thử quá nhiều lần, đợi một lát rồi thử lại.');
  return new Error(error.message);
}
