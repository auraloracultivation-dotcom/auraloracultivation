# Kho ảnh GPT (nhánh `kho-anh-gpt`)

Chỗ **chờ** để GPT (hoặc chủ dự án) đẩy ảnh mới lên. Claude sẽ vào đây lấy ảnh, cắt nền, chuyển sang đúng thư mục trong `assets/`
và gắn vào game qua Pull Request riêng. Game **không** đọc trực tiếp thư mục này.

## Luật cho người / AI đẩy ảnh
1. Chỉ đẩy vào nhánh **`kho-anh-gpt`**, chỉ thêm file trong **`assets/_gpt/`**. Không sửa file khác, không đẩy vào `main`.
2. Tên file = **mã** trong Đồ giám (nút sách trong game, hoặc tab "📖 Đồ giám (GPT)" của Lab v3.3, hoặc `CAN-ANH.md` ở đây).
   Ví dụ: `monster.xanh.yeu-ho.001.png`, `skill.kiem-khi.png`, `item.thao.thanh-tam.001.png`.
3. Bỏ vào thư mục con theo nhóm: `thao/` `dan/` `phuong/` `congphap/` `kynang/` `quaiskill/` `quai/` `trangbi/` `phoi/` `npc/` `khac/`.
4. Một tấm lưới nhiều món: đặt tên `luoi-<mô-tả>.png` và thêm file `luoi-<mô-tả>.txt` ghi thứ tự từng ô theo hàng
   (vd. `hàng 1: item.weapon.he.1, item.weapon.he.2, …`).
5. **PNG nền trong suốt là tốt nhất.** Không làm được thì nền hồng #FF00FF; nền chuyển sắc / không thuần / màu khác **vẫn cứ đẩy lên** —
   Claude sẽ tự tách nền. Đừng bỏ ảnh chỉ vì nền chưa chuẩn. Không chữ, không khung, không watermark.
6. Ảnh gốc giữ nguyên, không nén mất chi tiết; ảnh bản mới thì đặt tên thêm `-v2`, `-v3` (không ghi đè bản cũ).

## Phong cách chung
- Game tu tiên / tiên hiệp 2D trên điện thoại (màn dọc): linh khí, phù văn, ngọc, mây, kiếm khí, màu ngũ hành.
- Pixel art độ phân giải cao, viền tối rõ, màu rực, khối sáng tối rõ — nhỏ trên điện thoại vẫn đọc được.
- Nhân vật / trang phục kiểu chibi "My Heroes": nhìn chính diện, đầu to, thân tròn.
- Sprite sheet: các khung cùng cỡ, thẳng hàng, nhân vật cùng vị trí (chân chạm cùng đường đáy), các khung khác nhau thật.

## Luật trang bị (theo docs/06-TRANG-BI.md)
- **Trang phục**: chibi chính diện (đầu + thân, gồm tóc), KHÔNG vẽ tay, KHÔNG vẽ chân (game tự vẽ).
- **Vũ khí**: MỘT món, mũi chĩa lên, nghiêng ~40°, chuôi ở dưới; dài, to (vác sau lưng, còn làm phi kiếm).
- **Cánh**: nhìn chính diện, đối xứng, đáy ở giữa dưới.
- **Pháp tướng**: hư ảnh thần linh khổng lồ, hơi trong suốt phát sáng, đáy ở giữa dưới.
- **Mặt nạ**: 2 bản — chính diện đúng cỡ mặt không hiệu ứng (để đeo) + bản có hiệu ứng làm icon.
- **Nhẫn, Dây chuyền**: icon. **Linh thú**: sprite sheet đứng / đi / đánh nhìn sang phải + 1 icon.

Danh sách món cần ảnh + quy cách từng nhóm: [`CAN-ANH.md`](CAN-ANH.md).
