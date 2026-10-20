# 08 — Bản chơi thử (luật chơi phía máy khách)

Quyết định của chủ dự án ngày 21/10/2026: **đưa toàn bộ Lab vào game bằng code đơn giản, hình tạm**, để hình dung game trước,
song song với việc hoàn thành Mốc 1. Đây là **bản chơi thử**, chưa phải hệ thống an toàn cho nhiều người.

## Đã có trong game (thử nghiệm)
| Hệ thống | Cách chơi | Code |
|---|---|---|
| Quái | Sinh quanh người chơi theo vùng địa hình; càng gần tâm bản đồ càng yếu; tinh anh/boss ở phần ngoài mỗi vành | `src/game/monsters.js` |
| Hành vi quái | Lang thang quanh chỗ sinh → thấy người (thần thức) thì đuổi → không đuổi quá xa → quay về hồi máu | như trên |
| Đòn nặng | Mỗi 4 đòn, quái vung đòn nặng: vòng đỏ dưới chân, chạy ra khỏi vòng để né | như trên |
| Chiến đấu | Công thức Lab (`data/stats.json`): trúng/né, bạo kích, xuyên giáp, hút máu, phản đòn | `src/game/stats.js` |
| Linh thảo / khoáng | Mọc trên bản đồ theo vùng (cây lá xanh, tảng đá có vân sáng); đi sát là hái, không hái khi đang bay | `src/game/gather.js` |
| Rơi đồ | Tu vi, Linh thạch, linh thảo/khoáng theo vùng, vật liệu đặc biệt, vật phẩm nhiệm vụ | `src/game/gameplay.js` |
| Cảnh giới | Đủ tu vi tự lên tầng nhỏ; tầng đầu đại cảnh giới phải bấm **Đột phá** + có đan, tỷ lệ theo Lab | `src/game/progress.js` |
| Kỹ năng | Kiếm khí, Khống chế (Trúc Cơ), Linh thú, Lướt (Kết Đan), Diện rộng (Nguyên Anh), Pháp tướng (+60% công, +25% thủ), Đan dược, Tự động đánh | `gameplay.js` |
| Tu luyện (nút Kỹ năng) | Cảnh giới, Luyện đan, Luyện phôi, Thức tỉnh / Trang bị / Rã, Công pháp cấp 1→5, Nguyên liệu | `src/game/craft.js`, `views.js` |
| Nhiệm vụ | 20 nhiệm vụ Lab: nhận, tiến độ, nhận thưởng một lần, daily làm lại mỗi ngày, chuỗi chính tự mở | `src/game/quests.js` |
| Kho | Nguyên liệu, đan (nút Dùng), vật phẩm nhiệm vụ, cùng đồ ngoại hình 6 hệ | `src/ui/bag.js` |

Phím máy tính: Space đánh, 1–5 kỹ năng, Q uống đan hồi máu.

## Thông số
- `data/gameplay.json` — mọi số chơi thử Lab chưa có (Claude đề xuất, sửa thoải mái): chỉ số nhân vật theo tầng, tu vi cần, AI quái,
  tỷ lệ rơi, hiệu quả đan, kỹ năng, giá thức tỉnh.
- Chỉ số nhân vật mỗi tầng được **tính ngược từ quái Lab**: Linh lực đủ hạ quái thường cùng tầng trong ~4 đòn, HP chịu ~16 đòn.
- Vùng ↔ địa hình (`data/terrain.json` → `zone`): cỏ = Xanh, cát + đá lát = Cam, tuyết = Trắng, sỏi = Xám, hắc thổ + dung nham = Than.

## Trang bị và thức tỉnh
- Đồ 6 hệ trong Kho (có hình): **thức tỉnh được** ở Tu luyện → Thức tỉnh; dòng chỉ số lưu theo mã vật phẩm (`itemAw`).
- Đồ luyện từ phôi: thức tỉnh có chỉ số, chưa có hình (chờ ảnh của chủ dự án).
- Mỗi ô chỉ mặc một món: mặc đồ Kho thì tháo đồ phôi cùng ô, và ngược lại.

## Thanh Vân Thành (vùng an toàn giữa bản đồ)
- Bố cục ở `data/zones/zone.start.json` → `town`: `stamp` tô quảng trường đá + hào nước + 3 lối vào (cổng nam, cầu đông, cầu tây) lên bản đồ lúc tải (ảnh bản đồ gốc giữ nguyên);
  `props` đặt công trình (dx/dy = chân công trình so với tâm thành), `block` = vùng không đi xuyên.
