// Tác dụng công pháp theo cấp (data/gameplay.json → skills.cong_phap_effects). Dùng cho chỉ số, tu vi và chữ mô tả.
export function createCpEffects(effects, levels) {
  const lv = (id) => levels()[id] || 0;
  const of = (kind, skill) => Object.entries(effects).filter(([id, e]) => id.startsWith('skill.') && e.kind === kind && (!skill || e.skill === skill));
  const sum = (kind, skill) => of(kind, skill).reduce((s, [id, e]) => s + lv(id) * e.per, 0);
  return {
    skillMul: (skill) => 1 + sum('skill', skill === 'phap-tuong' ? 'phap-tuong' : skill),
    expMul: () => 1 + sum('exp'),
    // sửa chỉ số sau khi tính (linh lực tối đa, né tránh)
    apply(ps) { ps.mp = Math.round(ps.mp * (1 + sum('mp'))); ps.ne = Math.round(ps.ne * (1 + sum('ne'))); return ps; },
    // Chữ tác dụng: cấp hiện tại (hoặc cấp 1 nếu chưa luyện) → "Đánh thường mạnh hơn 10%/cấp (đang +20%)"
    text(id) {
      const e = effects[id];
      if (!e) return '';
      const per = Math.round(e.per * 100), cur = lv(id);
      return `${e.text.replace('{v}', per).trim()} mỗi cấp${cur ? ` · đang +${per * cur}%` : ''}`;
    },
  };
}
