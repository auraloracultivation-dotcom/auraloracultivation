// Máy yếu (chủ dự án 23/10/2026: Oppo A3s 2–3 GB RAM, Snapdragon 450 bị giật, đứng hình).
// Chế độ nhẹ: vẽ canvas ở mật độ 1× (ảnh pixel vẫn nét vì phóng nguyên lần) và giới hạn 30 khung/giây.
// Tự bật khi trình duyệt báo RAM ≤ 3 GB (chỉ Chrome Android báo; iPhone không bị ảnh hưởng). Ép bằng link: ?nhe (bật) / ?manh (tắt) — nhớ cho lần sau.
const KEY = 'tc.low';
function detect() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('nhe')) localStorage.setItem(KEY, '1');
    if (q.has('manh')) localStorage.setItem(KEY, '0');
    const saved = localStorage.getItem(KEY);
    if (saved) return saved === '1';
  } catch { /* trình duyệt chặn lưu: chỉ tự đoán */ }
  const mem = navigator.deviceMemory;
  return !!(mem && mem <= 3);
}
export const lowEnd = detect();
