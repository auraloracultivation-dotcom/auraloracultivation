# 09 — Đạo Vận: build đổi cách chiêu hoạt động (23/10/2026)

Chủ dự án muốn chất My Heroes: chọn đúng bộ + hệ + thẻ thì chiêu biến đổi (bắn hàng trăm đạn hình quạt liên tục, linh lực hồi liên tục). Sai một món thì chỉ còn bắn từng viên, chờ hồi chiêu. Hệ thống này chồng lên những gì đang có (chỉ số thức tỉnh random, trang phục, thú cưng…), không thay thế.

## Nguồn hiệu ứng
1. **Bộ ngũ hành**: đếm số món đồ Kho cùng hệ đang mặc trên 8 ô (Kim, Ám, Thủy, Hỏa, Mộc, Thổ). Mốc 2 / 4 / 6 / 8.
   - Mốc **8/8 = ĐẠI THÀNH**: hồi chiêu ×0,15, tốn linh lực ×0,5, hồi 20% linh lực mỗi giây, kèm hiệu ứng riêng của hệ.
   - Thiếu 1 món là tụt về mốc 6.
2. **Thần Phù** (giống card):
   - Rơi khi hạ quái: thường 0,4%, tinh anh 4%, boss 15%, Âm Hư chắc chắn.
   - Phẩm ngẫu nhiên từ Lục đến Đen, phẩm càng cao giá trị càng lớn.
   - 3 ô phù, mở lần lượt ở Luyện Khí 1, Trúc Cơ, Kết Đan.
   - Kho → thẻ Thần Phù: Gắn / Gỡ / Phân rã. Ô đầu tiên của thẻ là "Đạo Vận hiện tại", liệt kê hiệu ứng đang có và mốc kế tiếp.

## Có đồ ngũ hành từ đâu
- **Đồ Kho 6 hệ rơi khi hạ quái**: tinh anh 0,3%, boss 2,5%, Âm Hư 50%. Món chưa có thì vào Kho, đủ bộ rồi thì đổi thành 500 Linh thạch.
- **Phôi luyện ra mang hệ ngẫu nhiên**, lộ ra khi thức tỉnh.
  - Mặt nạ, nhẫn, dây chuyền, linh thú có hình 6 hệ thì hệ đi theo hình.
  - Phôi đã thức tỉnh và đang mặc thì tính vào bộ ngũ hành.

## Hiệu ứng (data/build/dao-van.json → `_tu_dien`)
- **Bắn và đạn**:
  - multishot: bắn thêm viên, xoè hình quạt.
  - pierce: xuyên qua quái.
  - bounce: nảy sang quái khác.
  - split: tách thành đạn nhỏ.
  - chain: sét lan sang quái gần.
  - homing: đạn tự đuổi mục tiêu.
  - explode: nổ lan.
  - burn: để lại đất cháy.
- **Đánh thường**:
  - basic_shot: bắn thêm đạn đạo pháp.
  - shock: sóng chấn quanh mục tiêu.
- **Bị động tự chạy**:
  - orbit: phi kiếm xoay quanh người.
  - rain: mưa kiếm, thiên hỏa, sóng, địa thứ.
  - turret: tự bắn liên thanh.
- **Hồi máu và linh lực**:
  - heal_on_hit: mỗi đòn trúng hồi máu.
  - mp_regen: linh lực hồi liên tục.
  - cd_mul / mp_mul: nhân thời gian hồi chiêu / linh lực tốn.
- **stat**: nhân chỉ số.

## Code
- `src/game/daovan.js`: gộp bộ + phù thành bảng `mods`. Chỉ tính lại khi đồ đang mặc hoặc ô phù đổi.
- `src/game/barrage.js`: đạn và bị động, vẽ vệt sáng, sét, đất cháy, phi kiếm.
  - Mọi sát thương đi qua `strike`, nên vẫn áp chế cảnh giới, vẫn có tu vi và rơi đồ.
  - Tối đa 160 viên đạn cùng lúc. Số bay tạm tắt khi quá nhiều hiệu ứng.
- `src/game/cards.js` + `src/entity/card-art.js`: Thần Phù (Kho, rơi đồ, hình lá bùa vẽ bằng code).
- `src/game/skills.js`: chiêu bắn đạn đi qua `barrage.fire`. Liên Hoàn Phù cho chiêu tự phát lại.

