// Hình Thần Phù vẽ bằng code (chưa có ảnh riêng): lá bùa giấy vàng, viền theo phẩm, chữ phù đỏ khác nhau theo loại.
// Trả về data URL (dùng trong <img> ở Kho), nhớ lại theo (loại, phẩm).
const TIER = { luc: '#6fdc76', lam: '#6aa8ff', tim: '#c58cff', cam: '#ffa94d', vang: '#ffd84a', do: '#ff5a4a', den: '#1a0006' };
const cache = new Map();
const hash = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function cardArt(id, tier) {
  const key = `${id}|${tier}`;
  if (cache.has(key)) return cache.get(key);
  const S = 96, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), col = TIER[tier] || TIER.luc, h = hash(id);
  g.translate(S / 2, S / 2); g.rotate(-0.12);
  if (tier === 'den' || tier === 'do') { g.shadowColor = '#ff2a2a'; g.shadowBlur = 14; } // phẩm cao: quầng đỏ
  g.fillStyle = col; g.fillRect(-25, -40, 50, 80); g.shadowBlur = 0; // viền phẩm
  const paper = g.createLinearGradient(0, -36, 0, 36); paper.addColorStop(0, '#fbe7a6'); paper.addColorStop(1, '#e2bf6a');
  g.fillStyle = paper; g.fillRect(-21, -36, 42, 72);
  g.strokeStyle = '#b3261e'; g.lineWidth = 2.4; g.lineCap = 'round'; // chữ phù: nét ngẫu nhiên theo loại (cố định cho mỗi loại)
  g.beginPath(); g.arc(0, -22, 7, 0, Math.PI * 2); g.stroke();
  let x = 0, y = -12;
  g.beginPath(); g.moveTo(x, y);
  for (let k = 0; k < 7; k++) { x = ((h >> (k * 3)) % 25) - 12; y += 6.5; g.lineTo(x, y); }
  g.stroke();
  g.beginPath(); g.moveTo(-12, 28); g.lineTo(12, 28); g.moveTo(-8, 32); g.lineTo(8, 32); g.stroke();
  const url = c.toDataURL(); cache.set(key, url);
  return url;
}
