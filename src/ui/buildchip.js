// Nút Đạo Vận: hiện bộ ngũ hành đang kích, chạm mở Cẩm nang (src/game/guide.js).
// HUD v3 (chủ dự án 23/10/2026): nằm ở hàng nút tròn góc phải, thay chỗ nút Túi — [data-r="dv"] do src/ui/hud.js dựng.
// Không có HUD v3 thì tự tạo nút nhỏ cạnh trái màn hình như cũ.
export function createBuildChip({ onOpen }) {
  const slot = document.querySelector('.h3-round [data-r="dv"]');
  if (slot) {
    slot._open = onOpen;
    const label = slot.querySelector('span');
    return { set(text, color) { label.textContent = text; slot.style.setProperty('--c', color); slot.setAttribute('aria-label', `Đạo Vận: ${text}`); } };
  }
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'build-chip'; b.setAttribute('aria-label', 'Cẩm nang Đạo Vận');
  b.innerHTML = '<i>☯</i><span>Đạo Vận</span>';
  b.addEventListener('click', onOpen);
  document.getElementById('ui').appendChild(b);
  return { set(text, color) { b.querySelector('span').textContent = text; b.style.setProperty('--c', color); } };
}
