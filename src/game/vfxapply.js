// Gán hiệu ứng ghép (data/vfx.json, src/entity/vfx.js) cho 24 kỹ năng, 12 pháp bảo và đạn Đạo Vận lúc nạp:
// mỗi chiêu → mã "x.<công thức>.<hệ>" — cùng một nét vẽ cả game, màu theo hệ của chiêu (chủ dự án 25/10/2026).
// Sửa tại chỗ S (gp.skills), pbDef.list, dvDef.he — phần còn lại của game vẫn đọc s.fx / d.fx / he.bolt như cũ.
export function applyVfx({ S, pbDef, dvDef, vfx }) {
  if (!vfx) return;
  const id = (recipe, he) => recipe && `x.${recipe}.${vfx.slug[he] || 'kim'}`;
  for (const [sid, m] of Object.entries(vfx.skills || {})) {
    const s = S[sid]; if (!s) continue;
    for (const k of ['fx', 'hit_fx', 'cast_fx', 'charge_fx']) if (m[k]) s[k] = id(m[k], s.he);
    for (const k of ['fx_h', 'fx_size', 'hit_h', 'charge_h']) if (m[k]) s[k] = m[k];
  }
  for (const d of pbDef?.list || []) {
    const m = vfx.treasures?.[d.id], t = vfx.thien?.[d.id];
    if (m) { for (const k of ['fx', 'cast_fx']) if (m[k]) d[k] = id(m[k], d.he); if (m.size) d.size = m.size; }
    if (t && d.fx && typeof d.fx === 'object') for (const [k, r] of Object.entries(t)) d.fx[k] = id(r, d.he);
  }
  for (const [he, h] of Object.entries(dvDef?.he || {})) {
    if (vfx.daovan?.bolt?.[he]) h.bolt = id(vfx.daovan.bolt[he], he);
    if (vfx.daovan?.hit) h.hit = id(vfx.daovan.hit, he);
    for (const t of Object.values(h.tiers || {})) if (t?.rain?.fx && vfx.daovan?.rain?.[t.rain.fx]) t.rain.fx = id(vfx.daovan.rain[t.rain.fx], he); // mưa chiêu bộ 6/8 món
  }
}
