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

// Máy chủ trả lại vị trí đã chấp nhận (có thể khác nếu bị từ chối).
export async function savePosition(x, y) {
  const { data, error } = await supabase.rpc('save_position', { p_x: x, p_y: y });
  if (error) throw error;
  return data;
}
