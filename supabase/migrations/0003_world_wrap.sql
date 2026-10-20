-- 0003 — Bản đồ vòng lặp 500×500 ô × 32 = 16000 điểm (đồng bộ data/config.json world)
-- Khoảng cách tính theo đường ngắn nhất qua mép, để đi qua mép không bị coi là dịch chuyển.
-- Điểm xuất hiện mới: giữa đồng cỏ (8016, 8016). Nhân vật cũ chuyển về đó.

alter table public.characters alter column x set default 8016;
alter table public.characters alter column y set default 8016;
update public.characters set x = 8016, y = 8016, last_move_at = now();

create or replace function public.save_position(p_x real, p_y real)
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.characters;
  v_elapsed double precision;
  v_dx double precision;
  v_dy double precision;
  c_max_speed constant double precision := 200;  -- đồng bộ data/config.json
  c_max_elapsed constant double precision := 3;  -- giây
  c_world constant double precision := 16000;    -- đồng bộ data/config.json world
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if p_x is null or p_y is null or p_x < 0 or p_y < 0 or p_x >= c_world or p_y >= c_world then
    raise exception 'OUT_OF_WORLD';
  end if;
  select * into v_row from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'NO_CHARACTER'; end if;

  v_elapsed := least(greatest(extract(epoch from (now() - v_row.last_move_at)), 0.05), c_max_elapsed);
  v_dx := abs(p_x - v_row.x); v_dx := least(v_dx, c_world - v_dx);
  v_dy := abs(p_y - v_row.y); v_dy := least(v_dy, c_world - v_dy);

  if sqrt(v_dx * v_dx + v_dy * v_dy) > c_max_speed * v_elapsed * 1.5 + 32 then
    return v_row; -- từ chối, trả lại vị trí đúng của máy chủ
  end if;

  update public.characters
     set x = p_x, y = p_y, last_move_at = now()
   where id = v_row.id
   returning * into v_row;
  return v_row;
end $$;
