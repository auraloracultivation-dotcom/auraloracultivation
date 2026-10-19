# 05 — Quy trình làm việc

## Vai trò
- **Chủ dự án**: quyết định hướng đi, duyệt Pull Request.
- **AI lập trình (Claude)**: đọc docs → làm trên nhánh riêng → mở Pull Request.
- **AI rà soát (GPT/Codex)**: đọc Pull Request, nhất là bảo mật, dữ liệu lưu, gameplay.
- **GitHub Actions**: tự kiểm tra mỗi Pull Request.

## Luật
1. Không ai đẩy thẳng vào `main`. Mỗi việc một nhánh `feat/...`, `fix/...`, `asset/...`.
2. Một Pull Request = một việc nhỏ, có mô tả: làm gì, kiểm tra thế nào, ảnh chụp nếu có hình.
3. **Claude được tự duyệt và tự gộp** Pull Request (quyết định của chủ dự án, 2026-10-20) khi:
   - kiểm tra tự động (GitHub Actions) xanh;
   - Claude đã tự rà lại thay đổi và ghi trong mô tả: làm gì, kiểm tra thế nào.
   **Phải hỏi chủ dự án trước khi gộp** nếu thay đổi:
   - đụng tới cơ sở dữ liệu thật (migration mới, xoá/sửa dữ liệu người chơi, RLS, quyền);
   - xoá tính năng hoặc nội dung đã có;
   - đổi kiến trúc, quy tắc ID, hoặc phạm vi mốc.
   Mỗi mốc vẫn kết thúc bằng việc chủ dự án thử thật trên điện thoại.
4. Đổi kiến trúc, đổi schema, đổi quy tắc ID → phải sửa docs trong cùng Pull Request.
5. Mỗi mốc kết thúc bằng bằng chứng kiểm thử (video/ảnh hai máy), không chỉ lời "đã xong".

## Lộ trình mốc
1. Hai người thấy nhau di chuyển, lưu vị trí. ← đang ở đây
2. Danh sách người chơi gần, tên, trạng thái online.
3. Quái và chiến đấu do máy chủ xác nhận.
4. Lưu tiến trình, túi đồ, trang bị.
5. Nhiều zone, chuyển bản đồ.
6. Đóng gói Android, thử 3–10 người.
