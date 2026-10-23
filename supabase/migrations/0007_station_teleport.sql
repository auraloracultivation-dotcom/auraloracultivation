-- 0007 — Truyền tống giữa các trận nhãn (yêu cầu chủ dự án 2026-10-23 17h)
-- save_position chặn dịch chuyển xa (kiểm tốc độ), nên truyền tống cần hàm riêng, giống respawn_at_town (0004/0005).
-- Chỉ chấp nhận khi vị trí máy chủ đang ở CẠNH một trận pháp (trong thành ≤ 420 điểm từ tâm, hoặc ≤ 260 điểm từ trận nhãn),
-- và chỉ đưa tới toạ độ CỐ ĐỊNH của trận nhãn đích → không dùng để dịch chuyển tuỳ ý.
-- Toạ độ đồng bộ data/zones/zone.start.json → town.stations (tâm thành 16016,16016 + dx/dy; điểm đến = dưới trận pháp 30 điểm).
-- Chưa kiểm ở máy chủ: đã "thắp sáng" trận nhãn đích chưa và phí Linh thạch — hai thứ này còn ở máy khách như tiền / tiến trình (Mốc 4).

create or replace function public.teleport_to_station(p_station text)
returns public.characters
language plpgsql security definer set search_path = ''
as $$
declare
  v_row public.characters;
  v_dest record;
  v_near boolean;
  c_world constant double precision := 32000;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;
  select * into v_dest from (values
      ('town', 16016, 16046),
      ('xanh', 16216, 17257),
      ('cam', 15634, 20214),
      ('xam', 18821, 22080),
      ('trang', 18999, 24268),
      ('than', 15067, 26690),
      ('den', 13775, 28648),
      ('tim', 18611, 30839)
    ) as d(id, x, y) where d.id = p_station;
  if not found then raise exception 'UNKNOWN_STATION'; end if;

  select * into v_row from public.characters where user_id = auth.uid() for update;
  if not found then raise exception 'NO_CHARACTER'; end if;

  v_near := sqrt(power(v_row.x - 16016, 2) + power(v_row.y - 16016, 2)) <= 420
    or exists (select 1 from (values
      (16216, 17227),
      (15634, 20184),
      (18821, 22050),
      (18999, 24238),
      (15067, 26660),
      (13775, 28618),
      (18611, 30809)
    ) as s(x, y) where sqrt(power(v_row.x - s.x, 2) + power(v_row.y - s.y, 2)) <= 260);
  if not v_near then raise exception 'NOT_AT_STATION'; end if;

  update public.characters
     set x = v_dest.x, y = v_dest.y, last_move_at = now()
   where id = v_row.id
   returning * into v_row;
  return v_row;
end $$;

revoke all on function public.teleport_to_station(text) from public, anon;
grant execute on function public.teleport_to_station(text) to authenticated;
