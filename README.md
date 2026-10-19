# Auralora Cultivation — Thế Giới Tu Chân

Game RPG tu tiên thế giới mở, 2D pixel art, nhiều người chơi, hướng tới Android.

## Mốc hiện tại (Mốc 1)
Hai người chơi trên hai điện thoại: đăng nhập → vào cùng bản đồ → thấy nhau di chuyển → thoát ra vào lại không mất vị trí.
Chưa làm chiến đấu, trang bị, tông môn cho tới khi Mốc 1 có bằng chứng kiểm thử.

## Đọc trước khi làm bất cứ việc gì (người hay AI)
1. [docs/01-KIEN-TRUC.md](docs/01-KIEN-TRUC.md) — máy chủ quyết định gì, máy khách làm gì
2. [docs/02-DU-LIEU.md](docs/02-DU-LIEU.md) — mã ID và nguồn dữ liệu duy nhất
3. [docs/03-THU-MUC.md](docs/03-THU-MUC.md) — mỗi hệ thống ở đâu, ai được sửa gì
4. [docs/04-ASSET.md](docs/04-ASSET.md) — quy chuẩn hình ảnh
5. [docs/05-QUY-TRINH.md](docs/05-QUY-TRINH.md) — nhánh, Pull Request, kiểm thử

## Hạ tầng
- Máy khách: HTML Canvas + JavaScript (ES modules), chạy trên GitHub Pages.
- Máy chủ: Supabase project `AuraloraCultivation` (ref `ympsgrghczpzkonfadco`, vùng Singapore).
- Khoá công khai (publishable) được phép nằm trong code máy khách. **Không bao giờ** đưa `service_role` / secret key vào repo.
