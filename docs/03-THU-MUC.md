# 03 — Thư mục và ranh giới module

```
data/        Định nghĩa nội dung (JSON) — nguồn sự thật
  config.json, items/, monsters/, skills/, zones/
src/
  core/      Vòng lặp game, input, camera, nạp dữ liệu. Không chứa luật gameplay.
  net/       Toàn bộ giao tiếp Supabase (đăng nhập, RPC, Realtime). Module khác KHÔNG gọi Supabase trực tiếp.
  map/       Bản đồ, ô, va chạm, zone.
  entity/    Nhân vật trên màn hình: người chơi (mình + người khác, nội suy), sau này NPC/quái.
  combat/    Hiển thị chiến đấu. Kết quả lấy từ máy chủ.
  ui/        Màn hình, menu, túi đồ.
assets/      Sprite theo loại (xem 04-ASSET.md)
supabase/
  migrations/  SQL đánh số 0001_, 0002_… — chỉ thêm file mới, không sửa file cũ đã chạy
tools/       Script kiểm tra (chạy trong GitHub Actions)
docs/        Hiến pháp dự án
```

## Luật giao tiếp giữa module
- Module chỉ gọi nhau qua hàm được `export` ở file `index.js` của thư mục đó.
- Không import file bên trong thư mục của module khác.
- Mỗi file dưới ~400 dòng; vượt thì tách.
- Không có file `index.html` chứa logic — chỉ nạp `src/main.js`.
