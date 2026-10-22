// Luật chơi THỬ NGHIỆM phía máy khách: quái, chiến đấu, rơi đồ, tu vi/đột phá, đan dược, kỹ năng, nhiệm vụ.
// Nhận đối tượng từ main.js (map, me, hud, pt…) và trả về các hàm main.js gọi mỗi khung hình.
// Mọi con số nằm trong data/ (stats.json = Lab, gameplay.json = thông số chơi thử). Mốc 3–4: chuyển kết quả lên máy chủ.
import { wrapDelta } from '../map/index.js';
import { drawMonster, drawMonsterLabel, drawFx, drawNode, loadSprites, fxDuration, loadNpcArt, drawNpc, drawNpcLabel } from '../entity/index.js';
import { createNpcs } from './npcs.js';
import { createItemInfo } from './iteminfo.js';
import { createForgedArt } from './forged-art.js';
import { createFxQueue } from './fxqueue.js';
import { createCpEffects } from './cp-effects.js';
import { createProgress } from './progress.js';
import { createStats } from './stats.js';
import { createMonsters } from './monsters.js';
import { createQuests } from './quests.js';
import { createCraft } from './craft.js';
import { createViews } from './views.js';
import { createSkillBar } from './skillbar.js';
import { createAutoPlay } from './autoplay.js';
import { createSoul } from './soul.js';
import { createLoot } from './loot.js';
import { openCodex } from './codex.js';
import { createGather } from './gather.js';
import { createInventory } from './inventory.js';
import { createVoid } from './void.js';
import { grantFull } from './testgift.js';
import { createSkills } from './skills.js';
import { createLoadout } from './loadout.js';
import { openSkillPanel } from './skillview.js';
import { createWallet } from './currency.js';
import { createLifespan } from './lifespan.js';
import { createTame } from './tame.js';
import { placeholderIcon, showRevive } from '../ui/index.js';
import { artInfo, iconUrl, fxIconUrl } from '../entity/index.js';

const MAJOR_OF = (id) => ({ lk: 0, tc: 1, kd: 2, na: 3, ht: 4, ab: 5, vd: 6 }[id.slice(0, 2)] ?? 0);
const HEAL_PILL = 'item.dan.tieu-hoi-huyet.001';

