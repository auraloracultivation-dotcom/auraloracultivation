// Nhiệm vụ Ngày / Tuần / Tiến độ (chủ dự án 23/10/2026: tu tiên + idle — hạ quái nhận ít, thưởng chính từ nhiệm vụ).
// Sinh theo VÙNG của đại cảnh giới đang tu (realms.json → zone), số liệu ở data/quests/quests.json → routine.
//   Ngày: 3 việc ~15 phút, reset 0h giờ VN · Tuần: 3 việc khó, reset 0h thứ Hai giờ VN · Tiến độ: bậc 1→n không reset.
// Nhiệm vụ đã sinh lưu nguyên trong progress.state.routine (đổi cảnh giới giữa ngày không đổi nhiệm vụ hôm đó).
// THỬ NGHIỆM phía máy khách như phần nhiệm vụ còn lại.
const MAJOR = ['lk', 'tc', 'kd', 'na', 'ht', 'ab', 'vd'];

export function createRoutine({ R, progress, realmMajor, realms, gp, mats, now = Date.now }) {
  const vn = () => new Date(now() + R.tz_offset_h * 3600e3); // giờ máy chủ // giờ VN, đọc bằng getUTC*
  const dayKey = () => vn().toISOString().slice(0, 10);
  const weekKey = () => { const d = vn(), back = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - back * 864e5).toISOString().slice(0, 10); }; // ngày thứ Hai
  const seed = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pick = (arr, s) => arr[seed(s) % arr.length];
  const st = () => (progress.state.routine ||= { day: '', daily: [], week: '', weekly: [], ladder: 1, lq: null });

  // Bối cảnh lúc sinh: vùng, tầng tu, số tu vi / Linh thạch gốc
  function ctx() {
    const major = realmMajor(), code = MAJOR[major] || 'lk', zone = realms.realms[major]?.zone || 'xanh';
    const stage = progress.stageDef, stone = gp.monster.stone_by_stage[stage.tier] || 1;
    const of = (z, g) => mats.materials.filter((m) => m.zone === z && m.group === g);
    const zi = R.zone_order.indexOf(zone);
    const special = of(zone, 'dacbiet').length ? of(zone, 'dacbiet') : of(R.zone_order[zi + 1] || zone, 'dacbiet'); // vùng đầu chưa có đồ đặc biệt → mượn vùng sau
    return { major, code, zone, zname: R.zone_names[zone] || zone, need: stage.exp_need, stone, T: R.table?.[stage.id], herbs: of(zone, 'thao'), ores: of(zone, 'khoang'), special };
  }
  const fill = (s, c, extra = {}) => s.replace(/\{(\w+)\}/g, (_, k) => (k === 'zone' ? c.zname : extra[k] ?? ''));
  function goalOf(t, c, key) {
    const g = t.goal;
    if (g.type === 'collect') { const it = pick(c[g.group === 'thao' ? 'herbs' : 'ores'], key); return { goal: { type: 'collect', target: it.id, count: g.count }, item: it.name }; }
    const rk = { thuong: 'yêu thú', elite: 'tinh anh', boss: 'thủ lĩnh' }[g.rank] || 'yêu thú';
    return { goal: { type: 'kill_zone', target: c.zone, rank: g.rank, count: g.count, label: `${rk} vùng ${c.zname}` } };
  }
  // Thưởng cố định theo bảng (R.table[tầng] = [tu vi, Linh thạch, Vàng]); tầng không có trong bảng mới dùng cách cũ
  const fixed = (row, exp, stone) => (row ? { exp: row[0], spiritStone: row[1], gold: row[2] } : { exp: Math.round(exp), spiritStone: stone });
  const items = (list) => list.filter((x) => x.it && x.n > 0).map((x) => ({ id: x.it.id, count: x.n }));

  function makeDaily(c, key) {
    const W = R.daily_reward;
    return R.daily.map((t, i) => {
      const { goal, item } = goalOf(t, c, `${key}.${i}`);
      return { id: `q.r.d.${key}.${i}`, type: 'daily', routine: 'd', tier: t.tier, realm: c.code, title: fill(t.title, c), desc: fill(t.desc, c, { item }), goals: [goal], next: [],
        rewards: { ...fixed(c.T?.daily, c.need * (W.exp_bar[c.code] ?? 0.05), c.stone * W.stone_kills), items: items([{ it: pick(c.herbs, `${key}.h${i}`), n: W.herb }]) } };
    });
  }
  function makeWeekly(c, key) {
    const W = R.weekly_reward;
    return R.weekly.map((t, i) => {
      const { goal } = goalOf(t, c, `${key}.${i}`);
      return { id: `q.r.w.${key}.${i}`, type: 'weekly', routine: 'w', tier: t.tier, realm: c.code, title: fill(t.title, c), desc: fill(t.desc, c), goals: [goal], next: [],
        rewards: { ...fixed(c.T?.weekly, c.need * (W.exp_bar[c.code] ?? 0.2), c.stone * W.stone_kills[i]),
          items: items([{ it: pick(c.ores, `${key}.o${i}`), n: W.ore[i] }, { it: pick(c.special, `${key}.s${i}`), n: W.special[i] }, { it: { id: 'item.phapbao.phoi.001' }, n: W.phoi_pb[i] }]) } };
    });
  }
  // TIẾN ĐỘ = con đường chính từ Luyện Khí tầng 1 tới khi đủ mạnh (chủ dự án 23/10): bậc n gắn với MỘT tầng tu cố định
  // (Luyện Khí: 1 bậc / tầng, Trúc Cơ → Hóa Thần: 3 bậc / tầng), vùng + thưởng theo tầng đó, không theo cảnh giới người chơi.
  // Chưa tới tầng của bậc thì mục tiêu đầu là "Đạt <tầng>". Hết 46 bậc: bậc hậu kỳ (Hóa Thần Hậu kỳ) thưởng tăng dần.
  const STAGES = gp.player.stages, SI = new Map(STAGES.map((x, i) => [x.id, i]));
  const STEPS = STAGES.map((x) => ({ st: x, k: 0, per: 1 })); // Ngũ Thiên Đạo Cảnh: 1 bậc Tiến độ / cấp (60 bậc)
  const stepOf = (n) => (n <= STEPS.length ? STEPS[n - 1] : { st: STAGES.at(-1), k: 3 + n - STEPS.length, per: 0, extra: n - STEPS.length });
  const majorOf = (id) => STAGES.find((x) => x.id === id)?.major ?? 0;
  const firstStepOfMajor = (m) => 1 + STEPS.findIndex((x) => majorOf(x.st.id) === m);
  const stageReached = (id) => (SI.get(progress.stageDef.id) ?? 0) >= (SI.get(id) ?? 0);

  function makeLadder(_c, n) {
    const L = R.ladder, { st, k, per, extra = 0 } = stepOf(n), mj = majorOf(st.id), zone = realms.realms[mj]?.zone || 'xanh';
    const zname = R.zone_names[zone] || zone, key = `L${n}`, lk = mj === 0, stone = gp.monster.stone_by_stage[st.tier] || 1;
    const of = (g) => mats.materials.filter((m) => m.zone === zone && m.group === g);
    const ores = of('khoang').length ? of('khoang') : mats.materials.filter((m) => m.group === 'khoang');
    const sp = of('dacbiet').length ? of('dacbiet') : mats.materials.filter((m) => m.zone === (realms.realms[mj + 1]?.zone || zone) && m.group === 'dacbiet');
    const kills = extra ? Math.min(L.kill_max, 80 + 20 * extra) : lk ? 20 + 4 * (SI.get(st.id) || 0) : 30 + 15 * k;
    const goals = [];
    if (!stageReached(st.id)) goals.push({ type: 'stage', target: st.id, count: 1, label: st.name });
    goals.push({ type: 'kill_zone', target: zone, count: kills, label: `yêu thú vùng ${zname}` });
    if (n % 2 === 0 && ores.length) goals.push({ type: 'collect', target: ores[0].id, count: Math.max(3, Math.round(kills / 6)) }); // khoáng thường của vùng
    const exp = Math.round(st.exp_need * (extra ? 0.1 : lk ? 0.5 : 0.25));
    const tier = extra ? (extra > 20 ? 'den' : 'do') : ['luc', 'lam', 'tim', 'cam', 'vang'][mj] || 'vang';
    return { id: `q.r.l.${n}`, type: 'ladder', routine: 'l', tier, realm: MAJOR[mj], step: n,
      title: `Tiến độ ${n}: ${st.name} · ${zname}`, desc: fill(L.desc, { zname }, { n }), goals, next: [],
      rewards: { ...(R.table?.[st.id] && !extra ? fixed(R.table[st.id].chapter) : { exp, spiritStone: stone * (lk ? 40 : 80) + stone * 10 * extra }),
        items: items([{ it: ores[0], n: extra ? Math.min(150, 30 + 5 * extra) : lk ? 5 + (SI.get(st.id) || 0) : 10 + 5 * k + 5 * mj }, // khoáng thường: nhiều
          { it: ores[1], n: extra ? 1 + Math.floor(extra / 5) : lk ? 0 : k + (mj >= 3 ? 0 : 1) }, // khoáng quý (Hư Ngọc, U Ngọc…): ít
          { it: sp.length ? pick(sp, `${key}.s`) : null, n: n % 3 === 0 ? 1 + Math.floor(n / 15) : 0 },
          { it: { id: 'item.phapbao.phoi.001' }, n: n % L.phoi_pb_every === 0 ? 1 : 0 }]) } };
  }

  // Gọi thường xuyên: hết ngày / hết tuần thì sinh bộ mới, xong bậc Tiến độ thì sinh bậc sau.
  // Trả về { add: [quest mới], drop: [id cũ cần bỏ] } để quests.js nhận / dọn.
  function ensure(isDone) {
    const s = st(), out = { add: [], drop: [] }, d = dayKey(), w = weekKey();
    let c = null; const C = () => (c ||= ctx());
    if (s.day !== d) { out.drop.push(...s.daily.map((q) => q.id)); s.day = d; s.daily = makeDaily(C(), d); out.add.push(...s.daily); }
    if (s.week !== w) { out.drop.push(...s.weekly.map((q) => q.id)); s.week = w; s.weekly = makeWeekly(C(), w); out.add.push(...s.weekly); }
    if (s.lv !== 3) { // Ngũ Thiên Đạo Cảnh (24/10): 1 bậc / cấp — bắt đầu từ bậc đầu của cảnh giới hiện tại
      if (s.lq) out.drop.push(s.lq.id);
      s.lv = 3; s.lq = null; s.ladder = Math.max(1, firstStepOfMajor(realmMajor()));
    }
    if (R.ladder.enabled === false) { if (s.lq) { out.drop.push(s.lq.id); s.lq = null; } } // 24/10: Tiến độ thay bằng Con đường Đạo Tâm
    else if (!s.lq || isDone(s.lq.id)) { if (s.lq) s.ladder = (s.ladder || 1) + 1; s.lq = makeLadder(null, s.ladder || 1); out.add.push(s.lq); }
    if (out.add.length || out.drop.length) progress.changed();
    return out;
  }
  const all = () => { const s = st(); return [...s.daily, ...s.weekly, ...(s.lq ? [s.lq] : [])]; };
  return { ensure, all, ladderStep: () => st().ladder || 1, stageReached };
}
