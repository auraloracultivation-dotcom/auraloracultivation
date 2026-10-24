// Hệ thống hiệu ứng thống nhất (chủ dự án 25/10/2026: "không râu ông nọ cắm cằm bà kia — làm cả game cho chỉn chu").
// Mỗi chiêu thuộc một hay vài "họ hiệu ứng"; mỗi họ là MỘT tấm GPT nền đen (tools/fx_slash.py) đổi màu theo hệ của chiêu,
// nên cả game cùng một nét vẽ. Họ chưa có tấm thì chiêu giữ hình cũ. Bảng: data/gameplay.json → fx_families.
import { fxForHe, fxDuration } from '../entity/index.js';

// S: data/gameplay.json → skills (sửa tại chỗ khi khởi tạo); fam: { families: { <họ>: { field, h_field, h_mul } }, skills: { <id>: [họ…] } }
export function applyFamilies(S, fam) {
  if (!fam) return;
  for (const [id, list] of Object.entries(fam.skills || {})) {
    const s = S[id];
    if (!s) continue;
    for (const name of list) {
      const f = fam.families[name], fx = f && fxForHe(name, s.he || fam.default_he || 'Kim');
      if (!f || !fxDuration(fx)) continue; // chưa có tấm GPT cho họ này → giữ hình cũ
      s[f.field] = fx;
      if (f.h_field && s[f.h_field]) s[f.h_field] = Math.round(s[f.h_field] * (f.h_mul || 1));
      else if (f.h_field && f.h) s[f.h_field] = f.h;
    }
  }
}
