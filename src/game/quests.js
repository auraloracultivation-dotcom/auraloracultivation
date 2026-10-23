// Nhiệm vụ THỬ NGHIỆM (data/quests/quests.json): nhận, đếm tiến độ theo sự kiện, nhận thưởng đúng một lần.
// Daily làm lại mỗi ngày (0h giờ VN). Mục tiêu trỏ NPC/địa điểm chưa có → "Hoàn thành tạm".
// Nhiệm vụ Ngày / Tuần / Tiến độ sinh tự động (src/game/routine.js) được đăng ký thêm vào danh sách và tự nhận.
import { createRoutine } from './routine.js';
const MAJOR = { lk: 0, tc: 1, kd: 2, na: 3, ht: 4, ab: 5, vd: 6 };
let NOW = Date.now; // giờ máy chủ (extra.now) — đổi giờ máy không làm mới nhiệm vụ
const today = () => new Date(NOW() + 7 * 3600e3).toISOString().slice(0, 10); // YYYY-MM-DD giờ VN

// extra: { realms, gp, mats } — có thì bật nhiệm vụ Ngày / Tuần / Tiến độ
export function createQuests(def, progress, realmMajor, extra = null) {
  if (extra?.now) NOW = extra.now;
  // Có nhiệm vụ Ngày / Tuần / Tiến độ tự sinh thì bỏ các nhiệm vụ "Daily" cũ của Lab (thưởng cố định rất nhỏ, lệch xa thưởng mới)
  // 24/10: chuỗi chính cũ (main, Tầm Bảo, explore…) thay bằng Con đường Đạo Tâm (daotam.js) — quests.json → retired_types
  const RT = new Set(def.retired_types || []);
  const retired = new Set(def.quests.filter((q) => (extra && def.routine && q.type === 'daily') || RT.has(q.type)).map((q) => q.id));
  const all = def.quests.filter((q) => !retired.has(q.id));
  const byId = new Map(all.map((q) => [q.id, q]));
  const placeholders = new Set(def.placeholders);
  const Q = () => progress.state.quests;
  const isDaily = (q) => q.type === 'daily';
  const doneToday = (q) => Q().done[q.id] === today();
  const isDone = (q) => (isDaily(q) ? doneToday(q) : !!Q().done[q.id]);
  const chained = new Set(all.flatMap((q) => q.next)); // chỉ mở khi xong nhiệm vụ trước

  // ---- Ngày / Tuần / Tiến độ ----
  const routine = extra && def.routine ? createRoutine({ R: def.routine, progress, realmMajor, ...extra }) : null;
  const register = (q) => { if (!byId.has(q.id)) { all.push(q); byId.set(q.id, q); } };
  routine?.all().forEach(register);
  for (const id of retired) delete Q().active[id];
  function sync() {
    if (!routine) return;
    const r = routine.ensure((id) => !!Q().done[id]);
    for (const id of r.drop) { // hết ngày / hết tuần: bỏ nhiệm vụ cũ
      delete Q().active[id]; byId.delete(id); // GIỮ done[id]: chỉnh lùi giờ máy sinh lại đúng id cũ cũng không nhận thưởng lại được
      const i = all.findIndex((q) => q.id === id); if (i >= 0) all.splice(i, 1);
    }
    for (const q of r.add) { register(q); accept(q.id); }
    for (const [id, a] of Object.entries(Q().active)) { // mục tiêu "Đạt cảnh giới" của bậc Tiến độ: tự tích khi đủ tầng
      const q = byId.get(id); q?.goals.forEach((g, i) => { if (g.type === 'stage') a.p[i] = routine.stageReached(g.target) ? 1 : 0; });
    }
  }

  function available() {
    sync();
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
  if (byId.has('q.main.001') && !Q().done['q.main.001'] && !Q().active['q.main.001']) accept('q.main.001');

  const complete = (id) => { const q = byId.get(id), a = Q().active[id]; return q && a && q.goals.every((g, i) => a.p[i] >= g.count); };

  // Sự kiện từ gameplay: kill {id, rank}, gain {id, n}, craft {id, kind}, use {id}, awaken, dodge, daily
  const listeners = [];
  function emit(type, e = {}) {
    for (const f of listeners) f(type, e); // Con đường Đạo Tâm (daotam.js) nghe chung sự kiện
    let changed = false;
    for (const [qid, a] of Object.entries(Q().active)) {
      const q = byId.get(qid);
      if (!q) { delete Q().active[qid]; continue; }
      q.goals.forEach((g, i) => {
        if (a.p[i] >= g.count) return;
        let n = 0;
        if ((g.type === 'kill' || g.type === 'boss') && type === 'kill' && g.target === e.id) n = 1;
        else if (g.type === 'kill_zone' && type === 'kill' && e.zone === g.target && (!g.rank || g.rank === e.rank)) n = 1;
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
    for (const n of q.next) if ((MAJOR[byId.get(n)?.realm] ?? 0) <= realmMajor()) accept(n); // chưa đủ cảnh giới: để ở "Có thể nhận" (auto thì tự nhận khi đủ)
    progress.changed();
    if (isDaily(q)) emit('daily');
    return q.rewards;
  }

  const active = () => (sync(), Object.keys(Q().active)).map((id) => ({ q: byId.get(id), a: Q().active[id] })).filter((x) => x.q);
  const done = () => all.filter(isDone);
  return { onEmit: (f) => listeners.push(f), available, active, done, accept, claim, emit, complete, fakeGoal, isPlaceholder: (t) => placeholders.has(t), byId, ladderStep: () => routine?.ladderStep() || 0 };
}
