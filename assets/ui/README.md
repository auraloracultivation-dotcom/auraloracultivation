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
- Bản đồ nhỏ và bản đồ thế giới: khung la bàn của chủ dự án `frames/khung-ban-do.png` (sinh bằng `tools/map_frame.py`, lòng tròn trong suốt); nút `icons/ban-do-dong.png`, `ban-do-cong.png`, `ban-do-tru.png`. `frames/minimap-tron.png` không còn dùng.

## Độ sắc nét
Khung hiển thị theo **bội số nguyên điểm ảnh gốc** (`crispWidth` trong `src/ui/stage.js`); nút nhỏ hơn bội số thì thu nhỏ mượt.

## Bổ sung 2026-10-20 (mẫu `mau-hud-doc`, khung `khung-nhan-vat-moi`)
- `frames/khung-nhan-vat-v2.png` — khung nhân vật HUD mới, sinh bằng `tools/hud_frame.py` (xoá chữ, màu thanh, nhân vật, biểu tượng xoắn để game tự vẽ)
- `icons/tui-do.png`, `ky-nang.png`, `nhiem-vu.png`, `tong-mon.png`, `cai-dat-v2.png`, `ban-do-v2.png` — menu góc trên
- `icons/bay-len.png`, `icons/ha-xuong.png` — một nút Bay lên ↔ Hạ xuống
- `icons/sen.png` (cảnh giới / Tu vi), `icons/nguoi.png` (đạo hiệu)
- `frames/bang-cai-dat-v2.png` — khung Cài đặt mới (tách từ ảnh mẫu chụp trong game bằng `tools/panel_from_mockup.py`); nút Bật/Ngôn ngữ/Đăng xuất/✕ vẽ sẵn, game đặt nút trong suốt đè lên
