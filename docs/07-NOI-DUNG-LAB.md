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

## Thay đổi 23/10/2026 (chủ dự án)
- Thêm cảnh giới **Anh Biến**, **Vấn Đỉnh** (người chơi) và **Âm Hư** (chỉ boss). `data/realms.json`, `data/gameplay.json → player.stages` sinh bằng `tools/gen_balance.py`.
- Thứ tự vùng đổi: **Xám Khói (sỏi) = Kết Đan, Trắng (tuyết) = Nguyên Anh** (trước ngược lại). Đi kèm: Nguyên Anh Đan dùng nguyên liệu Xám Khói,
  Hóa Thần Đan dùng nguyên liệu Trắng; đồ rơi từ boss đổi vùng Trắng ↔ Xám; nhiệm vụ "Thử thách Tuyết Sơn" nay là nhiệm vụ Nguyên Anh.
- Thêm Vùng Đen, Vùng Tím: 10 quái mới (hình mượn + đổi màu), 8 nguyên liệu + Âm Hư Tinh Hạch (`materials.json`, ghi `_nguon`), Anh Biến Đan, Vấn Đỉnh Đan + đan phương.
- Quái giờ có `stages` (tầng xuất hiện); hp/atk/def [min, max] chỉ để hiển thị. Linh thạch rơi theo tầng (`monster.stone_by_stage`), không theo HP.

## Chênh lệch Lab ↔ repo — đã chốt ở Lab v3.1 (21/10/2026)
1. **Vùng ↔ địa hình**: cỏ = Xanh, cát + đá lát cổ = Cam, sỏi = Xám Khói, tuyết = Trắng, hắc thổ + dung nham = Xám Than, hắc thạch = Đen, tử vực = Tím (`data/terrain.json` → `zone`; đổi 23/10).
2. **Huyền Thiết Vụn** (không phải Huyền Thiết) trong phôi Dây chuyền và Luyện Khí Quyết.
3. Nhiệm vụ "Thử thách Tuyết Sơn": boss Vùng Trắng là **Tuyết Sơn Lão Tổ**.
4. Vật phẩm nhiệm vụ có ID chuẩn: `data/items/quest-items.json`.

## Còn thiếu trong Lab (game đang dùng số tạm ở data/gameplay.json)
Dòng thức tỉnh Chính Xác/Né/Tốc Đánh/Tốc Chạy; hiệu quả đan hồi/cường hoá; tu vi cần mỗi tầng; nguyên liệu 3 công pháp cuối;
giới hạn bảo hộ phù/ngày; giá shop. Trạng thái các file Lab vẫn là `design` — luật đang chạy là bản thử (docs/08).


## Hệ thống thọ nguyên — ĐÃ CHẠY (chủ dự án chốt 23/10/2026, thay đề xuất 21/10)

File: `data/lifespan.json`, code `src/game/lifespan.js`. Bản chơi thử (localStorage); Mốc 4 máy chủ tự tính.

- 1 ngày thật theo giờ Việt Nam (qua 0h) = 1 năm tuổi, kể cả khi không vào game. Giờ lấy từ máy chủ (`server_time`).
- Tuổi = 1 + số ngày (giờ VN) kể từ ngày tạo nhân vật (`characters.created_at`). Chuyển thế sau tọa hóa thì tính lại từ ngày chuyển thế. Thọ nguyên tối đa gốc 100 (chủ dự án: mọi người bắt đầu 1/100). Đột phá cộng: Luyện Khí mỗi tầng +1; Trúc Cơ +10/+5/+5; Kết Đan +20/+10/+10; Nguyên Anh +40/+20/+20; Hóa Thần +80/+40/+40.
- Trường Sinh Đan: +2 thọ nguyên tối đa, mỗi ngày 1 viên. Luyện từ 1 Thọ Nguyên Thảo (mọc khắp Vùng Xanh ngoài thành), không cần đan phương.
- Hiện sau cảnh giới: trên đầu nhân vật và khung nhân vật, ví dụ `Kết Đan Sơ kỳ (Thọ nguyên 43/109 năm)`.
- Tuổi chạm thọ nguyên tối đa → **tọa hóa: chết hẳn** (chủ dự án chọn). Tiến trình + Kho bị xoá, chuyển thế từ Luyện Khí tầng 1. Chỉ xét khi đã lấy được giờ máy chủ.

## Ba loại tiền (23/10/2026)

File: `data/currency.json`, code `src/game/currency.js`.
- **Vàng**: tiền phàm nhân, rơi từ quái (8× Linh thạch), mua đồ thường ở tab Phàm phẩm.
- **Linh thạch**: như cũ.
- **Tiên ngọc**: mua được mọi món (giá = Linh thạch × 0,01, làm tròn lên), riêng tab Tiên Bảo: Tu Vi Đan (+10% vạch), Viên Mãn Đan (đầy vạch). Sau này chỉ có khi nạp — nạp thật bắt buộc qua máy chủ. Tiên khí (Vấn Đỉnh+) chưa mở.
