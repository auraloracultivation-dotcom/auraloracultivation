// Nhiệm vụ Ngày / Tuần / Tiến độ (chủ dự án 23/10/2026: tu tiên + idle — hạ quái nhận ít, thưởng chính từ nhiệm vụ).
// Sinh theo VÙNG của đại cảnh giới đang tu (realms.json → zone), số liệu ở data/quests/quests.json → routine.
//   Ngày: 3 việc ~15 phút, reset 0h giờ VN · Tuần: 3 việc khó, reset 0h thứ Hai giờ VN · Tiến độ: bậc 1→n không reset.
// Nhiệm vụ đã sinh lưu nguyên trong progress.state.routine (đổi cảnh giới giữa ngày không đổi nhiệm vụ hôm đó).
// THỬ NGHIỆM phía máy khách như phần nhiệm vụ còn lại.
const MAJOR = ['lk', 'tc', 'kd', 'na', 'ht', 'ab', 'vd'];

export function createRoutine({ R, progress, realmMajor, realms, gp, mats }) {
  const vn = () => new Date(Date.now() + R.tz_offset_h * 3600e3); // giờ VN, đọc bằng getUTC*
  const dayKey = () => vn().toISOString().slice(0, 10);
  const weekKey = () => { const d = vn(), back = (d.getUTCDay() + 6) % 7; return new Date(d.getTime() - back * 864e5).toISOString().slice(0, 10); }; // ngày thứ Hai
  const seed = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pick = (arr, s) => arr[seed(s) % arr.length];
  const st = () => (progress.state.routine ||= { day: '', daily: [], week: '', weekly: [], ladder: 1, lq: null });

  // Bối cảnh lúc sinh: vùng, tầng tu, số tu vi / Linh thạch gốc
  function ctx() {
    const major = realmMajor(), code = MAJOR[major] || 'lk', zone = realms.realms[major]?.zone || 'xanh';
    const stage = progress.stageDef, stone = gp.monster.stone_by_stage[stage.id] || 1;
    const of = (z, g) => mats.materials.filter((m) => m.zone === z && m.group === g);
    const zi = R.zone_order.indexOf(zone);
    const special = of(zone, 'dacbiet').length ? of(zone, 'dacbiet') : of(R.zone_order[zi + 1] || zone, 'dacbiet'); // vùng đầu chưa có đồ đặc biệt → mượn vùng sau
    return { major, code, zone, zname: R.zone_names[zone] || zone, need: stage.exp_need, stone, herbs: of(zone, 'thao'), ores: of(zone, 'khoang'), special };
  }
  const fill = (s, c, extra = {}) => s.replace(/\{(\w+)\}/g, (_, k) => (k === 'zone' ? c.zname : extra[k] ?? ''));
  function goalOf(t, c, key) {
    const g = t.goal;
    if (g.type === 'collect') { const it = pick(c[g.group === 'thao' ? 'herbs' : 'ores'], key); return { goal: { type: 'collect', target: it.id, count: g.count }, item: it.name }; }
    const rk = { thuong: 'yêu thú', elite: 'tinh anh', boss: 'thủ lĩnh' }[g.rank] || 'yêu thú';
    return { goal: { type: 'kill_zone', target: c.zone, rank: g.rank, count: g.count, label: `${rk} vùng ${c.zname}` } };
  }
  const items = (list) => list.filter((x) => x.it && x.n > 0).map((x) => ({ id: x.it.id, count: x.n }));

  function makeDaily(c, key) {
    const W = R.daily_reward;
    return R.daily.map((t, i) => {
      const { goal, item } = goalOf(t, c, `${key}.${i}`);
      return { id: `q.r.d.${key}.${i}`, type: 'daily', routine: 'd', tier: t.tier, realm: c.code, title: fill(t.title, c), desc: fill(t.desc, c, { item }), goals: [goal], next: [],
        rewards: { exp: Math.round(c.need * (W.exp_bar[c.code] ?? 0.05)), spiritStone: c.stone * W.stone_kills, items: items([{ it: pick(c.herbs, `${key}.h${i}`), n: W.herb }]) } };
    });
  }
  function makeWeekly(c, key) {
    const W = R.weekly_reward;
    return R.weekly.map((t, i) => {
      const { goal } = goalOf(t, c, `${key}.${i}`);
      return { id: `q.r.w.${key}.${i}`, type: 'weekly', routine: 'w', tier: t.tier, realm: c.code, title: fill(t.title, c), desc: fill(t.desc, c), goals: [goal], next: [],
        rewards: { exp: Math.round(c.need * (W.exp_bar[c.code] ?? 0.2)), spiritStone: c.stone * W.stone_kills[i],
          items: items([{ it: pick(c.ores, `${key}.o${i}`), n: W.ore[i] }, { it: pick(c.special, `${key}.s${i}`), n: W.special[i] }, { it: { id: 'item.phapbao.phoi.001' }, n: W.phoi_pb[i] }]) } };
    });
  }
  function makeLadder(c, n) {
    const L = R.ladder, key = `L${n}`;
    const goals = [{ type: 'kill_zone', target: c.zone, count: Math.min(L.kill_max, L.kill_base + L.kill_step * (n - 1)), label: `yêu thú vùng ${c.zname}` }];
    if (n % L.ore_every === 0 && c.ores.length) goals.push({ type: 'collect', target: pick(c.ores, key).id, count: Math.min(L.ore_max, L.ore_base + L.ore_step * n) });
    return { id: `q.r.l.${n}`, type: 'ladder', routine: 'l', tier: L.tiers.find(([k]) => n < k)?.[1] || 'den', realm: c.code,
      title: fill(L.title, c, { n }), desc: fill(L.desc, c, { n }), goals, next: [],
      rewards: { exp: Math.round(c.need * L.exp_bar), spiritStone: c.stone * (L.stone_kills_base + L.stone_kills_step * (n - 1)),
        items: items([{ it: pick(c.ores, `${key}.r`), n: L.reward_ore_base + L.reward_ore_step * n },
          { it: pick(c.special, `${key}.s`), n: n % L.special_every === 0 ? 1 + Math.floor(n / 10) : 0 },
          { it: { id: 'item.phapbao.phoi.001' }, n: n % L.phoi_pb_every === 0 ? 1 : 0 }]) } };
  }

  // Gọi thường xuyên: hết ngày / hết tuần thì sinh bộ mới, xong bậc Tiến độ thì sinh bậc sau.
  // Trả về { add: [quest mới], drop: [id cũ cần bỏ] } để quests.js nhận / dọn.
  function ensure(isDone) {
    const s = st(), out = { add: [], drop: [] }, d = dayKey(), w = weekKey();
    let c = null; const C = () => (c ||= ctx());
    if (s.day !== d) { out.drop.push(...s.daily.map((q) => q.id)); s.day = d; s.daily = makeDaily(C(), d); out.add.push(...s.daily); }
    if (s.week !== w) { out.drop.push(...s.weekly.map((q) => q.id)); s.week = w; s.weekly = makeWeekly(C(), w); out.add.push(...s.weekly); }
    if (!s.lq || isDone(s.lq.id)) { if (s.lq) s.ladder = (s.ladder || 1) + 1; s.lq = makeLadder(C(), s.ladder || 1); out.add.push(s.lq); }
    else if (s.lq.realm !== (MAJOR[realmMajor()] || 'lk')) { out.drop.push(s.lq.id); s.lq = makeLadder(C(), s.ladder || 1); out.add.push(s.lq); } // lên đại cảnh giới: bậc đang làm chuyển sang vùng mới
    if (out.add.length || out.drop.length) progress.changed();
    return out;
  }
  const all = () => { const s = st(); return [...s.daily, ...s.weekly, ...(s.lq ? [s.lq] : [])]; };
  return { ensure, all, ladderStep: () => st().ladder || 1 };
}
