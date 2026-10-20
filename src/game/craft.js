// Luyện đan, luyện phôi, thức tỉnh, rã, luyện công pháp — THỬ NGHIỆM phía máy khách.
// Đan/phôi/công pháp chỉ tốn nguyên liệu; thức tỉnh tốn Linh thạch (Lab). Thất bại mất 30–50% nguyên liệu.
const rnd = (a, b) => a + Math.random() * (b - a);

export function createCraft({ progress, pills, blanks, awaken, skills, gp }) {
  const loseRange = pills.fail_material_loss;
  const A = gp.awaken;

  function loseSome(inputs) {
    const f = rnd(...loseRange);
    for (const i of inputs) progress.take(i.id, Math.max(1, Math.ceil(i.count * f)));
  }
  const pickInputs = (p) => [p.recipe.inputs, ...(p.recipe.alt_inputs || [])].find((x) => progress.has(x));
  const stageOk = (unlock) => progress.stageIndex(unlock) <= progress.state.stage;

  function brewPill(id) {
    const p = pills.pills.find((x) => x.id === id);
    const inputs = p && pickInputs(p);
    if (!inputs) return { ok: false, msg: 'Thiếu nguyên liệu' };
    if (Math.random() < p.recipe.rate) {
      for (const i of inputs) progress.take(i.id, i.count);
      progress.add(p.id, 1);
      return { ok: true, msg: `Luyện thành ${p.name}`, event: ['craft', { id: p.id, kind: 'pill' }] };
    }
    loseSome(inputs);
    return { ok: false, msg: `Luyện ${p.name} thất bại — mất một phần nguyên liệu` };
  }

  function forgeBlank(id) {
    const b = blanks.blanks.find((x) => x.id === id);
    if (!b) return { ok: false, msg: 'Không có công thức' };
    if (!stageOk(b.unlock)) return { ok: false, msg: 'Cảnh giới chưa đủ' };
    if (!progress.has(b.inputs)) return { ok: false, msg: 'Thiếu nguyên liệu' };
    if (Math.random() < b.rate) {
      for (const i of b.inputs) progress.take(i.id, i.count);
      const name = b.sample_names[Math.floor(Math.random() * b.sample_names.length)];
      progress.newGear(b.slot, name);
      return { ok: true, msg: `Luyện thành phôi ${name} — hãy Thức tỉnh`, event: ['craft', { id: b.id, kind: 'blank' }] };
    }
    loseSome(b.inputs);
    return { ok: false, msg: 'Luyện phôi thất bại — mất một phần nguyên liệu' };
  }

  function gearQ() {
    const s = progress.state.stage;
    let q = 0;
    for (const [id, v] of Object.entries(gp.gearQ_by_stage)) if (progress.stageIndex(id) <= s) q = v;
    return q;
  }
  // Tỷ lệ phẩm theo Lab: ngưỡng cộng dồn tăng tuyến tính theo gearQ
  function rollTier() {
    const g = awaken.gearQ, q = gearQ(), r = Math.random();
    for (const t of ['den', 'do', 'vang', 'cam', 'tim', 'lam']) {
      if (r < g.cumulative_at_0[t] + g.cumulative_add_per_gearQ[t] * q) return t;
    }
    return 'luc';
  }
  const awakenCost = (g) => (g.tier ? A.reroll_cost[g.tier] : A.first_cost);

  function awakenGear(uid) {
    const g = progress.gear(uid);
    if (!g) return { ok: false, msg: 'Không thấy trang bị' };
    const cost = awakenCost(g);
    if (progress.state.stone < cost) return { ok: false, msg: `Cần ${cost} Linh thạch` };
    progress.addStone(-cost);
    g.spent += cost;
    const tierId = rollTier();
    const ti = awaken.tiers.findIndex((t) => t.id === tierId), tier = awaken.tiers[ti];
    const nLines = Math.round(rnd(tier.lines[0], tier.lines[1]));
    g.tier = tierId;
    g.lines = Array.from({ length: nLines }, () => {
      const k = A.line_keys[Math.floor(Math.random() * A.line_keys.length)];
      const [lo, hi] = awaken.line_ranges[k][ti];
      const v = rnd(lo, hi);
      return { k, v: ['crit', 'hut', 'phan'].includes(k) ? Math.round(v * 10) / 10 : Math.round(v) };
    });
    progress.changed();
    return { ok: true, msg: `Thức tỉnh: phẩm ${tier.name}, ${nLines} dòng`, event: ['awaken', {}] };
  }

  function dismantle(uid) {
    const g = progress.gear(uid);
    if (!g) return { ok: false, msg: 'Không thấy trang bị' };
    const back = Math.floor(g.spent * A.dismantle_refund);
    progress.removeGear(uid); progress.addStone(back);
    return { ok: true, msg: `Đã rã ${g.name}: hoàn ${back} Linh thạch` };
  }

  // Công pháp cấp 1→5: cấp n tốn n lần nguyên liệu gốc
  function trainSkill(id) {
    const s = skills.skills.find((x) => x.id === id);
    if (!s?.learn) return { ok: false, msg: 'Lab chưa ghi nguyên liệu cho công pháp này' };
    if (!stageOk(s.unlock)) return { ok: false, msg: 'Cảnh giới chưa đủ' };
    const lv = progress.state.cp[id] || 0;
    if (lv >= s.max_level) return { ok: false, msg: 'Đã đạt cấp tối đa' };
    const inputs = s.learn.inputs.map((i) => ({ id: i.id, count: i.count * (lv + 1) }));
    if (!progress.has(inputs)) return { ok: false, msg: 'Thiếu nguyên liệu' };
    for (const i of inputs) progress.take(i.id, i.count);
    progress.state.cp[id] = lv + 1; progress.changed();
    return { ok: true, msg: `${s.name} lên cấp ${lv + 1}` };
  }

  return { brewPill, forgeBlank, awakenGear, dismantle, trainSkill, awakenCost, gearQ, pickInputs, stageOk };
}
