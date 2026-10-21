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
- **Thức tỉnh từng dòng (Lab v3.2)**: mỗi lần bấm thêm 1 dòng, màu (phẩm) từng dòng ngẫu nhiên; mỗi món có giới hạn ẩn 1–10 dòng, chạm giới hạn thì nút tắt. Không còn thức tỉnh lại. Số ở `data/gameplay.json` → awaken.
- Hình vũ khí / cánh / pháp tướng: `src/entity/rig.js` nạp hình 6 hệ (he6.json) + kho hình chung (art.json, nạp khi cần). Hình 6 hệ không thuộc bộ nào (vd. Thương Hải Pháp kiếm) mượn thông số bộ cùng số.
- Đồ 6 hệ trong Kho (có hình): **thức tỉnh được** ở Tu luyện → Thức tỉnh; dòng chỉ số lưu theo mã vật phẩm (`itemAw`).
- Đồ luyện từ phôi: thức tỉnh có chỉ số, chưa có hình (chờ ảnh của chủ dự án).
- Mỗi ô chỉ mặc một món: mặc đồ Kho thì tháo đồ phôi cùng ô, và ngược lại.

## Thanh Vân Thành (vùng an toàn giữa bản đồ)
- Bố cục ở `data/zones/zone.start.json` → `town`: `stamp` tô quảng trường đá + hào nước + 3 lối vào (cổng nam, cầu đông, cầu tây) lên bản đồ lúc tải (ảnh bản đồ gốc giữ nguyên);
  `props` đặt công trình (dx/dy = chân công trình so với tâm thành), `block` = vùng không đi xuyên.
- Trong thành (`safe.half_px`): quái không sinh, không bước vào, không đuổi/đánh người đứng trong.
- **Không tự hồi khí huyết** (yêu cầu chủ dự án 21/10): chỉ hồi bằng đan dược và hút máu khi đánh (hồi sinh thì đầy máu).
- Hình công trình: tấm kiến trúc chủ dự án gửi, cắt bằng `tools/asset_build.py` → `assets/town/`. Code: `src/map/town.js`.
- Mới là trang trí + vùng an toàn: chạm Lò luyện đan / Kho hàng / Tế đàn chưa mở bảng tương ứng.

## Vạn Bảo Lâu, đan phương, kho
- Cửa hàng (`data/shop.json`, giá TẠM): mở bằng nút Tông môn khi đang trong thành, hoặc chạm Kho hàng. Bán theo Lab: đan phương sơ–trung,
  công thức phôi Lục–Cam (đến Linh thú), công pháp cơ bản, bảo hộ phù (3 lần/ngày), nguyên liệu Vùng Xanh/Cam (đắt).
  Không bán (chỉ rơi từ boss, `data/items/recipes.json` → drop): Hóa Thần / Duy Trì Đan phương, công thức Cánh / Pháp tướng, bí kíp Kiếm Khí trở lên.
- **Phải có trong kho** Đan phương / Công thức phôi / Bí kíp mới luyện được (không mất khi dùng). Bảng Tu luyện CHỈ hiện những cuốn đang có; muốn thêm phải về thành mua. Nhiệm vụ đầu tặng Luyện Khí Quyết, Đan phương Tiểu Hồi Huyết, Trúc Cơ.
- Bảo hộ phù: có trong kho thì tự dùng khi Đột phá (+15 điểm %).
- Kho / ô trang bị bảng Nhân vật: chạm món → Sử dụng / Tháo / Thức tỉnh / Phân rã (hoàn 50% Linh thạch đã thức tỉnh) / Vứt; đan: Dùng; đan phương / công thức / bí kíp: hiện nguyên liệu cần + nút Luyện đan / Luyện phôi / Tu luyện, luyện ngay trong Kho. Code: `src/game/inventory.js`.
- Chạm Lò luyện đan → Luyện đan; Tế đàn → Cảnh giới.

