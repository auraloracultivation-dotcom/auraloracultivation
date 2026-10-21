// Nhân vật chibi tạm vẽ bằng code (khung 24×32, neo ở chân). Sẽ thay bằng sprite theo docs/04-ASSET.md.
// scale: tỉ lệ thu nhỏ nhân vật (data/config.json player.sprite_scale); neo ở chân
export const FLY_LIFT = 12; // độ cao khi bay (điểm ảnh khung nhân vật)
export function liftOf(p) {
  return p.flying ? FLY_LIFT + Math.sin(performance.now() / 260) * 1.5 : 0;
}

import { hasLook, knownLook, drawRig, rigHeadHeight } from './rig.js';
import { drawShield } from './npc-draw.js';

const fallbackOutfit = (id = '') => {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `art.outfit.he.${(Math.abs(h) % 6) + 1}`;
};

export function drawPlayer(ctx, p, scale = 1) {
  if (p.soul) return drawSoul(ctx, p, scale);
  if (p.alpha === 0) return; // đã tàn mờ hẳn (chết)
  ctx.save();
  if (p.alpha !== undefined) ctx.globalAlpha *= p.alpha;
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);
  // Chưa mặc trang phục (người khác chưa gửi đồ, hoặc vừa tháo): mặc tạm 1 trong 6 bộ hệ theo mã người chơi — không còn hình khối cũ
  const look = knownLook(p.look?.outfit ? p.look : { ...p.look, outfit: fallbackOutfit(p.id) });
  if (look) { // đã mặc trang bị: nhân vật ghép lớp (rig.js) tự lo bóng, nhún, bay
    drawRig(ctx, p, look, (c) => drawBody(c, { ...p, x: 0, y: 0, facing: 1, noShadow: true }));
    ctx.restore();
    return;
  }
  const lift = liftOf(p);
  if (lift) { // bóng nhỏ, mờ dưới đất + vệt linh khí
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, 1, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(160,220,255,0.35)';
    ctx.beginPath(); ctx.ellipse(0, -lift + 1, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawBody(ctx, { ...p, x: 0, y: -lift, noShadow: !!lift });
  ctx.restore();
}

function drawBody(ctx, p) {
  const x = Math.round(p.x);
  const bob = p.walkT ? Math.round(Math.sin(p.walkT * 14)) : 0;
  const y = Math.round(p.y) + bob;
  const robe = p.isLocal ? '#d9b24a' : '#4f7fc4';
  const robeDark = p.isLocal ? '#a8862f' : '#355b94';

  if (!p.noShadow) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(x, Math.round(p.y) + 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
  }

  // chân
  const step = p.walkT ? Math.round(Math.sin(p.walkT * 14) * 2) : 0;
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(x - 4, y - 4 + step, 3, 4);
  ctx.fillRect(x + 1, y - 4 - step, 3, 4);
  // áo bào
  ctx.fillStyle = robe;
  ctx.fillRect(x - 6, y - 15, 12, 12);
  ctx.fillStyle = robeDark;
  ctx.fillRect(x - 6, y - 6, 12, 2);
  ctx.fillRect(x - 1, y - 15, 2, 9);
  // đầu
  ctx.fillStyle = '#f2dfc4';
  ctx.fillRect(x - 6, y - 27, 12, 12);
  // tóc + búi tóc
  ctx.fillStyle = '#2b2320';
  ctx.fillRect(x - 6, y - 28, 12, 4);
  ctx.fillRect(x - 2, y - 31, 4, 3);
  ctx.fillRect(p.facing > 0 ? x - 6 : x + 4, y - 25, 2, 5);
  // mắt
  ctx.fillStyle = '#1b1b1b';
  const ex = p.facing > 0 ? 1 : -3;
  ctx.fillRect(x + ex, y - 21, 1, 2);
  ctx.fillRect(x + ex + 3, y - 21, 1, 2);
}

// Cỡ chữ/thanh trên đầu (tên, cảnh giới, máu, chat): camera thu nhỏ thì phóng chữ lên để vẫn đọc được
let TS = 1;
export const setTextScale = (k) => { TS = k; };
export const textScale = () => TS;

// Linh hồn (chết, chờ hồi sinh): bóng trắng mờ trôi lơ lửng, đuôi khói, hai mắt — không tên, không thanh máu
function drawSoul(ctx, p, scale) {
  const t = performance.now() / 1000, bob = Math.sin(t * 2.4) * 1.5;
  ctx.save();
  ctx.translate(p.x, p.y); ctx.scale(scale * (p.facing || 1), scale);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(0, 1, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.translate(0, -12 + bob);
  ctx.shadowColor = 'rgba(200,235,255,0.9)'; ctx.shadowBlur = 8;
  ctx.fillStyle = 'rgba(245,250,255,0.78)';
  ctx.beginPath(); // đầu tròn + thân thon dần thành đuôi khói lượn sóng
  ctx.arc(0, -8, 7, Math.PI, 0);
  ctx.quadraticCurveTo(8, 2, 3 + Math.sin(t * 5) * 2, 10);
  ctx.quadraticCurveTo(0, 7, -2 + Math.sin(t * 5 + 1) * 2, 12);
  ctx.quadraticCurveTo(-6, 5, -7, -8);
  ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(40,60,90,0.8)';
  ctx.beginPath(); ctx.ellipse(-2.5, -8, 1.1, 1.6, 0, 0, Math.PI * 2); ctx.ellipse(2.5, -8, 1.1, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawLabel(ctx, p, now, scale = 1) {
  if (p.alpha === 0 || p.soul) return;
  const x = Math.round(p.x);
  const head = hasLook(p.look) ? rigHeadHeight(knownLook(p.look)) : 33;
  const y = Math.round(p.y + 33 - head * scale - (p.look?.outfit ? (p.rig?.flyT || 0) * 8 : liftOf(p)) * scale); // bám theo đầu
  ctx.save();
  ctx.translate(x, y - 31); // mốc ngay trên đầu; mọi thứ bên dưới tính từ mốc này
  ctx.scale(TS, TS);
  ctx.font = '6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.fillStyle = p.isLocal ? '#ffe9a8' : '#ffffff';
  ctx.strokeText(p.name, 0, -2);
  ctx.fillText(p.name, 0, -2);
  if (p.isLocal && p.shield !== undefined) { // khiên bảo vệ sau tên: chạm để bật / tắt (main.js → game.tap)
    const sx = -ctx.measureText(p.name).width / 2 - 5;
    drawShield(ctx, sx, -5, p.shield || p.guarded);
    p.shieldAt = { x: x + sx * TS, y: y - 31 - 5 * TS, r: 6 * TS };
  }
  // Cảnh giới phía trên tên; thanh khí huyết giữa tên và đầu (người khác chưa gửi HP → chỉ hiện cảnh giới)
  if (p.realm) {
    ctx.font = '600 5px sans-serif';
    ctx.fillStyle = '#9fe8ff';
    ctx.strokeText(p.realm, 0, -9);
    ctx.fillText(p.realm, 0, -9);
  }
  if (p.hpR !== undefined && p.hpR !== null) {
    const w = 26, by = -0.5;
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(-w / 2 - 0.5, by - 0.5, w + 1, 3.5);
    ctx.fillStyle = p.hpR > 0.3 ? '#4cd964' : '#ff453a'; ctx.fillRect(-w / 2, by, w * Math.max(0, Math.min(1, p.hpR)), 2.5);
  }
  if (p.chat && now < p.chatUntil) {
    ctx.font = '6px sans-serif';
    const w = Math.min(90, ctx.measureText(p.chat).width + 8);
    const by = p.realm ? -27 : -21;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(-w / 2, by, w, 11);
    ctx.fillRect(-1, by + 11, 2, 2);
    ctx.fillStyle = '#222';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.chat, 0, by + 6, w - 4);
  }
  ctx.restore();
}

// Hiệu ứng chém thường (nhẹ, chỉ hình ảnh — sát thương do máy chủ quyết định từ Mốc 3)
export function drawSlash(ctx, p, scale = 1) {
  if (!p.slashT || p.slashT <= 0) return;
  const k = 1 - p.slashT / 0.22; // 0 → 1
  const r = 20 * scale;
  const cx = p.x + p.facing * 6 * scale, cy = p.y - 12 * scale;
  const a0 = p.facing > 0 ? -1.2 : Math.PI + 1.2;
  const sweep = 2.2 * k * (p.facing > 0 ? 1 : -1);
  ctx.save();
  ctx.globalAlpha = 1 - k * 0.7;
  ctx.strokeStyle = '#fff6d6';
  ctx.lineWidth = 3 * scale;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, r, a0, a0 + sweep, p.facing < 0);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(242,199,127,.8)';
  ctx.lineWidth = 1.2 * scale;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3 * scale, a0, a0 + sweep, p.facing < 0);
  ctx.stroke();
  ctx.restore();
}

// Ảnh chân dung tĩnh của nhân vật (bảng Nhân vật, ảnh đại diện): vẽ ra canvas tạm rồi cắt sát phần có hình.
// body = true: chỉ người (bỏ pháp tướng, cánh, vũ khí) — dùng cho ảnh đại diện tròn.
export function renderPortrait(look, { body = false, zoom = 4 } = {}) {
  const l = body && look ? { outfit: look.outfit } : look;
  const size = 220 * zoom;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  g.translate(size / 2, size * 0.78);
  g.scale(zoom, zoom);
  drawPlayer(g, { x: 0, y: 0, facing: 1, walkT: 0, moving: false, isLocal: true, look: l?.outfit || l?.weapon || l?.wing || l?.avatar ? l : null, rig: { T: 0, ph: 0, flyT: 0, atk: -1, last: performance.now() / 1000 } }, 1);
  const d = g.getImageData(0, 0, size, size).data;
  let x0 = size, y0 = size, x1 = -1, y1 = -1;
  for (let y = 0; y < size; y += 2) for (let x = 0; x < size; x += 2) {
    if (d[(y * size + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return c;
  const out = document.createElement('canvas');
  out.width = x1 - x0 + 3; out.height = y1 - y0 + 3;
  out.getContext('2d').drawImage(c, -x0 + 1, -y0 + 1);
  out.foot = [size / 2 - x0 + 1, size * 0.78 - y0 + 1]; // vị trí chân trong ảnh đã cắt (để ghép cùng tỉ lệ)
  return out;
}