// bag: Kho đồ 6 hệ (src/ui/testbag.js) — đồ trong Kho thức tỉnh được; onLook(): báo main.js cập nhật hình mặc trên người
export async function createGameplay({ onRespawn = () => {}, loadJSON, map, me, hud, pt, toast, audio, userId, bag, onLook = () => {}, onRealm = () => {}, serverNow, timeSynced = () => true, onToaHoa = () => {} }) {
  const [statsDef, gp, monDef, mats, pills, blanks, awaken, cp, questDef, qItems, realms] = await Promise.all([
    'data/stats.json', 'data/gameplay.json', 'data/monsters/monsters.json', 'data/items/materials.json', 'data/items/pills.json',
    'data/equipment/blanks.json', 'data/equipment/awaken.json', 'data/skills/cong-phap.json', 'data/quests/quests.json',
    'data/items/quest-items.json', 'data/realms.json'].map((p) => loadJSON(p)));
  const [recipes, shop, artIdx] = await Promise.all([loadJSON('data/items/recipes.json'), loadJSON('data/shop.json'), loadJSON('data/equipment/art.json')]);
  const [curDef, lifeDef, premium] = await Promise.all(['data/currency.json', 'data/lifespan.json', 'data/items/premium.json'].map((p) => loadJSON(p)));
  const artDef = await loadJSON('data/art/sprites.json');
  await Promise.all([loadSprites(artDef), loadNpcArt(artDef.npc)]); // hình quái, hiệu ứng, icon, NPC (thử nghiệm)
  const progress = createProgress(userId, gp);
  const wallet = createWallet({ def: curDef, progress }); // Vàng · Linh thạch · Tiên ngọc
  const life = createLifespan({ def: lifeDef, progress, stages: gp.player.stages, serverNow }); // thọ nguyên theo ngày giờ Việt Nam
  const { ensureArt, forgedLook, artFile } = createForgedArt(artIdx, progress); // hình ngẫu nhiên cho đồ luyện từ phôi
  const stats = createStats(statsDef, gp);
  const mobs = createMonsters({ gp, mdef: monDef, map });
  const voids = createVoid({ mdef: monDef, mobs, map, progress, toast, me, serverNow });
  const quests = createQuests(questDef, progress, () => MAJOR_OF(progress.stageDef.id));
  // Đan phương / công thức / bí kíp: món id được dạy bởi vật phẩm nào; có trong kho mới luyện được
  const teacher = new Map(recipes.items.filter((r) => r.teaches).map((r) => [r.teaches, r.id]));
  const owns = (id) => !teacher.has(id) || progress.count(teacher.get(id)) > 0;
  const craft = createCraft({ progress, pills, blanks, awaken, skills: cp, gp, owns });
  const gather = createGather({ gp, mats, map });
  const info = createItemInfo({ monsters: monDef.monsters, shop, pills, blanks, realms, gp, cpText: (id) => cpFx.text(id) }); // tác dụng + nơi có của vật phẩm
  const npcs = createNpcs({ def: await loadJSON('data/npcs.json'), map, mobs, stats, stages: gp.player.stages });
  const PV = gp.pvp, rollLoot = createLoot({ gp, mats, qItems, recipes, progress });
  const autoPlay = createAutoPlay({ me, mobs, gather, map, cfg: gp.auto, reach: gp.player.attack_range_px, canFly: () => !!me.look?.weapon && pt.mp >= 15 });
  gather.seed(me);
  const SLOTS = ['mat-na', 'trang-phuc', 'vu-khi', 'nhan', 'canh', 'phap-tuong', 'linh-thu', 'day-chuyen'];
  // Trang bị đang tính chỉ số: đồ luyện ra đang mặc + đồ Kho đang mặc đã thức tỉnh
  const wornGear = () => [...progress.equipped(),
    ...SLOTS.map((sl) => bag.equippedItem(sl)).filter(Boolean).map((it) => progress.state.itemAw[it.id]).filter((a) => a?.tier)];
  const itemDefs = new Map([...mats.materials, ...pills.pills, ...qItems.items, ...recipes.items, ...premium.items].map((d) => [d.id, d]));
  const S = gp.skills, PL = gp.player;

  let ps = null; // chỉ số hiện tại
  const buffs = {}; // tên → { mul, until }
  const cds = {}; // hồi chiêu theo id
  let wasInTown = null;
  let guardUntil = 0, npcTarget = null; // bảo vệ sau hồi sinh; NPC đang nhắm
  me.shield = progress.state.shield ?? true; // khiên bảo vệ (mặc định bật)
  let stunUntil = 0; // bị boss trói: không đi được
  let hp = 0, dead = false, autoDir = null, hurtAt = -99, attackCd = 0, auto = false, targetUid = null, pet = null, now = 0;
  const fx = [], bolts = [];
  const { say, play } = createFxQueue(fx, fxDuration); // số bay trên đầu + hiệu ứng hình

  function recompute() {
    const b = {};
    for (const [k, v] of Object.entries(buffs)) if (v.until > now) b[k] = v.mul;
    ps = cpFx.apply(stats.player(progress.stageDef, wornGear(), b)); // + tác dụng công pháp
    pt.setMax(ps.mp);
    hp = Math.min(hp, ps.hp);
    hud.setRealm(life.label(progress.stageDef.name + (progress.atPeak() ? ' · đỉnh' : '')));
    me.realm = life.label(progress.stageDef.name); onRealm(me.realm); // cảnh giới + thọ nguyên: hiện trên đầu + gửi cho người khác
    views.refreshDock?.();
  }
  const cpFx = createCpEffects(S.cong_phap_effects, () => progress.state.cp);
  const cpBonus = (skill) => cpFx.skillMul(skill);
  const ptMul = () => (pt.active ? S['phap-tuong'].atk_mul * cpFx.skillMul('phap-tuong') : 1);
  const HEAD = 30; // độ cao đầu nhân vật (điểm)
  const healMe = (n) => { if (n > 0) { hp = Math.min(ps.hp, hp + n); say(me.x, me.y - HEAD, `+${Math.round(n)} hút máu`, '#5dff7a'); } };
  const midY = (m) => m.y - (m.def.art?.h || m.r * 2) / 2;
  const HIT_FX = { attack: ['chem-x', 18], 'kiem-khi': ['kiem-bang-no', 28], 'linh-thu': ['chem-x', 14] };

  // ---------- Người chơi đánh quái ----------
  function strike(m, mul, skill) {
    const r = stats.hit(ps, stats.monster(m), { atkMul: mul * ptMul() * cpBonus(skill) });
    const top = m.y - (m.def.art?.h || m.r * 2) - 4;
    if (r.miss) { say(m.x, top, 'Trượt', '#cfd6e6'); return; }
    say(m.x, top, r.crit ? `Bạo kích -${r.dmg}` : `-${r.dmg}`, r.crit ? '#ffd23a' : '#ffffff', r.crit);
    const hf = HIT_FX[skill];
    if (hf) play(hf[0], m.x, midY(m), hf[1] * (r.crit ? 1.4 : 1));
    healMe(r.heal);
    if (mobs.damage(m, r.dmg)) onKill(m);
  }
  function target(range) {
    const sel = mobs.list.find((m) => m.uid === targetUid && m.state !== 'dead');
    if (sel && mobs.distTo(sel, me) <= range) return sel;
    return mobs.nearest(me, range);
  }
  // Ngoài thành, tắt khiên, không trong thời gian bảo vệ → đánh / bị đánh được
  const canFight = () => !dead && !me.shield && now >= guardUntil && !map.safeAt(me.x, me.y);
  function strikeNpc(n) {
    const r = stats.hit(ps, n.st, { atkMul: ptMul() * cpBonus('attack') });
    if (r.miss) return say(n.x, n.y - HEAD, 'Trượt', '#cfd6e6');
    say(n.x, n.y - HEAD, r.crit ? `Bạo kích -${r.dmg}` : `-${r.dmg}`, r.crit ? '#ffd23a' : '#ffffff', r.crit);
    healMe(r.heal);
    play('chem-x', n.x, n.y - 9, 18);
    if (npcs.damage(n, r.dmg, 'me')) { progress.addStone(PV.kill_stone); toast(`Hạ gục ${n.name} · +${PV.kill_stone} Linh thạch`, 1800); npcTarget = null; }
  }
  function attack() {
    if (dead || attackCd > 0) return false;
    attackCd = stats.interval(ps);
    const m = target(PL.attack_range_px);
    if (!m && canFight()) { // không có quái trong tầm: đánh NPC đang nhắm / NPC tắt khiên gần nhất
      const n = (npcTarget && npcs.canFight(npcTarget) && npcs.dist(npcTarget, me) <= PL.attack_range_px) ? npcTarget : npcs.nearestFoe(me, PL.attack_range_px);
      if (n) { me.facing = wrapDelta(n.x - me.x, map.width) >= 0 ? 1 : -1; strikeNpc(n); return true; }
    }
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
    play('khoi', m.x, m.y, Math.max(16, (m.def.art?.h || 20) * 0.7), { ground: true, delay: 0.4 });
    const rank = m.def.rank, k = gp.monster.exp_mul[rank];
    const exp = Math.round((m.maxHp / 10) * k * cpFx.expMul()), stone = m.stone || 1; // Linh thạch theo tầng quái (data/gameplay.json → monster.stone_by_stage)
    const gold = wallet.goldPerKill(stone);
    addExp(exp); progress.addStone(stone); wallet.add('vang', gold);
    const got = rollLoot(m);
    for (const g of got) gain(g.id, g.n);
    if (rank === 'boss' && !progress.state.bosses.includes(m.def.id)) progress.state.bosses.push(m.def.id);
    tame.tryTame(m); // 0,5% quái quy phục làm thú cưng
    quests.emit('kill', { id: m.def.id, rank });
    say(m.x, m.y - m.r * 3, `+${exp} tu vi · +${stone} Linh thạch · +${gold} Vàng`, '#9fe8ff');
    if (got.length) toast(`Nhặt: ${got.map((g) => g.label).join(', ')}`, 1800);
    progress.changed();
  }
  function addExp(n) {
    const ups = progress.addExp(n);
    if (ups.length) { hp = Infinity; play('vong-lua', me.x, me.y - 8, 40); toast(`Đột phá tầng: ${ups[ups.length - 1].name}`, 2200); }
    if (progress.atPeak()) toast('Tu vi đã đến đỉnh — chạm nút Đột phá', 2200);
    recompute(); hp = Math.min(hp, ps.hp);
  }

  // ---------- Quái đánh người chơi ----------
  const env = {
    me, alive: true,
    hitPlayer(m, mul, skillName) {
      const r = stats.hit(stats.monster(m), ps, { atkMul: mul, defMul: pt.active ? S['phap-tuong'].def_mul : 1 });
      hurtAt = now;
      if (r.miss) { say(me.x, me.y - HEAD, 'Né', '#9fe8ff'); return; }
      hp -= r.dmg;
      say(me.x, me.y - HEAD, `${skillName ? `${skillName} ` : mul > 1 ? 'Đòn nặng ' : r.crit ? 'Bạo kích ' : ''}-${r.dmg}`, mul > 1 ? '#ff5a3a' : '#ff9a8a', mul > 1 || r.crit);
      if (mul > 1 && !skillName) play(m.def.rank === 'boss' ? 'hoa-cot' : 'sao-den', me.x, me.y, m.def.rank === 'boss' ? 46 : 34, { ground: m.def.rank === 'boss' });
      else play('cham-mau', me.x, me.y - 12, 16);
      if (r.reflect) { say(m.x, m.y - (m.def.art?.h || m.r * 2) - 4, `Phản đòn -${r.reflect}`, '#c58cff'); if (mobs.damage(m, r.reflect)) onKill(m); }
      if (hp <= 0) die();
    },
    dodged(m, skillName) { say(me.x, me.y - HEAD, skillName ? `Né ${skillName}!` : 'Né đòn nặng!', '#7dff8a', true); quests.emit('dodge'); },
    fx: (id, x, y, h, ground, rot = 0) => play(id, x, y, h, { ground, rot }), // hiệu ứng chiêu boss
    stunPlayer(s) { stunUntil = Math.max(stunUntil, now + s); say(me.x, me.y - HEAD - 10, 'Bị trói!', '#ffe36a', true); },
  };
  function hitByNpc(n) {
    const r = stats.hit(n.st, ps, { defMul: pt.active ? S['phap-tuong'].def_mul : 1 });
    hurtAt = now;
    if (r.miss) { say(me.x, me.y - HEAD, 'Né', '#9fe8ff'); return; }
    hp -= r.dmg; say(me.x, me.y - HEAD, `${r.crit ? 'Bạo kích ' : ''}-${r.dmg}`, '#ff9a8a', r.crit); play('cham-mau', me.x, me.y - 12, 16);
    if (r.reflect) { say(n.x, n.y - HEAD, `Phản đòn -${r.reflect}`, '#c58cff'); npcs.damage(n, r.reflect, 'me'); }
    if (hp <= 0) { die(); toast(`Bị ${n.name} hạ gục`, 2500); }
  }
  function die() {
    hp = 0; dead = true; mobs.calmAll(); auto = false; hud.setActive('auto', false); autoDir = null;
    if (pt.active) pt.cancel();
    soul.start();
  }
  function revive(here) { // here: hồi sinh tại chỗ linh hồn đang đứng (đã trả Linh thạch); không thì về trận pháp giữa thành
    soul.end(); dead = false; hp = ps.hp; guardUntil = now + PV.revive_guard_s;
    if (!here && map.town) { me.x = map.town.cx; me.y = map.town.cy + 30; onRespawn(me.x, me.y); }
    else if (!map.canStand(me.x, me.y, 4)) ({ x: me.x, y: me.y } = map.nearestStand(me.x, me.y, 4, 30));
    play('vong-lua', me.x, me.y - 8, 40); toast(`Hồi sinh${here ? ' tại chỗ' : ` tại trận pháp ${map.town?.name || ''}`} — được bảo vệ ${PV.revive_guard_s} giây`, 2000);
  }
  const tame = createTame({ cfg: gp.tame, progress, monsters: monDef.monsters, mobs, map, me, stats, gp, toast, say: (...a) => say(...a), play: (...a) => play(...a), onKill: (m) => onKill(m), placeholder: placeholderIcon });
  const soul = createSoul({ me, hud, progress, cfg: gp.soul, townName: map.town?.name || 'thành', toast, showRevive, onRevive: revive });

  // ---------- Kỹ năng (src/game/skills.js) + ô tự xếp (loadout.js) ----------
  const loadout = createLoadout(progress, S);
  const skills = createSkills({ S, me, mobs, map, pt, cds, toast, say, play, fx, bolts, strike, target, buffs, recompute,
    get bar() { return bar; }, heal: (n) => { hp = Math.min(ps.hp, hp + n); say(me.x, me.y - HEAD, `+${Math.round(n)} khí huyết`, '#5dff7a', true); },
    maxHp: () => ps.hp, now: () => now, dead: () => dead,
    summonPet() { const a = bag.equippedItem('linh-thu')?.art || progress.equipped().find((x) => x.slot === 'linh-thu')?.art, f = a && artFile(a); // hình linh thú đang mặc
      pet = { until: now + S['linh-thu'].last_s, next: now, x: me.x - 14, y: me.y, t: 0, face: 1, moving: false, img: f ? Object.assign(new Image(), { src: f }) : null }; play('vong-lua', me.x - 14, me.y - 6, 34); toast('Linh thú hiện thân', 1000); } });
  function usePill(id) {
    const p = gp.pills[id];
    if (!p || dead) return false;
    if ((cds.pill || 0) > now) { toast('Đan dược đang hồi', 900); return false; }
    if (p.life_add) { const c = life.canEat(); if (!c.ok) { toast(c.msg, 2200); return false; } }
    const full = (p.exp_pct || p.exp_fill) && (progress.atPeak() || progress.state.exp >= progress.stageDef.exp_need);
    if (full) { toast(progress.nextStageDef() ? 'Tu vi đã đầy — hãy bấm Đột phá' : 'Đã ở cảnh giới cao nhất', 1800); return false; }
    if (!progress.take(id, 1)) { toast(`Hết ${itemDefs.get(id)?.name || 'đan'}`, 1200); return false; }
    cds.pill = now + gp.pills.use_cooldown_s;
    if (p.heal_hp) { hp = Math.min(ps.hp, hp + ps.hp * p.heal_hp); say(me.x, me.y - HEAD, `+${Math.round(ps.hp * p.heal_hp)} khí huyết`, '#5dff7a', true); }
    if (p.heal_mp) pt.gain(ps.mp * p.heal_mp);
    if (p.buff === 'pt_drain') pt.setDrainMul(p.mul, p.s);
    else if (p.buff) { buffs[p.buff] = { mul: p.mul, until: now + p.s }; recompute(); }
    if (p.life_add) { toast(life.eat(), 2400); play('vong-lua', me.x, me.y - 8, 34); recompute(); }
    if (p.exp_pct) addExp(Math.ceil(progress.stageDef.exp_need * p.exp_pct));
    if (p.exp_fill) addExp(Math.max(0, progress.stageDef.exp_need - progress.state.exp));
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
    play('may-kiep', me.x, me.y - 70, 60); // thiên kiếp: mây tụ trên đầu rồi sét đánh xuống
    play('set-danh', me.x, me.y, 70, { ground: true, delay: 0.7 });
    const charm = progress.take('item.phu.bao-ho.001', 1); // bảo hộ phù: +15 điểm %, tự dùng nếu có
    const rate = Math.min(1, realm.breakthrough.rate + (charm ? realms.breakthrough_rules.protect_charm.add_rate_points : 0));
    if (charm) toast('Dùng Bảo hộ phù: +15% tỷ lệ', 1500);
    if (Math.random() < rate) {
      progress.advanceStage(); hp = Infinity; recompute(); hp = ps.hp;
      toast(`Đột phá thành công: ${progress.stageDef.name}! Thọ nguyên tối đa ${life.max()} năm`, 3000);
    } else toast(`Đột phá thất bại (${Math.round(rate * 100)}%) — mất ${pill.name}, tu vi giữ nguyên`, 3000);
    progress.changed();
  }

  // ---------- Mỗi khung hình ----------
  // Thọ nguyên (lifespan.js): qua 0h giờ VN cập nhật nhãn; hết thọ → tọa hóa (chết hẳn), main.js hiện bảng chuyển thế
  const lifeHooks = { synced: timeSynced, onWarn: (w) => toast(w, 4000), onTick: () => { if (me.realm !== life.label(progress.stageDef.name)) recompute(); },
    onDead(sum) { dead = true; auto = false; hud.setActive('auto', false); autoDir = null; mobs.calmAll(); if (pt.active) pt.cancel(); onToaHoa({ ...sum, realm: progress.stageDef.name }); } };
  function update(dt) {
    now += dt;
    life.watch(dt, lifeHooks);
    attackCd = Math.max(0, attackCd - dt);
    for (const [k, v] of Object.entries(buffs)) if (v.until <= now) { delete buffs[k]; recompute(); }
    if (dead) soul.tick(dt); // thân xác mờ dần → linh hồn + bảng chọn hồi sinh (soul.js)
    me.guarded = now < guardUntil;
    const inTown = map.safeAt(me.x, me.y);
    if (inTown !== wasInTown) { wasInTown = inTown; toast(inTown ? `Vào ${map.town.name} — vùng an toàn, quái không vào được` : `Rời ${map.town.name}`, 1800); }
    // Không tự hồi khí huyết (yêu cầu chủ dự án 21/10): chỉ hồi bằng đan dược và hút máu khi đánh
    env.alive = !dead;
    mobs.update(dt, env); voids.update(dt); tame.update(dt, !dead); // Âm Hư theo lịch chung (src/game/void.js)
    npcs.update(dt, { me, playerCanFight: canFight, hitPlayer: hitByNpc });
    for (const n of gather.update(dt, me, !dead)) { gain(n.item.id, n.n); say(n.x, n.y - 10, `+${n.n} ${n.item.name}`, n.group === 'thao' ? '#9dff8a' : '#d6dbe8'); progress.changed(); }
    if (auto && !dead) { // Tự động: uống đan khi máu thấp, đi tới quái / nguyên liệu gần nhất, đánh
      if (hp < ps.hp * gp.auto.hp_pill_below && progress.count(HEAL_PILL) && (cds.pill || 0) <= now) usePill(HEAL_PILL);
      autoDir = autoPlay.step(dt, now);
      if (gp.auto.use_skills && target(260)) skills.autoCast(loadout.ids(), hp / ps.hp); // tự dùng kỹ năng trong ô
      if (target(PL.attack_range_px) && attackCd <= 0) { attack(); me.onAutoSwing?.(); }
    }
    skills.updateBolts(dt);
    if (pet) {
      if (now > pet.until || dead) pet = null;
      else {
        const px = pet.x, py = pet.y;
        pet.x += (me.x - 14 * me.facing - pet.x) * Math.min(1, dt * 4); pet.y += (me.y + 4 - pet.y) * Math.min(1, dt * 4);
        pet.t += dt; pet.moving = Math.hypot(pet.x - px, pet.y - py) > 10 * dt; if (Math.abs(pet.x - px) > 0.05) pet.face = pet.x > px ? 1 : -1;
        const m = target(120);
        if (m && now >= pet.next) { pet.next = now + S['linh-thu'].every_s; strike(m, S['linh-thu'].mul, 'linh-thu'); }
      }
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      if (f.delay > 0) { f.delay -= dt; continue; }
      f.t -= dt; if (f.t <= 0) fx.splice(i, 1);
    }
    if (!Number.isFinite(hp)) hp = ps.hp;
    hud.setBar('hp', Math.max(0, Math.round(hp)), ps.hp);
    me.hpR = hp / ps.hp; // thanh máu trên đầu
    hud.setBar('xp', progress.state.exp, progress.stageDef.exp_need);
    bar.update(now); // ô kỹ năng: hình đang dùng, xám khi chưa có, số đếm hồi chiêu
    progress.state.hp = Math.round(hp);
    progress.tick(dt);
  }

  const at = (o) => ({ x: me.x + wrapDelta(o.x - me.x, map.width), y: me.y + wrapDelta(o.y - me.y, map.height) });
  function renderBelow(ctx, t) {
    for (const n of gather.list) { const p = at(n); drawNode(ctx, n, p.x, p.y, t); }
    for (const n of npcs.list) { const p = at(n); if (Math.abs(p.x - me.x) < 700 && Math.abs(p.y - me.y) < 700) drawNpc(ctx, n, p.x, p.y, npcs.height); }
    const list = mobs.list.map((m) => ({ m, ...at(m) })).filter((o) => Math.abs(o.x - me.x) < 800 && Math.abs(o.y - me.y) < 1000).sort((a, b) => a.y - b.y); // chỉ vẽ quái gần màn hình
    for (const { m, x, y } of list) {
      if (m.state === 'windup') { const w = at({ x: m.wx, y: m.wy }); m.wrx = w.x; m.wry = w.y; m.heavyR = gp.monster.heavy.radius_px; }
      m.tele = m.state === 'cast' ? mobs.telegraph(m, at) : null; // vùng chiêu boss sắp đánh
      drawMonster(ctx, m, x, y, t);
    }
    tame.render(ctx, at, t);
    if (pet) drawFx(ctx, [{ ...pet, kind: 'pet', ...at(pet) }], 0, 0);
  }
  function renderAbove(ctx, t) {
    for (const m of mobs.list) { const p = at(m); if (Math.abs(p.x - me.x) < 800 && Math.abs(p.y - me.y) < 1000) drawMonsterLabel(ctx, m, p.x, p.y, m.uid === targetUid, t); }
    for (const n of npcs.list) { const p = at(n); if (Math.abs(p.x - me.x) < 700 && Math.abs(p.y - me.y) < 700) drawNpcLabel(ctx, n, p.x, p.y, npcs.height, performance.now(), npcs.guarded(n)); }
    drawFx(ctx, [...bolts, ...fx].map((f) => ({ ...f, ...at(f) })), 0, 0);
  }

  // Chạm vào quái → chọn mục tiêu. Trả về true nếu đã xử lý (main.js khỏi xét người chơi)
  // Chạm khiên sau tên mình: tắt / bật (bật lại phải rời giao chiến vài giây)
  function toggleShield() {
    if (!me.shield && now - hurtAt < PV.shield_on_after_s) return toast(`Đang giao chiến — chờ ${PV.shield_on_after_s} giây mới bật lại khiên`, 1500);
    me.shield = !me.shield; progress.state.shield = me.shield; progress.changed();
    toast(me.shield ? 'Bật khiên bảo vệ: không đánh nhau' : 'Tắt khiên: ra khỏi thành có thể đánh nhau với người / NPC tắt khiên', 2200);
  }
  function tap(wx, wy) {
    const s = me.shieldAt;
    if (s && Math.hypot(wx - s.x, wy - s.y) < s.r + 3) { toggleShield(); return true; }
    let best = null, bd = 18;
    for (const m of mobs.list) {
      if (m.state === 'dead') continue;
      const p = at(m), d = Math.hypot(p.x - wx, p.y - m.r - wy);
      if (d < bd + m.r) { bd = d; best = m; }
    }
    if (!best) {
      const n = npcs.at(wx, wy, at);
      if (!n) return false;
      if (npcs.canFight(n) && canFight()) { npcTarget = n; toast(`Mục tiêu: ${n.name} (${n.realm})`, 1000); } else npcs.greet(n, wx);
      return true;
    }
    targetUid = best.uid === targetUid ? null : best.uid;
    if (targetUid) toast(`Mục tiêu: ${best.def.name}`, 900);
    return true;
  }

  const views = createViews({ info, shop, owns, teacher, bag, onLook, monsters: monDef.monsters, progress, quests, craft, itemDefs, mats, pills, blanks, awaken, cp, realms, gp, toast,
    wallet, life, getStats: () => ps, getHp: () => hp, onReward: (r) => { if (r.exp) addExp(r.exp); if (r.spiritStone) progress.addStone(r.spiritStone);
      for (const i of r.items || []) progress.add(i.id, i.count); }, recompute, usePill, emit: quests.emit });

  const inv = createInventory({ recipes: { pills: pills.pills, blanks: blanks.blanks, skills: cp.skills }, info, progress, bag, craft, itemDefs, awaken, gp, art: (a) => artInfo(a)?.file || artFile(a), icon: iconUrl, fallbackIcon: placeholderIcon,
    onLook, recompute, usePill, breakthrough: () => breakthrough(), btPills: new Set(realms.realms.filter((r) => r.breakthrough).map((r) => r.breakthrough.pill)), openCultivate: (tab) => views.openCultivate(tab) });
  const stageName = (id) => gp.player.stages.find((x) => x.id === id)?.name || id;
  const bar = createSkillBar({ hud, S, gp, progress, pt, cds, slotItem: (s) => inv.slotItem(s), icon: iconUrl, fxIcon: fxIconUrl, loadout, stageName });
  function itemAction(key, action) {
    const r = tame.isPet(key) ? tame.act(key, action) : inv.act(key, action); // thú cưng (tame.js) / đồ khác
    if (r && typeof r === 'object') { toast(r.msg, 1600); if (r.event) quests.emit(...r.event); } else if (r) toast(r, 1500);
    progress.changed();
  }
  if (!progress.state.migrRecipes) { // người chơi cũ xong nhiệm vụ trước khi có đan phương trong thưởng → bù một lần
    for (const q of questDef.quests) if (progress.state.quests.done[q.id] && q.type !== 'daily') for (const i of q.rewards.items || []) if (teacher.has(itemDefs.get(i.id)?.teaches) && !progress.count(i.id)) progress.add(i.id, 1);
    progress.state.migrRecipes = true; progress.changed();
  }
  hp = progress.state.hp ?? Infinity;
  recompute(); if (!Number.isFinite(hp) || hp <= 0) hp = ps.hp;
  progress.onChange(() => { for (const g of progress.state.gear) if (!g.art) ensureArt(g); views.refreshDock?.(); });
  addEventListener('pagehide', () => progress.flush());

  return {
    update, renderBelow, renderAbove, tap, attack, skill: (id) => skills.cast(id), breakthrough, usePill,
    slotSkill: (i) => loadout.get(i), slots: loadout.size,
    openSkills: (slot = -1) => openSkillPanel({ S, loadout, bar, progress, stageName, slot, toast }), // bảng Kỹ năng: chạm kỹ năng → chọn ô
    get dead() { return dead; },
    wallet, life, // tiền tệ (Kho / Vạn Bảo Lâu) + thọ nguyên
    reincarnate() { progress.reset(); progress.flush(); }, // tọa hóa → chuyển thế: xoá tiến trình (main.js xoá thêm Kho rồi tải lại)
    stunned: () => now < stunUntil,
    _debug: { me, map, progress, mobs, voids, mdef: monDef, bag, gather, npcs, die, get hp() { return hp; }, get ps() { return ps; } }, // chỉ cho kiểm thử (?debug)
    speed: () => buffs.speed?.mul || null,
    toggleAuto() { if (dead) return; auto = !auto; autoDir = null; autoPlay.reset(); hud.setActive('auto', auto); toast(auto ? 'Tự động đánh: bật' : 'Tự động đánh: tắt', 1000); },
    healPill: () => usePill(HEAL_PILL), autoDir: () => (auto ? autoDir : null),
    openCodex: () => openCodex({ loadJSON, gp, mats, pills, recipes, cp, monsters: monDef.monsters, mobSkills: monDef.skills, blanks, qItems, artDef, info, cpText: cpFx.text, fxDuration }), // Đồ giám (nút sách)
    statValue: views.statValue, openQuests: views.openQuests, openCultivate: views.openCultivate,
    forgedLook,
    setDock(d) { views.refreshDock = d.refresh; },
    bagEntries: () => [...inv.entries(), ...tame.entries()], slotItem: inv.slotItem, slotCandidates: inv.slotCandidates, itemAction,
    openShop() { if (!map.safeAt(me.x, me.y)) return toast(`${shop.name} ở ${map.town?.name || 'trong thành'} — hãy vào thành`, 1800); views.openShop(); },
    onProp: (id) => { const f = { 'kho-hang': () => views.openShop(), 'lo-luyen-dan': () => views.openCultivate('dan'), 'te-dan': () => views.openCultivate('realm') }[id]; f?.(); return !!f; }, // chạm công trình
    realmName: () => progress.stageDef.name, gp, grantFull: (gift) => grantFull({ progress, wallet, gift, mats, pills, recipes, shop, blanks }), // mã thử 'full' // gp: thông số chơi thử (bảng xếp hạng dùng trọng số lực chiến)
    rankInfo: () => ({ stageIndex: progress.state.stage, stageName: progress.stageDef.name, exp: progress.state.exp, stats: ps, voidKills: progress.state.voidKillCount || 0 }),
    markers: () => voids.markers(), // Âm Hư đang xuất hiện (chấm tím trên bản đồ)
  };
}
