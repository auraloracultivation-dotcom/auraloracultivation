// HUYẾT SÁT BÍ CẢNH (chủ dự án 23/10/2026: Tiên Nghịch × My Heroes dungeon) — THỬ NGHIỆM phía máy khách.
// Đứng ngoài thành bấm Bắt đầu (Nhiệm vụ → Bí Cảnh): vòng cấm chế quanh chỗ đứng, 10 đợt quái tầng của mình ùa vào.
// Hết đợt → đợt sau mạnh hơn; đợt 5 có tinh anh, đợt 10 có boss. Thua: chết / ra khỏi vòng / hết giờ đợt. Thưởng theo đợt đã qua.
// Số liệu: data/build/bi-canh.json. Quái chết vẫn đi qua onKill thường (tu vi, rơi đồ, Thần Phù…).
import { wrapDelta } from '../map/index.js';

// c: { def, mdef, mobs, map, me, progress, life, wallet, cards, cardDef, dv, pbItem, toast, play, say, dead(), stageId() }
export function createBiCanh(c) {
  const { def, mdef, mobs, map, me, progress } = c;
  const order = Object.keys(mdef.stage_stats);
  let run = null; // { x, y, wave, left (giây còn của đợt), mobs: Set uid, pause }

  const today = () => String(c.life.today());
  const triesLeft = () => { const t = progress.state.biCanh; return def.tries_per_day - (t?.day === today() ? t.n : 0); };
  // Quái thường đúng tầng của người chơi (không có thì lấy tầng gần nhất có quái)
  function pool(rank) {
    const si = order.indexOf(c.stageId());
    for (let k = 0; k < order.length; k++) for (const j of [si - k, si + k]) {
      const s = order[j]; if (!s) continue;
      const arr = mdef.monsters.filter((d) => !d.void && d.rank === rank && d.stages.includes(s));
      if (arr.length) return { arr, stage: s };
    }
    return { arr: mdef.monsters.filter((d) => !d.void && d.rank === rank), stage: c.stageId() };
  }

  function start() {
    if (run) return 'Đang trong bí cảnh';
    if (c.dead()) return 'Đang là linh hồn';
    if (map.safeAt(me.x, me.y)) return 'Ra khỏi thành rồi mới mở bí cảnh';
    if (triesLeft() <= 0) return 'Hôm nay hết lượt (qua 0h giờ Việt Nam có lượt mới)';
    const t = progress.state.biCanh?.day === today() ? progress.state.biCanh : { day: today(), n: 0 };
    t.n++; progress.state.biCanh = t; progress.changed();
    run = { x: me.x, y: me.y, wave: 0, left: 0, mobs: new Set(), pause: 1.2 };
    c.play('v.tran-phap', me.x, me.y + 8, def.radius_px * 0.9, { ground: true });
    c.toast(`${def.name}: giữ vững trong vòng cấm chế, vượt ${def.waves} đợt!`, 2600);
    return null;
  }

  function spawnWave() {
    const w = ++run.wave, n = def.base_count + def.per_wave * (w - 1), hpMul = 1 + def.hp_per_wave * (w - 1);
    const p = pool('thuong');
    const put = (d, stage, k, total) => {
      const a = (k / total) * Math.PI * 2 + Math.random() * 0.3, r = def.radius_px * (0.85 + Math.random() * 0.12);
      const m = mobs.spawnAt(d, stage, map.wrapX(run.x + Math.cos(a) * r), map.wrapY(run.y + Math.sin(a) * r * 0.75), { hpMul, aggro: 9999, leash: 9999, biCanh: true });
      run.mobs.add(m.uid);
    };
    for (let k = 0; k < n; k++) put(p.arr[Math.floor(Math.random() * p.arr.length)], p.stage, k, n);
    if (w === def.elite_wave) { const e = pool('elite'); for (let k = 0; k < 2; k++) put(e.arr[k % e.arr.length], e.stage, k, 2); }
    if (w === def.boss_wave) { const b = pool('boss'); put(b.arr[0], b.stage, 0, 1); }
    run.left = def.wave_time_s;
    c.toast(`Đợt ${w}/${def.waves}${w === def.boss_wave ? ' — BOSS!' : w === def.elite_wave ? ' — tinh anh' : ''}`, 1600);
  }

  function end(win, why) {
    const cleared = win ? def.waves : Math.max(0, run.wave - 1), R = def.reward;
    for (const uid of run.mobs) { const m = mobs.list.find((x) => x.uid === uid); if (m && m.state !== 'dead') { m.state = 'dead'; m.deadT = 0.5; } }
    run = null;
    const got = [];
    if (cleared) {
      progress.addStone(R.stone_per_wave * cleared); c.wallet.add('vang', R.gold_per_wave * cleared);
      got.push(`${R.stone_per_wave * cleared} Linh thạch`, `${R.gold_per_wave * cleared} Vàng`);
      R.card_at.forEach((at, i) => {
        if (cleared < at) return;
        const list = c.cardDef.list, cd = list[Math.floor(Math.random() * list.length)];
        const tier = Math.max(R.card_min_tier[i], Math.floor(Math.random() * 7 * Math.random()));
        c.cards.grant(cd.id, tier); got.push(`Thần Phù ${cd.name}`);
      });
      if (cleared >= R.treasure_blank_at) { progress.add(c.pbItem, 1); got.push('Phôi Pháp Bảo'); }
      const give = ([id, n]) => { progress.add(id, n); got.push(`${c.itemName(id)}${n > 1 ? ` ×${n}` : ''}`); };
      for (let k = 3; k <= cleared; k += 3) give(R.items_per_3[(k / 3 - 1) % R.items_per_3.length]); // mỗi 3 đợt 1 món
      if (win) R.full_clear.forEach(give);
      if (cleared >= R.set_item_at) c.dv.onKill({ void: true, def: {} }, () => got.push('đồ ngũ hành'));
      progress.changed();
    }
    c.toast(`${win ? 'Vượt' : why} ${def.name} — qua ${cleared}/${def.waves} đợt${got.length ? `. Thưởng: ${got.join(', ')}` : ''}`, 5000);
  }

  function update(dt) {
    if (!run) return;
    if (c.dead()) return end(false, 'Ngã xuống ở');
    const d = Math.hypot(wrapDelta(me.x - run.x, map.width), wrapDelta(me.y - run.y, map.height));
    if (d > def.radius_px + 40) return end(false, 'Rời khỏi');
    if (run.pause > 0) { run.pause -= dt; if (run.pause <= 0) spawnWave(); return; }
    run.left -= dt;
    for (const uid of run.mobs) { const m = mobs.list.find((x) => x.uid === uid); if (!m || m.state === 'dead') run.mobs.delete(uid); }
    if (!run.mobs.size) { if (run.wave >= def.waves) return end(true); run.pause = def.break_s; c.say(me.x, me.y - 50, `Qua đợt ${run.wave}!`, '#ffd76a', true); return; }
    if (run.left <= 0) end(false, 'Hết giờ ở');
  }

  // Vòng cấm chế đỏ quanh bí cảnh + đồng hồ đợt
  function render(ctx, at, now) {
    if (!run) return;
    const p = at(run), r = def.radius_px, k = now / 1000;
    ctx.save();
    ctx.strokeStyle = '#ff3b4f'; ctx.lineWidth = 2; ctx.globalAlpha = 0.55 + 0.25 * Math.sin(k * 3);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r, r * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([6, 8]); ctx.lineDashOffset = -k * 30; ctx.globalAlpha = 0.4;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, r - 8, (r - 8) * 0.75, 0, 0, Math.PI * 2); ctx.stroke();
    if (run.wave) { // đồng hồ đợt trên đầu người chơi
      const q = at(me), txt = `Đợt ${run.wave}/${def.waves} · ${Math.max(0, Math.ceil(run.left))}s · ${run.mobs.size} quái`;
      ctx.setLineDash([]); ctx.globalAlpha = 1; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(0,0,0,.85)'; ctx.fillStyle = run.left < 10 ? '#ff8a7a' : '#ffd76a';
      ctx.strokeText(txt, q.x, q.y - 62); ctx.fillText(txt, q.x, q.y - 62);
    }
    ctx.restore();
  }
  const status = () => (run ? { wave: run.wave, waves: def.waves, left: Math.max(0, Math.ceil(run.left)), mobs: run.mobs.size } : null);
  // Bảng trong Nhiệm vụ → Bí Cảnh
  const panel = () => ({ name: def.name, tries: triesLeft(), max: def.tries_per_day, running: !!run, status: status(), def });
  // Huyết Sát Lệnh: thêm 1 lượt hôm nay
  function addTry() { const t = progress.state.biCanh?.day === today() ? progress.state.biCanh : { day: today(), n: 0 }; t.n--; progress.state.biCanh = t; progress.changed(); }
  return { addTry, start, update, render, status, panel, active: () => !!run, zone: () => (run ? { x: run.x, y: run.y, r: def.radius_px - 20 } : null), quit: () => run && end(false, 'Bỏ') };
}
