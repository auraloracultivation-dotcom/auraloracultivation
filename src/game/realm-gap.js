// Áp chế cảnh giới + trần tu vi mỗi lần hạ quái (chủ dự án 23/10: Hóa Thần Hậu kỳ không được chém Âm Hư, cách 7 tầng).
// Thông số: data/gameplay.json → monster.suppress, monster.exp_cap. Thứ tự tầng = data/monsters/monsters.json → stage_stats (lk1 … am_hu).
export function createRealmGap({ gp, mdef, progress, today = () => 0, toast = () => {} }) {
  const SUP = gp.monster.suppress, CAP = gp.monster.exp_cap;
  const ix = Object.fromEntries(Object.keys(mdef.stage_stats).map((k, i) => [k, i]));
  // Đánh quái cao hơn mình quá `grace` tầng: mỗi tầng vượt thêm, sát thương × per_stage (Âm Hư với Hóa Thần Hậu kỳ: 0,5^6 = 1/64)
  const gap = (mStage, pStage) => (ix[mStage] ?? 0) - (ix[pStage] ?? 0);
  const mul = (mStage, pStage) => { const g = gap(mStage, pStage) - SUP.grace; return g > 0 ? Math.max(SUP.min, SUP.per_stage ** g) : 1; };
  // Tu vi một lần hạ quái không quá cap × vạch tu vi tầng hiện tại (quái cảnh giới cao không cho nhảy cả tầng)
  const capExp = (exp, m, need) => Math.min(exp, Math.max(1, Math.round(need * (m.void ? CAP.void : CAP[m.def.rank] ?? CAP.thuong))));
  // Linh khí mỗi ngày (gameplay.json → daily_linh_khi): tu vi từ quái tính theo phần vạch đã nhận hôm nay
  const D = gp.daily_linh_khi;
  // Giảm dần (chủ dự án 23/10 17h): w = lượng đã đánh hôm nay tính theo cap của tầng; con sau nhận ít hơn con trước.
  // Tổng cả ngày tiến sát cap (số cố định theo tầng, D.cap) chứ không vượt — không có mốc "hết" đột ngột.
  const capOf = (stageId, need) => D.cap?.[stageId] ?? (D.bars?.[stageId.slice(0, 2)] ?? 1) * need;
  const day = () => { const d = today(); return progress.state.lk?.day === d && progress.state.lk.w !== undefined ? progress.state.lk : (progress.state.lk = { day: d, w: 0 }); };
  function daily(exp, need, stageId) {
    if (!D || !progress) return exp;
    const st = day(), cap = capOf(stageId, need), was = Math.exp(-st.w); st.w += exp / cap;
    // nhận đúng phần diện tích dưới đường e^(−w): cả ngày cộng lại không bao giờ quá cap; cạn rồi chỉ còn chút `floor`
    const got = cap * (was - Math.exp(-st.w)) + exp * (D.floor ?? 0.01) * (1 - was);
    if (was > 0.5 && Math.exp(-st.w) <= 0.5) toast('Linh khí quanh đây loãng dần — hạ quái nhận ít tu vi hơn. Qua 0h (giờ Việt Nam) hồi lại.', 3500);
    if (was > 0.1 && Math.exp(-st.w) <= 0.1) toast('Linh khí hôm nay gần cạn — nên làm nhiệm vụ hoặc nghỉ tới mai.', 3500);
    return Math.round(got);
  }
  const dailyLeft = () => (progress?.state.lk?.day === today() && progress.state.lk.w !== undefined ? Math.max(0, Math.exp(-progress.state.lk.w)) : 1); // 1 = linh khí đầy
  return { gap, mul, capExp, daily, dailyLeft, overMul: D?.over_mul };
}
