// Luật chơi THỬ NGHIỆM phía máy khách: quái, chiến đấu, rơi đồ, tu vi/đột phá, đan dược, kỹ năng, nhiệm vụ.
// Nhận đối tượng từ main.js (map, me, hud, pt…) và trả về các hàm main.js gọi mỗi khung hình.
// Mọi con số nằm trong data/ (stats.json = Lab, gameplay.json = thông số chơi thử). Mốc 3–4: chuyển kết quả lên máy chủ.
import { wrapDelta } from '../map/index.js';
import { drawMonster, drawMonsterLabel, drawFx, drawNode, loadSprites, fxDuration, loadNpcArt, drawNpc, drawNpcLabel } from '../entity/index.js';
import { createNpcs } from './npcs.js';
import { createItemInfo } from './iteminfo.js';
import { createForgedArt } from './forged-art.js';
import { createFxQueue } from './fxqueue.js';
import { fxOf, weaponHe } from '../entity/slashfx.js';
import { createCpEffects } from './cp-effects.js';
import { createProgress } from './progress.js';
import { createStats } from './stats.js';
import { createMonsters } from './monsters.js';
import { createQuests } from './quests.js';
import { createCraft } from './craft.js';
import { createRecipeUses } from './recipe-uses.js';
import { createViews } from './views.js';
import { createSkillBar } from './skillbar.js';
import { createAutoPlay } from './autoplay.js';
import { createSoul } from './soul.js';
import { createLoot } from './loot.js';
import { openCodex } from './codex.js';
import { createGather } from './gather.js';
import { createInventory } from './inventory.js';
import { createVoid } from './void.js';
import { grantFull, grantGod, grantHopNhat } from './testgift.js';
import { createSkills } from './skills.js';
import { createLoadout } from './loadout.js';
import { openSkillPanel } from './skillview.js';
import { createWallet } from './currency.js';
import { createLifespan } from './lifespan.js';
import { createTame } from './tame.js';
import { createRealmGap } from './realm-gap.js'; import { createLateRealm } from './late-realm.js'; import { juice } from './juice.js';
import { createPillUse } from './pill-use.js';
import { createDaoVan } from './daovan.js';
import { createCards } from './cards.js';
import { createBarrage } from './barrage.js';
import { createTreasure } from './treasure.js';
import { createCamChe } from './camche.js';
import { createBiCanh } from './bicanh.js';
import { createConsumables } from './consumables.js';
import { createGuide } from './guide.js';
import { createHurt } from './hurt.js';
import { createDaoTam, questNpcDefs } from './daotam.js';
import { createTruyenThua } from './truyenthua.js';
import { createCombo } from './combo.js';
import { createHopNhat } from './hopnhat.js';
import { createSkillLearn } from './skill-learn.js';
import { simulateDuel } from './spar.js';
import { placeholderIcon, showRevive, showDialog, showHeChooser } from '../ui/index.js';
import { artInfo, iconUrl, fxIconUrl, cardArt } from '../entity/index.js';
import { sound } from '../audio/index.js';

const HEAL_PILL = 'item.dan.tieu-hoi-huyet.001', MP_PILL = 'item.dan.hoi-linh.001';

