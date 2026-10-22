-- 0006 — Bảng xếp hạng (chủ dự án yêu cầu 2026-10-23)
-- Bảng RIÊNG, không đụng public.characters → sau này đổi nguồn dữ liệu không ảnh hưởng gì khác.
--   Hiện tại: tiến trình (cảnh giới, chỉ số) còn chạy phía máy khách (docs/08) nên máy khách GỬI ẢNH CHỤP qua RPC có kiểm tra
--   (source = 'client' — người chơi sửa máy được, chỉ để vui/tham khảo, chưa dùng cho phần thưởng).
--   Mốc 4 (tiến trình lên máy chủ): máy chủ tự ghi vào chính bảng này (source = 'server'), bỏ RPC submit — giao diện không phải đổi.
-- Đọc: ai đăng nhập cũng đọc được (RLS select). Ghi: chỉ qua submit_leaderboard (security definer), không có policy ghi.
-- Hoàn tác: drop function public.submit_leaderboard; drop table public.leaderboard;

create table public.leaderboard (
  user_id uuid primary key references auth.users(id) on delete cascade,
  character_id uuid not null unique references public.characters(id) on delete cascade,
  name text not null,
  stage_index int not null default 0 check (stage_index between 0 and 100),
  stage_name text not null default '' check (char_length(stage_name) <= 40),
  exp bigint not null default 0 check (exp >= 0),
  power bigint not null default 0 check (power >= 0),
  void_kills int not null default 0 check (void_kills >= 0),
  stats jsonb not null default '{}'::jsonb,
  look jsonb,
  source text not null default 'client' check (source in ('client', 'server')),
  updated_at timestamptz not null default now()
);

alter table public.leaderboard enable row level security;
create policy "leaderboard_read_authenticated" on public.leaderboard for select to authenticated using (true);

create index leaderboard_realm_idx on public.leaderboard (stage_index desc, exp desc);
create index leaderboard_power_idx on public.leaderboard (power desc);
create index leaderboard_void_idx on public.leaderboard (void_kills desc);

create or replace function public.submit_leaderboard(
  p_stage_index int, p_stage_name text, p_exp bigint, p_power bigint, p_void_kills int, p_stats jsonb, p_look jsonb
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_char public.characters;
  v_last timestamptz;
  v_stats jsonb;
  v_look jsonb;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_char from public.characters where user_id = auth.uid();
  if not found then raise exception 'NO_CHARACTER'; end if;

  -- tối đa 1 lần / 20 giây mỗi người (máy khách gửi mỗi phút hoặc khi lên cảnh giới)
  select updated_at into v_last from public.leaderboard where user_id = auth.uid();
  if v_last is not null and v_last > now() - interval '20 seconds' then return; end if;

  if p_stage_index is null or p_stage_index < 0 or p_stage_index > 100
     or p_exp is null or p_exp < 0 or p_exp > 10000000000000
     or p_power is null or p_power < 0 or p_power > 1000000000000000
     or p_void_kills is null or p_void_kills < 0 or p_void_kills > 100000
     or char_length(coalesce(p_stage_name, '')) > 40
     or jsonb_typeof(p_stats) is distinct from 'object' or octet_length(p_stats::text) > 1500
     or (p_look is not null and (jsonb_typeof(p_look) <> 'object' or octet_length(p_look::text) > 600)) then
    raise exception 'BAD_LEADERBOARD_DATA';
  end if;

  -- chỉ giữ chỉ số có tên trong danh sách, giá trị là số
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb) into v_stats
    from jsonb_each(p_stats)
   where key in ('hp', 'mp', 'linh', 'def', 'xuyen', 'chinh', 'ne', 'crit', 'hut', 'tocdanh', 'tocchay', 'phan')
     and jsonb_typeof(value) = 'number';
  -- trang bị đang mặc: chỉ mã hình art.<loại>.<…> (giống luật lọc Presence ở máy khách)
  select jsonb_object_agg(key, value) into v_look
    from jsonb_each(coalesce(p_look, '{}'::jsonb))
   where key in ('outfit', 'weapon', 'wing', 'avatar')
     and jsonb_typeof(value) = 'string' and (value #>> '{}') ~ '^art\.[a-z]+\.[a-z0-9.-]{1,30}$';

  insert into public.leaderboard as l (user_id, character_id, name, stage_index, stage_name, exp, power, void_kills, stats, look, source, updated_at)
  values (auth.uid(), v_char.id, v_char.name, p_stage_index, coalesce(p_stage_name, ''), p_exp, p_power, p_void_kills, v_stats, v_look, 'client', now())
  on conflict (user_id) do update
     set name = excluded.name, stage_index = excluded.stage_index, stage_name = excluded.stage_name, exp = excluded.exp,
         power = excluded.power, void_kills = excluded.void_kills, stats = excluded.stats, look = excluded.look, updated_at = now()
   where l.source = 'client'; -- khi máy chủ đã quản lý (Mốc 4) thì máy khách không ghi đè được
end $$;

revoke all on function public.submit_leaderboard(int, text, bigint, bigint, int, jsonb, jsonb) from public, anon;
grant execute on function public.submit_leaderboard(int, text, bigint, bigint, int, jsonb, jsonb) to authenticated;
