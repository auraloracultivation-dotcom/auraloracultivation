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
| Sát thương, hồi chiêu, kết quả trận | Máy chủ (từ Mốc 3) | Edge Function / RPC |
| Kinh nghiệm, rơi đồ, đột phá, giao dịch | Máy chủ | RPC / Edge Function, không có ngoại lệ |

## Luật bảo mật cơ sở dữ liệu
- Mọi bảng bật RLS.
- Máy khách chỉ có quyền **đọc** (SELECT). Không tạo policy INSERT/UPDATE/DELETE cho người chơi.
- Mọi thao tác ghi đi qua hàm `security definer`, có `set search_path = ''`, kiểm tra `auth.uid()` và kiểm tra tính hợp lý.
- Thay đổi schema chỉ qua file migration trong `supabase/migrations/`, đánh số tăng dần.

## Ghi chú
Supabase Realtime đủ cho Mốc 1–2. Khi chiến đấu thời gian thực nhiều người cần độ trễ thấp, đánh giá máy chủ game riêng (ghi quyết định vào file này).
