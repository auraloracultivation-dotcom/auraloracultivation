// Vẽ NPC: trang phục + vũ khí RIÊNG của NPC (assets/npcs, không phải vật phẩm game). Hình tĩnh, chuyển động bằng code:
// nhún khi đi, 2 bàn chân nhỏ bước so le, vũ khí vác sau lưng, vung nửa vòng khi đánh.
import { textScale } from './draw.js';

let ART = null;
const imgs = {};
export async function loadNpcArt(art) {
  ART = art;
  await Promise.all(['outfits', 'weapons'].map((k) => new Promise((res) => {
    const im = new Image(); im.onload = () => { imgs[k] = im; res(); }; im.onerror = () => res(); im.src = art[k].src;
  })));
}

const cell = (k, i) => ART?.[k].cells[i % ART[k].cells.length];

export function drawNpc(ctx, n, x, y, H) {
  const o = cell('outfits', n.outfit), w = cell('weapons', n.weapon);
  if (!o || !imgs.outfits) return;
  const walking = n.moving;
  const bob = walking ? Math.abs(Math.sin(n.walkT * 9)) * 1.2 : Math.sin(n.t * 2) * 0.4;
  const oh = H, ow = (o.w / o.h) * oh;
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(0, 0, ow * 0.32, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  if (n.facing < 0) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = true;
  // vũ khí sau lưng: chuôi ở hông sau, mũi chĩa lên, ngả ra sau; khi vung xoay quanh chuôi
  if (w && imgs.weapons) {
    const wh = H * 1.25, ww = (w.w / w.h) * wh;
    const swing = n.swingT > 0 ? Math.sin((1 - n.swingT / 0.35) * Math.PI) * 2.6 : 0;
    ctx.save();
    ctx.translate(-ow * 0.12, -oh * 0.32 - bob);
    ctx.rotate(-0.55 + swing);
    ctx.drawImage(imgs.weapons, w.x, w.y, w.w, w.h, -ww / 2, -wh * 0.85, ww, wh);
    ctx.restore();
  }
  // chân: 2 ô nhỏ bước so le
  const step = walking ? Math.sin(n.walkT * 9) * 1.6 : 0;
  ctx.fillStyle = '#2a1d16';
  ctx.fillRect(-4, -2.6 + step * 0.4, 3, 2.6); ctx.fillRect(1, -2.6 - step * 0.4, 3, 2.6);
  ctx.drawImage(imgs.outfits, o.x, o.y, o.w, o.h, -ow / 2, -oh - 1.5 - bob, ow, oh);
  ctx.restore();
}

export function drawNpcLabel(ctx, n, x, y, H, now) {
  const k = textScale();
  ctx.save();
  ctx.translate(x, y - H - 4);
  ctx.scale(k, k);
  ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.font = '600 5.5px sans-serif'; ctx.fillStyle = '#b8f5c8';
  ctx.strokeText(n.name, 0, 0); ctx.fillText(n.name, 0, 0);
  if (n.chat && now < n.chatUntil) {
    ctx.font = '6px sans-serif';
    const w = Math.min(110, ctx.measureText(n.chat).width + 8), by = -20;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(-w / 2, by, w, 11); ctx.fillRect(-1, by + 11, 2, 2);
    ctx.fillStyle = '#222'; ctx.textBaseline = 'middle';
    ctx.fillText(n.chat, 0, by + 6, w - 4);
  }
  ctx.restore();
}
