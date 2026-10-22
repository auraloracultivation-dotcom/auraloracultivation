// Ba loại tiền (chủ dự án 23/10/2026): Vàng (phàm nhân) · Linh thạch (tu sĩ) · Tiên ngọc (tiên giới, sau này chỉ có khi nạp).
// Số liệu: data/currency.json. Số dư lưu trong tiến trình chơi thử (progress.state.gold / stone / jade) — Mốc 4 lên máy chủ.
import { iconUrl } from '../entity/index.js';
import { compactNum } from '../core/index.js';

export function createWallet({ def, progress }) {
  const K = def.kinds;
  const field = (k) => K[k].state;
  const get = (k) => progress.state[field(k)] || 0;
  const add = (k, n) => { const f = field(k); progress.state[f] = Math.max(0, (progress.state[f] || 0) + n); };
  const name = (k) => K[k].name;

  // Giá một món cửa hàng tính bằng tiền k (null = không bán bằng tiền này). Tiên ngọc mua được mọi món.
  function price(s, k) {
    const cur = s.currency || 'linh-thach';
    if (cur === k) return s.price;
    if (k !== 'tien-ngoc') return null;
    const stone = cur === 'vang' ? s.price * def.stone_per_gold : s.price;
    return Math.max(1, Math.ceil(stone * def.jade_per_stone));
  }
  const can = (s, k) => { const p = price(s, k); return p !== null && get(k) >= p; };
  const pay = (s, k) => { const p = price(s, k); if (p === null || get(k) < p) return false; add(k, -p); return true; };
  const label = (k, n) => `${compactNum(n)} ${K[k].short}`;

  // Dải số dư cho bảng (Kho, Vạn Bảo Lâu, Tu luyện): [{ k, img, name, text }]
  const list = () => def.order.map((k) => ({ k, img: iconUrl(K[k].icon), name: K[k].name, text: compactNum(get(k)), info: K[k].info }));
  const html = () => `<div class="wallet">${list().map((c) => `<span title="${c.name}">${c.img ? `<img src="${c.img}" alt="">` : ''}<b>${c.text}</b><i>${c.name}</i></span>`).join('')}</div>`;
  return { get, add, name, price, can, pay, label, list, html, goldPerKill: (stone) => Math.max(1, Math.round(stone * def.gold_per_kill_stone)) };
}
