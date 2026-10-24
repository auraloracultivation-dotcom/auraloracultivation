// Ô kỹ năng trên HUD — ô tự xếp (chủ dự án 23/10): ô s1..sN hiện kỹ năng người chơi đã chọn (loadout.js).
// - Ô hiện đúng hình kỹ năng: hiệu ứng của chiêu; Đan dược = viên đan (kèm số còn); Thú hồn / Pháp tướng = món đang đeo.
// - Ô trống, chưa mở theo cảnh giới, hoặc chưa có thứ để dùng → ô xám (chạm vào: ô trống mở bảng Kỹ năng, còn lại báo lý do).
// - Đang hồi chiêu → bóng tối quét quanh nút + số giây đếm ngược.
// Chỉ đọc trạng thái rồi gọi hud; mỗi khung hình chỉ cập nhật khi có thay đổi.
const HEAL_PILL = 'item.dan.tieu-hoi-huyet.001';

export function createSkillBar({ learn, hud, S, gp, progress, pt, cds, slotItem, icon, fxIcon, loadout, stageName, treasure = () => null }) {
  const last = {};
  const put = (key, val, fn) => { if (last[key] !== val) { last[key] = val; fn(); } };

  // Một kỹ năng: lý do chưa dùng được (null = dùng được), hình, hồi chiêu [còn, tổng], số kèm
  function info(id, now) {
    const s = S[id];
    if (!s) return { off: 'ô trống — chạm để chọn kỹ năng', art: null, cd: [0, 1] };
    const locked = s.unlock && progress.stageIndex(s.unlock) > progress.state.stage;
    const lockMsg = !learn.learned(id) ? 'chưa lĩnh ngộ — chỉ rơi khi hạ boss' : locked ? `mở ở ${stageName(s.unlock)}` : null;
    if (id === 'linh-thu') {
      const pet = slotItem('linh-thu');
      return { off: lockMsg || (pet ? null : 'chưa đeo thú hồn (Kho → Pháp khí)'), art: !locked && pet ? pet.thumb : null, cd: [(cds[id] || 0) - now, s.cd_s] };
    }
    if (id === 'phap-tuong') {
      const av = slotItem('phap-tuong');
      return { off: av ? null : 'chưa đeo pháp tướng (Kho → Pháp khí)', art: av?.thumb || null, cd: [pt.cdLeft, pt.cdTotal], active: pt.active };
    }
    if (id === 'phap-bao') { // pháp bảo đang đeo (treasure.js)
      const t = treasure();
      return { off: lockMsg || (t ? null : 'chưa đeo pháp bảo (Kho → Pháp Bảo)'), art: !locked && t ? t.thumb : null, cd: [(cds[id] || 0) - now, t?.cd || s.cd_s] };
    }
    if (id === 'dan-duoc') {
      const n = progress.count(HEAL_PILL);
      return { off: n ? null : 'hết đan hồi máu — luyện ở Lò luyện đan', art: n ? icon(HEAL_PILL) : null, badge: n || '', cd: [(cds.pill || 0) - now, gp.pills.use_cooldown_s] };
    }
    return { off: lockMsg, art: locked ? null : art(id), cd: [(cds[id] || 0) - now, s.cd_s] };
  }
  // Hình đại diện kỹ năng (bảng Kỹ năng cũng dùng)
  function art(id) {
    const s = S[id];
    if (!s) return null;
    if (s.medal) return s.medal; // huy hiệu tròn khít ô (tools/skill_medals.py)
    if (s.icon_url) return s.icon_url;
    if (s.icon) return fxIcon(...s.icon);
    if (id === 'dan-duoc') return icon(HEAL_PILL);
    if (id === 'linh-thu' || id === 'phap-tuong') return slotItem(id)?.thumb || null;
    return null;
  }

  return {
    slotId: (i) => `s${i + 1}`,
    art,
    // Cho gameplay: kỹ năng này dùng được không (để chặn bấm khi chưa có thứ cần)
    blocked: (id) => info(id, 0).off,
    update(now) {
      for (let i = 0; i < loadout.size; i++) {
        const sid = `s${i + 1}`, id = loadout.get(i), s = info(id, now);
        put(`id:${sid}`, id, () => { for (const k of ['off', 'art', 'badge', 'cd', 'on']) delete last[`${k}:${sid}`]; });
        put(`off:${sid}`, s.off, () => hud.setLocked(sid, !!s.off, s.off || undefined));
        put(`art:${sid}`, s.art, () => hud.setArt(sid, s.art));
        put(`badge:${sid}`, s.badge, () => hud.setBadge(sid, s.badge));
        put(`on:${sid}`, !!s.active, () => hud.setActive(sid, !!s.active));
        const left = Math.max(0, s.cd[0]), frac = left > 0 ? Math.round((left / s.cd[1]) * 40) : 0;
        put(`cd:${sid}`, `${Math.ceil(left)}:${frac}`, () => hud.setCooldown(sid, left, s.cd[1]));
      }
    },
  };
}
