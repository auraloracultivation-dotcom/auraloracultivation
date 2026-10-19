-- 0001 — Nhân vật (đã chạy trên project ympsgrghczpzkonfadco ngày 2026-10-20)
-- Client CHỈ được đọc; mọi ghi đi qua hàm RPC do máy chủ kiểm tra.
create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null unique check (char_length(name) between 2 and 16),
  realm int not null default 0 check (realm >= 0),
  exp bigint not null default 0 check (exp >= 0),
  zone_id text not null default 'zone.start',
  x real not null default 0,
  y real not null default 0,
  last_move_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.characters enable row level security;

create policy "characters_read_authenticated" on public.characters
  for select to authenticated using (true);

create or replace function public.create_character(p_name text)
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare v_row public.characters;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  if exists (select 1 from public.characters where user_id = auth.uid()) then
    raise exception 'CHARACTER_EXISTS';
  end if;
  insert into public.characters(user_id, name)
  values (auth.uid(), trim(p_name))
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.save_position(p_x real, p_y real)
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.characters;
  v_elapsed double precision;
  v_dist double precision;
  c_max_speed constant double precision := 200; -- đồng bộ data/config.json
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_row from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'NO_CHARACTER'; end if;

  v_elapsed := greatest(extract(epoch from (now() - v_row.last_move_at)), 0.05);
  v_dist := sqrt(power(p_x - v_row.x, 2) + power(p_y - v_row.y, 2));

  if v_dist > c_max_speed * v_elapsed * 1.5 + 32 then
    return v_row;
  end if;

  update public.characters
     set x = p_x, y = p_y, last_move_at = now()
   where id = v_row.id
   returning * into v_row;
  return v_row;
end $$;

revoke all on function public.create_character(text) from public, anon;
revoke all on function public.save_position(real, real) from public, anon;
grant execute on function public.create_character(text) to authenticated;
grant execute on function public.save_position(real, real) to authenticated;
