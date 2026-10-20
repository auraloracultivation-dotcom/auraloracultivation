// Kỹ năng Pháp tướng (data/skills/phap-tuong.json): đeo pháp tướng chưa hiện; bấm kỹ năng mới hoá hình.
// Khi hiện, linh lực giảm liên tục; cạn thì tự tan. Bấm lần nữa để thu lại.
// THỬ NGHIỆM phía máy khách — linh lực chưa do máy chủ quản lý (Mốc 3 chuyển lên máy chủ).
export function createPhapTuong(def) {
  const max = def.mp_max_test;
  let mp = max, active = false, cd = 0;

  return {
    get active() { return active; },
    get mp() { return mp; },
    max,
    // Bấm nút. hasAvatar: đang đeo pháp tướng? Trả về kết quả để nơi gọi hiện thông báo/âm thanh.
    toggle(hasAvatar) {
      if (active) { active = false; cd = def.cooldown_s; return 'off'; }
      if (!hasAvatar) return 'no-avatar';
      if (cd > 0) return 'cooldown';
      if (mp < def.mp_min_to_activate) return 'no-mp';
      active = true;
      return 'on';
    },
    // Thu lại không qua nút (vd. tháo pháp tướng ra khỏi người)
    cancel() { if (active) { active = false; cd = def.cooldown_s; } },
    // Mỗi khung hình. Trả về 'empty' đúng lúc linh lực cạn làm pháp tướng tan.
    tick(dt) {
      if (cd > 0) cd = Math.max(0, cd - dt);
      if (active) {
        mp -= def.mp_drain_per_s * dt;
        if (mp <= 0) { mp = 0; active = false; cd = def.cooldown_s; return 'empty'; }
      } else mp = Math.min(max, mp + def.mp_regen_per_s * dt);
      return null;
    },
  };
}