## Lộ trình tiếp (Tiên Nghịch × My Heroes, chỉ lấy hệ thống, không chép tên hay truyện)
1. ✅ Đạo Vận: bộ ngũ hành + Thần Phù.
2. ✅ **Pháp bảo** (`data/build/phap-bao.json`, `src/game/treasure.js`):
   - **Phôi Pháp Bảo**: Vạn Bảo Lâu bán 3000 LT, tối đa 3 phôi/ngày, từ Trúc Cơ. Cũng rơi từ tinh anh 0,4%, boss 4%, Âm Hư chắc chắn.
   - **Luyện hóa** phôi ra một pháp bảo **chưa nhận chủ**. **Nhận chủ** (800 LT) mới biết là pháp bảo nào.
   - **8 pháp bảo**:
     - Thanh Phong Phi Kiếm: kiếm toả tròn rồi tự đuổi quái.
     - U Hồn Phiên: u hồn xoay quanh người.
     - Thương Hải Châu: quét quạt thủy tiễn.
     - Xích Diệm Hồ Lô: phun hỏa đạn liên tục.
     - Thanh Mộc Đỉnh: hồi máu + bắn lá.
     - Trấn Sơn Ấn: ấn núi giáng xuống, choáng.
     - Lôi Linh Châu: lôi bạo.
     - Hộ Thân Chung: phòng thủ ×2,5 + chấn quanh mình.
   - Đeo vào ô pháp bảo, rồi xếp kỹ năng **Pháp Bảo** vào ô kỹ năng để dùng. Chiêu bắn đạn đi qua `barrage.fire` nên ăn theo Đạo Vận.
   - **Ôn dưỡng** cấp 1→10 bằng Linh thạch: sát thương +15% mỗi cấp, số đạn / hồn / tia +1 mỗi 2 cấp.
   - **Thức tỉnh** dòng chỉ số random như trang bị, cộng vào chỉ số khi đang đeo.
3. ✅ **Cấm chế** (`data/build/cam-che.json`, `src/game/camche.js`):
   - Kỹ năng **Bố Cấm Chế** (từ Luyện Khí 5) đặt trận dưới mục tiêu. Tối đa 3 trận, mỗi trận 9–12 giây.
   - Loại trận theo hệ chủ đạo:
     - Kim: kiếm chém quái trong trận.
     - Ám: hút hồn, hồi máu cho mình.
     - Thủy: thủy lao giam quái.
     - Hỏa: thiêu đốt.
     - Mộc: dây leo trói quái, hồi máu khi mình đứng trong trận.
     - Thổ: chấn choáng.
   - Mỗi món cùng hệ đang mặc: +15% sát thương trận.
4. ✅ **Luyện hồn thú cưng**: thú nuốt hồn 1 con cùng loài đang nghỉ trong Kho thì +1★, tối đa 5★. Mỗi sao +35% công và khí huyết.
5. ✅ **Huyết Sát Bí Cảnh** (`data/build/bi-canh.json`, `src/game/bicanh.js`):
   - Mở ở Nhiệm vụ → tab Bí Cảnh, phải đứng ngoài thành, mỗi ngày 3 lượt.
   - Vòng cấm chế đỏ quanh chỗ đứng. 10 đợt quái tầng của mình ùa vào: đợt 5 có tinh anh, đợt 10 có boss, mỗi đợt 50 giây.
   - Thua khi chết, ra khỏi vòng hoặc hết giờ. Khi đang trong bí cảnh, Tự động chỉ đánh quái trong vòng.
   - Thưởng:
     - Mỗi đợt qua: Linh thạch + Vàng.
     - Qua đợt 3 / 6 / 9: được Thần Phù.
     - Qua hết: Phôi Pháp Bảo + cơ hội rơi đồ ngũ hành.
6. Chuyển kết quả có giá trị lên máy chủ (Mốc 3–4): máy chủ chỉ kiểm hợp lý, không mô phỏng từng khung hình.

## 48 món ảnh chủ dự án (23/10)
- `tools/icons_v2.py → grid_cut + ICON48`: 3 tấm 4×4 (`assets/items/_source/icon-48-*.webp`), không nhãn, ghép theo thứ tự danh sách.
  - Thay hình tạm: nguyên liệu Vùng Đen / Tím, Âm Hư Tinh Hạch, Anh Biến / Vấn Đỉnh / Trường Sinh / Tu Vi / Viên Mãn Đan, Thọ Nguyên Thảo, Bảo Hộ Phù, Phôi Pháp Bảo.
  - Thêm: 10 Thần Phù (`card.phu.*`), 13 pháp bảo (`pb.*`).
