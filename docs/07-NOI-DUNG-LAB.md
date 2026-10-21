# 07 — Nội dung thiết kế từ Lab v3 (Cửu Tiêu Nguyên Anh Ký)

Nhập ngày 21/10/2026 từ file "Auralora Lab v3 — Toàn cảnh dự án" của chủ dự án.

## Trạng thái: THIẾT KẾ — chưa triển khai
Mọi file dưới đây có `"_status": "design"`. Nghĩa là:
- **ĐÃ CÓ TRONG LAB** và **đã chép vào data/** — nhưng **CHƯA có code nào dùng**, **CHƯA kiểm thử cân bằng**.
- ID trong các file này **chưa phát hành** (chưa người chơi nào giữ), nên còn được đổi. Khi một hệ thống đọc file và đưa vào game thật, đổi `_status` thành `"live"` — từ đó ID bị khoá theo docs/02.
- Không bỏ qua mốc trong docs/05: quái/chiến đấu thật vẫn chờ Mốc 3, túi đồ/đan/phôi lưu máy chủ chờ Mốc 4.

| File | Nội dung |
|---|---|
| `data/realms.json` | 5 cảnh giới, hệ số sức mạnh, tỷ lệ + đan đột phá, bảo hộ phù |
| `data/stats.json` | 11 chỉ số, trần, công thức chiến đấu, hằng số, pha boss |
| `data/items/materials.json` | 15 linh thảo, 10 khoáng, 4 vật liệu đặc biệt (theo vùng) |
| `data/items/pills.json` | 9 đan + nguyên liệu, tỷ lệ thành công |
| `data/equipment/blanks.json` | Công thức phôi 8 ô + tên mẫu |
| `data/equipment/awaken.json` | Phẩm thức tỉnh: tỷ lệ, số dòng, hệ số, giá Linh thạch, khoảng chỉ số mỗi dòng, gearQ |
| `data/skills/cong-phap.json` | 8 công pháp + nguyên liệu luyện |
| `data/monsters/monsters.json` | 25 quái (5 vùng × thường/elite/boss), HP/ATK/DEF dạng [min, max] |
| `data/quests/quests.json` | 20 nhiệm vụ mẫu, ngân sách thưởng, danh sách placeholder |
| `data/shop.json` | Bán / không bán |

## Quy tắc ID đã dùng
- Linh thảo giữ đúng ID Lab: `item.thao.<tên>.001`. Khoáng: `item.khoang.<tên>.001`. Đặc biệt: `item.dacbiet.<tên>.001`. Đan: `item.dan.<tên>.001`.
- Quái: `monster.<vùng>.<tên>.001`, vùng = `xanh, cam, trang, xam, than`.
- Phôi: `recipe.phoi.<ô>.001` (ô theo `data/equipment/slots.json`). Công pháp giữ ID Lab.
- Nhiệm vụ Lab viết tắt (`monster.yeu-ho`, `ore.xich-thiet`, `pill.recovery.basic`…) đã đổi sang ID chuẩn; bản gốc giữ ở `lab_target` / `lab_id`.

## Kiểm tra tự động
`tools/check_refs.mjs` (chạy trong `tools/check.mjs`): ID không trùng, đúng dạng, mọi nguyên liệu/đan/quái/nhiệm vụ được trỏ tới phải tồn tại.
Mục tiêu nhiệm vụ chưa có thực thể (NPC, địa điểm, cờ mở khoá) phải khai báo trong `placeholders` của `quests.json`.

## Chênh lệch Lab ↔ repo — đã chốt ở Lab v3.1 (21/10/2026)
1. **Vùng ↔ địa hình**: cỏ = Xanh, cát + đá lát cổ = Cam, tuyết = Trắng, sỏi = Xám, hắc thổ + dung nham = Than (`data/terrain.json` → `zone`).
2. **Huyền Thiết Vụn** (không phải Huyền Thiết) trong phôi Dây chuyền và Luyện Khí Quyết.
3. Nhiệm vụ "Thử thách Tuyết Sơn": boss Vùng Trắng là **Tuyết Sơn Lão Tổ**.
4. Vật phẩm nhiệm vụ có ID chuẩn: `data/items/quest-items.json`.

## Còn thiếu trong Lab (game đang dùng số tạm ở data/gameplay.json)
Dòng thức tỉnh Chính Xác/Né/Tốc Đánh/Tốc Chạy; hiệu quả đan hồi/cường hoá; tu vi cần mỗi tầng; nguyên liệu 3 công pháp cuối;
giới hạn bảo hộ phù/ngày; giá shop. Trạng thái các file Lab vẫn là `design` — luật đang chạy là bản thử (docs/08).


## Hệ thống tuổi thọ — đề xuất mới (21/10/2026)

File thiết kế: `data/lifespan.json`. Trạng thái **design**, chưa áp dụng vào game thật.

- Quy đổi thời gian: 24 giờ thực = 1 năm tuổi thọ; thời gian vẫn trôi khi nhân vật ngoại tuyến.
- Nhân vật bắt đầu ở tuổi 16, tuổi thọ tối đa ban đầu 100 năm.
- Mỗi lần đột phá thành công, tuổi thọ tối đa tăng lên mốc của cảnh giới mới. Tuổi hiện tại không quay về 0; tuổi thọ còn lại = tuổi thọ tối đa − tuổi hiện tại.
- Mốc đề xuất: Luyện Khí tầng 10 = 200 năm; Trúc Cơ hậu kỳ = 400; Kết Đan hậu kỳ = 1.000; Nguyên Anh hậu kỳ = 2.500; Hóa Thần hậu kỳ = 8.000 năm.
- Khi tuổi hiện tại chạm tuổi thọ tối đa, nhân vật chết. Bản đầu chỉ đánh dấu chết/khóa nhân vật, không xóa dữ liệu vĩnh viễn ngay.
- Nếu muốn xóa hồ sơ sau khi chết, cần 7 ngày chờ, thông báo rõ, thao tác dọn dẹp phía máy chủ và cơ chế khôi phục. Không được xóa tài khoản đăng nhập hoặc dữ liệu dùng chung.
- Bản chơi thử hiện lưu localStorage và chưa có thời gian máy chủ đáng tin cậy; không bật tự xóa dữ liệu trong bản này. Trước khi triển khai thật, máy chủ phải tự tính thời gian đã trôi qua để tránh chỉnh giờ thiết bị.
