# 06 — Nhân vật và trang bị (kiểu My Heroes)

Chốt qua bản thử chuyển động ngày 2026-10-20. Thông số số học nằm ở `data/character_rig.json`, không viết cứng trong code.

## Ghép nhân vật — các lớp từ sau ra trước
| Lớp | Nguồn | Ghi chú |
|---|---|---|
| Pháp tướng | `phap-tuong` | to ~2,4 lần người, đáy ở chân. Chưa chốt thuộc ô nào |
| Cánh | ô **Cánh** | hào quang/cánh sau lưng, đáy ở chân |
| Vũ khí | ô **Vũ khí** | ~2,3 lần chiều cao người; chuôi ở hông sau, mũi chĩa lên, ngả 40° ra sau |
| Chân | code | 2 ô vuông nhỏ, bước so le |
| Thân | ô **Trang phục** (phần dưới cổ) | nhún trước |
| Tay | code + `assets/characters/base/ban-tay.*` | **chốt**: bàn tay GPT cỡ 0,45 (0,09 bề ngang áo), tay nắm xoay −36°, tay xoè xoay 7°; đặt đúng chỗ tay cũ (`hands`), vẽ trước áo |
| Đầu | ô **Trang phục** (phần trên cổ, cắt dư xuống để che khe) | nhún theo sau thân nửa nhịp |
| Mặt nạ | ô **Mặt nạ** | đè lên mặt |

Nhẫn, Dây chuyền, Pháp bảo, Linh thú: không vẽ lên người (chỉ icon + chỉ số; linh thú đi bên cạnh).
Danh sách 8 ô và thứ tự trên bảng Nhân vật: `data/equipment/slots.json`.

## Chuyển động
- **Đi**: thân nhún thấp, đầu theo sau nửa nhịp; chân bước so le; tay đánh ngược nhịp chân.
- **Chém**: thân nhún sâu, kiếm xoay **nửa vòng quanh chuôi**, luôn nằm **sau** người; tay phía trước (cùng hướng chém) vươn nhẹ, phóng to rồi **xoè tung chiêu** (`ban-tay.tung-chieu`), không quầng sáng.
- **Bàn tay**: thở to nhỏ khi đứng, to theo nhịp bước khi đi. Tay xoè luôn hướng ra ngoài thân.
- **Phi hành = ngự kiếm**: kiếm nằm ngang dưới chân, chuôi sau mũi trước; nhanh gấp 1,5 đi bộ.

## Hình (art) và vật phẩm (item) tách riêng
- `data/equipment/art.json` — chỉ mục mọi hình: `id` (vd `art.mask.012`), file, kích thước, điểm neo.
  Sinh tự động, **không sửa tay**; sửa tay đặt ở `data/equipment/overrides.json` (vd vũ khí ngược đầu: `"flip": true`).
- Vật phẩm (`data/items/…`, mã `item.<nhóm>.<cấp>.<số>`) mang chỉ số, cấp, tên và trỏ tới hình:
  ```json
  { "id": "item.mask.lam.001", "slot": "mat-na", "art": "art.mask.012", "name": "Hồ Diện", "tier": "lam", "stats": {} }
  ```
  Đổi hình một món chỉ cần đổi `art`; người chơi lưu ID vật phẩm nên không ảnh hưởng dữ liệu lưu.

## Quy trình thêm hình mới
1. Ảnh GPT (nền hồng #FF00FF, các món tách rời, xếp lưới đều) chép vào `assets/<…>/_source/`.
2. Thêm một dòng `sheet_grid.py` vào `tools/equipment_build.sh` (lưới cột×hàng, tiền tố mã, kiểu neo).
3. Chạy `./tools/equipment_build.sh` → cắt, khử viền hồng, xoá tay/chân vẽ sẵn của trang phục, đổi sang WebP, sinh `art.json`.
4. Mở bản thử "Tủ Đồ Tu Chân" để soát; món nào lệch thì thêm vào `overrides.json`.

## Yêu cầu khi nhờ GPT vẽ (để cắt sạch, khỏi sửa)
- Mỗi món **một mình**, không dính món khác; khoảng trống hồng giữa các món.
- Trang phục: nhìn chính diện, **không vẽ tay, không vẽ chân** (hoặc tay tròn tách rời thân).
- Vũ khí: **một** vũ khí/ô (không bắt chéo hai món), mũi chĩa lên, cùng một chiều nghiêng cho cả bảng.
- Mặt nạ: thêm bản **nhìn chính diện, đúng cỡ mặt, không hiệu ứng** để đeo; bản có hiệu ứng dùng làm icon.

## Còn mở
- Pháp tướng thuộc ô nào hay là kỹ năng bật lên.
- Tóc/miện: kiểu tóc chọn lúc tạo nhân vật hay thuộc ô Mặt nạ (hiện tóc nằm sẵn trong hình trang phục).
- Bảng vũ khí hàng 3 là đôi vũ khí bắt chéo (`pair`), nên vẽ lại thành từng món.
