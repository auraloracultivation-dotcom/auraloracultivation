# Trang bị

Mỗi ô trang bị một thư mục. Ảnh gốc của chủ dự án để chung ở `_source/` (không sửa).

```
equipment/
  _source/     Ảnh gốc (bảng mảnh GPT, nền hồng #FA03FB). Giữ nguyên.
  mu/          Mũ / mặt nạ / tóc — vẽ trên khung đầu, giữ mắt nhìn thấy (trừ mặt nạ kín).
  giap/        Giáp = cả bộ trang phục: thân + 2 tay áo + quần.
  hai/         Hài — chỉ phần đế dưới gót mỗi chân.
  vu-khi/      Kiếm, trượng… (chuôi giấu trong nắm tay).
  nhan/        Nhẫn — chỉ icon, không vẽ lên người.
  linh-quang/  Vầng sáng sau lưng, to bằng nhân vật.
```

## Luật
- Lớp rời chồng đúng khung nhân vật trần (`assets/characters/base/`), cùng mật độ pixel, cùng điểm neo.
- Không làm nhân vật to/nhỏ đi; đồ không to quá thân.
- Icon túi đồ phải khớp đúng hình khi mặc.

## Tên file (trùng ID dữ liệu)
`<ô>/<id>.png` (lớp mặc) + `<ô>/<id>.icon.png` (icon túi).
Ví dụ: `giap/item.armor.tu-dien.001.png`, `giap/item.armor.tu-dien.001.icon.png`.
ID đã phát hành KHÔNG BAO GIỜ đổi.
