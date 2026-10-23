// Bảng CÀI ĐẶT (chủ dự án 23/10/2026, theo mẫu giao diện gửi kèm): mỗi dòng một ô icon + nội dung.
//   Âm thanh / Nhạc nền: thanh trượt âm lượng + nút Bật/Tắt · Ngôn ngữ · Nhập mã quà tặng · Bị kẹt? Về thành · Đăng xuất.
// Lưu trên máy (localStorage 'tc.settings'): { sound, music, soundVol, musicVol, lang }. Âm thanh áp dụng ngay qua onChange.
import { el } from './stage.js';
import { toast } from './screens.js';

const KEY = 'tc.settings';
const ICON = (n) => `assets/ui/icons/${n}.png`;
const DEF = { sound: true, music: true, soundVol: 0.8, musicVol: 0.7, lang: 'vi' };

export function loadSettings() {
  try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEF }; }
}
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* trình duyệt chặn lưu: bỏ qua */ } }

export function showSettings({ onLogout, onRedeem, onChange, onRecall }) {
  const s = loadSettings();
  const wrap = el('<div class="overlay modal-wrap set2-wrap"></div>');
  const box = el(`<div class="set2" role="dialog" aria-label="Cài đặt">
    <div class="set2-title"><b>CÀI ĐẶT</b></div>
    <button type="button" class="set2-x" aria-label="Đóng">✕</button>
    <div class="set2-rows">
      ${['sound', 'music'].map((k) => `<div class="set2-row">
        <img class="set2-ic" src="${ICON(k === 'sound' ? 'am-thanh' : 'nhac-nen')}" alt="">
        <div class="set2-body"><span>${k === 'sound' ? 'Âm thanh' : 'Nhạc nền'}</span>
          <input type="range" min="0" max="100" step="5" data-vol="${k}" aria-label="Âm lượng ${k === 'sound' ? 'âm thanh' : 'nhạc nền'}"></div>
        <button type="button" class="set2-tog" data-tog="${k}"></button></div>`).join('')}
      <div class="set2-row"><img class="set2-ic" src="${ICON('ngon-ngu')}" alt="">
        <div class="set2-body"><span>Ngôn ngữ</span></div>
        <button type="button" class="set2-sel" data-lang>VI <i>▾</i></button></div>
      ${onRedeem ? `<form class="set2-row set2-code" autocomplete="off"><i class="set2-ic glyph">🎁</i>
        <div class="set2-body"><span>Mã quà tặng</span>
          <input class="set2-in" type="text" maxlength="40" placeholder="Nhập mã…" autocapitalize="none" autocorrect="off" spellcheck="false"></div>
        <button type="submit" class="set2-btn">Xác nhận</button><p class="set2-msg" role="status"></p></form>` : ''}
      ${onRecall ? `<div class="set2-row"><img class="set2-ic" src="${ICON('tong-mon')}" alt="">
        <div class="set2-body"><span>Bị kẹt? Về thành</span></div>
        <button type="button" class="set2-btn" data-recall>Về ngay</button></div>` : ''}
      <div class="set2-row"><img class="set2-ic" src="${ICON('dang-xuat')}" alt="">
        <button type="button" class="set2-logout" data-logout>Đăng xuất</button></div>
    </div>
  </div>`);
  wrap.appendChild(box);
  document.getElementById('ui').appendChild(wrap);
  const close = () => { wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 180); };
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  box.querySelector('.set2-x').addEventListener('click', close);

  const apply = () => { save(s); onChange?.(s); };
  const paint = () => {
    box.querySelectorAll('[data-tog]').forEach((b) => { const on = s[b.dataset.tog]; b.textContent = on ? 'Bật' : 'Tắt'; b.classList.toggle('off', !on); b.setAttribute('aria-pressed', String(on)); });
    box.querySelectorAll('[data-vol]').forEach((r) => { const k = r.dataset.vol, v = Math.round(s[`${k}Vol`] * 100); r.value = v; r.style.setProperty('--p', `${v}%`); r.disabled = !s[k]; });
  };
  box.addEventListener('click', (e) => {
    const t = e.target.closest('[data-tog]'); if (t) { s[t.dataset.tog] = !s[t.dataset.tog]; paint(); apply(); return; }
    if (e.target.closest('[data-lang]')) toast('Hiện chỉ có Tiếng Việt', 1200);
    if (e.target.closest('[data-recall]')) { close(); onRecall(); }
    if (e.target.closest('[data-logout]')) { close(); onLogout(); } // đóng trước để hộp xác nhận hiện trên cùng
  });
  box.querySelectorAll('[data-vol]').forEach((r) => r.addEventListener('input', () => {
    s[`${r.dataset.vol}Vol`] = r.value / 100; r.style.setProperty('--p', `${r.value}%`); apply();
  }));
  const form = box.querySelector('.set2-code');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = form.querySelector('input'), msg = form.querySelector('.set2-msg'), code = input.value.trim();
    msg.classList.remove('ok');
    if (!code) { msg.textContent = 'Hãy nhập mã.'; return; }
    try { const text = await onRedeem(code); msg.textContent = text; msg.classList.add('ok'); input.value = ''; input.blur(); toast(text, 2200); }
    catch (err) { msg.textContent = err.message || 'Mã không đúng.'; }
  });
  paint();
  return close;
}
