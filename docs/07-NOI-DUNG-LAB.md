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

## Chênh lệch Lab ↔ repo, chờ chủ dự án quyết
1. **Vùng ↔ địa hình**: Lab có 5 vùng quái; `data/terrain.json` có 6 bậc (cỏ, cát, đá lát, tuyết, sỏi, hắc thổ). Chưa ghép.
2. **Huyền Thiết** (khoáng Vùng Xám) xuất hiện ở công thức cấp thấp: phôi Dây chuyền (LK3) và Luyện Khí Quyết. Có thể ý là *Huyền Thiết Vụn*.
3. Nhiệm vụ trỏ `boss.bing-ho`: Băng Hồ là quái thường; boss Vùng Trắng là Tuyết Sơn Lão Tổ.
4. Còn thiếu số: dòng thức tỉnh Chính Xác/Né/Tốc Đánh/Tốc Chạy; hiệu quả các đan hồi/cường hoá; hệ số LK2–4, LK6–9; nguyên liệu 3 công pháp cuối; giới hạn bảo hộ phù/ngày; giá shop.
5. Màn hình: Lab và docs/04 ghi **ưu tiên dọc 390×844**.
