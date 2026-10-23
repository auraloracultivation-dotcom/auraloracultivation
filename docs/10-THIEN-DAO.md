# 10 — Ngũ Thiên Đạo Cảnh (hệ tu luyện riêng, 24/10/2026)

Chủ dự án 24/10/2026: game theo hướng **My Heroes bản tu tiên** — tới trần nhanh (~1 tuần), sau đó mạnh thêm bằng **trang bị**.
Không dùng hệ cảnh giới của truyện cho người chơi nữa.

## Cảnh giới người chơi: 60 cấp
| Cảnh giới | Cấp | Bậc quái tương ứng (mở khoá nội dung, bí cảnh, áp chế) |
|---|---|---|
| Khai Linh | 1–10 | Luyện Khí tầng 1–10 |
| Ngưng Mạch | 11–20 | Trúc Cơ (11–13 Sơ, 14–16 Trung, 17–20 Hậu) |
| Tụ Tinh | 21–30 | Kết Đan |
| Hóa Nguyệt | 31–40 | Nguyên Anh |
| Phá Nhật | 41–50 | Hóa Thần |
| Hợp Đạo | 51–60 | Anh Biến — **TRẦN**, không mở thêm cấp; mạnh thêm bằng trang bị |

- Mã cấp: `lv1` … `lv60` (`data/gameplay.json → player.stages`). Mỗi cấp có `major` (0–5), `tier` (bậc quái tương ứng), chỉ số gốc, `exp_need`.
- Dữ liệu cũ mở khoá bằng mã bậc cũ (`tc_so`, `kd_so`…) vẫn dùng được: `progress.stageIndex('tc_so')` = cấp đầu tiên có bậc đó
  (`player.tier_first`). Tên hiển thị: `progress.stageName(id)`.
- Đột phá ở cấp 10/20/30/40/50 cần đan (Ngưng Mạch Đan, Tụ Tinh Đan, Hóa Nguyệt Đan, Phá Nhật Đan, Hợp Đạo Đan — ID giữ nguyên
  `item.dan.truc-co.001`…); tỷ lệ 90/80/70/60/50%, thất bại mất một phần tu vi, không thụt cảnh giới.
- `data/realms.json`: `name` = tên cảnh giới người chơi; `monster_name` = tên bậc quái cũ. Quái **giữ** tên bậc Luyện Khí … Âm Hư.

## Chỉ số: trang bị quyết định
- Chỉ số gốc tăng đều ×40 cả 60 cấp (trước ×20.000). Dòng trang bị vẫn là % chỉ số gốc (Đen 25–40%/dòng): đồ tốt (×3–5)
  thắng được người cao hơn một cảnh giới mặc đồ thường.
- Quái tính theo "người chơi chuẩn" ở cấp tương ứng có hệ số trang bị 1 → 2,6 (bộ Đạo Tâm nhận dần). Kiểm tra (người chuẩn):
  hạ quái thường 3–10 đòn, chịu 10–24 đòn. Vùng Tím (Vấn Đỉnh) và Âm Hư cần đồ trên chuẩn.
- Luật cứng giữ: quái mạnh nhất vùng trước ≤ quái thường yếu nhất Sơ kỳ vùng sau (tool tự nâng, check_refs kiểm).
- Áp chế nới: quá 3 bậc mới giảm sát thương ×0,7/bậc. Luật "cảnh giới cao" Anh Biến tắt (Hợp Đạo lên như mọi cảnh giới).
- ~7 ngày lên cấp 60: ~5.300 quái + nhiệm vụ; linh khí ngày ≈ 14/9/7/6/5/4 cấp mỗi ngày theo cảnh giới.

## Sinh số liệu
`python3 -I tools/gen_thien_dao.py` — ghi player.stages, stage_stats quái, giới hạn ngày, tỷ lệ đột phá, thọ nguyên theo cấp.
`tools/gen_balance.py` (bảng cũ) không chạy nữa.

## Bản lưu cũ
`progress.js` VERSION 2: bản 1 (25 bậc) tự đổi khi tải — bậc cũ → cấp cuối khoảng tương ứng (Hóa Thần Hậu kỳ → Phá Nhật tầng 10),
tu vi về 0, đồ / tiền giữ nguyên, thú cưng đổi công theo tỷ lệ bảng quái mới (`gameplay.json → migrate_v2`). Chủ dự án: chỉ tặng, không trừ.

## Con đường Đạo Tâm (chuỗi nhiệm vụ chính, 24/10/2026)

- Dữ liệu: `data/quests/dao-tam.json` — 6 chương, ~63 bước, 6 NPC đặt cạnh công trình trong thành. Code: `src/game/daotam.js`.
- Người chơi chọn 1 hệ (một lần, không đổi). Phần thưởng dọc đường tặng đủ 12 món Đạo Vận cùng hệ:
  8 trang bị + 2 kỹ năng (sịn, cùi) + 1 thần phù + 1 pháp bảo → chạm Thiên Cơ Hợp Nhất. Mỗi nhân vật chỉ nhận 1 bộ.
- Kiểu mục tiêu: talk, choose_he, level, kill, gather, obtain, use, wear, awaken, skill, card, pb, station, hopnhat.
- Bước "thức tỉnh N dòng": nếu món chạm giới hạn ẩn trước N dòng thì cũng tính xong (không bao giờ kẹt).
- Tự làm nhiệm vụ (`src/game/questauto.js`, nút "Tự nhiệm vụ") tách hẳn khỏi Tự farm (`autoplay.js`):
  tự đi tới NPC / trận nhãn, tự chạy hội thoại, tự farm đúng vùng, tự mặc / thức tỉnh / mua / uống đan / đột phá.
  Chọn hệ thì chờ người chơi. Kéo cần điều khiển hoặc bật Tự farm = tắt.
- Nhiệm vụ cũ kiểu main / explore / craft / combat / long được cho nghỉ (`quests.json → retired_types`).
