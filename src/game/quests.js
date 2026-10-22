// Nhiệm vụ THỬ NGHIỆM (data/quests/quests.json): nhận, đếm tiến độ theo sự kiện, nhận thưởng đúng một lần.
// Daily làm lại mỗi ngày (theo giờ máy). Mục tiêu trỏ NPC/địa điểm chưa có → "Hoàn thành tạm".
const MAJOR = { lk: 0, tc: 1, kd: 2, na: 3, ht: 4, ab: 5, vd: 6 };
const today = () => new Date().toLocaleDateString('sv'); // YYYY-MM-DD theo giờ máy

export function createQuests(def, progress, realmMajor) {
  const all = def.quests;
  const byId = new Map(all.map((q) => [q.id, q]));
  const placeholders = new Set(def.placeholders);
  const Q = () => progress.state.quests;
  const isDaily = (q) => q.type === 'daily';
  const doneToday = (q) => Q().done[q.id] === today();
  const isDone = (q) => (isDaily(q) ? doneToday(q) : !!Q().done[q.id]);
  const chained = new Set(all.flatMap((q) => q.next)); // chỉ mở khi xong nhiệm vụ trước

  function available() {
    const major = realmMajor();
    return all.filter((q) => !Q().active[q.id] && !isDone(q) && (MAJOR[q.realm] ?? 0) <= major
      && (!chained.has(q.id) || all.some((p) => p.next.includes(q.id) && Q().done[p.id])));
  }
  function accept(id) {
    const q = byId.get(id);
    if (!q || Q().active[id] || isDone(q)) return false;
    Q().active[id] = { p: q.goals.map(() => 0) };
    if (q.goals.some((g) => g.type === 'boss_unique')) Q().active[id].seen = [];
    progress.changed();
    return true;
  }
  // Nhiệm vụ chính đầu tiên tự nhận
  if (!Q().done['q.main.001'] && !Q().active['q.main.001']) accept('q.main.001');

  const complete = (id) => { const q = byId.get(id), a = Q().active[id]; return q && a && q.goals.every((g, i) => a.p[i] >= g.count); };

  // Sự kiện từ gameplay: kill {id, rank}, gain {id, n}, craft {id, kind}, use {id}, awaken, dodge, daily
  function emit(type, e = {}) {
    let changed = false;
    for (const [qid, a] of Object.entries(Q().active)) {
      const q = byId.get(qid);
      if (!q) { delete Q().active[qid]; continue; }
      q.goals.forEach((g, i) => {
        if (a.p[i] >= g.count) return;
        let n = 0;
        if ((g.type === 'kill' || g.type === 'boss') && type === 'kill' && g.target === e.id) n = 1;
        else if (g.type === 'boss_unique' && type === 'kill' && e.rank === 'boss' && !a.seen.includes(e.id)) { a.seen.push(e.id); n = 1; }
        else if (g.type === 'collect' && type === 'gain' && g.target === e.id) n = e.n;
        else if (g.type === 'craft' && type === 'craft' && (g.target === e.id || (g.target === 'equipment.blank_item' && e.kind === 'blank'))) n = 1;
        else if (g.type === 'use' && type === 'use' && g.target === e.id) n = 1;
        else if (g.type === 'awaken' && type === 'awaken') n = 1;
        else if (g.type === 'dodge_heavy' && type === 'dodge') n = 1;
        else if (g.type === 'complete_daily' && type === 'daily') n = 1;
        else if (g.type === 'discover_unique' && type === 'herb') n = 1;
        if (n) { a.p[i] = Math.min(g.count, a.p[i] + n); changed = true; }
      });
    }
    if (changed) progress.changed();
  }

  // Mục tiêu placeholder: chỉ được bấm hoàn thành tạm khi NPC/địa điểm chưa có trong game
  function fakeGoal(qid, i) {
    const q = byId.get(qid), a = Q().active[qid];
    if (!q || !a || !placeholders.has(q.goals[i].target)) return false;
    a.p[i] = q.goals[i].count; progress.changed(); return true;
  }

  // Nhận thưởng: một lần (daily: một lần mỗi ngày). Trả về thưởng để gameplay cộng.
  function claim(id) {
    const q = byId.get(id);
    if (!complete(id) || isDone(q)) return null;
    delete Q().active[id];
    Q().done[id] = isDaily(q) ? today() : true;
    for (const u of q.rewards.unlock || []) if (!progress.state.flags.includes(u)) progress.state.flags.push(u);
    for (const n of q.next) accept(n);
    progress.changed();
    if (isDaily(q)) emit('daily');
    return q.rewards;
  }

  const active = () => Object.keys(Q().active).map((id) => ({ q: byId.get(id), a: Q().active[id] })).filter((x) => x.q);
  const done = () => all.filter(isDone);
  return { available, active, done, accept, claim, emit, complete, fakeGoal, isPlaceholder: (t) => placeholders.has(t), byId };
}
