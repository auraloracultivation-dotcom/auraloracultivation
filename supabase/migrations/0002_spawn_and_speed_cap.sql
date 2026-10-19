-- 0002 — Điểm xuất hiện mặc định + vá lỗ hổng dịch chuyển
-- Lỗi ở 0001: thời gian kể từ lần lưu trước không bị giới hạn, nên đứng yên 10 phút
-- rồi gửi toạ độ bất kỳ vẫn hợp lệ. Nay giới hạn tối đa 3 giây.
-- Máy khách phải lưu ngay khi bắt đầu di chuyển, rồi mỗi 2 giây, và khi dừng.

alter table public.characters alter column x set default 640;
alter table public.characters alter column y set default 480;
update public.characters set x = 640, y = 480 where x = 0 and y = 0;

create or replace function public.save_position(p_x real, p_y real)
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.characters;
  v_elapsed double precision;
  v_dist double precision;
  c_max_speed constant double precision := 200; -- đồng bộ data/config.json
  c_max_elapsed constant double precision := 3; -- giây
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_row from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'NO_CHARACTER'; end if;

  v_elapsed := least(greatest(extract(epoch from (now() - v_row.last_move_at)), 0.05), c_max_elapsed);
  v_dist := sqrt(power(p_x - v_row.x, 2) + power(p_y - v_row.y, 2));

  if v_dist > c_max_speed * v_elapsed * 1.5 + 32 then
    return v_row; -- từ chối, trả lại vị trí đúng của máy chủ
  end if;

  update public.characters
     set x = p_x, y = p_y, last_move_at = now()
   where id = v_row.id
   returning * into v_row;
  return v_row;
end $$;
