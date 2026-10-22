// Bảng TỌA HÓA (chủ dự án 23/10/2026): tuổi chạm thọ nguyên tối đa → nhân vật chết hẳn.
// Không đóng được; chỉ một nút Chuyển thế (main.js xoá tiến trình + Kho rồi tải lại, bắt đầu lại từ Luyện Khí tầng 1).
import { escapeHtml } from './screens.js';

export function showToaHoa({ name, realm, age, max, lived, onRebirth }) {
  const wrap = document.createElement('div');
  wrap.className = 'toahoa-wrap';
  wrap.innerHTML = `<div class="toahoa" role="alertdialog" aria-label="Tọa hóa">
    <b>Thọ nguyên đã tận</b>
    <p class="th-name">${escapeHtml(name)} tọa hóa</p>
    <p>Cảnh giới cuối: <b>${escapeHtml(realm)}</b></p>
    <p>Hưởng thọ <b>${age}</b> năm (thọ nguyên tối đa ${max}) · tu hành ${lived} ngày</p>
    <p class="th-note">Tu vi, đan dược, nguyên liệu, tiền và Kho đồ đều tan theo thân xác. Chuyển thế để bắt đầu lại từ Luyện Khí tầng 1.</p>
    <button type="button" class="bag-act">Chuyển thế</button>
  </div>`;
  document.body.appendChild(wrap);
  const b = wrap.querySelector('button');
  b.addEventListener('click', async () => { b.disabled = true; b.textContent = 'Đang chuyển thế…'; await onRebirth(); });
}
