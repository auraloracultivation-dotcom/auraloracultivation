// Combo đánh thường (chủ dự án 25/10/2026): Chém → Chọc → Xoay. Ra đòn tiếp trong reset_s giây kể từ lúc hết hồi đòn trước
// thì sang đòn sau (tính theo tốc đánh, nên đánh chậm hay nhanh đều nối được), quá thì về Chém.
// Số ở data/gameplay.json → attack_combo: mul (nhân sát thương mục tiêu), aoe_px + aoe_mul (Xoay quét quanh mình).
export function createCombo(cfg) {
  let i = -1, lastAt = -99;
  return {
    // now: giây trong game; gap: thời gian hồi giữa 2 đòn đánh thường. Trả về đòn kế tiếp { id, mul, aoe_px, aoe_mul }
    next(now, gap = 0) {
      i = now - lastAt <= gap + cfg.reset_s ? (i + 1) % cfg.moves.length : 0;
      lastAt = now;
      return cfg.moves[i];
    },
  };
}
