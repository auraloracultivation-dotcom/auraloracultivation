// Áp chế cảnh giới + trần tu vi mỗi lần hạ quái (chủ dự án 23/10: Hóa Thần Hậu kỳ không được chém Âm Hư, cách 7 tầng).
// Thông số: data/gameplay.json → monster.suppress, monster.exp_cap. Thứ tự tầng = data/monsters/monsters.json → stage_stats (lk1 … am_hu).
export function createRealmGap({ gp, mdef }) {
  const SUP = gp.monster.suppress, CAP = gp.monster.exp_cap;
  const ix = Object.fromEntries(Object.keys(mdef.stage_stats).map((k, i) => [k, i]));
  // Đánh quái cao hơn mình quá `grace` tầng: mỗi tầng vượt thêm, sát thương × per_stage (Âm Hư với Hóa Thần Hậu kỳ: 0,5^6 = 1/64)
  const gap = (mStage, pStage) => (ix[mStage] ?? 0) - (ix[pStage] ?? 0);
  const mul = (mStage, pStage) => { const g = gap(mStage, pStage) - SUP.grace; return g > 0 ? Math.max(SUP.min, SUP.per_stage ** g) : 1; };
  // Tu vi một lần hạ quái không quá cap × vạch tu vi tầng hiện tại (quái cảnh giới cao không cho nhảy cả tầng)
  const capExp = (exp, m, need) => Math.min(exp, Math.max(1, Math.round(need * (m.void ? CAP.void : CAP[m.def.rank] ?? CAP.thuong))));
  return { gap, mul, capExp };
}
