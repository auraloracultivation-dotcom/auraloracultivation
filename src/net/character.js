import { supabase } from './client.js';

export async function getMyCharacter(userId) {
  const { data, error } = await supabase
    .from('characters').select('*').eq('user_id', userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCharacter(name) {
  const { data, error } = await supabase.rpc('create_character', { p_name: name });
  if (error) {
    if (error.code === '23505') throw new Error('Đạo hiệu này đã có người dùng.');
    if (error.code === '23514') throw new Error('Đạo hiệu cần 2–16 ký tự.');
    if ((error.message || '').includes('CHARACTER_EXISTS')) throw new Error('Tài khoản đã có nhân vật.');
    throw error;
  }
  return data;
}

// Hồi sinh: máy chủ đưa nhân vật về trận pháp giữa Thanh Vân Thành (điểm cố định, migration 0004)
export async function respawnAtTown() {
  const { data, error } = await supabase.rpc('respawn_at_town');
  if (error) throw error;
  return data;
}

// Truyền tống giữa các trận nhãn (chủ dự án 23/10): máy chủ chỉ chấp nhận khi đang đứng cạnh một trận pháp,
// và chỉ đưa tới toạ độ cố định của trận nhãn đích (migration 0007). Chưa có hàm trên máy chủ → lỗi, nơi gọi báo "chưa khai thông".
export async function teleportToStation(stationId) {
  const { data, error } = await supabase.rpc('teleport_to_station', { p_station: stationId });
  if (error) throw error;
  return data;
}

// Máy chủ trả lại vị trí đã chấp nhận (có thể khác nếu bị từ chối).
export async function savePosition(x, y) {
  const { data, error } = await supabase.rpc('save_position', { p_x: x, p_y: y });
  if (error) throw error;
  return data;
}
