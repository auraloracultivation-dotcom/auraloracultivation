// Vệt chém vẽ tay kiểu My Heroes (assets/effects/v3/chem.<hệ>.webp, tools/fx_slash.py): lưỡi liềm sáng, cộng sáng, màu theo hệ vũ khí.
// Thông số: data/character_rig.json → slash_fx. Vẽ trước người (sau tay), trong hệ toạ độ đã lật theo hướng mặt.
import { drawEffect } from './sprites.js';

const SLUG = { Kim: 'kim', 'Ám': 'am', 'Thủy': 'thuy', 'Hỏa': 'hoa', 'Mộc': 'moc', 'Thổ': 'tho', Quang: 'quang', 'Lôi': 'loi', 'Băng': 'bang', Phong: 'phong', 'Hư': 'hu', 'Thời': 'thoi' };
const BY_NUM = ['kim', 'am', 'thuy', 'hoa', 'moc', 'tho', 'quang', 'loi', 'bang', 'phong', 'hu', 'thoi']; // art.weapon.he.<n> (thứ tự bộ he6.json)

// art: thông số hình vũ khí (có thể có he); id: mã hình
export function slashOf(id, art) {
  if (art?.he && SLUG[art.he]) return `s.chem.${SLUG[art.he]}`;
  const n = Number(/\.he\.(\d+)$/.exec(id || '')?.[1]);
  return `s.chem.${BY_NUM[n - 1] || 'phong'}`;
}

// cfg: { moves: { chem: {dx, dy, r, t0, t1, rot, follow, a} } } — tâm vệt = chuôi kiếm (+dx, dy theo L), cao 2·r·L: vệt ôm đúng tầm kiếm quét.
// w: { gx, gy, L } chuôi & chiều dài kiếm lúc này. spin: góc kiếm đã quay (xoay: vệt quay theo kiếm)
// Trả về true nếu đòn này dùng vệt vẽ tay (khi đó bỏ vệt nét vẽ cũ)
export function drawSlash(ctx, cfg, move, t, w, fxId, spin = 0) {
  const m = cfg?.moves?.[move];
  if (!m) return false;
  const p = (t - m.t0) / (m.t1 - m.t0);
  if (p < 0 || p >= 1) return true;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(w.gx, w.gy); if (m.follow) ctx.rotate(spin);
  const ok = drawEffect(ctx, fxId, p, (m.dx || 0) * w.L, (m.dy || 0) * w.L, 2 * m.r * w.L, (m.rot || 0) * Math.PI / 180, m.a ?? 1);
  ctx.restore();
  return ok;
}
