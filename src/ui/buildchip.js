// Nút "☯ Đạo Vận" nhỏ cạnh trái màn hình (dưới khung nhân vật): hiện bộ ngũ hành đang kích, chạm mở Cẩm nang (src/game/guide.js).
export function createBuildChip({ onOpen }) {
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'build-chip'; b.setAttribute('aria-label', 'Cẩm nang Đạo Vận');
  b.innerHTML = '<i>☯</i><span>Đạo Vận</span>';
  b.addEventListener('click', onOpen);
  document.getElementById('ui').appendChild(b);
  return { set(text, color) { b.querySelector('span').textContent = text; b.style.setProperty('--c', color); } };
}
