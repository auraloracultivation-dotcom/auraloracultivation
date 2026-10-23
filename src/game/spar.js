// LUẬN BÀN (tỉ thí) với người trên Bảng xếp hạng (chủ dự án 23/10/2026): đấu thử với "bóng" chỉ số của họ, ngay trên máy mình.
// Không ai mất gì, không thưởng, không ghi máy chủ — chỉ để thử sức. Dùng đúng công thức đòn đánh của game (stats.hit / interval).
// Số liệu: gameplay.json → spar. Trả về danh sách sự kiện theo thời gian để src/ui/spar.js phát lại.
const KEYS = ['hp', 'linh', 'def', 'xuyen', 'chinh', 'ne', 'crit', 'hut', 'tocdanh', 'phan'];

export function simulateDuel(mine, theirs, stats, cfg, rnd = Math.random) {
  const side = (s) => { const o = {}; for (const k of KEYS) o[k] = Number(s?.[k]) || 0; o.hp = Math.max(1, o.hp * cfg.hp_mul); return o; };
  const F = [side(mine), side(theirs)], hp = [F[0].hp, F[1].hp];
  const next = [stats.interval(F[0]) * rnd(), stats.interval(F[1]) * rnd()], nSkill = [cfg.skill_every_s, cfg.skill_every_s * 1.15];
  const ev = [];
  let t = 0;
  while (t < cfg.max_s && hp[0] > 0 && hp[1] > 0) {
    const a = next[0] <= next[1] ? 0 : 1, d = 1 - a;
    t = next[a];
    const skill = t >= nSkill[a];
    if (skill) nSkill[a] += cfg.skill_every_s;
    const r = stats.hit(F[a], F[d], { atkMul: cfg.dmg_mul * (skill ? cfg.skill_mul : 1) }, rnd);
    hp[d] = Math.max(0, hp[d] - r.dmg);
    if (r.heal) hp[a] = Math.min(F[a].hp, hp[a] + r.heal);
    if (r.reflect && hp[d] > 0) hp[a] = Math.max(0, hp[a] - r.reflect);
    ev.push({ t, from: a, dmg: r.dmg, miss: !!r.miss, crit: !!r.crit, skill, heal: r.heal || 0, reflect: r.reflect || 0, hp: [hp[0], hp[1]] });
    next[a] += stats.interval(F[a]);
  }
  // Hết giờ: bên còn nhiều % khí huyết hơn thắng
  const win = hp[1] <= 0 ? 0 : hp[0] <= 0 ? 1 : hp[0] / F[0].hp >= hp[1] / F[1].hp ? 0 : 1;
  return { events: ev, maxHp: [F[0].hp, F[1].hp], winner: win, time: t, timeout: hp[0] > 0 && hp[1] > 0 };
}