- **Vật phẩm mới** (`data/items/misc.json`, `src/game/consumables.js`):
  - Huyết Sát Lệnh: +1 lượt Bí Cảnh trong ngày.
  - Phù Chỉ Trống: vẽ ra 1 Thần Phù ngẫu nhiên.
  - Túi Vàng / Rương Linh Thạch / Rương Tiên Ngọc: mở ra tiền.
  - Ngũ Hành Linh Thạch: đổi hệ một phôi luyện đã thức tỉnh.
  - Hồn Tinh: 3 viên thay cho 1 con cùng loài khi luyện hồn. Thả thú về rừng được Hồn Tinh.
  - Ôn Dưỡng Linh Dịch: cần để ôn dưỡng pháp bảo từ cấp 4.
- **5 pháp bảo mới**:
  - Huyền Băng Kính: đóng băng quanh mình.
  - Phệ Hồn Cổ Đăng: rút hồn, hồi máu.
  - Thiên La Võng: kéo quái về một chỗ rồi trói.
  - Cửu Tiêu Lôi Tháp: dựng tháp giáng sét.
  - Phá Không Thoa: thoa xuyên qua mọi quái, nảy 8 lần.
- **Bán ở Vạn Bảo Lâu**: Phù Chỉ Trống, Linh Dịch, Huyết Sát Lệnh, Hồn Tinh (Linh thạch); Ngũ Hành Linh Thạch (Tiên ngọc).
- **Bí Cảnh thưởng thêm**: mỗi 3 đợt 1 món (Linh Dịch / Hồn Tinh / Túi Vàng). Qua hết được Rương Linh Thạch + Phù Chỉ Trống, 10% có Rương Tiên Ngọc.

## Cân bằng 23/10 (chủ dự án: max Hóa Thần trong 3 giờ, trang bị gần như vô dụng)
- **Dòng trang bị**: hp / def / linh giờ là **% chỉ số gốc theo cảnh giới**.
  - Dòng Đen cho 25–40% mỗi dòng; dòng Lục chỉ 1–2%.
  - 8 món × 10 dòng Đen làm tấn công tăng khoảng ×5–6. Đồ thường chỉ +30–60%.
  - Dòng cũ (số phẳng) tự đổi sang % theo đúng vị trí trong khoảng phẩm (`craft.migrateLines`, bảng cũ ở `awaken.json → line_ranges_v1`).
  - Tỷ lệ ra Đen giữ nguyên, 0,7–1,7% mỗi dòng, nên 10 dòng Đen gần như 0%.
- **Linh khí mỗi ngày** (`gameplay.json → daily_linh_khi`, `realm-gap.js → daily`):
  - Mỗi ngày (giờ Việt Nam) hạ quái chỉ nhận trọn tu vi tới một phần vạch tầng hiện tại: LK 3 vạch, TC 1,5, KĐ 1, NA 0,6, HT 0,35. Vượt mức thì chỉ nhận 10%.
  - Tu Vi Đan và Viên Mãn Đan không bị giới hạn.
  - Tối thiểu khoảng 22 ngày đánh quái mới lên Hóa Thần Hậu kỳ.
- **Đạn thêm của Đạo Vận** (bắn quạt) mạnh 40% viên chính (`dao-van.json → limits.extra_mul`).

## Kỹ năng lĩnh ngộ (23/10/2026)
- Kỹ năng chiến đấu chỉ có khi **hạ boss** (kể cả Âm Hư): 0,5%/lần lĩnh ngộ 1 kỹ năng chưa có — `gameplay.json → skill_drop.chance`.
- Mỗi đại cảnh giới **tặng 1 kỹ năng** (`skill_drop.realm_gift`): Luyện Khí Hỏa Cầu, Trúc Cơ Kiếm Khí, Kết Đan Thiên Hà, Nguyên Anh Nguyên Anh, Hóa Thần Hắc Động.
- Kỹ năng hệ thống (`skill_drop.free`) vẫn mở theo cảnh giới. Người chơi cũ giữ kỹ năng đã mở trước bản này (không phạt).
- Code: `src/game/skill-learn.js`; lưu `progress.state.learned` (máy khách, Mốc 4 lên máy chủ).
