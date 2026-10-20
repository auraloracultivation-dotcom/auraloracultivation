// Luật chơi THỬ NGHIỆM phía máy khách: quái, chiến đấu, rơi đồ, tu vi/đột phá, đan dược, kỹ năng, nhiệm vụ.
// Nhận đối tượng từ main.js (map, me, hud, pt…) và trả về các hàm main.js gọi mỗi khung hình.
// Mọi con số nằm trong data/ (stats.json = Lab, gameplay.json = thông số chơi thử). Mốc 3–4: chuyển kết quả lên máy chủ.
import { wrapDelta } from '../map/index.js';
import { drawMonster, drawMonsterLabel, drawFx } from '../entity/index.js';
import { createProgress } from './progress.js';
import { createStats } from './stats.js';
import { createMonsters } from './monsters.js';
import { createQuests } from './quests.js';
import { createCraft } from './craft.js';
import { createViews } from './views.js';

const SKILL_OF_CP = { attack: 'skill.tamphap.luyen-khi.001', 'kiem-khi': 'skill.chieu.kiem-khi.001', 'linh-thu': 'skill.khe.linh-thu.001',
  'nguyen-anh': 'skill.than.canh-phong.001', 'phap-tuong': 'skill.phap-tuong.thien-thu.001' };
const MAJOR_OF = (id) => ({ lk: 0, tc: 1, kd: 2, na: 3, ht: 4 }[id.slice(0, 2)] ?? 0);
const rint = (a, b) => Math.round(a + Math.random() * (b - a));

