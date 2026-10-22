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
2. Pháp bảo: ô riêng, luyện từ phôi, thức tỉnh random, có chiêu kích hoạt, ôn dưỡng lên cấp.
3. Cấm chế và trận pháp: đặt bẫy trên đất, phong ấn.
4. Hồn phiên: luyện hồn quái thu phục để thú cưng mạnh hơn.
5. Chuyển kết quả có giá trị lên máy chủ (Mốc 3–4): máy chủ chỉ kiểm hợp lý, không mô phỏng từng khung hình.
