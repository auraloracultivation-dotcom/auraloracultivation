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
  function daily(exp, need, stageId) {
    if (!D || !progress) return exp;
    const d = today(), st = progress.state.lk?.day === d ? progress.state.lk : (progress.state.lk = { day: d, got: 0 });
    const cap = D.bars[stageId.slice(0, 2)] ?? 1, room = Math.max(0, cap - st.got) * need;
    const full = Math.min(exp, room), out = Math.round(full + (exp - full) * D.over_mul);
    const was = st.got; st.got += full / need;
    if (was < cap && st.got >= cap - 1e-9) toast(`Linh khí hôm nay đã cạn — hạ quái chỉ còn ${Math.round(D.over_mul * 100)}% tu vi. Qua 0h (giờ Việt Nam) hồi lại.`, 4000);
    return Math.max(1, out);
  }
  const dailyLeft = (need, stageId) => { const st = progress?.state.lk, cap = D?.bars[stageId.slice(0, 2)] ?? 1;
    return st?.day === today() ? Math.max(0, cap - st.got) : cap; };
  return { gap, mul, capExp, daily, dailyLeft, overMul: D?.over_mul };
}
