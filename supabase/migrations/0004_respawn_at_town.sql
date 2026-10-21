-- 0004 — Hồi sinh ở trận pháp giữa Thanh Vân Thành (yêu cầu chủ dự án 2026-10-21)
-- save_position từ chối dịch chuyển xa (kiểm tốc độ), nên hồi sinh cần hàm riêng.
-- Chỉ đưa về MỘT điểm cố định trong thành (an toàn, không có quái) → không dùng để dịch chuyển tuỳ ý.
-- Điểm: tâm thành ô (250, 250) × 32 + 16 = 8016; trận pháp ở dưới tâm 30 điểm → (8016, 8046). Đồng bộ data/zones/zone.start.json → town.
-- Lưu ý: hiện cái chết do máy khách báo (chiến đấu chưa lên máy chủ, Mốc 3) nên ai cũng gọi được hàm này để "về thành".

create or replace function public.respawn_at_town()
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.characters;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.characters
     set x = 8016, y = 8046, last_move_at = now()
   where user_id = auth.uid()
   returning * into v_row;
  if not found then raise exception 'NO_CHARACTER'; end if;
  return v_row;
end $$;

revoke all on function public.respawn_at_town() from public, anon;
grant execute on function public.respawn_at_town() to authenticated;
