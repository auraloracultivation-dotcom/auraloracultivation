# Nhân vật

```
characters/
  _source/   Ảnh gốc chủ dự án gửi. Không sửa — để cắt lại khi cần.
  base/      Phần cơ bản dùng chung cho mọi trang phục.
```

`base/`:
- `ban-tay.tron` — bàn tay tròn code vẽ khi đi/đứng (mặc định).
- `ban-tay.nam`, `nam-chat`, `nam-nghieng`, `chi`, `mo` — 5 thế bàn tay GPT (không tay áo): nắm, nắm chặt, nắm nghiêng, duỗi/chỉ, mở tay phép thuật. Tay nắm (`nam`) vẽ là tay TRÁI, tay phải = lật gương. Thế đánh (`chi`, `mo`, `nam-chat`, `nam-nghieng`) vẽ chiều ngược lại. Khi đánh, tay phía sau mở ra: chém phải → tay trái, chém trái → tay phải.
- `ban-tay.tung-chieu` — bàn tay xoè khi tung chiêu (mặc định khi đánh).
- `than-tran`, `toc.sau`, `toc.nghieng` — nhân vật trần và tóc tách lớp (dự phòng cho hệ tóc riêng).

Mẫu "tân thủ" (chưa lên trang bị) nằm ở `assets/equipment/trang-phuc/art.outfit.tan-thu.*`.
Cách ghép và chuyển động: `docs/06-TRANG-BI.md`.