- Trong thành (`safe.half_px`): quái không sinh, không bước vào, không đuổi/đánh người đứng trong; hồi máu ×`regen_mul`.
- Hình công trình: tấm kiến trúc chủ dự án gửi, cắt bằng `tools/asset_build.py` → `assets/town/`. Code: `src/map/town.js`.
- Mới là trang trí + vùng an toàn: chạm Lò luyện đan / Kho hàng / Tế đàn chưa mở bảng tương ứng.

## Vạn Bảo Lâu, đan phương, kho
- Cửa hàng (`data/shop.json`, giá TẠM): mở bằng nút Tông môn khi đang trong thành, hoặc chạm Kho hàng. Bán theo Lab: đan phương sơ–trung,
  công thức phôi Lục–Cam (đến Linh thú), công pháp cơ bản, bảo hộ phù (3 lần/ngày), nguyên liệu Vùng Xanh/Cam (đắt).
  Không bán (chỉ rơi từ boss, `data/items/recipes.json` → drop): Hóa Thần / Duy Trì Đan phương, công thức Cánh / Pháp tướng, bí kíp Kiếm Khí trở lên.
- **Phải có trong kho** Đan phương / Công thức phôi / Bí kíp mới luyện được (không mất khi dùng). Nhiệm vụ đầu tặng Luyện Khí Quyết, Đan phương Tiểu Hồi Huyết, Trúc Cơ.
- Bảo hộ phù: có trong kho thì tự dùng khi Đột phá (+15 điểm %).
- Kho / ô trang bị bảng Nhân vật: chạm món → Sử dụng / Tháo / Thức tỉnh / Phân rã (hoàn 50% Linh thạch đã thức tỉnh) / Vứt; đan: Dùng; công thức: Luyện. Code: `src/game/inventory.js`.
- Chạm Lò luyện đan → Luyện đan; Tế đàn → Cảnh giới.

## Đường, rừng, bãi đá
- Đường đất (`data/zones/zone.start.json` → roads): trục Đông–Tây + Bắc–Nam xuyên bản đồ (quấn mép), 5 vành đường vuông (mỗi vùng một vành), 4 đường chéo.
  Qua nước tự thành **cầu gỗ** → đi tới mọi vùng không bị nước chặn. Trên đường không có quái, cây, đá.
- Cây / đá / hoa cỏ (`data/terrain.json` → `decor` mỗi loại đất + `decor_rules`): mọc thành **rừng** và **bãi đá** theo cụm, cố định theo toạ độ (mọi máy thấy giống nhau).
  Cây chặn ở gốc, đá chặn cả khối, cỏ hoa đi xuyên. Hình: tấm cảnh vật chủ dự án → `assets/decor/atlas.png`. Code: `src/map/decor.js`.
- Linh thảo mọc nhiều trong rừng, khoáng nhiều ở bãi đá; ai thích farm đâu thì farm đó (rừng / đá / dọc đường).
- Chỉ là hình + va chạm phía máy khách: máy chủ chưa biết cây đá (chỉ kiểm tốc độ).

## Camera
`data/config.json` → `camera.zoom` (đang 0,75). Chữ/thanh máu trên đầu tự phóng để vẫn đọc được.

## Giới hạn — phải biết
- **Chạy phía máy khách, lưu localStorage** (`tc.progress.<id>`): người chơi sửa được, đổi máy là mất. Không dùng để xếp hạng/giao dịch.
- **Mỗi người thấy quái riêng**: hai người đứng cạnh nhau không đánh cùng một con. Mốc 3 chuyển quái + sát thương lên máy chủ.
- Hình quái/hiệu ứng/icon là **tài nguyên thử nghiệm** (assets/CREDITS.md): đóng gói bằng `tools/asset_build.py` → `data/art/sprites.json`.
  Đổi hình một con quái: sửa `art` trong `data/monsters/monsters.json` (sheet, h = cao, hue = đổi màu). Không đụng AI.
- NPC/địa điểm nhiệm vụ chưa có → nút **Hoàn thành tạm** trong bảng Nhiệm vụ.

## Chơi thử không cần mạng
Mở game với `?offline` (vd. `…/auraloracultivation/?offline`): không đăng nhập, không thấy người khác, tiến trình lưu riêng.
Thêm `&debug` để có `__tp(x, y)` (dịch chuyển) và `__game` cho kiểm thử tự động.
