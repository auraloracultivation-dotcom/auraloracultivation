// Bấm nút tin cậy khi đa chạm: trên iPhone, sự kiện "click" thường KHÔNG được phát nếu một ngón khác
// đang giữ màn hình (ví dụ tay trái đang giữ cần điều khiển). Ở đây bắt pointerup trên nút trong #ui
// rồi tự gọi click(); click thật đến sau (nếu có) thì bỏ qua để không bấm hai lần.
const MOVE_TOL = 14;

export function enableFastTap(root = document.getElementById('ui')) {
  const downs = new Map();
  let suppressUntil = 0, suppressEl = null;

  root.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('button, [data-tap]');
    if (!el || !root.contains(el) || el.disabled) return;
    downs.set(e.pointerId, { el, x: e.clientX, y: e.clientY });
  }, true);

  const finish = (e) => {
    const d = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    if (!d || e.type !== 'pointerup') return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > MOVE_TOL) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    if (!under || !d.el.contains(under)) return;
    if (e.pointerType === 'mouse') return; // chuột: click thật luôn đến, không cần
    suppressEl = d.el;
    suppressUntil = performance.now() + 500;
    d.el.click();
  };
  root.addEventListener('pointerup', finish, true);
  root.addEventListener('pointercancel', finish, true);

  root.addEventListener('click', (e) => {
    if (e.isTrusted && suppressEl && performance.now() < suppressUntil && suppressEl.contains(e.target)) {
      e.stopImmediatePropagation();
      e.preventDefault();
      suppressEl = null;
    }
  }, true);
}
