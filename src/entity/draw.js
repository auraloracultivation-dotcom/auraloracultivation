// Nhân vật chibi tạm vẽ bằng code (khung 24×32, neo ở chân). Sẽ thay bằng sprite theo docs/04-ASSET.md.
// scale: tỉ lệ thu nhỏ nhân vật (data/config.json player.sprite_scale); neo ở chân
export const FLY_LIFT = 12; // độ cao khi bay (điểm ảnh khung nhân vật)
export function liftOf(p) {
  return p.flying ? FLY_LIFT + Math.sin(performance.now() / 260) * 1.5 : 0;
}

import { hasLook, knownLook, drawRig, rigHeadHeight } from './rig.js';

export function drawPlayer(ctx, p, scale = 1) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(scale, scale);
  const look = knownLook(p.look);
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

export function drawLabel(ctx, p, now, scale = 1) {
  const x = Math.round(p.x);
  const head = hasLook(p.look) ? rigHeadHeight(knownLook(p.look)) : 33;
  const y = Math.round(p.y + 33 - head * scale - (p.look?.outfit ? (p.rig?.flyT || 0) * 8 : liftOf(p)) * scale); // bám theo đầu
  ctx.font = '6px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.75)';
  ctx.fillStyle = p.isLocal ? '#ffe9a8' : '#ffffff';
  ctx.strokeText(p.name, x, y - 33);
  ctx.fillText(p.name, x, y - 33);

  if (p.chat && now < p.chatUntil) {
    const w = Math.min(90, ctx.measureText(p.chat).width + 8);
    const bx = x - w / 2, by = y - 52;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(bx, by, w, 11);
    ctx.fillRect(x - 1, by + 11, 2, 2);
    ctx.fillStyle = '#222';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.chat, x, by + 6, w - 4);
  }
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
  return out;
}
