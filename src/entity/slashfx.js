// Vệt chém vẽ tay kiểu My Heroes (assets/effects/v3/chem.<hệ>.webp, tools/fx_slash.py): lưỡi liềm sáng, cộng sáng, màu theo hệ vũ khí.
// Thông số: data/character_rig.json → slash_fx. Vẽ trước người (sau tay), trong hệ toạ độ đã lật theo hướng mặt.
import { drawEffect } from './sprites.js';

const SLUG = { Kim: 'kim', 'Ám': 'am', 'Thủy': 'thuy', 'Hỏa': 'hoa', 'Mộc': 'moc', 'Thổ': 'tho', Quang: 'quang', 'Lôi': 'loi', 'Băng': 'bang', Phong: 'phong', 'Hư': 'hu', 'Thời': 'thoi' };
const BY_NUM = ['kim', 'am', 'thuy', 'hoa', 'moc', 'tho', 'quang', 'loi', 'bang', 'phong', 'hu', 'thoi']; // art.weapon.he.<n> (thứ tự bộ he6.json)

const HE_NUM = ['Kim', 'Ám', 'Thủy', 'Hỏa', 'Mộc', 'Thổ', 'Quang', 'Lôi', 'Băng', 'Phong', 'Hư', 'Thời'];
export const weaponHe = (id) => HE_NUM[Number(/\.he\.(\d+)$/.exec(id || '')?.[1]) - 1] || null; // hệ của hình vũ khí art.weapon.he.<n>

export const fxForHe = (name, he) => `s.${name}.${SLUG[he] || 'kim'}`; // họ hiệu ứng theo hệ của chiêu (src/game/fxfamily.js)

// name: chem | choc | no | xoay | gai (tools/fx_slash.py); id: mã hình vũ khí; art: thông số hình (có thể có he)
export function fxOf(name, id, art) {
  if (art?.he && SLUG[art.he]) return `s.${name}.${SLUG[art.he]}`;
  const n = Number(/\.he\.(\d+)$/.exec(id || '')?.[1]);
  return `s.${name}.${BY_NUM[n - 1] || 'phong'}`;
}

// cfg: { moves: { chem: {fx, dx, dy, r, t0, t1, rot, follow, along, body, a} } } — tâm vệt = chuôi kiếm (+dx, dy theo L), cao 2·r·L.
//   follow: quay theo góc kiếm đã quay (spin) · along: xoay theo hướng kiếm (ảnh vẽ chĩa sang phải) · body: tâm ở thân (dy theo CH), không theo chuôi
// w: { gx, gy, L, CH, ang } chuôi, chiều dài kiếm, chiều cao nhân vật, góc kiếm lúc này (0 = lên, +90° = trước mặt)
// Trả về true nếu đòn này dùng vệt vẽ tay (khi đó bỏ vệt nét vẽ cũ)
export function drawSlash(ctx, cfg, move, t, w, weapon, art, spin = 0) {
  const m = cfg?.moves?.[move];
  if (!m) return false;
  const p = (t - m.t0) / (m.t1 - m.t0);
  if (p < 0 || p >= 1) return true;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  if (m.body) ctx.translate(0, (m.dy || 0) * w.CH); else ctx.translate(w.gx, w.gy);
  if (m.follow) ctx.rotate(spin); else if (m.along) ctx.rotate(w.ang - Math.PI / 2);
  const ok = drawEffect(ctx, fxOf(m.fx || move, weapon, art), p, (m.dx || 0) * w.L, m.body ? 0 : (m.dy || 0) * w.L, 2 * m.r * w.L, (m.rot || 0) * Math.PI / 180, m.a ?? 1);
  ctx.restore();
  return ok;
}
