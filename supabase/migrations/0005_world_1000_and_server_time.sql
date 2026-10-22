-- 0005 — Mở rộng bản đồ 500×500 → 1000×1000 ô (32000 điểm), 7 vùng (chủ dự án chốt 2026-10-23)
-- 1. save_position: c_world 16000 → 32000 (đồng bộ data/config.json world + data/zones/zone.start.json)
-- 2. Dời mọi nhân vật +8000 điểm mỗi trục: tâm thành cũ (8016) → tâm mới (16016); vị trí so với thành giữ nguyên
-- 3. respawn_at_town: trận pháp giữa thành mới (16016, 16046)
-- 4. server_time(): giờ máy chủ cho lịch Âm Hư (mọi máy thấy cùng lúc) — chỉ đọc, ai cũng gọi được
-- Hoàn tác: chạy ngược (x - 8000, mod 16000) và khôi phục hàm ở 0003/0004.

alter table public.characters alter column x set default 16016;
alter table public.characters alter column y set default 16016;

update public.characters
   set x = mod((x + 8000)::numeric, 32000)::real,
       y = mod((y + 8000)::numeric, 32000)::real,
       last_move_at = now();

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
  c_world constant double precision := 32000;    -- đồng bộ data/config.json world (1000 ô × 32)
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

create or replace function public.respawn_at_town()
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.characters;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  update public.characters
     set x = 16016, y = 16046, last_move_at = now()  -- tâm thành ô (500, 500) × 32 + 16; trận pháp dưới tâm 30 điểm
   where user_id = auth.uid()
   returning * into v_row;
  if not found then raise exception 'NO_CHARACTER'; end if;
  return v_row;
end $$;

create or replace function public.server_time()
returns timestamptz
language sql stable security invoker set search_path = ''
as $$ select now() $$;

revoke all on function public.server_time() from public;
grant execute on function public.server_time() to anon, authenticated;
