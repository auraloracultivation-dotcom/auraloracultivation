// Vẽ quái HÌNH TẠM bằng code (chưa có sprite chính thức trong assets/monsters/).
// Khi có ảnh thật: thêm "art" vào data/monsters/monsters.json và đổi hàm này sang vẽ ảnh — không phải sửa AI.
import { textScale } from './draw.js';

const ZONE_COLOR = { xanh: '#5fbf5a', cam: '#e08a3a', trang: '#cfe6f2', xam: '#8d8f99', than: '#4a3b46' };

export function drawMonster(ctx, m, x, y, now) {
  const r = m.r, dead = m.state === 'dead';
  ctx.save();
  if (dead) ctx.globalAlpha = Math.max(0, m.deadT / 0.6);
  // báo trước đòn nặng: vòng đỏ lớn dần tại chỗ người chơi đứng lúc quái vung
  if (m.state === 'windup') {
    ctx.save(); ctx.globalAlpha = 0.25 + 0.25 * Math.sin(now / 60);
    ctx.fillStyle = '#ff3b30'; ctx.beginPath();
    ctx.ellipse(m.wrx, m.wry, m.heavyR, m.heavyR * 0.55, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  // bóng
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(x, y + 1, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); ctx.fill();
  const bob = m.state === 'idle' ? Math.sin(m.walkT * 6) * 0.6 : Math.sin(m.walkT * 12) * 1.2;
  const by = y - r * 0.85 + bob;
  ctx.fillStyle = m.hitT > 0 ? '#ffffff' : ZONE_COLOR[m.def.zone] || '#aaa';
  ctx.strokeStyle = m.def.rank === 'boss' ? '#ffcf4a' : m.def.rank === 'elite' ? '#c58cff' : '#1b1208';
  ctx.lineWidth = m.def.rank === 'thuong' ? 1 : 2;
  ctx.beginPath(); ctx.ellipse(x, by, r, r * 0.85, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  // mắt nhìn theo hướng
  const ex = x + m.facing * r * 0.3;
  ctx.fillStyle = m.state === 'chase' || m.state === 'windup' ? '#ff4433' : '#1b1208';
  ctx.fillRect(ex - r * 0.35, by - r * 0.25, Math.max(1.5, r * 0.18), Math.max(1.5, r * 0.18));
  ctx.fillRect(ex + r * 0.15, by - r * 0.25, Math.max(1.5, r * 0.18), Math.max(1.5, r * 0.18));
  if (m.def.rank === 'boss') { // vương miện
    ctx.fillStyle = '#ffcf4a'; ctx.beginPath();
    const cy = by - r * 0.85;
    ctx.moveTo(x - r * 0.5, cy); ctx.lineTo(x - r * 0.35, cy - r * 0.45); ctx.lineTo(x, cy - r * 0.15);
    ctx.lineTo(x + r * 0.35, cy - r * 0.45); ctx.lineTo(x + r * 0.5, cy); ctx.closePath(); ctx.fill();
  }
  if (m.stun > 0) { ctx.fillStyle = '#ffe36a'; ctx.font = 'bold 7px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦✦', x, by - r - 4); }
  ctx.restore();
}

// Cảnh giới quái dạng chữ: "lk1–3" → "Luyện Khí 1–3", "tc_so–trung" → "Trúc Cơ Sơ–Trung"
const REALM = { lk: 'Luyện Khí', tc: 'Trúc Cơ', kd: 'Kết Đan', na: 'Nguyên Anh', ht: 'Hóa Thần' };
const KY = { so: 'Sơ', trung: 'Trung', hau: 'Hậu' };
const realmText = (r) => {
  const big = REALM[r.slice(0, 2)] || r;
  const rest = r.slice(2).replace(/^_/, '').split('–').map((s) => KY[s] || s).join('–');
  return `${big} ${rest}`;
};

// Trên đầu quái: cảnh giới · tên · thanh máu (luôn hiện). Chọn mục tiêu thì có vòng dưới chân.
export function drawMonsterLabel(ctx, m, x, y, selected, now) {
  if (m.state === 'dead') return;
  const r = m.r, top = y - r * 1.9 - (m.def.rank === 'boss' ? r * 0.5 : 0);
  ctx.save();
  if (selected) {
    ctx.strokeStyle = '#ff6a5a'; ctx.lineWidth = 1.2; ctx.globalAlpha = 0.6 + Math.sin(now / 180) * 0.3;
    ctx.beginPath(); ctx.ellipse(x, y + 1, r + 3, r * 0.45 + 2, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
  }
  ctx.translate(x, top); ctx.scale(textScale(), textScale()); // chữ giữ cỡ đọc được khi camera thu nhỏ
  const w = Math.max(22, r * 2.6);
  ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(-w / 2 - 0.5, -0.5, w + 1, 3.5);
  ctx.fillStyle = m.def.rank === 'boss' ? '#ffb03a' : '#e2483d';
  ctx.fillRect(-w / 2, 0, (w * m.hp) / m.maxHp, 2.5);
  ctx.textAlign = 'center'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.8)';
  ctx.font = '600 5.5px sans-serif';
  const tag = m.def.rank === 'boss' ? '【Boss】' : m.def.rank === 'elite' ? '【Tinh anh】' : '';
  const label = `${tag}${m.def.name}`;
  ctx.fillStyle = m.def.rank === 'boss' ? '#ffd36a' : m.def.rank === 'elite' ? '#d9b8ff' : '#f2efe6';
  ctx.strokeText(label, 0, -2); ctx.fillText(label, 0, -2);
  ctx.font = '600 4.5px sans-serif'; ctx.fillStyle = '#9fe8ff';
  const rt = realmText(m.def.realm);
  ctx.strokeText(rt, 0, -8); ctx.fillText(rt, 0, -8);
  ctx.restore();
}

// Số sát thương bay lên, kiếm khí, vòng diện rộng
export function drawFx(ctx, fx, ox, oy) {
  ctx.save();
  for (const f of fx) {
    const x = f.x + ox, y = f.y + oy;
    if (f.kind === 'text') {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f.t * 2);
      ctx.translate(x, y - (1 - f.t / f.life) * 18 * textScale()); ctx.scale(textScale(), textScale());
      ctx.font = `bold ${f.big ? 9 : 7}px sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.fillStyle = f.color;
      ctx.strokeText(f.text, 0, 0); ctx.fillText(f.text, 0, 0);
      ctx.restore();
    } else if (f.kind === 'bolt') {
      ctx.globalAlpha = 0.9; ctx.strokeStyle = '#9ff3ff'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - f.vx * 0.04, y - f.vy * 0.04); ctx.stroke();
    } else if (f.kind === 'ring') {
      ctx.globalAlpha = f.t / f.life * 0.7; ctx.strokeStyle = f.color; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(x, y, f.r * (1.2 - f.t / f.life * 0.4), f.r * 0.55, 0, 0, Math.PI * 2); ctx.stroke();
    } else if (f.kind === 'pet') {
      ctx.globalAlpha = 1; ctx.fillStyle = '#f5f0e6'; ctx.strokeStyle = '#1b1208'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(x, y - 5, 5, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1208'; ctx.fillRect(x + 1, y - 6, 1.2, 1.2);
    }
  }
  ctx.restore();
}

// Điểm hái HÌNH TẠM: linh thảo = cụm lá + nụ hoa theo màu vùng; khoáng = tảng đá có vân sáng
const HERB_TIP = { xanh: '#b8ffb0', cam: '#ff7a4a', trang: '#e8f6ff', xam: '#c7a6ff', than: '#ff3b6b' };
export function drawNode(ctx, n, x0, y0, now) {
  ctx.save();
  ctx.translate(x0, y0); ctx.scale(1.7, 1.7); // to hơn cho dễ thấy khi camera thu nhỏ
  const x = 0, y = 0;
  ctx.fillStyle = 'rgba(0,0,0,.25)';
  ctx.beginPath(); ctx.ellipse(x, y + 1, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  const glow = 0.5 + 0.5 * Math.sin(now / 300 + n.sway);
  if (n.group === 'thao') {
    const sw = Math.sin(now / 500 + n.sway) * 0.15;
    ctx.strokeStyle = '#1b3a14'; ctx.lineWidth = 0.8; ctx.fillStyle = '#3fae4a';
    for (const a of [-0.7, 0, 0.7]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + sw);
      ctx.beginPath(); ctx.ellipse(0, -4, 1.6, 4, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = HERB_TIP[n.item.zone] || '#fff'; ctx.globalAlpha = 0.7 + glow * 0.3;
    ctx.beginPath(); ctx.arc(x, y - 8, 1.8, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.fillStyle = '#6b6f80'; ctx.strokeStyle = '#2a2a33'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.lineTo(x - 4, y - 5); ctx.lineTo(x + 1, y - 7); ctx.lineTo(x + 6, y - 3); ctx.lineTo(x + 5, y);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = HERB_TIP[n.item.zone] || '#fff'; ctx.globalAlpha = 0.5 + glow * 0.5;
    ctx.fillRect(x - 2, y - 4, 1.5, 1.5); ctx.fillRect(x + 2, y - 3, 1.2, 1.2);
  }
  ctx.restore();
}
