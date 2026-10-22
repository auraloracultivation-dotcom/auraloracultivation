# 01 — Kiến trúc: ranh giới máy chủ / máy khách

## Nguyên tắc gốc
**Máy khách không bao giờ được tin.** Mọi thứ có giá trị (kinh nghiệm, cảnh giới, vật phẩm, tiền, bảng xếp hạng) chỉ được thay đổi bởi máy chủ.

## Phân vai

| Việc | Ai quyết định | Cách làm |
|---|---|---|
| Vẽ hình, hiệu ứng, âm thanh, camera | Máy khách | `src/` |
| Di chuyển tức thời (cho mượt) | Máy khách dự đoán | Gửi vị trí qua Realtime |
| Lưu vị trí | Máy chủ | RPC `save_position` — kiểm tra tốc độ, từ chối dịch chuyển gian lận |
| Thấy người chơi khác | Supabase Realtime (Presence/Broadcast) | `src/net/` |
| Tạo nhân vật | Máy chủ | RPC `create_character` |
| Giờ chung (lịch Âm Hư) | Máy chủ | RPC `server_time` (chỉ đọc), máy khách nhớ độ lệch |
| Sát thương, hồi chiêu, kết quả trận | Máy chủ (từ Mốc 3) | Edge Function / RPC |
| Kinh nghiệm, rơi đồ, đột phá, giao dịch | Máy chủ | RPC / Edge Function, không có ngoại lệ |

## Tài khoản (quyết định 2026-10-20)
- Người chơi đăng nhập bằng **tên tài khoản + mật khẩu**, không cần email.
- Tên tài khoản: 3–20 ký tự `a-z 0-9 _`, không phân biệt hoa thường. Khác với **đạo hiệu** (tên nhân vật, có dấu).
- Supabase bắt buộc có email nên máy chủ sinh **email ẩn** `<tài khoản>@nguoichoi.invalid`. Không gửi thư nào tới địa chỉ này.
- Đăng ký đi qua Edge Function `dang-ky` (`supabase/functions/dang-ky/`): kiểm tra tên, tạo tài khoản bằng quyền quản trị, đã xác nhận sẵn. Đăng nhập thì máy khách tự ghép email ẩn.
- Tài khoản tạo bằng email thật trước đây vẫn đăng nhập được bằng cách gõ đủ email.
- Quên mật khẩu: chỉ tài khoản có email thật tự lấy lại được; tài khoản tên thì liên hệ quản trị. Sau này có thể cho gắn email/số điện thoại để tự lấy lại.

## Luật bảo mật cơ sở dữ liệu
- Mọi bảng bật RLS.
- Máy khách chỉ có quyền **đọc** (SELECT). Không tạo policy INSERT/UPDATE/DELETE cho người chơi.
- Mọi thao tác ghi đi qua hàm `security definer`, có `set search_path = ''`, kiểm tra `auth.uid()` và kiểm tra tính hợp lý.
- Thay đổi schema chỉ qua file migration trong `supabase/migrations/`, đánh số tăng dần.

## Khu (zone) và phân tuyến — quyết định 2026-10-20
- Mục tiêu: **tối thiểu 2 người tương tác được**. Ưu tiên **mượt** hơn đông (từ 23/10: 50 người / tuyến nhờ kênh ô lưới, xem dưới).
- Mỗi khu là một kênh Realtime riêng: `zone:<zone_id>:<tuyến>` (ví dụ `zone:zone.start:1`).
- Tuyến đầy → máy chủ xếp người mới vào tuyến tiếp theo (`:2`, `:3`…). Hai tuyến cùng bản đồ nhưng không thấy nhau.
- Vị trí chỉ gửi **khi đang di chuyển**, 4 lần/giây; máy nhận **nội suy** để chuyển động mượt. Đứng yên không gửi.
- Lưu vị trí xuống cơ sở dữ liệu mỗi ~5 giây và khi thoát (RPC `save_position`).
- **NPC lấp chỗ trống**: khu ít người thì có NPC đi lại, tu luyện, buôn bán cho có không khí. NPC trang trí do máy khách tự chạy theo kịch bản trong `data/` (không tốn mạng). NPC/quái có liên quan phần thưởng thì do máy chủ quản lý (từ Mốc 3).
- Ngân sách mạng: gói miễn phí Supabase giới hạn 100 tin/giây và 200 kết nối (gói Pro 500/500). 20 người × 4 tin/giây khi di chuyển nằm trong mức thử nghiệm; khi có người chơi thật đông thì lên Pro hoặc chuyển máy chủ game riêng.

## Chống lag: kênh theo ô lưới — quyết định 2026-10-23
- Nguyên nhân lag đo được (log Supabase 22/10): mọi người trong tuyến nhận vị trí của mọi người (10 người × 4 tin/giây × 9 người nhận ≈ 360 tin/giây,
  gói miễn phí chỉ 100) → máy chủ ngắt kênh → thư viện tự gửi vị trí qua HTTP (≈116.000 lượt) → giật, người khác đứng hình. Thêm lỗi `ClientPresenceRateLimitReached` do cập nhật Presence dồn dập.
- Nay mỗi tuyến có **kênh sảnh** `zone:<khu>:<tuyến>` (Presence {id, name} để đếm người + chat chung) và **kênh ô lưới** `cell:<khu>:<tuyến>:<cx>:<cy>`
  (thế giới chia ô `net.cell_px` = 1280 điểm). Vị trí + Presence (tên, trang bị, cảnh giới) gửi vào ô của mình; máy chỉ nghe **3×3 ô quanh mình**.
- Đổi ô có vùng đệm 8% để đứng ở mép không đổi kênh liên tục. Kênh rớt thì tự nối lại (1→15 giây). **Không gửi khi kênh chưa vào xong** (không bao giờ rơi về HTTP).
- Presence của mình gom tối đa 1 lần mỗi `net.presence_gap_ms`. Tuyến chứa tối đa `zone.max_players` = 50 (trước 20).
- Cây/đá tính theo mảng 32×32 ô quanh người chơi khi cần (`src/map/decor.js`), không tính cả bản đồ lúc tải.

## Ghi chú
Supabase Realtime đủ cho Mốc 1–2. Khi chiến đấu thời gian thực nhiều người cần độ trễ thấp, đánh giá máy chủ game riêng (ghi quyết định vào file này).
