// 2 ô ĐAN DÙNG NHANH (chủ dự án 23/10/2026): ô trống nhấp nháy "+" → chạm để chọn đan ghim vào ô;
// ô đã ghim → chạm là uống, GIỮ (~0,5 giây) để đổi đan khác. Ghim lưu trên máy (localStorage).
// Mặc định ô 1 = Tiểu Hồi Huyết Đan. Nút trên HUD: data-act "dan1", "dan2" (src/game/hud-actions.js).
const KEY = 'tc.pillPins';
const HOLD_MS = 480;

export function createQuickPill({ game, hud, pick, iconUrl, toast, defaults = ['item.dan.tieu-hoi-huyet.001', null] }) {
  let pins;
  try { pins = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { pins = null; }
  if (!Array.isArray(pins) || pins.length !== 2) pins = [...defaults];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(pins)); } catch { /* bỏ qua */ } };

  function choose(i) {
    const items = game().pillChoices();
    if (!items.length) { toast('Kho chưa có đan dược nào — luyện ở Tu luyện → Luyện đan hoặc mua ở Vạn Bảo Lâu', 2200); return; }
    pick({ title: `Ghim đan vào ô ${i + 1}`, items: pins[i] ? [...items, { key: '-', name: 'Bỏ ghim', thumb: '' }] : items,
      onPick: (id) => { pins[i] = id === '-' ? null : id; save(); paint(); if (pins[i]) toast('Đã ghim — chạm để uống, giữ để đổi', 1600); } });
  }
  function paint() {
    pins.forEach((id, i) => {
      const act = `dan${i + 1}`, n = id ? game()?.pillCount(id) ?? 0 : 0;
      hud.setArt(act, id ? iconUrl(id) : null);
      hud.setBadge(act, id ? String(n) : '');
      document.querySelector(`[data-act="${act}"]`)?.classList.toggle('empty', !id);
      document.querySelector(`[data-act="${act}"]`)?.classList.toggle('out', !!id && !n);
    });
  }
  // Nhấn giữ: gắn thẳng vào nút (HUD chỉ báo lúc chạm xuống)
  pins.forEach((_, i) => {
    const btn = document.querySelector(`[data-act="dan${i + 1}"]`); if (!btn) return;
    let timer = 0, held = false;
    btn.addEventListener('pointerdown', () => { held = false; clearTimeout(timer); timer = setTimeout(() => { held = true; choose(i); }, HOLD_MS); });
    const up = () => {
      clearTimeout(timer); if (held) return;
      held = true; // một lần chạm chỉ xử lý một lần
      if (!pins[i]) choose(i);
      else if (game()?.usePill(pins[i])) paint();
      else paint();
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', () => { clearTimeout(timer); held = true; });
  });
  paint();
  return { refresh: paint };
}
