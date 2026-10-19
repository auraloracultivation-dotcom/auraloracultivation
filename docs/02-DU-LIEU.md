# 02 — Dữ liệu: một nguồn sự thật duy nhất

## Hai loại dữ liệu, không trộn lẫn
1. **Định nghĩa nội dung** (vật phẩm, quái, skill, zone): nằm trong `data/*.json` của repo. Ví dụ: kiếm cấp Lục có công bao nhiêu.
2. **Trạng thái người chơi** (nhân vật, túi đồ, vị trí): nằm trong cơ sở dữ liệu Supabase. Ví dụ: người A đang cầm kiếm nào.

Trạng thái người chơi chỉ lưu **ID**, không lưu lại chỉ số. Chỉ số luôn tra từ định nghĩa.

## Quy tắc mã ID
`<loại>.<nhóm>.<cấp>.<số>` — chữ thường, không dấu, không đổi sau khi đã phát hành.

| Loại | Ví dụ |
|---|---|
| Vật phẩm | `item.sword.luc.001` |
| Quái | `monster.forest.wolf.001` |
| Skill | `skill.sword.basic.001` |
| Zone | `zone.start`, `zone.forest.01` |

Cấp độ hiếm (không phải màu): `luc, lam, tim, vang, cam, do, nau, den`, sau đó `nhisac, tamsac, tusac`.

## Quy tắc
- Không viết số chỉ số (công, máu, tốc độ…) thẳng trong code `src/`. Đọc từ `data/`.
- Hằng số chung (tốc độ tối đa, kích thước ô…) nằm trong `data/config.json`. Nếu máy chủ cũng cần (ví dụ `max_speed`), phải ghi chú tên hàm SQL dùng nó để sửa cả hai.
- Xoá một mục: đánh dấu `"deprecated": true`, không xoá ID khỏi file khi đã có người chơi giữ nó.