## Đường, rừng, bãi đá
- Đường đất (`data/zones/zone.start.json` → roads): trục Đông–Tây + Bắc–Nam xuyên bản đồ (quấn mép), 5 vành đường vuông (mỗi vùng một vành), 4 đường chéo.
  Qua nước tự thành **cầu gỗ** → đi tới mọi vùng không bị nước chặn. Trên đường không có quái, cây, đá.
- Cây / đá / hoa cỏ (`data/terrain.json` → `decor` mỗi loại đất + `decor_rules`): mọc thành **rừng** và **bãi đá** theo cụm, cố định theo toạ độ (mọi máy thấy giống nhau).
  Cây chặn ở gốc, đá chặn cả khối, cỏ hoa đi xuyên. Hình: tấm cảnh vật chủ dự án → `assets/decor/atlas.png`. Code: `src/map/decor.js`.
- Linh thảo mọc nhiều trong rừng, khoáng nhiều ở bãi đá; ai thích farm đâu thì farm đó (rừng / đá / dọc đường).
- Chỉ là hình + va chạm phía máy khách: máy chủ chưa biết cây đá (chỉ kiểm tốc độ).

## 50 NPC
- `data/npcs.json`: tên, trang phục, vũ khí, nhà (22 trong thành, 28 dọc đường chính), lời tán gẫu, lời chào. Máy khách tự chạy (docs/01: NPC lấp chỗ trống).
- Đi lại quanh nhà, tán gẫu, luyện kiếm; vung vào quái chỉ là hình. Cỡ bằng người chơi (`height_px`). Chạm NPC → chào (hoặc chọn làm mục tiêu nếu đánh được).
- Trang phục/vũ khí NPC là hình RIÊNG (`assets/npcs`), **không phải vật phẩm game** — trang bị của người chơi hiện chỉ có 6 bộ hệ.
- Chỉ NPC trong ~1600 điểm quanh người chơi mới chạy (nhẹ máy). Code: `src/game/npcs.js`, `src/entity/npc-draw.js`.

## Khiên bảo vệ và đánh nhau
- Sau tên có **khiên**: xanh = được bảo vệ (mặc định), đỏ gạch chéo = tắt. Chạm khiên của mình để tắt/bật (bật lại phải rời giao chiến 5 giây).
- Ngoài thành, ai tắt khiên đều đánh được nhau: người chơi ↔ NPC, NPC ↔ NPC. Vừa hồi sinh được bảo vệ 10 giây. Trong thành không ai đánh được.
- NPC có cảnh giới + khí huyết như người chơi; NPC tắt khiên tự tấn công người / NPC tắt khiên gần đó; gục thì hồi sinh ở nhà sau 20 giây. Hạ NPC +5 Linh thạch.
- Chết: thân xác tàn mờ rồi **hoá linh hồn trắng** (`src/game/soul.js`): chỉ đi lại (tốc độ bằng bay, qua được nước), không tên, không thanh máu, không đánh / kỹ năng / ngự kiếm, quái không thấy.
  Bảng chọn: **Về Thanh Vân Thành hồi sinh** (miễn phí, trận pháp giữa thành; máy chủ: RPC `respawn_at_town`, migration 0004, đã cài 21/10) hoặc **Hồi sinh tại đây** (Linh thạch = 10 + 5 × số tầng; `data/gameplay.json` → soul).
  Người khác hiện vẫn thấy hình nhân vật thường (chưa gửi trạng thái linh hồn qua mạng).
- **Người chơi thật ↔ người chơi thật chưa đánh được**: cần máy chủ xác nhận sát thương (Mốc 3).

## Ngự kiếm (bay)
Phải cầm kiếm mới bay được (chưa có kiếm thì chỉ chạy). Đang bay linh lực không hồi và mất `player.fly_mp_per_s` mỗi giây (data/config.json); cạn linh lực hoặc tháo kiếm thì tự hạ xuống (đang trên nước thì bước ra bờ gần nhất).

