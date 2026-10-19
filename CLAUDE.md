# Hướng dẫn cho AI làm việc trong repo này

Trước mọi thay đổi, đọc toàn bộ `docs/01` → `docs/05`. Các luật cứng:

- Máy khách không được ghi trực tiếp vào cơ sở dữ liệu; mọi thao tác ghi qua RPC/Edge Function có kiểm tra.
- Chỉ số và nội dung nằm trong `data/`, code chỉ tham chiếu ID.
- Chỉ `src/net/` được gọi Supabase.
- Không gom code vào một file. Không có logic trong `index.html`.
- Schema chỉ đổi bằng migration mới trong `supabase/migrations/`.
- Không đưa secret/service_role key vào repo.
- Làm trên nhánh riêng, mở Pull Request, không đẩy thẳng `main`.
- Được tự gộp Pull Request khi kiểm tra xanh, TRỪ thay đổi cơ sở dữ liệu thật, xoá nội dung, đổi kiến trúc — những việc đó phải hỏi chủ dự án (xem docs/05).
