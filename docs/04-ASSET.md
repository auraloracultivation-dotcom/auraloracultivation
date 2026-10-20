# 04 — Quy chuẩn asset

## Phân vai (quyết định 2026-10-20)
- **Thiết kế và nội dung hình ảnh: chủ dự án.** Claude không tự vẽ đồ hoạ; chỉ tách nền, cắt, nén, ghép vào game và làm hiệu ứng nhẹ (phát sáng, mờ dần, ánh chạy).
- **Ưu tiên màn hình dọc** (quyết định 2026-10-20); ngang vẫn hỗ trợ. Mọi bảng mới phải kiểm tra trên 390×844 trước.
- Sửa nhẹ hình theo yêu cầu chủ dự án được phép (ví dụ đã xoá hình bóng người giữa `frames/bang-nhan-vat.png`); ảnh gốc giữ nguyên trong `_source/`.
- Giao diện: **khung tím–vàng** (tấm 1–4) kết hợp **icon đen–vàng** (tấm 5).

## Quy trình đưa tấm UI vào game
1. Ảnh gốc (nền hồng #FA03FB hoặc nền đen) lưu vào `assets/ui/_source/` — không sửa, để cắt lại khi cần.
2. Chạy `python3 -I tools/ui_slice.py <ảnh> assets/ui/pieces/<tên-tấm> --bg magenta|black`
   → mỗi mảnh liền một file PNG trong suốt, đánh số theo hàng, nén bảng màu 128 màu, kèm `manifest.json` (toạ độ gốc).
3. Mảnh nào dùng trong game thì **chép sang tên có nghĩa**: `assets/ui/frames/`, `assets/ui/icons/`. Code chỉ dùng tên có nghĩa, không dùng số.
4. Ảnh nền màn hình (vẽ sẵn ô nhập, nút) lưu `.webp` trong `assets/ui/bg/`. Code đặt ô nhập/nút thật đè đúng toạ độ đã vẽ (`src/ui/stage.js`).

## Phong cách
- Pixel art chibi tu tiên, góc nhìn **3/4 (chéo)** cho nhân vật, trang phục, thú cưỡi, pet.
- Nhân vật trần cơ sở: **24×32 px**, tông kem trắng đơn giản. Trang bị là **lớp rời** chồng lên đúng khung đó.

## Kích thước và điểm neo
| Loại | Khung | Điểm neo |
|---|---|---|
| Nhân vật / trang bị | 24×32 | giữa chân (12, 31) |
| Thú cưỡi | 48×40 | giữa chân |
| Ô bản đồ | 16×16 | góc trên trái |

## Đặt tên file
Trùng mã ID dữ liệu: `assets/equipment/item.sword.luc.001.png`. Icon túi đồ: `...001.icon.png`.

## Hoạt ảnh
- Sprite sheet theo hàng: hàng = hướng/hành động, cột = frame.
- Các frame phải thực sự khác nhau; không cắt một ảnh tĩnh thành frame giả.
- Icon phải khớp đúng hình trang bị khi mặc lên người.

## Nguồn
Ghi tác giả và giấy phép của asset tải ngoài vào `assets/CREDITS.md`.