// bag: Kho đồ 6 hệ (src/ui/testbag.js) — đồ trong Kho thức tỉnh được; onLook(): báo main.js cập nhật hình mặc trên người
export async function createGameplay({ onRespawn = () => {}, loadJSON, map, me, hud, pt, toast, audio, userId, bag, onLook = () => {}, onRealm = () => {}, serverNow, bornAt = null, timeSynced = () => true, onToaHoa = () => {} }) {
  const [statsDef, gp, monDef, mats, pills, blanks, awaken, cp, questDef, qItems, realms] = await Promise.all([
    'data/stats.json', 'data/gameplay.json', 'data/monsters/monsters.json', 'data/items/materials.json', 'data/items/pills.json',
    'data/equipment/blanks.json', 'data/equipment/awaken.json', 'data/skills/cong-phap.json', 'data/quests/quests.json',
    'data/items/quest-items.json', 'data/realms.json'].map((p) => loadJSON(p)));
  const [recipes, shop, artIdx] = await Promise.all([loadJSON('data/items/recipes.json'), loadJSON('data/shop.json'), loadJSON('data/equipment/art.json')]);
  const [curDef, lifeDef, premium, dvDef, misc] = await Promise.all(['data/currency.json', 'data/lifespan.json', 'data/items/premium.json', 'data/build/dao-van.json', 'data/items/misc.json'].map((p) => loadJSON(p)));
  const [pbDef, ccDef, bcDef] = await Promise.all(['data/build/phap-bao.json', 'data/build/cam-che.json', 'data/build/bi-canh.json'].map((p) => loadJSON(p))); // pháp bảo, cấm chế, bí cảnh
  const artDef = await loadJSON('data/art/sprites.json');
  await Promise.all([loadSprites(artDef), loadNpcArt(artDef.npc)]); // hình quái, hiệu ứng, icon, NPC (thử nghiệm)
  const progress = createProgress(userId, gp);
  const wallet = createWallet({ def: curDef, progress }); // Vàng · Linh thạch · Tiên ngọc
  const life = createLifespan({ def: lifeDef, progress, stages: gp.player.stages, serverNow, bornAt }); // thọ nguyên theo ngày giờ Việt Nam
  const { ensureArt, forgedLook, artFile } = createForgedArt(artIdx, progress, dvDef.he_order); // hình ngẫu nhiên cho đồ luyện từ phôi
  const stats = createStats(statsDef, gp);
  const mobs = createMonsters({ gp, mdef: monDef, map }), gapR = createRealmGap({ gp, mdef: monDef, progress, today: () => life.today(), toast: (...a) => toast(...a) }), late = createLateRealm({ gp, progress, gapR, toast: (...a) => toast(...a) }); // áp chế cảnh giới
  const voids = createVoid({ mdef: monDef, mobs, map, progress, toast, me, serverNow });
  const quests = createQuests(questDef, progress, () => (progress.stageDef.major ?? 0), { realms, gp, mats, now: serverNow || Date.now }); // + Ngày / Tuần / Tiến độ (routine.js)
  // Đan phương / công thức / bí kíp: món id được dạy bởi vật phẩm nào; có trong kho mới luyện được
  const ru = createRecipeUses({ progress, recipes: recipes.items, toast: (...a) => toast(...a) }), { teacher, owns } = ru; // công thức có số lần dùng
  const craft = createCraft({ progress, pills, blanks, awaken, skills: cp, gp, owns, spend: ru.spend });
  craft.migrateLines(); // dòng cũ (số phẳng) → % chỉ số gốc
  const gather = createGather({ gp, mats, map });
  const info = createItemInfo({ monsters: monDef.monsters, shop, pills, blanks, realms, gp, cpText: (id) => cpFx.text(id) }); // tác dụng + nơi có của vật phẩm
  const [npcDef, dtDef, zoneDef, itemsList] = await Promise.all(['data/npcs.json', 'data/quests/dao-tam.json', 'data/zones/zone.start.json', 'data/items/items.json'].map((p) => loadJSON(p)));
  npcDef.npcs.push(...questNpcDefs(dtDef, zoneDef.town.props)); // NPC nhiệm vụ Đạo Tâm đứng cạnh công trình trong thành
  const npcs = createNpcs({ def: npcDef, map, mobs, stats, stages: gp.player.stages }), itemsJson = { items: itemsList.items };
  const PV = gp.pvp, rollLoot = createLoot({ gp, mats, qItems, recipes, progress });
  const combo = createCombo(gp.attack_combo);
  const autoPlay = createAutoPlay({ me, mobs, gather, map, cfg: gp.auto, reach: gp.player.attack_range_px, heavyR: gp.monster.heavy.radius_px, canFly: () => !!me.look?.weapon && pt.mp >= 15, zone: () => biCanh?.zone(), hpFrac: () => (ps.hp ? hp / ps.hp : 1) });
  gather.seed(me);
  const GB = gp.gear_base, gearBase = () => { const v = GB.pct_lv1 + GB.per_lv * progress.state.stage; return { lines: GB.keys.map((k) => ({ k, v, p: 1 })) }; };
  const SLOTS = ['mat-na', 'trang-phuc', 'vu-khi', 'nhan', 'canh', 'phap-tuong', 'linh-thu', 'day-chuyen'];
  // Pháp khí đang tính chỉ số: đồ luyện ra đang mặc + đồ Kho đang mặc đã thức tỉnh
  let treasure = null; // pháp bảo (treasure.js) — tạo sau barrage
  const wornGear = () => [...progress.equipped(), ...(treasure ? treasure.worn() : []),
    ...SLOTS.map((sl) => bag.equippedItem(sl)).filter(Boolean).map((it) => progress.state.itemAw[it.id]).filter((a) => a?.tier),
    ...SLOTS.map((sl) => bag.equippedItem(sl)).filter((it) => it?.he).map(gearBase)]; // chỉ số gốc của đồ ngũ hành (gameplay.json → gear_base)
  const itemDefs = new Map([...mats.materials, ...pills.pills, ...qItems.items, ...recipes.items, ...premium.items, ...pbDef.items, ...misc.items].map((d) => [d.id, d]));
  const S = gp.skills, PL = gp.player;

  let ps = null; // chỉ số hiện tại
  const buffs = {}; // tên → { mul, until }
  const cds = {}; // hồi chiêu theo id
  let wasInTown = null;
  let guardUntil = 0, npcTarget = null; // bảo vệ sau hồi sinh; NPC đang nhắm
  me.shield = progress.state.shield ?? true; // khiên bảo vệ (mặc định bật)
  let stunUntil = 0; // bị boss trói: không đi được
  function setAuto(mode, focus = null) { // mode: 'farm' | 'quest' | null
    if (dead && mode) return; auto = !!mode; autoDir = null; mode ? autoPlay.start(mode, focus) : autoPlay.reset();
    hud.setActive('auto', mode === 'farm'); // nút Tự nhiệm vụ do questauto.js bật / tắt (không nháy khi đổi chế độ farm)
  }
  let hp = 0, dead = false, autoDir = null, hurtAt = -99, attackCd = 0, auto = false, resumeAuto = null, targetUid = null, pet = null, now = 0;
  const fx = [], bolts = [];
  const { say, play, spark } = createFxQueue(fx, fxDuration); // số bay trên đầu + hiệu ứng hình

  function recompute() {
    const b = {};
    for (const [k, v] of Object.entries(buffs)) if (v.until > now) b[k] = v.mul;
    ps = cpFx.apply(stats.player(progress.stageDef, wornGear(), b)); // + tác dụng công pháp
    for (const [k, v] of Object.entries(dv.mods().stat)) ps[k] = ['hut', 'crit', 'phan'].includes(k) ? ps[k] + v : Math.round(ps[k] * v); // Đạo Vận: chỉ số bộ
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
  const healMe = (n) => { if (n > 0 && !dead) { hp = Math.min(ps.hp, hp + n); say(me.x, me.y - HEAD, `+${Math.round(n)}`, '#5dff7a', false, true); } }; // linh hồn không hút máu (chủ dự án 23/10)
  const midY = (m) => m.y - (m.def.art?.h || m.r * 2) / 2;
  const HIT_FX = { attack: ['chem-x', 18], 'kiem-khi': ['kiem-bang-no', 28], 'linh-thu': ['chem-x', 14] };

  // ---------- Người chơi đánh quái ----------
  function strike(m, mul, skill) {
    const sup = gapR.mul(m.stage, progress.stageDef.tier), r = stats.hit(ps, stats.monster(m), { atkMul: mul * ptMul() * cpBonus(skill) * sup });
    const top = m.y - (m.def.art?.h || m.r * 2) - 4;
    if (r.miss) { say(m.x, top, 'Trượt', '#cfd6e6'); return; }
    sound(r.crit ? 'sfx.bao-kich' : 'sfx.trung');
    say(m.x, top, `${r.dmg}${r.crit ? '!' : ''}${sup < 1 ? '↓' : ''}`, sup < 1 ? '#b9a6d6' : r.crit ? '#ffd23a' : '#ffffff', r.crit); // số gọn kiểu My Heroes: ! = bạo kích, ↓ = bị áp chế
    const hf = skill === 'attack' && me.look?.weapon ? [fxOf('no', me.look.weapon), 34] : HIT_FX[skill]; // đánh thường có kiếm: nổ vẽ tay theo hệ vũ khí
    if (hf) play(hf[0], m.x, midY(m), hf[1] * (r.crit ? 1.4 : 1)); spark(m.x, midY(m), dv.heOf(S[skill]?.he || weaponHe(me.look?.weapon) || 'Kim')?.color || '#fff3c0', r.crit ? 14 : 7, r.crit ? 1.5 : 1); m.kb = mobs.rel(m, me).dx >= 0 ? 1 : -1; if (r.crit) juice.stop(0.05); // tia lửa, quái giật lùi, khựng hình khi bạo kích
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
    if (dead || attackCd > 0 || me.flying) return false; // đang ngự kiếm: không đánh
    attackCd = me.atkGap = stats.interval(ps); // nhịp đánh: hình đòn tự co cho kịp (src/entity/moves.js tempo)
    const m = target(PL.attack_range_px);
    if (!m && canFight()) { // không có quái trong tầm: đánh NPC đang nhắm / NPC tắt khiên gần nhất
      const n = (npcTarget && npcs.canFight(npcTarget) && npcs.dist(npcTarget, me) <= PL.attack_range_px) ? npcTarget : npcs.nearestFoe(me, PL.attack_range_px);
      if (n) { me.facing = wrapDelta(n.x - me.x, map.width) >= 0 ? 1 : -1; strikeNpc(n); return true; }
    }
    const mv = combo.next(now, attackCd); // Chém → Chọc → Xoay (src/game/combo.js)
    if (m) { me.facing = mobs.rel(m, me).dx >= 0 ? 1 : -1; strike(m, mv.mul, 'attack'); barrage.basic(m); } // Đạo Vận: bắn thêm, sóng chấn
    if (mv.aoe_px) for (const o of mobs.within(me, PL.attack_range_px + mv.aoe_px)) if (o !== m && o.state !== 'dead' && !map.safeAt(o.x, o.y)) strike(o, mv.aoe_mul, 'attack'); // Xoay: quét quanh mình
    return mv.id;
  }

  // ---------- Kết quả hạ quái: tu vi, Linh thạch, nguyên liệu, vật phẩm nhiệm vụ ----------
  function gain(id, n) {
    progress.add(id, n);
    quests.emit('gain', { id, n });
    if (itemDefs.get(id)?.group === 'thao' && !progress.state.herbs.includes(id)) { progress.state.herbs.push(id); quests.emit('herb'); }
  }
  function onKill(m) {
    if (targetUid === m.uid) targetUid = null;
    play('khoi', m.x, m.y, Math.max(16, (m.def.art?.h || 20) * 0.7), { ground: true, delay: 0.4 }); sound(m.def.rank === 'boss' || m.void ? 'sfx.boss.chet' : 'sfx.quai.chet');
    const rank = m.def.rank, k = gp.monster.exp_mul[rank];
    const KR = gp.kill_rewards, fr = (x) => Math.floor(x) + (Math.random() < x % 1 ? 1 : 0); // giết quái nhận ít (tu tiên + idle, chủ dự án 23/10) — phần lẻ thành xác suất
    const exp = gapR.daily(gapR.capExp(Math.round((m.maxHp / 10) * k * cpFx.expMul() * KR.exp_mul), m, progress.stageDef.exp_need), progress.stageDef.exp_need, progress.stageDef.id), stone = fr((m.stone || 1) * KR.stone_mul); // Linh thạch theo tầng quái × stone_mul
    const gold = fr(wallet.goldPerKill(m.stone || 1) * KR.gold_mul);
    addExp(exp); progress.addStone(stone); wallet.add('vang', gold);
    const got = rollLoot(m);
    for (const g of got) gain(g.id, g.n);
    if (rank === 'boss' && !progress.state.bosses.includes(m.def.id)) progress.state.bosses.push(m.def.id);
    tame.tryTame(m); if (Math.random() < KR.gear_drop_mul) { cards.onKill(m); treasure.onKill(m); dv.onKill(m, toast); } learn.onKill(m); // linh thú · Thần Phù / phôi pháp bảo / đồ ngũ hành (giảm theo gear_drop_mul)
    quests.emit('kill', { id: m.def.id, rank, zone: m.def.zone });
    say(m.x, m.y - m.r * 3, `+${exp} tu vi${stone ? ` · +${stone} Linh thạch` : ''}${gold ? ` · +${gold} Vàng` : ''}`, '#9fe8ff');
    if (got.length) { toast(`Nhặt: ${got.map((g) => g.label).join(', ')}`, 1800); sound('sfx.nhat'); }
    progress.changed();
  }
  function addExp(n) {
    const ups = progress.addExp(n); late.tick();
    if (ups.length) { hp = Infinity; play('vong-lua', me.x, me.y - 8, 40); sound('sfx.len-cap'); toast(`Đột phá tầng: ${ups[ups.length - 1].name}`, 2200); }
    if (progress.atPeak()) toast('Tu vi đã đến đỉnh — chạm nút Đột phá', 2200);
    recompute(); hp = Math.min(hp, ps.hp);
  }

  // ---------- Quái / NPC đánh người chơi (src/game/hurt.js) ----------
  const { env, hitByNpc } = createHurt({ me, stats, S, pt, mobs, npcs, quests, say, play, toast, HEAD, onKill: (m) => onKill(m), die: () => die(),
    get: () => ({ hp, dead, ps }), setHp: (v) => { hp = v; }, hurt: () => { hurtAt = now; }, stun: (s) => { stunUntil = Math.max(stunUntil, now + s); } });
  function die() {
    if (dead) return; // nhiều đòn cùng khung: chỉ chết một lần (không trừ tu vi 2 lần, không mất Tự động bật lại)
    hp = 0; dead = true; mobs.calmAll(); resumeAuto = auto ? autoPlay.snapshot() : null; auto = false; hud.setActive('auto', false); autoDir = null; autoPlay.reset(); const dmsg = late.death(); if (dmsg) toast(dmsg, 3000); // mất tu vi khi chết: late-realm.js (Anh Biến: trọng thương / thụt cảnh giới)
    if (pt.active) pt.cancel();
    soul.start(); sound('sfx.chet');
  }
  function revive(here) { // here: hồi sinh tại chỗ linh hồn đang đứng (đã trả Linh thạch); không thì về trận pháp giữa thành
    soul.end(); dead = false; hp = ps.hp; guardUntil = now + PV.revive_guard_s; sound('sfx.hoi-sinh');
    if (!here && map.town) { me.x = map.town.cx; me.y = map.town.cy + 30; onRespawn(me.x, me.y); }
    else if (!map.canStand(me.x, me.y, 4)) ({ x: me.x, y: me.y } = map.nearestStand(me.x, me.y, 4, 30));
    play('vong-lua', me.x, me.y - 8, 40); toast(`Hồi sinh${here ? ' tại chỗ' : ` tại trận pháp ${map.town?.name || ''}`} — được bảo vệ ${PV.revive_guard_s} giây`, 2000); if (resumeAuto) { const r = resumeAuto; resumeAuto = null; auto = true; autoPlay.start(r.mode, r.focus, here ? null : r.at); if (r.mode === 'farm') hud.setActive('auto', true); toast('Tự động bật lại — quay về chỗ farm cũ', 1800); } // về thành thì tự đi lại vùng neo cũ
  }
  const tame = createTame({ cfg: gp.tame, progress, monsters: monDef.monsters, mdef: monDef, mobs, map, me, stats, gp, toast, say: (...a) => say(...a), play: (...a) => play(...a), onKill: (m) => onKill(m), placeholder: placeholderIcon, suppress: (m, p) => gapR.mul(m.stage, p.stage) });
  const soul = createSoul({ me, hud, progress, cfg: gp.soul, townName: map.town?.name || 'thành', toast, showRevive, onRevive: revive, autoBack: () => !!resumeAuto }); // đang Tự động mà chết: 10 giây không chọn thì tự về thành

  // ---------- Kỹ năng (src/game/skills.js) + ô tự xếp (loadout.js) ----------
  const loadout = createLoadout(progress, S);
  const learn = createSkillLearn({ S, cfg: gp.skill_drop, progress, toast, play: (...a) => play(...a) }); // kỹ năng rơi từ boss (tỷ lệ trong data, không hiện)
  // ---------- Đạo Vận: bộ ngũ hành + Thần Phù → đạn xoè quạt, nảy, tách, phi kiếm, mưa kiếm, liên thanh (daovan / cards / barrage) ----------
  const cards = createCards({ def: dvDef, tiers: awaken.tiers, progress, stageOk: (id) => craft.stageOk(id), toast, play });
  const dv = createDaoVan({ def: dvDef, bag, cards, progress });
  const barrage = createBarrage({ dv, me, mobs, map, bolts, play, strike, toast, dead: () => dead, maxHp: () => ps.hp, heal: (n) => { if (!dead) hp = Math.min(ps.hp, hp + n); } });
  treasure = createTreasure({ stageName: progress.stageName, def: pbDef, S, progress, craft, awaken, barrage, mobs, me, map, buffs, recompute, target, play, say, toast, heOf: dv.heOf,
    stageOk: (id) => craft.stageOk(id), now: () => now, maxHp: () => ps.hp, rewind: () => { for (const k in cds) if (k !== 'phap-bao') cds[k] = 0; }, heal: (n) => { if (!dead) hp = Math.min(ps.hp, hp + n); } });
  const camChe = createCamChe({ def: ccDef, dv, barrage, me, mobs, target, play, toast, dead: () => dead, maxHp: () => ps.hp, heal: (n) => { if (!dead) hp = Math.min(ps.hp, hp + n); } });
  const biCanh = createBiCanh({ def: bcDef, mdef: monDef, mobs, map, me, progress, life, wallet, cards, cardDef: dvDef.cards, dv, pbItem: pbDef.items[0].id,
    toast, play, say, dead: () => dead, stageId: () => progress.stageDef.tier, stageName: progress.stageName, itemName: (id) => itemDefs.get(id)?.name || bag.nameOf?.(id) || id, S, pbList: pbDef.list, learn: () => learn, treasure: () => treasure });
  const hopNhat = createHopNhat({ def: dvDef.hop_nhat, forged: (he, sl) => progress.equipped().some((g) => g.tier && g.he === he && g.slot === sl), bag, treasure, cards, loadout, S, cardName: (id) => dvDef.cards.list.find((x) => x.id === id)?.name || id, learned: (id) => learn.learned(id), target: (r) => (me.flying ? null : target(r)), pt, ps: () => ps, dead: () => dead, toast, src: { pb: pbDef, cards: dvDef.cards.drop, set: dvDef.set_drop, skill: gp.skill_drop, realms: realms.realms } }); // Thiên Cơ Hợp Nhất (src: nguồn để chỉ cách lấy)
  const guide = createGuide({ hopNhat, learn, dvDef, ccDef, pbDef, items: itemsJson.items, S, dv, cards, bag, progress, loadout, stageName: progress.stageName,
    art: (a) => artInfo(a)?.file || artFile(a), equip: (id) => itemAction(`bag:${id}`, 'equip'), toast }); // nút + bảng Cẩm nang Đạo Vận
  const usable = createConsumables({ itemDefs, progress, wallet, cards, cardDef: dvDef.cards, treasure, biCanh, heOrder: dvDef.he_order, play, me, recompute });
  const skills = createSkills({ fam: gp.fx_families, hopOn: () => !!hopNhat.active(), useTreasure: (q) => treasure.use(q, { soft: !!hopNhat.active() }), camChe: (s) => camChe.cast(s), S, me, mobs, map, pt, cds, toast, say, play, fx, bolts, strike, target, buffs, recompute, mods: dv.mods, fire: barrage.fire, maybeEcho: barrage.maybeEcho, mover: barrage.mover, schedule: barrage.schedule, healPets: (f) => tame.healAll(f),
    get bar() { return bar; }, heal: (n) => { if (dead) return; hp = Math.min(ps.hp, hp + n); say(me.x, me.y - HEAD, `+${Math.round(n)} khí huyết`, '#5dff7a', true); },
    maxHp: () => ps.hp, now: () => now, dead: () => dead,
    swing(id, s) { const k = gp.skill_swing.by_id[id] || gp.skill_swing.by_kind[s.kind], m = k && target(s.range_px || s.radius_px || 200); if (!k) return; if (m) me.facing = mobs.rel(m, me).dx >= 0 ? 1 : -1; me.onSkillSwing?.(k); }, // xoay mặt về mục tiêu rồi vung kiếm
    summonPet() { const a = bag.equippedItem('linh-thu')?.art || progress.equipped().find((x) => x.slot === 'linh-thu')?.art, f = a && artFile(a); // hình thú hồn đang mặc
      pet = { until: now + S['linh-thu'].last_s, next: now, x: me.x - 14, y: me.y, t: 0, face: 1, moving: false, img: f ? Object.assign(new Image(), { src: f }) : null }; play('vong-lua', me.x - 14, me.y - 6, 34); toast('Thú hồn hiện thân', 1000); } });
  const { usePill, breakthrough, breakthroughPill } = createPillUse({ majors: realms.realms.map((r) => r.short.toLowerCase()), realmName: (k) => realms.realms.find((r) => r.short.toLowerCase() === k)?.name, gp, realms, progress, itemDefs, life, quests, pt, buffs, cds, me, HEAD, toast, say, play, addExp, recompute,
    now: () => now, dead: () => dead, hp: () => hp, setHp: (v) => { hp = v; }, ps: () => ps });
  const daotam = createDaoTam({ def: dtDef, hop: dvDef.hop_nhat.he, items: itemsJson.items, itemDefs, shop, progress, bag, learn, loadout, cards, treasure, hopNhat, npcs, map, me, wallet, S, pbList: pbDef.list, // Con đường Đạo Tâm
    addExp, itemAction, breakthrough, breakthroughPill, usePill, toast, play, dialog: showDialog, chooseHe: showHeChooser, heColor: (he) => dvDef.he[he]?.color || '#ffd23a' });
  quests.onEmit((type, e) => daotam.emit(type, e)); const tt = createTruyenThua({ itemDefs, progress, wallet, daotam, chooseHe: showHeChooser, toast, recompute }); // Truyền Thừa

  // ---------- Mỗi khung hình ----------
  // Thọ nguyên (lifespan.js): qua 0h giờ VN cập nhật nhãn; hết thọ → tọa hóa (chết hẳn), main.js hiện bảng chuyển thế
  const lifeHooks = { synced: timeSynced, onWarn: (w) => toast(w, 4000), onTick: () => { if (me.realm !== life.label(progress.stageDef.name)) recompute(); },
    onDead(sum) { dead = true; auto = false; hud.setActive('auto', false); autoDir = null; autoPlay.reset(); mobs.calmAll(); if (pt.active) pt.cancel(); onToaHoa({ ...sum, realm: progress.stageDef.name }); } };
  function update(dt) {
    now += dt;
    life.watch(dt, lifeHooks);
    attackCd = Math.max(0, attackCd - dt);
    for (const [k, v] of Object.entries(buffs)) if (v.until <= now) { delete buffs[k]; recompute(); }
    if (dead) soul.tick(dt); // thân xác mờ dần → linh hồn + bảng chọn hồi sinh (soul.js)
    me.guarded = now < guardUntil;
    const inTown = map.safeAt(me.x, me.y);
    if (inTown !== wasInTown) { wasInTown = inTown; toast(inTown ? `Vào ${map.town.name} — vùng an toàn, quái không vào được` : `Rời ${map.town.name}`, 1800); }
    env.alive = !dead;
    mobs.update(dt, env); voids.update(dt); tame.update(dt, !dead); // Âm Hư theo lịch chung (src/game/void.js)
    npcs.update(dt, { me, playerCanFight: canFight, hitPlayer: hitByNpc });
    for (const n of gather.update(dt, me, !dead)) { gain(n.item.id, n.n); sound('sfx.nhat'); say(n.x, n.y - 10, `+${n.n} ${n.item.name}`, n.group === 'thao' ? '#9dff8a' : '#d6dbe8'); progress.changed(); }
    if (auto && !dead) { // Tự động: uống đan khi máu thấp, đi tới quái / nguyên liệu gần nhất, đánh
      if (hp < ps.hp * gp.auto.hp_pill_below && progress.count(HEAL_PILL) && (cds.pill || 0) <= now) usePill(HEAL_PILL); else if (pt.mp < pt.max * (gp.auto.mp_pill_below ?? 0.3) && progress.count(MP_PILL) && (cds.pill || 0) <= now) usePill(MP_PILL); // linh lực dưới 30%: tự uống Hồi Linh Đan; hết đan vẫn đánh thường
      autoDir = autoPlay.step(dt, now);
      if (gp.auto.use_skills && target(260)) skills.autoCast(loadout.ids(), hp / ps.hp); // tự dùng kỹ năng trong ô
      if (target(PL.attack_range_px) && attackCd <= 0) { const k = attack(); if (k) me.onAutoSwing?.(k); }
    }
    guide.tick(); learn.tick(); daotam.tick(dt); hopNhat.update(dt); barrage.update(dt); camChe.update(dt); biCanh.update(dt); const md = dv.mods(); if (md.mp_regen && !dead) pt.gain(ps.mp * md.mp_regen * dt); if (!dead && hp < ps.hp && now - hurtAt > PL.regen_after_s) hp = Math.min(ps.hp, hp + ps.hp * PL.regen_hp_per_s * (map.safeAt(me.x, me.y) ? map.town?.regenMul || 1 : 1) * dt); // hồi khí huyết khi thôi giao chiến (data/gameplay.json → player.regen_*) // đạn + bị động Đạo Vận, linh lực hồi liên tục
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
    if (dead) hp = 0; // linh hồn: cột khí huyết luôn trống tới khi hồi sinh
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
    barrage.renderGround(ctx, at, t); camChe.render(ctx, at, t); biCanh.render(ctx, at, t); // hào quang Đạo Vận, trận cấm chế, vòng bí cảnh
    for (const n of npcs.list) { const p = at(n); if (Math.abs(p.x - me.x) < 700 && Math.abs(p.y - me.y) < 700) drawNpc(ctx, n, p.x, p.y, npcs.height); }
    const list = mobs.list.map((m) => ({ m, ...at(m) })).filter((o) => Math.abs(o.x - me.x) < 800 && Math.abs(o.y - me.y) < 1000).sort((a, b) => a.y - b.y); // chỉ vẽ quái gần màn hình
    for (const { m, x, y } of list) {
      if (m.state === 'windup') { const w = at({ x: m.wx, y: m.wy }); m.wrx = w.x; m.wry = w.y; m.heavyR = gp.monster.heavy.radius_px; }
      m.tele = m.state === 'cast' ? mobs.telegraph(m, at) : null; // vùng chiêu boss sắp đánh
      drawMonster(ctx, m, x, y, t);
    }
    tame.render(ctx, at, t); mobs.drawOrbs(ctx, at, t); // linh cầu quái bắn
    if (pet) drawFx(ctx, [{ ...pet, kind: 'pet', ...at(pet) }], 0, 0);
  }
  function renderAbove(ctx, t) {
    for (const m of mobs.list) { const p = at(m); if (Math.abs(p.x - me.x) < 800 && Math.abs(p.y - me.y) < 1000) drawMonsterLabel(ctx, m, p.x, p.y, m.uid === targetUid, t); }
    for (const n of npcs.list) { const p = at(n); if (Math.abs(p.x - me.x) < 700 && Math.abs(p.y - me.y) < 700) drawNpcLabel(ctx, n, p.x, p.y, npcs.height, performance.now(), npcs.guarded(n)); }
    daotam.render(ctx, at, t); barrage.render(ctx, at, t); // dấu ! nhiệm vụ · vệt sáng, sét, đất cháy, phi kiếm (Đạo Vận)
    juice.frame(ctx, t, me.x, me.y); drawFx(ctx, [...bolts, ...fx].map((f) => ({ ...f, ...at(f) })), 0, 0); // juice: tối màn hình khi gồng chiêu lớn (hiệu ứng vẽ đè lên vẫn sáng)
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

  const views = createViews({ daotam, ru, biCanh, gapR, info, shop, owns, teacher, bag, onLook, monsters: monDef.monsters, realmMajor: () => (progress.stageDef.major ?? 0), progress, quests, craft, itemDefs, mats, pills, blanks, awaken, cp, realms, gp, toast,
    wallet, life, getStats: () => ps, getHp: () => hp, onReward: (r) => { if (r.exp) addExp(late.questExp(r.exp)); if (r.spiritStone) progress.addStone(r.spiritStone); if (r.gold) wallet.add('vang', r.gold);
      for (const i of r.items || []) progress.add(i.id, i.count); }, recompute, usePill, emit: quests.emit });

  const inv = createInventory({ ru, recipes: { pills: pills.pills, blanks: blanks.blanks, skills: cp.skills }, info, progress, bag, craft, itemDefs, awaken, gp, art: (a) => artInfo(a)?.file || artFile(a), icon: iconUrl, fallbackIcon: placeholderIcon,
    onLook, recompute, usePill, breakthrough: () => breakthrough(), combineAction: (id) => tt.action(id), combine: (id) => tt.combine(id), btPills: new Set(realms.realms.filter((r) => r.breakthrough).map((r) => r.breakthrough.pill)), openCultivate: (tab) => views.openCultivate(tab) });
  const stageName = progress.stageName;
  const bar = createSkillBar({ learn, hud, S, gp, progress, pt, cds, slotItem: (s) => inv.slotItem(s), icon: iconUrl, fxIcon: fxIconUrl, loadout, stageName, treasure: () => treasure.view() });
  function itemAction(key, action) {
    const r = tame.isPet(key) ? tame.act(key, action) : cards.isCard(key) ? cards.act(key, action) : treasure.isTreasure(key) ? treasure.act(key, action)
      : action === 'open' ? usable.open(key.slice(5)) : action === 'doi-he' ? usable.rerollHe(+key.slice(5)) : inv.act(key, action); // linh thú / Thần Phù / pháp bảo / mở phôi / đồ khác
    if (r && cards.isCard(key)) recompute();
    if (r && typeof r === 'object') { toast(r.msg, 1600); if (r.event) quests.emit(...r.event); } else if (r) toast(r, 1500);
    progress.changed();
  }
  if (!progress.state.migrRecipes) { // người chơi cũ xong nhiệm vụ trước khi có đan phương trong thưởng → bù một lần
    for (const q of questDef.quests) if (progress.state.quests.done[q.id] && q.type !== 'daily') for (const i of q.rewards.items || []) if (teacher.has(itemDefs.get(i.id)?.teaches) && !progress.count(i.id)) progress.add(i.id, 1);
    progress.state.migrRecipes = true; progress.changed();
  }
  hp = progress.state.hp ?? Infinity;
  recompute(); if (!Number.isFinite(hp) || hp <= 0) hp = ps.hp;
  for (const g of progress.state.gear) ensureArt(g); // đồ phôi cũ mang hình tạm đã xoá → bốc lại hình bộ 6 hệ
  progress.onChange(() => { for (const g of progress.state.gear) if (!g.art) ensureArt(g); views.refreshDock?.(); });
  addEventListener('pagehide', () => progress.flush());

  return {
    update, renderBelow, renderAbove, tap, attack, skill: (id) => skills.cast(id), breakthrough, usePill,
    slotSkill: (i) => loadout.get(i), slots: loadout.size,
    openSkills: (slot = -1) => openSkillPanel({ S, loadout, bar, progress, stageName, slot, toast, learn }), // bảng Kỹ năng: chạm kỹ năng → chọn ô
    get dead() { return dead; },
    wallet, life, // tiền tệ (Kho / Vạn Bảo Lâu) + thọ nguyên
    reincarnate() { progress.reset(); life.reborn(); progress.flush(); }, // tọa hóa → chuyển thế: xoá tiến trình (main.js xoá thêm Kho rồi tải lại)
    stunned: () => now < stunUntil,
    _debug: { late, me, map, progress, mobs, voids, mdef: monDef, bag, gather, npcs, die, revive, tame, dv, cards, bolts, get treasure() { return treasure; }, cds, biCanh, learn, pt, get hopNhat() { return hopNhat; }, get bar() { return bar; }, get hp() { return hp; }, set hp(v) { hp = v; }, get ps() { return ps; } }, // chỉ cho kiểm thử (?debug)
    speed: () => buffs.speed?.mul || null,
    // Tự farm (nút Tự farm) và farm theo nhiệm vụ (questauto.js / navi.js) là hai chế độ riêng của autoplay.js
    toggleAuto() { if (dead) return; const on = !(auto && autoPlay.mode() === 'farm'); setAuto(on ? 'farm' : null); toast(on ? 'Tự farm: bật — đánh quái quanh đây, kéo cần để dời chỗ' : 'Tự farm: tắt', 1600); },
    setAuto, autoMode: () => (auto ? autoPlay.mode() : null), autoHungry: () => (auto ? autoPlay.hungry() : 0), daotam, setAutoQ: (v) => hud.setActive('autoq', v), // Tự làm nhiệm vụ (questauto.js)
    healPill: () => usePill(HEAL_PILL), usePill, pillCount: (id) => progress.count(id), isAuto: () => auto, autoDir: () => (auto ? autoDir : null), autoMoved: () => auto && autoPlay.moved(), // kéo cần khi Tự động: dời neo
    openCodex: () => openCodex({ loadJSON, gp, mats, pills, recipes, cp, monsters: monDef.monsters, mobSkills: monDef.skills, blanks, qItems, artDef, info, cpText: cpFx.text, fxDuration }), // Đồ giám (nút sách)
    statValue: views.statValue, openQuests: views.openQuests, questBrief: views.questBrief, naviGoal: views.naviGoal, track: views.track, setGo: views.setGo, setQuestAuto: views.setQuestAuto, pillChoices: views.pillChoices, zoneRing: (z) => mobs.ringOf(z), openCultivate: views.openCultivate, // dẫn đường + đan dùng nhanh
    forgedLook, progress, // progress: trận nhãn đã thắp (src/game/stations.js)
    setDock(d) { views.refreshDock = d.refresh; },
    bagEntries: () => [...inv.entries().map(({ item, count }) => { const a = item.key.startsWith('gear:') && usable.gearAction(progress.gear(+item.key.slice(5)));
      return { item: a ? { ...item, actions: [...item.actions.slice(0, -1), a, item.actions.at(-1)] } : item, count }; }), ...tame.entries(), ...cards.entries(dv.mods()), ...treasure.entries()], slotItem: inv.slotItem, slotCandidates: inv.slotCandidates, itemAction, quickSell: (t, dry) => inv.quickSell(t, dry), quickSellTiers: () => gp.quick_sell.tiers.map((id) => ({ id, name: id === 'none' ? 'Chưa thức tỉnh' : awaken.tiers.find((x) => x.id === id)?.color_old || id, on: gp.quick_sell.default.includes(id) })),
    openShop() { if (!map.safeAt(me.x, me.y)) return toast(`${shop.name} ở ${map.town?.name || 'trong thành'} — hãy vào thành`, 1800); views.openShop(); },
    onProp: (id) => { const f = { 'kho-hang': () => views.openShop(), 'lo-luyen-dan': () => views.openCultivate('dan'), 'te-dan': () => views.openCultivate('realm') }[id]; f?.(); return !!f; }, // chạm công trình
    realmName: () => progress.stageDef.name, gp, grantFull: (gift) => grantFull({ progress, wallet, gift, mats, pills, recipes, shop, blanks }), grantHopNhat: (gift) => grantHopNhat({ progress, cards, treasure, learn, dvDef, pbDef, gift }), grantGod: (gift) => { const n = grantGod({ progress, bag, awaken, gp, mdef: monDef, gift }); recompute(); return n; }, grantStage: (id) => { const i = progress.stageIndex(id); if (i <= progress.state.stage) return 0; progress.setStage(i); recompute(); return 1; }, // mã 'admin': nâng cảnh giới tới mốc mở pháp bảo // mã thử 'full' // gp: thông số chơi thử (bảng xếp hạng dùng trọng số lực chiến)
    spar: (op) => simulateDuel(ps, op, stats, gp.spar), // luận bàn với bóng chỉ số người trên bảng xếp hạng
    rankInfo: () => ({ stageIndex: progress.state.stage, stageName: progress.stageDef.name, exp: progress.state.exp, stats: ps, voidKills: progress.state.voidKillCount || 0 }),
    markers: () => voids.markers(), hudArt: () => { const c = cards.equippedDefs()[0]; return { pb: treasure.view()?.thumb || iconUrl('item.phapbao.phoi.001'), phu: c ? iconUrl(`card.${c.id}`) || cardArt(c.id, 'den') : iconUrl('card.phu.lien-thanh'), dv: cardArt('summary', 'den') }; }, // Âm Hư (bản đồ) · ảnh vật phẩm cho nút Pháp Bảo / Thần Phù / Đạo Vận
  };
}
