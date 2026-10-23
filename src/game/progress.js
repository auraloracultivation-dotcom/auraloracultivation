// Tiến trình người chơi THỬ NGHIỆM: cảnh giới, tu vi, Linh thạch, túi nguyên liệu/đan, trang bị luyện ra, công pháp, nhiệm vụ.
// Lưu localStorage theo tài khoản — CHƯA lưu máy chủ, người chơi sửa được. Mốc 4 chuyển lên máy chủ (RPC).
const VERSION = 1;

export function createProgress(userId, gp) {
  const key = `tc.progress.${userId}`;
  const stages = gp.player.stages;
  let st = fresh();
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && saved.v === VERSION) st = { ...st, ...saved };
  } catch { /* hỏng thì làm lại từ đầu */ }
  st.stage = Math.max(0, Math.min(stages.length - 1, st.stage | 0));
  st.itemAw ||= {}; // thức tỉnh của đồ trong Kho (6 hệ): mã vật phẩm → { tier, lines, spent }

  let dirty = false, timer = 0;
  const save = () => { try { localStorage.setItem(key, JSON.stringify(st)); } catch { /* chặn lưu */ } dirty = false; };
  const touch = () => { dirty = true; };
  let listener = () => {};

  function fresh() {
    return { v: VERSION, stage: 0, exp: 0, hp: null, stone: 0, inv: { ...(gp.player.starter_inv || {}) }, gear: [], eq: {}, cp: {}, uid: 1, // starter_inv: quà tân thủ (đan hồi huyết)
      quests: { active: {}, done: {} }, herbs: [], bosses: [], dailyDone: {}, flags: [], itemAw: {} };
  }

  return {
    get state() { return st; },
    get stageDef() { return stages[st.stage]; },
    stageIndex: (id) => stages.findIndex((s) => s.id === id),
    nextStageDef: () => stages[st.stage + 1] || null,
    onChange(fn) { listener = fn; },
    changed() { touch(); listener(); },
    tick(dt) { timer += dt; if (dirty && timer > 3) { timer = 0; save(); } },
    flush: save,
    reset() { st = fresh(); save(); listener(); },

    count: (id) => st.inv[id] || 0,
    add(id, n = 1) { st.inv[id] = (st.inv[id] || 0) + n; touch(); },
    take(id, n = 1) {
      if ((st.inv[id] || 0) < n) return false;
      st.inv[id] -= n; if (!st.inv[id]) delete st.inv[id];
      touch(); return true;
    },
    has(inputs) { return inputs.every((i) => (st.inv[i.id] || 0) >= i.count); },
    addStone(n) { st.stone = Math.max(0, st.stone + n); touch(); },

    // Tu vi: tầng nhỏ tự lên; tầng đầu của đại cảnh giới (Trúc Cơ Sơ…) phải bấm Đột phá
    addExp(n) {
      st.exp += n;
      const ups = [];
      for (;;) {
        const cur = stages[st.stage], next = stages[st.stage + 1];
        if (st.exp < cur.exp_need || !next) break;
        if (gp.major_realm_first_stage[next.id]) { st.exp = cur.exp_need; break; } // đủ đỉnh, chờ đột phá
        st.exp -= cur.exp_need; st.stage++; ups.push(stages[st.stage]);
      }
      if (st.stage === stages.length - 1) st.exp = Math.min(st.exp, stages[st.stage].exp_need);
      touch();
      return ups;
    },
    atPeak() {
      const cur = stages[st.stage], next = stages[st.stage + 1];
      return !!next && !!gp.major_realm_first_stage[next.id] && st.exp >= cur.exp_need;
    },
    advanceStage() { st.stage++; st.exp = 0; touch(); },
    setStage(i, exp = 0) { st.stage = Math.max(0, Math.min(stages.length - 1, i)); st.exp = Math.max(0, Math.floor(exp)); touch(); }, // thụt cảnh giới / đột phá Anh Biến thất bại

    newGear(slot, name) {
      const g = { uid: st.uid++, slot, name, tier: null, lines: [], spent: 0 };
      st.gear.push(g); touch(); return g;
    },
    gear: (uid) => st.gear.find((g) => g.uid === uid),
    removeGear(uid) {
      st.gear = st.gear.filter((g) => g.uid !== uid);
      for (const [sl, u] of Object.entries(st.eq)) if (u === uid) delete st.eq[sl];
      touch();
    },
    // Trả về true nếu vừa MẶC vào (để nơi gọi tháo đồ Kho cùng ô)
    toggleEquip(uid) {
      const g = st.gear.find((x) => x.uid === uid);
      if (!g || !g.tier) return false;
      if (st.eq[g.slot] === uid) { delete st.eq[g.slot]; touch(); return false; }
      st.eq[g.slot] = uid; touch(); return true;
    },
    unequipSlot(slot) { if (st.eq[slot]) { delete st.eq[slot]; touch(); } },
    dropItemAw(id) { delete st.itemAw[id]; touch(); },
    itemAw: (id) => (st.itemAw[id] ||= { tier: null, lines: [], spent: 0 }),
    equipped: () => Object.values(st.eq).map((u) => st.gear.find((g) => g.uid === u)).filter(Boolean),
  };
}
