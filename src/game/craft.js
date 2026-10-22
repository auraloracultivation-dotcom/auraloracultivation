// Luyện đan, luyện phôi, thức tỉnh, rã, luyện công pháp — THỬ NGHIỆM phía máy khách.
// Đan/phôi/công pháp chỉ tốn nguyên liệu; thức tỉnh tốn Linh thạch (Lab). Thất bại mất 30–50% nguyên liệu.
const rnd = (a, b) => a + Math.random() * (b - a);

// owns(id): người chơi có đan phương / công thức / bí kíp dạy món id trong kho chưa (data/items/recipes.json)
export function createCraft({ progress, pills, blanks, awaken, skills, gp, owns = () => true }) {
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
    if (!p) return { ok: false, msg: 'Không có đan này' };
    if (!owns(p.id)) return { ok: false, msg: `Cần Đan phương ${p.name} trong kho` };
    const inputs = pickInputs(p);
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
    if (!owns(b.id)) return { ok: false, msg: 'Cần Công thức phôi trong kho' };
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
  const ORDER = ['luc', 'lam', 'tim', 'cam', 'vang', 'do', 'den'];
  // Món cũ (thức tỉnh kiểu v3.1, cả món một phẩm): gán phẩm cho từng dòng + giới hạn ẩn
  function rollCap() {
    const w = A.cap_weights, sum = w.reduce((s, x) => s + x, 0);
    let r = Math.random() * sum, i = 0;
    while ((r -= w[i]) > 0) i++;
    return i + 1;
  }
  function norm(g) {
    if (!g) return g;
    g.lines ||= [];
    for (const l of g.lines) l.t ||= g.tier || 'luc';
    if (g.lines.length && !g.cap) g.cap = Math.max(g.lines.length, rollCap()); // món cũ: giữ dòng đã có, bốc giới hạn
    return g;
  }
  // Giá dòng kế tiếp; null = đã đạt giới hạn (nút thức tỉnh tắt). Giới hạn chỉ lộ ra khi chạm tới.
  const awakenCost = (g) => {
    norm(g);
    if (g.cap && g.lines.length >= g.cap) return null;
    return A.line_cost[Math.min(g.lines.length, A.line_cost.length - 1)];
  };
  const bestTier = (g) => g.lines.reduce((b, l) => (ORDER.indexOf(l.t) > ORDER.indexOf(b) ? l.t : b), g.lines[0]?.t || null);

  // Đồ trong Kho (6 hệ, có hình): lưu dòng thức tỉnh theo mã vật phẩm
  const awakenItem = (id) => awakenTarget(progress.itemAw(id));
  const awakenGear = (uid) => awakenTarget(progress.gear(uid));
  const dismantleRefund = (g) => Math.floor((g?.spent || 0) * A.dismantle_refund);
  function awakenTarget(g) {
    if (!g) return { ok: false, msg: 'Không thấy trang bị' };
    const cost = awakenCost(g);
    if (cost === null) return { ok: false, msg: 'Đã đạt giới hạn thức tỉnh' };
    if (progress.state.stone < cost) return { ok: false, msg: `Cần ${cost} Linh thạch` };
    const reveal = !g.lines.length && g.uid && g.slot; // phôi luyện: lần thức tỉnh đầu lộ hình ngẫu nhiên
    if (!g.cap) g.cap = rollCap(); // bốc giới hạn ẩn ở lần thức tỉnh đầu
    progress.addStone(-cost);
    g.spent += cost;
    const t = rollTier(), ti = awaken.tiers.findIndex((x) => x.id === t);
    const k = A.line_keys[Math.floor(Math.random() * A.line_keys.length)];
    const [lo, hi] = awaken.line_ranges[k][ti];
    const v = rnd(lo, hi);
    g.lines.push({ k, v: ['crit', 'hut', 'phan'].includes(k) ? Math.round(v * 10) / 10 : Math.round(v), t });
    g.tier = bestTier(g);
    progress.changed();
    const full = g.lines.length >= g.cap;
    return { ok: true, msg: `${reveal ? 'Phôi lộ hình! ' : ''}Dòng ${g.lines.length}: phẩm ${awaken.tiers[ti].name}${full ? ' — đã đạt giới hạn!' : ''}`, event: ['awaken', {}] };
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
    if (!s) return { ok: false, msg: 'Không có công pháp' };
    if (!owns(s.id)) return { ok: false, msg: `Cần Bí kíp ${s.name} trong kho` };
    if (!s.learn) return { ok: false, msg: 'Lab chưa ghi nguyên liệu cho công pháp này' };
    if (!stageOk(s.unlock)) return { ok: false, msg: 'Cảnh giới chưa đủ' };
    const lv = progress.state.cp[id] || 0;
    if (lv >= s.max_level) return { ok: false, msg: 'Đã đạt cấp tối đa' };
    const inputs = s.learn.inputs.map((i) => ({ id: i.id, count: i.count * (lv + 1) }));
    if (!progress.has(inputs)) return { ok: false, msg: 'Thiếu nguyên liệu' };
    for (const i of inputs) progress.take(i.id, i.count);
    progress.state.cp[id] = lv + 1; progress.changed();
    return { ok: true, msg: `${s.name} lên cấp ${lv + 1}` };
  }

  return { awakenObj: awakenTarget, norm, dismantleRefund, brewPill, forgeBlank, awakenGear, awakenItem, dismantle, trainSkill, awakenCost, gearQ, pickInputs, stageOk };
}