export async function createGameplay({ loadJSON, map, me, hud, pt, toast, audio, userId }) {
  const [statsDef, gp, monDef, mats, pills, blanks, awaken, cp, questDef, qItems, realms] = await Promise.all([
    'data/stats.json', 'data/gameplay.json', 'data/monsters/monsters.json', 'data/items/materials.json', 'data/items/pills.json',
    'data/equipment/blanks.json', 'data/equipment/awaken.json', 'data/skills/cong-phap.json', 'data/quests/quests.json',
    'data/items/quest-items.json', 'data/realms.json'].map((p) => loadJSON(p)));
  const progress = createProgress(userId, gp);
  const stats = createStats(statsDef, gp);
  const mobs = createMonsters({ gp, defs: monDef.monsters, map });
  const quests = createQuests(questDef, progress, () => MAJOR_OF(progress.stageDef.id));
  const craft = createCraft({ progress, pills, blanks, awaken, skills: cp, gp });
  const itemDefs = new Map([...mats.materials, ...pills.pills, ...qItems.items].map((d) => [d.id, d]));
  const S = gp.skills, PL = gp.player;

  let ps = null; // chỉ số hiện tại
  const buffs = {}; // tên → { mul, until }
  const cds = {}; // hồi chiêu theo id
  let hp = 0, dead = false, reviveT = 0, hurtAt = -99, attackCd = 0, auto = false, targetUid = null, pet = null, now = 0;
  const fx = [], bolts = [];

  function recompute() {
    const b = {};
    for (const [k, v] of Object.entries(buffs)) if (v.until > now) b[k] = v.mul;
    ps = stats.player(progress.stageDef, progress.equipped(), b);
    pt.setMax(ps.mp);
    hp = Math.min(hp, ps.hp);
    hud.setRealm(progress.stageDef.name + (progress.atPeak() ? ' · đỉnh' : ''));
    for (const [id, s] of Object.entries(S)) if (s.unlock) hud.setLocked(id, progress.stageIndex(s.unlock) > progress.state.stage);
    views.refreshDock?.();
  }
  const cpBonus = (skill) => 1 + (progress.state.cp[SKILL_OF_CP[skill]] || 0) * S.cong_phap_bonus_per_level;
  const ptMul = () => (pt.active ? S['phap-tuong'].atk_mul : 1);
  const say = (x, y, text, color, big = false) => fx.push({ kind: 'text', x, y, text, color, big, t: 0.9, life: 0.9 });

  // ---------- Người chơi đánh quái ----------
  function strike(m, mul, skill) {
    const r = stats.hit(ps, stats.monster(m), { atkMul: mul * ptMul() * cpBonus(skill) });
    if (r.miss) { say(m.x, m.y - m.r * 2, 'Trượt', '#cfd6e6'); return; }
    say(m.x, m.y - m.r * 2, r.crit ? `${r.dmg}!` : `${r.dmg}`, r.crit ? '#ffd23a' : '#ffffff', r.crit);
    if (r.heal) hp = Math.min(ps.hp, hp + r.heal);
    if (mobs.damage(m, r.dmg)) onKill(m);
  }
  function target(range) {
    const sel = mobs.list.find((m) => m.uid === targetUid && m.state !== 'dead');
    if (sel && mobs.distTo(sel, me) <= range) return sel;
    return mobs.nearest(me, range);
  }
  function attack() {
    if (dead || attackCd > 0) return false;
    attackCd = stats.interval(ps);
    const m = target(PL.attack_range_px);
    if (m) { me.facing = mobs.rel(m, me).dx >= 0 ? 1 : -1; strike(m, 1, 'attack'); }
    return true;
  }

  // ---------- Kết quả hạ quái: tu vi, Linh thạch, nguyên liệu, vật phẩm nhiệm vụ ----------
  function gain(id, n) {
    progress.add(id, n);
    quests.emit('gain', { id, n });
    if (itemDefs.get(id)?.group === 'thao' && !progress.state.herbs.includes(id)) { progress.state.herbs.push(id); quests.emit('herb'); }
  }
  function onKill(m) {
    if (targetUid === m.uid) targetUid = null;
    const rank = m.def.rank, k = gp.monster.exp_mul[rank];
    const exp = Math.round((m.maxHp / 10) * k), stone = Math.max(1, Math.round(m.maxHp * gp.monster.stone_per_hp * k));
    addExp(exp); progress.addStone(stone);
    const zoneMats = mats.materials.filter((x) => x.zone === m.def.zone);
    const got = [];
    for (const [grp, key] of [['thao', 'herb'], ['khoang', 'ore'], ['dacbiet', 'special']]) {
      const [p, a, b] = gp.loot[rank][key];
      const pool = zoneMats.filter((x) => x.group === grp);
      if (!pool.length || Math.random() > p) continue;
      const it = pool[Math.floor(Math.random() * pool.length)], n = rint(a, b);
      gain(it.id, n); got.push(`${it.name} ×${n}`);
    }
    for (const q of qItems.items) {
      const d = q.drop;
      const match = d.from ? d.from === m.def.id : d.from_rank === rank;
      if (match && (!d.only_when_quest || progress.state.quests.active[d.only_when_quest]) && Math.random() < d.chance) { gain(q.id, 1); got.push(q.name); }
    }
    if (rank === 'boss' && !progress.state.bosses.includes(m.def.id)) progress.state.bosses.push(m.def.id);
    quests.emit('kill', { id: m.def.id, rank });
    say(m.x, m.y - m.r * 3, `+${exp} tu vi · +${stone} Linh thạch`, '#9fe8ff');
    if (got.length) toast(`Nhặt: ${got.join(', ')}`, 1800);
    progress.changed();
  }
  function addExp(n) {
    const ups = progress.addExp(n);
    if (ups.length) { hp = Infinity; toast(`Đột phá tầng: ${ups[ups.length - 1].name}`, 2200); }
    if (progress.atPeak()) toast('Tu vi đã đến đỉnh — chạm nút Đột phá', 2200);
    recompute(); hp = Math.min(hp, ps.hp);
  }

  // ---------- Quái đánh người chơi ----------
  const env = {
    me, alive: true,
    hitPlayer(m, mul) {
      const r = stats.hit(stats.monster(m), ps, { atkMul: mul, defMul: pt.active ? S['phap-tuong'].def_mul : 1 });
      hurtAt = now;
      if (r.miss) { say(me.x, me.y - 22, 'Né', '#9fe8ff'); return; }
      hp -= r.dmg;
      say(me.x, me.y - 22, `-${r.dmg}`, mul > 1 ? '#ff5a3a' : '#ff9a8a', mul > 1);
      if (r.reflect && mobs.damage(m, r.reflect)) onKill(m);
      if (hp <= 0) die();
    },
    dodged() { say(me.x, me.y - 22, 'Né đòn nặng!', '#7dff8a', true); quests.emit('dodge'); },
  };
  function die() {
    hp = 0; dead = true; reviveT = PL.revive_s; mobs.calmAll(); auto = false; hud.setActive('auto', false);
    if (pt.active) pt.cancel();
    toast(`Trọng thương! Hồi phục sau ${PL.revive_s} giây`, 2500);
  }

  // ---------- Kỹ năng ----------
  function ready(id) {
    const s = S[id];
    if (dead) return false;
    if ((cds[id] || 0) > now) { toast('Đang hồi chiêu', 900); return false; }
    if (!pt.spend(s.mp)) { toast('Linh lực không đủ', 1000); return false; }
    cds[id] = now + s.cd_s; return true;
  }
  function skill(id) {
    const s = S[id];
    if (!ready(id)) return;
    if (id === 'kiem-khi') {
      const m = target(s.range_px);
      let dx = me.facing, dy = 0;
      if (m) { const r = mobs.rel(m, me); const d = Math.hypot(r.dx, r.dy) || 1; dx = r.dx / d; dy = r.dy / d; }
      bolts.push({ kind: 'bolt', x: me.x, y: me.y - 10, vx: dx * s.speed_px_per_s, vy: dy * s.speed_px_per_s, left: s.range_px });
    } else if (id === 'khong-che') {
      const m = target(s.range_px);
      if (m) { m.stun = s.stun_s; say(m.x, m.y - m.r * 2, 'Choáng', '#ffe36a'); } else toast('Không có mục tiêu gần', 900);
    } else if (id === 'linh-thu') {
      pet = { until: now + s.last_s, next: now, x: me.x - 14, y: me.y };
      toast('Linh thú hiện thân', 1000);
    } else if (id === 'luot') {
      buffs.ne = { mul: s.ne_mul, until: now + s.last_s }; buffs.speed = { mul: s.speed_px_per_s, until: now + s.last_s };
      recompute(); toast('Lăng Ba Vi Bộ', 900);
    } else if (id === 'nguyen-anh') {
      fx.push({ kind: 'ring', x: me.x, y: me.y, r: s.radius_px, color: '#c9a6ff', t: 0.5, life: 0.5 });
      for (const m of mobs.within(me, s.radius_px)) strike(m, s.mul, 'nguyen-anh');
    }
  }
  function usePill(id) {
    const p = gp.pills[id];
    if (!p || dead) return false;
    if ((cds.pill || 0) > now) { toast('Đan dược đang hồi', 900); return false; }
    if (!progress.take(id, 1)) { toast(`Hết ${itemDefs.get(id)?.name || 'đan'}`, 1200); return false; }
    cds.pill = now + gp.pills.use_cooldown_s;
    if (p.heal_hp) { hp = Math.min(ps.hp, hp + ps.hp * p.heal_hp); say(me.x, me.y - 22, `+${Math.round(ps.hp * p.heal_hp)}`, '#7dff8a'); }
    if (p.heal_mp) pt.gain(ps.mp * p.heal_mp);
    if (p.buff === 'pt_drain') pt.setDrainMul(p.mul, p.s);
    else if (p.buff) { buffs[p.buff] = { mul: p.mul, until: now + p.s }; recompute(); }
    quests.emit('use', { id });
    toast(`Dùng ${itemDefs.get(id).name}`, 1000);
    return true;
  }
  function breakthrough() {
    const next = progress.nextStageDef();
    if (!next) return toast('Đã ở cảnh giới cao nhất', 1500);
    if (!progress.atPeak()) {
      const need = progress.stageDef.exp_need - progress.state.exp;
      return toast(gp.major_realm_first_stage[next.id] ? `Cần thêm ${need} tu vi để đột phá` : `Tu vi đủ sẽ tự lên tầng (còn ${need})`, 1800);
    }
    const realm = realms.realms.find((r) => r.id === gp.major_realm_first_stage[next.id]);
    const pill = itemDefs.get(realm.breakthrough.pill);
    if (!progress.take(pill.id, 1)) return toast(`Cần ${pill.name} (luyện ở Tu luyện → Luyện đan)`, 2200);
    if (Math.random() < realm.breakthrough.rate) {
      progress.advanceStage(); hp = Infinity; recompute(); hp = ps.hp;
      toast(`Đột phá thành công: ${progress.stageDef.name}!`, 3000);
    } else toast(`Đột phá thất bại (${Math.round(realm.breakthrough.rate * 100)}%) — mất ${pill.name}, tu vi giữ nguyên`, 3000);
    progress.changed();
  }

  // ---------- Mỗi khung hình ----------
  function update(dt) {
    now += dt;
    attackCd = Math.max(0, attackCd - dt);
    for (const [k, v] of Object.entries(buffs)) if (v.until <= now) { delete buffs[k]; recompute(); }
    if (dead) { reviveT -= dt; if (reviveT <= 0) { dead = false; hp = ps.hp; toast('Đã hồi phục', 1200); } }
    else if (now - hurtAt > PL.regen_after_s) hp = Math.min(ps.hp, hp + ps.hp * PL.regen_hp_per_s * dt);
    env.alive = !dead;
    mobs.update(dt, env);
    if (auto && !dead && target(PL.attack_range_px) && attackCd <= 0) { attack(); me.onAutoSwing?.(); }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i], step = Math.hypot(b.vx, b.vy) * dt;
      b.x = map.wrapX(b.x + b.vx * dt); b.y = map.wrapY(b.y + b.vy * dt); b.left -= step;
      const m = mobs.list.find((x) => x.state !== 'dead' && Math.hypot(wrapDelta(x.x - b.x, map.width), wrapDelta(x.y - x.r - b.y, map.height)) < x.r + 5);
      if (m) strike(m, S['kiem-khi'].mul, 'kiem-khi');
      if (m || b.left <= 0) bolts.splice(i, 1);
    }
    if (pet) {
      if (now > pet.until || dead) pet = null;
      else {
        pet.x += (me.x - 14 * me.facing - pet.x) * Math.min(1, dt * 4); pet.y += (me.y + 4 - pet.y) * Math.min(1, dt * 4);
        const m = target(120);
        if (m && now >= pet.next) { pet.next = now + S['linh-thu'].every_s; strike(m, S['linh-thu'].mul, 'linh-thu'); }
      }
    }
    for (let i = fx.length - 1; i >= 0; i--) { fx[i].t -= dt; if (fx[i].t <= 0) fx.splice(i, 1); }
    if (!Number.isFinite(hp)) hp = ps.hp;
    hud.setBar('hp', Math.max(0, Math.round(hp)), ps.hp);
    hud.setBar('xp', progress.state.exp, progress.stageDef.exp_need);
    progress.state.hp = Math.round(hp);
    progress.tick(dt);
  }

  const at = (o) => ({ x: me.x + wrapDelta(o.x - me.x, map.width), y: me.y + wrapDelta(o.y - me.y, map.height) });
  function renderBelow(ctx, t) {
    const list = mobs.list.map((m) => ({ m, ...at(m) })).sort((a, b) => a.y - b.y);
    for (const { m, x, y } of list) {
      if (m.state === 'windup') { const w = at({ x: m.wx, y: m.wy }); m.wrx = w.x; m.wry = w.y; m.heavyR = gp.monster.heavy.radius_px; }
      drawMonster(ctx, m, x, y, t);
    }
    if (pet) drawFx(ctx, [{ kind: 'pet', ...at(pet) }], 0, 0);
  }
  function renderAbove(ctx, t) {
    for (const m of mobs.list) { const p = at(m); drawMonsterLabel(ctx, m, p.x, p.y, m.uid === targetUid, t); }
    drawFx(ctx, [...bolts, ...fx].map((f) => ({ ...f, ...at(f) })), 0, 0);
  }

  // Chạm vào quái → chọn mục tiêu. Trả về true nếu đã xử lý (main.js khỏi xét người chơi)
  function tap(wx, wy) {
    let best = null, bd = 18;
    for (const m of mobs.list) {
      if (m.state === 'dead') continue;
      const p = at(m), d = Math.hypot(p.x - wx, p.y - m.r - wy);
      if (d < bd + m.r) { bd = d; best = m; }
    }
    if (!best) return false;
    targetUid = best.uid === targetUid ? null : best.uid;
    if (targetUid) toast(`Mục tiêu: ${best.def.name}`, 900);
    return true;
  }

  const views = createViews({ monsters: monDef.monsters, progress, quests, craft, itemDefs, mats, pills, blanks, awaken, cp, realms, gp, toast,
    getStats: () => ps, getHp: () => hp, onReward: (r) => { if (r.exp) addExp(r.exp); if (r.spiritStone) progress.addStone(r.spiritStone);
      for (const i of r.items || []) progress.add(i.id, i.count); }, recompute, usePill, emit: quests.emit });

  hp = progress.state.hp ?? Infinity;
  recompute(); if (!Number.isFinite(hp) || hp <= 0) hp = ps.hp;
  progress.onChange(() => views.refreshDock?.());
  addEventListener('pagehide', () => progress.flush());

  return {
    update, renderBelow, renderAbove, tap, attack, skill, breakthrough, usePill,
    get dead() { return dead; },
    _debug: { progress, mobs, get hp() { return hp; }, get ps() { return ps; } }, // chỉ cho kiểm thử (?debug)
    speed: () => buffs.speed?.mul || null,
    toggleAuto() { auto = !auto; hud.setActive('auto', auto); toast(auto ? 'Tự động đánh: bật' : 'Tự động đánh: tắt', 1000); },
    healPill: () => usePill('item.dan.tieu-hoi-huyet.001'),
    statValue: views.statValue, openQuests: views.openQuests, openCultivate: views.openCultivate,
    setDock(d) { views.refreshDock = d.refresh; },
    bagEntries: views.bagEntries, onBagUse: views.onBagUse, realmName: () => progress.stageDef.name,
    markers: () => mobs.list.filter((m) => m.def.rank !== 'thuong' && m.state !== 'dead').map((m) => ({ x: m.x, y: m.y, boss: true })),
  };
}
