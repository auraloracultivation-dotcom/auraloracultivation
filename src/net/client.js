// Khởi tạo Supabase. Khoá publishable được phép công khai; quyền thật do RLS + RPC ở máy chủ quyết định.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://ympsgrghczpzkonfadco.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xu2slWDBny_GVKzfsc3Z1Q_IIzP3YtN';

// Ghi nhận trước khi thư viện xử lý và xoá phần # của đường dẫn
export const openedFromRecovery = /type=recovery/.test(location.hash);

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
