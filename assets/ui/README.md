# Giao diện (UI)

| Thư mục | Nội dung |
|---|---|
| `_source/` | Ảnh gốc chủ dự án gửi (không sửa) |
| `pieces/<tấm>/` | Mảnh cắt tự động + `manifest.json` (thư viện để chọn) |
| `frames/` | Khung đang dùng trong game, tên có nghĩa |
| `icons/` | Icon đang dùng |
| `bg/` | Ảnh nền màn hình (.webp) |

Đang dùng:
- `bg/tim-dang-nhap.webp` — màn đăng nhập (ô nhập + nút đặt đè đúng chỗ vẽ)
- `bg/tim-dang-tai.webp` — màn tải (thanh tiến độ thật đè lên thanh vẽ)
- `frames/bang-may.png` — bảng hộp thoại (tạo nhân vật, xác nhận)
- `frames/bang-ten-khu.png` — băng tên khu trong game
- `frames/nut-vang.png`, `frames/nut-toi.png` — nút chính / phụ
- `frames/nut-tron-may.png` — nút tròn (Chat)
- `icons/cai-dat.png` — nút cài đặt
- `frames/khung-nhan-vat.png` — khung nhân vật trên trái (ảnh đại diện + 3 thanh)
- `frames/minimap-tron.png` — bản đồ nhỏ (cắt bằng `tools/ui_crop.py`)
- `frames/bang-nhan-vat.png`, `frames/bang-cai-dat.png`, `frames/bang-ban-do.png` — bảng Nhân vật, Cài đặt, Bản đồ
- `frames/o-ky-nang-003.png` — ô nút tấn công / kỹ năng
- `icons/tan-cong.png`, `icons/phi-hanh.png`, `icons/toc-bien.png`, `icons/khoa.png`, `icons/ban-do.png`

Dự phòng: `bg/den-vang-dang-nhap.webp`, `bg/den-vang-dang-tai.webp` (bộ đen–vàng).

## Bổ sung 2026-10-20 (tấm dọc `sheet6-doc-tim`, mẫu `mau-cai-dat`)
- `bg/tim-dang-nhap-doc.webp`, `bg/tim-dang-tai-doc.webp` — nền đăng nhập / tải cho màn dọc
- `icons/dong.png` (✕ đóng bảng), `icons/dong-y.png` (✓), `icons/cong.png` (+), `icons/tru.png` (−)
- `icons/am-thanh.png`, `icons/nhac-nen.png`, `icons/ngon-ngu.png`, `icons/dang-xuat.png` — cắt từ ảnh mẫu Cài đặt
- `frames/o-tron.png` — ô tròn nút tấn công / kỹ năng
- Bản đồ nhỏ và bản đồ thế giới: viền la bàn vẽ bằng code (`src/ui/compass.js`) cho sắc nét mọi cỡ; `frames/minimap-tron.png` không còn dùng.

## Độ sắc nét
Khung hiển thị theo **bội số nguyên điểm ảnh gốc** (`crispWidth` trong `src/ui/stage.js`); nút nhỏ hơn bội số thì thu nhỏ mượt.