## Thông tin vật phẩm
- **Vạn Bảo Lâu** chỉ nói công dụng + giá: đan → hồi bao nhiêu / tăng gì / đột phá cảnh giới nào; đan phương → luyện ra đan gì, đan đó làm gì; bí kíp → công pháp tăng gì mỗi cấp.
  Công thức / bí kíp: chữ **Đã có** (xanh) hoặc **Chưa có** (xám).
- **Kho** mới nói thêm cần gì, nơi có (vùng, rừng / bãi đá, quái rơi, cửa hàng). Code: `src/game/iteminfo.js`.
- Mọi đan dùng được ngay trong Kho; đan đột phá (Trúc Cơ, Kết Đan…) có nút **Dùng để đột phá**.
- Hiệu quả công pháp: `data/gameplay.json` → skills.cong_phap_effects (vd. Luyện Khí Quyết: đánh thường +10% mỗi cấp). Code: `src/game/cp-effects.js`.

## Bảng Nhân vật: chạm ô trống
Hiện bảng nhỏ nằm ngang các món trong kho mặc được vào ô đó; chọn là mặc ngay, bảng Nhân vật vẽ lại.

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

## Ô kỹ năng (HUD)
- Ô hiện thứ đang dùng: Đan dược = viên Tiểu Hồi Huyết Đan + số còn; Linh thú / Pháp tướng = món đang đeo.
- Mọi ô dùng khung xám trống `assets/ui/skills/trong.png` (bỏ hình hồng mặc định). Chỉ hiện hình khi có: Kiếm khí / Khống chế / Nguyên Anh = một khung hiệu ứng của chiêu (khi đã mở theo cảnh giới), Đan dược / Linh thú / Pháp tướng như trên.
- Chưa mở theo cảnh giới, hoặc chưa có thứ để dùng (hết đan, chưa đeo linh thú / pháp tướng) → khung trống; chạm vào sẽ báo lý do.
- Đang hồi chiêu: bóng tối quét quanh nút + số giây đếm ngược. Code: `src/game/skillbar.js`, `src/ui/hud.js`.

## Nút Tự động
Bật: tự tìm thứ **gần nhất** trong `auto.search_px` — quái hoặc linh thảo / khoáng — đi tới, đánh quái, hái nguyên liệu (đang bay thì chỉ tìm quái);
khí huyết dưới 30% mà Kho có Tiểu Hồi Huyết Đan thì tự uống. Kẹt (vướng cây / nước) thì tạm bỏ mục tiêu. Kéo cần điều khiển là người chơi điều khiển ngay.
Chết thì tự tắt. Số: `data/gameplay.json` → auto. Code: `src/game/autoplay.js`.

## Đồ giám (nút sách trên HUD)
- Liệt kê mọi thứ trong game kèm **ảnh + tên + mã + thông tin**: linh thảo / khoáng, đan, đan phương / công thức, công pháp, kỹ năng người, kỹ năng quái + hiệu ứng, quái vật, trang bị, phôi, NPC, khác.
- Mỗi mục ghi trạng thái ảnh: **Đã có ảnh** (ảnh riêng của chủ dự án) · **Ảnh tạm** (gói miễn phí / dùng chung / mượn / đổi màu) · **Chưa có ảnh**. Lọc theo trạng thái để biết cần làm ảnh nào.
- Mã (dòng chữ nhỏ) = tên file nên đặt khi gửi ảnh. Quái, hiệu ứng, NPC có nút ▶ chạy chuyển động (bấm tiếp để đổi đứng / đi / đánh / chết).
- Trạng thái tính trong `src/game/codex.js` (OWNER_SHEETS, OWNER_FX…): thay ảnh xong thì sửa danh sách đó. Giao diện: `src/ui/codex.js`.
- Bảng Tu luyện cũ vẫn mở bằng cách chạm Lò luyện đan / Tế đàn trong Thanh Vân Thành.
