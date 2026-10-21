// Ô kỹ năng trên HUD (yêu cầu chủ dự án 21/10):
// - Ô hiện đúng hình thứ đang dùng: Đan dược = viên đan hồi máu (kèm số còn), Linh thú / Pháp tướng = món đang đeo.
// - Chưa mở theo cảnh giới, hoặc chưa có thứ để dùng (hết đan, chưa đeo linh thú / pháp tướng) → ô xám.
// - Đang hồi chiêu → bóng tối quét quanh nút + số giây đếm ngược.
// Chỉ đọc trạng thái rồi gọi hud; mỗi khung hình chỉ cập nhật khi có thay đổi.
const HEAL_PILL = 'item.dan.tieu-hoi-huyet.001';

export function createSkillBar({ hud, S, gp, progress, pt, cds, slotItem, icon }) {
  const last = {};
  const put = (key, val, fn) => { if (last[key] !== val) { last[key] = val; fn(); } };

  // Mỗi ô: lý do bị khoá (null = dùng được), hình bên trong, hồi chiêu [còn, tổng]
  function slots(now) {
    const stage = progress.state.stage, out = {};
    for (const [id, s] of Object.entries(S)) {
      if (!s.unlock) continue;
      const locked = progress.stageIndex(s.unlock) > stage;
      out[id] = { off: locked || null, cd: [(cds[id] || 0) - now, s.cd_s] };
    }
    const pet = slotItem('linh-thu');
    if (!out['linh-thu'].off && !pet) out['linh-thu'].off = 'chưa đeo linh thú (Kho → Trang bị)';
    out['linh-thu'].art = pet?.thumb || null;
    const avatar = slotItem('phap-tuong');
    out['phap-tuong'] = { off: avatar ? null : 'chưa đeo pháp tướng (Kho → Trang bị)', art: avatar?.thumb || null, cd: [pt.cdLeft, pt.cdTotal] };
    const n = progress.count(HEAL_PILL);
    out['dan-duoc'] = { off: n ? null : 'hết đan hồi máu — luyện ở Lò luyện đan', art: icon(HEAL_PILL), badge: n || '', cd: [(cds.pill || 0) - now, gp.pills.use_cooldown_s] };
    return out;
  }

  return {
    // Cho gameplay: kỹ năng này dùng được không (để chặn bấm khi chưa có thứ cần)
    blocked: (id) => last[`off:${id}`] || null,
    update(now) {
      for (const [id, s] of Object.entries(slots(now))) {
        put(`off:${id}`, s.off, () => hud.setLocked(id, !!s.off, typeof s.off === 'string' ? s.off : undefined));
        put(`art:${id}`, s.art, () => hud.setArt(id, s.art));
        put(`badge:${id}`, s.badge, () => hud.setBadge(id, s.badge));
        const left = Math.max(0, s.cd[0]), frac = left > 0 ? Math.round((left / s.cd[1]) * 40) : 0;
        put(`cd:${id}`, `${Math.ceil(left)}:${frac}`, () => hud.setCooldown(id, left, s.cd[1]));
      }
    },
  };
}
