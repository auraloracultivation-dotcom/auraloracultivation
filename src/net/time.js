// Giờ máy chủ: lịch Âm Hư (src/game/void.js) phải giống nhau trên mọi máy, nên không tin giờ điện thoại.
// Gọi RPC server_time (migration 0005) một lần, nhớ độ lệch so với giờ máy. Lỗi thì dùng giờ máy.
import { supabase } from './client.js';

let offset = 0, synced = false;

export async function syncServerTime() {
  try {
    const t0 = Date.now();
    const { data, error } = await supabase.rpc('server_time');
    const t1 = Date.now();
    if (error || !data) return;
    const s = new Date(data).getTime();
    if (Number.isFinite(s)) { offset = s - (t0 + t1) / 2; synced = true; }
  } catch { /* giữ giờ máy */ }
}

export const serverNow = () => Date.now() + offset;
// Đã lấy được giờ máy chủ chưa — thọ nguyên chỉ xét tọa hóa khi true (không xoá nhân vật theo giờ điện thoại)
export const timeSynced = () => synced;
