# 04 — Quy chuẩn asset

## Phân vai (quyết định 2026-10-20)
- **Thiết kế và nội dung hình ảnh: chủ dự án.** Claude không tự vẽ đồ hoạ; chỉ tách nền, cắt, nén, ghép vào game và làm hiệu ứng nhẹ (phát sáng, mờ dần, ánh chạy).
- **Ưu tiên màn hình dọc** (quyết định 2026-10-20); ngang vẫn hỗ trợ. Mọi bảng mới phải kiểm tra trên 390×844 trước.
- Sửa nhẹ hình theo yêu cầu chủ dự án được phép (ví dụ đã xoá hình bóng người giữa `frames/bang-nhan-vat.png`); ảnh gốc giữ nguyên trong `_source/`.
- Giao diện: **khung tím–vàng** (tấm 1–4) kết hợp **icon đen–vàng** (tấm 5).

## Quy trình đưa tấm UI vào game
1. Ảnh gốc (nền hồng #FA03FB hoặc nền đen) lưu vào `assets/ui/_source/` — không sửa, để cắt lại khi cần.
2. Chạy `python3 -I tools/ui_slice.py <ảnh> assets/ui/pieces/<tên-tấm> --bg magenta|black`
   → mỗi mảnh liền một file PNG trong suốt, đánh số theo hàng, nén bảng màu 128 màu, kèm `manifest.json` (toạ độ gốc).
3. Mảnh nào dùng trong game thì **chép sang tên có nghĩa**: `assets/ui/frames/`, `assets/ui/icons/`. Code chỉ dùng tên có nghĩa, không dùng số.
4. Ảnh nền màn hình (vẽ sẵn ô nhập, nút) lưu `.webp` trong `assets/ui/bg/`. Code đặt ô nhập/nút thật đè đúng toạ độ đã vẽ (`src/ui/stage.js`).

## Phong cách (quyết định 2026-10-20, thay quy tắc cũ 3/4 – 24×32)
- Nhân vật kiểu **My Heroes: Dungeon Raid**: nhìn **chính diện**, đầu to + thân tròn, **không vẽ tay/chân trong hình**
  (code vẽ 2 ô chân và 2 bàn tay), vũ khí to vác sau lưng. Đổi hướng = lật gương.
- Mỗi món chỉ cần **1 hình tĩnh**; mọi chuyển động (nhún, chém xoay kiếm, ngự kiếm) là code — xem `docs/06-TRANG-BI.md`.
- Thú cưỡi bỏ; linh thú chỉ đi theo hỗ trợ đánh.

## Kích thước và điểm neo
Hình trang bị không cần khung cố định: game co theo chiều cao nhân vật. Điểm neo ghi trong `data/equipment/art.json`.
| Loại | Điểm neo |
|---|---|
| Trang phục (đầu + thân) | giữa gấu áo (`hem`) — đáy thân, chân code vẽ bên dưới |
| Vũ khí | chuôi (điểm cầm) + góc lưỡi `angle` |
| Cánh, pháp tướng | giữa đáy, đặt ở chân nhân vật |
| Mặt nạ | tâm hình, đặt lên mặt |
| Ô bản đồ | 16×16, góc trên trái |

## Đặt tên file
Hình: `assets/equipment/<ô>/art.<loại>.<số>.webp` (mã hình, không phải mã vật phẩm). Vật phẩm `item.*` trỏ tới mã hình,
nên nhiều vật phẩm (cấp khác nhau) dùng chung một hình được.

## Hoạt ảnh
- Sprite sheet theo hàng: hàng = hướng/hành động, cột = frame.
- Các frame phải thực sự khác nhau; không cắt một ảnh tĩnh thành frame giả.
- Icon phải khớp đúng hình trang bị khi mặc lên người.

## Âm thanh (từ 21/10/2026)
- File gốc chủ dự án gửi (WAV) giữ ở `assets/audio/_source/`; bản dùng trong game ở `assets/audio/`:
  nhạc nền → MP3 (nhẹ), tiếng dài → MP3, tiếng rất ngắn (≤0,2 giây) → WAV 16-bit (MP3 thêm khoảng lặng đầu, lệch nhịp chém).
- Đăng ký id + âm lượng trong `data/audio.json`; code chỉ gọi id (`sfx.kiem.chem`, `sfx.phaptuong.hoahinh`, `bgm.tuchan`).
- Tiếng chỉ phát sau lần chạm đầu tiên (luật trình duyệt điện thoại). Bật/tắt trong Cài đặt → Âm thanh / Nhạc nền.

## Nguồn
Ghi tác giả và giấy phép của asset tải ngoài vào `assets/CREDITS.md`.

## HUD v3 (23/10/2026)
Ảnh GPT chủ dự án chọn: `assets/ui/_source/hud-v3-gpt.png`. Cắt lại bằng `python3 -I tools/hud_v3_slice.py`
(xoá chữ / số vẽ sẵn ở chỗ game tự ghi) → `assets/ui/frames/hud-*.png` (khung) và `assets/ui/icons/hud-*.png` (nút).
Bố cục: `src/ui/hud.js` + `src/ui/hud.css`, khung chat `src/ui/hud-chat.js`, khung nhiệm vụ `src/ui/hud-quest.js`,
vị trí nút kỹ năng `src/game/hud-actions.js`.

## Xoá kho hình tạm (23/10/2026, chủ dự án yêu cầu)
Đã xoá 164 hình trang bị tạm cũ (`art.outfit/weapon/wing/avatar.NNN`, trông giống đồ NPC). Chỉ còn hình **6 bộ ngũ hành**
(8 món mỗi hệ) (đồ tân thủ cũng là 1 món của 6 bộ — hình tân thủ riêng đã xoá). Đồ luyện từ phôi giờ lấy hình bộ đúng hệ của phôi (`src/game/forged-art.js`);
đồ phôi cũ mang hình đã xoá tự bốc lại hình bộ ngũ hành khi vào game.

## Trận nhãn các vùng (23/10/2026 17h)
Hai tấm GPT chủ dự án gửi: `assets/town/_source/tran-phap-gpt.png` (12 trận pháp) và `assets/town/_source/kien-truc-2-gpt.png`
(18 điện / nhà / tháp). Cắt bằng `python3 -I tools/station_slice.py` → `assets/town/tp-*.png`, `assets/town/nha-*.png`,
kích thước ghi ở `data/art/stations-art.json` (gộp vào props khi dựng bản đồ). Mỗi vùng 1 trận nhãn ở
`data/zones/zone.start.json → town.stations` (trận pháp + 1 nhà + 2 NPC canh giữ trong `data/npcs.json`, `guard`).
Các hình chưa dùng (điện lớn, tháp, chợ…) để dành cho tông môn / thị trấn sau này.

## 6 Thiên hệ (23/10/2026 21h)
Quang · Lôi · Băng · Phong · Hư · Thời, mỗi hệ 8 món. Nguồn + kết quả chủ dự án xếp trên Tủ Đồ Tu Chân:
`assets/equipment/_source/thien-he/` (hình đã cắt, `meta.json`, `presets.json`, 2 tấm gốc). Chạy `python3 -I tools/equip_thien_he.py`
→ hình `art.<loại>.he.7–12` (linh thú `art.pet.he.13–18`), bộ he.7–12 trong `data/equipment/he6.json`, 48 món trong
`data/items/items.json` (`thien: true`), Đạo Vận / Hợp Nhất trong `data/build/dao-van.json` (soi số theo hệ ngũ hành song sinh).
Đồ Thiên hệ chỉ rơi từ Âm Hư; phôi luyện vẫn chỉ ra hình ngũ hành.

## Hình mới 6 pháp bảo Thiên hệ (24/10/2026 01h)
5 tấm hoạt ảnh pháp bảo chủ dự án gửi (nền hồng): Kim Luân (Quang), Lôi Kỳ (Lôi), Lưu Ly Trản (Băng), Phong Ấn Phiến (Phong),
Sa Lậu (Thời) — gốc ở `assets/effects/_source/phap-bao-thien/`. Hư Không Bàn chưa có tấm: tạm dùng chén băng đổi màu tím (`hu-tam.webp`);
có tấm thật thì thay file này rồi chạy lại tool. Cắt bằng `python3 -I tools/thien_phap_bao.py` → `assets/effects/thien/tp.<hệ>.*.webp`
(chỉ mục `data/art/sprites.json → fx`, có `glow` để tự cộng sáng) + icon `assets/ui/skills/pb-tp-<hệ>.png`.
Chiêu mới (kind `t_*`): `src/game/treasure-thien.js`; quầng sáng dùng chung `src/game/glow.js` (gradient vẽ sẵn, không `shadowBlur`).
Vẫn chỉ nhận từ Thiên Cơ Truyền Thừa (1 lượt/ngày), không ra từ phôi.
