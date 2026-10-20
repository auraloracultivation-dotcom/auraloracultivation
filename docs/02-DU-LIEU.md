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

## Bản đồ (từ 2026-10-20)
- Mỗi khu có `data/zones/<id>.json` (thông số) và `data/zones/<id>.map.png` (ảnh bản đồ: **mỗi điểm ảnh = 1 ô**).
- Màu điểm ảnh ↔ loại địa hình nằm ở `data/terrain.json` (đi được, tốc độ, cấp quái `tier`, ô dùng để vẽ).
- Ô đất **giữ viền đen** và vẽ nhỏ: mỗi ô bản đồ (32 điểm) chia 2×2 ô đất 16 điểm (`grid: 2` trong `terrain.json`); nước 1 ô liền, không viền.
- Ô vẽ lấy từ atlas `assets/tiles/atlas.webp`, chỉ mục ở `data/tiles.json` (sinh bằng `tools/tiles_atlas.py`).
- Bản đồ sinh bằng `tools/gen_map.py`; cũng có thể **sửa tay bằng app vẽ** — chỉ cần tô đúng màu trong `terrain.json`.
- Bản đồ vòng lặp: kích thước thế giới (`data/config.json` → `world`) phải khớp hằng `c_world` trong hàm SQL `save_position`.
