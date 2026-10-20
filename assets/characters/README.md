# Nhân vật

```
characters/
  _source/   Ảnh gốc chủ dự án gửi (nền hồng #FA03FB hoặc đen). KHÔNG sửa — để cắt lại khi cần.
  base/      Nhân vật trần đã tách nền, cắt khung, dùng trong game.
```

## Luật
- Nhân vật trần là **gốc cố định**: mọi trang bị chồng lên trên; tháo đồ phải lộ lại đúng nhân vật này, không vẽ lại.
- Kích thước nhân vật trên màn hình **không đổi** khi mặc đồ.
- Góc nhìn 3/4 (chéo), hướng phải là bản gốc; hướng trái = lật gương.
- Hoạt ảnh: sprite sheet, hàng = hành động, cột = khung. Khung phải thật sự khác nhau.
- Khung chuẩn và điểm neo: xem `docs/04-ASSET.md`.

## Tên file
`base.<hanh-dong>.png` — ví dụ `base.idle.png`, `base.walk.png`, `base.attack.png`, `base.hurt.png`.
Kèm `base.json` mô tả số khung, cỡ khung, điểm neo chân, vạch yên.
