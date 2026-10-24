// PHÁP BẢO (chủ dự án 23/10/2026, Tiên Nghịch × My Heroes) — THỬ NGHIỆM phía máy khách. Số liệu: data/build/phap-bao.json.
// - Có được từ Phôi Pháp Bảo (Vạn Bảo Lâu / rơi từ tinh anh, boss, Âm Hư): chưa biết là gì, NHẬN CHỦ (tốn Linh thạch) mới lộ.
// - 1 ô pháp bảo (mở ở `unlock`). Đeo vào → kỹ năng "Pháp Bảo" (xếp vào ô kỹ năng) dùng chiêu riêng của pháp bảo.
// - Chiêu bắn đạn đi qua barrage.fire → ăn Đạo Vận (bộ ngũ hành + Thần Phù): bắn quạt, nảy, tách, sét lan…
// - Ôn dưỡng lên cấp (Linh thạch): sát thương +mul_per_lv mỗi cấp, số đạn / hồn / tia +1 mỗi 2 cấp.
// - Thức tỉnh dòng chỉ số random như pháp khí (craft.awakenObj) — cộng vào chỉ số khi đang đeo.
// Lưu progress.state.treasures = [{ uid, id, lv, known, aw }], progress.state.treasureOn = uid.
import { juice } from './juice.js';
import { fxIconUrl, loadFx, iconUrl } from '../entity/index.js';
import { createThien } from './treasure-thien.js'; // chiêu mới 6 pháp bảo Thiên hệ (24/10/2026)
import { sound } from '../audio/index.js';

const STAT = { hp: 'Khí huyết', linh: 'Tấn công', def: 'Phòng thủ', xuyen: 'Xuyên giáp', crit: 'Bạo kích %', hut: 'Hút máu %', phan: 'Phản đòn %' };

// c: { def, S, progress, craft, awaken, barrage, mobs, me, map, buffs, recompute, heal(n), maxHp(), target(r), play, say, toast, stageOk, now() }
export function createTreasure(c) {
  const { def, S, progress, craft, barrage, mobs, me, play, toast } = c;
  const byId = new Map(def.list.map((t) => [t.id, t]));
  const thien = createThien({ barrage, mobs, me, map: c.map, play, heal: c.heal, maxHp: c.maxHp, target: c.target, rewind: c.rewind });
  const pic = (d) => d.icon_url || iconUrl(d.id) || fxIconUrl(...d.icon); // ảnh chủ dự án (icons atlas) — thiếu thì mượn icon hiệu ứng
  const DICH = 'item.dich.on-duong.001'; // Ôn Dưỡng Linh Dịch
  const dichNeed = (t) => def.lv_dich?.[(t.lv || 0) + 1] || 0;
  const list = () => (progress.state.treasures ||= []);
  { const M = def.migrate_25_10 || {}; let moved = 0; // chỉ giữ 12 pháp bảo (chủ dự án 25/10/2026): đồ đã bỏ → pháp bảo cùng hệ, giữ cấp + thức tỉnh
    for (const t of list()) if (M[t.id]) { t.id = M[t.id]; moved++; }
    if (moved) { progress.changed(); setTimeout(() => toast(`${moved} pháp bảo cũ đã đổi sang pháp bảo cùng hệ (giữ nguyên cấp, thức tỉnh)`, 4000), 2500); } }
  const on = () => list().find((t) => t.uid === progress.state.treasureOn && t.known) || null;
  const tierName = (id) => c.awaken.tiers.find((x) => x.id === id)?.name || '';
  const scale = (t) => 1 + def.mul_per_lv * (t.lv || 0);
  const more = (t) => Math.floor((t.lv || 0) / 2);
  const fill = (d, t) => d.desc.replace(/\{(\w+)(%?)\}/g, (_, k, p) => { const v = k === 'n' ? d.n + more(t) : d[k]; return p ? `${Math.round(v * 100)}%` : v; });

  // Kỹ năng "Pháp Bảo": hồi chiêu + linh lực theo pháp bảo đang đeo (skills.js đọc S['phap-bao'])
  function syncSkill() {
    const t = on(), d = t && byId.get(t.id), s = S['phap-bao'];
    if (!s) return;
    s.cd_s = d ? d.cd_s : 10; s.mp = d ? d.mp : 20;
    s.icon = d ? d.icon : ['v.cong-hu', 0];
    if (d && thien.has(d.kind)) loadFx(thien.fxIds(d)); // tải sẵn hoạt ảnh của pháp bảo Thiên hệ đang đeo (không tải cả 6 lúc vào game)
  }

  // ---- Dùng chiêu: trả về true nếu đã kích hoạt ----
  // o: { mul (nhân sát thương), quietName (không hô tên) } — Thiên Cơ Hợp Nhất tự phóng liên tục (hopnhat.js)
  function use(quiet, o = {}) {
    const t = on(), d = t && byId.get(t.id);
    if (!d) { if (!quiet) toast('Chưa đeo pháp bảo (Kho → Pháp Bảo)', 1400); return false; }
    const H = o.hop || (o.soft && d.hop_single); // đang Hợp Nhất (tự phóng, hoặc bấm/tự dùng khi Hợp Nhất làm hồi chiêu gần 0)
    const mul = d.mul * scale(t) * (o.mul || 1) * (H ? d.hop_mul || 1 : 1), n = // hop_mul: bù riêng khi Thiên Cơ Hợp Nhất tự phóng (pháp bảo đánh vùng không ăn thưởng đạn Đạo Vận)
      Math.max(1, Math.round(((d.n || 0) + more(t)) * (H ? d.hop_n_mul || 1 : 1))), tgt = c.target(260); // hop_n_mul: Hợp Nhất phóng liên tục → ít đạn mỗi lượt cho đỡ rối mắt
    const he = c.heOf(d.he);
    const aim = (m) => { if (!m) return { dx: me.facing, dy: 0 }; const r = mobs.rel(m, me), L = Math.hypot(r.dx, r.dy - 10) || 1; return { dx: r.dx / L, dy: (r.dy - 10) / L }; };
    const shot = (dx, dy, extra = {}) => barrage.fire({ id: 'pb', x: me.x + dx * 26, y: me.y - 14 + dy * 26, dx, dy, speed: 420, range: 260, fx: d.fx || he.bolt, size: (H && d.hop_size) || d.size || 18, mul, color: he.color, single: !!(H && d.hop_single), pierce: (H && d.hop_pierce) || 0, ...extra }); // xuất phát trước người một đoạn: không che đầu, đòn chém; hop_single: Hợp Nhất tự phóng không nhân đạn Đạo Vận — bắn liên tục ×5 đạn che kín nhân vật
    if (!o.quietName) c.say(me.x, me.y - 44, d.name, he.color, true);
    sound(o.hop || o.soft ? 'sfx.hop-nhat.ban' : 'sfx.phap-bao'); // soft: Hợp Nhất làm pháp bảo không hồi chiêu → tiếng nhỏ, không dồn dập
    if (d.cast_fx && !o.hop && !o.soft && !['stream', 'seal', 'shield', 'storm'].includes(d.kind)) play(d.cast_fx, me.x, me.y + 4, 52, { ground: true }); // ảnh hoạt ảnh pháp bảo (Hợp Nhất bắn liên tục: bỏ, kẻo hình to che kín nhân vật)
    if (d.shake) juice.later(0.15, () => juice.shake(d.shake, 0.25)); if (d.dim) juice.dim(0.6, d.dim); // cảm giác đòn kiểu My Heroes
    if (thien.has(d.kind)) return thien.cast(d, { mul, n, tgt, color: he.color, auto: !!o.quietName });
    switch (d.kind) {
      case 'ring_burst': for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2; shot(Math.cos(a), Math.sin(a), { homing: d.homing ?? 0.9, range: d.range_px ?? 260 }); } break; // vòng kiếm toả ra rồi quặt về mục tiêu
      case 'stream': { // phun liên tục về phía mục tiêu (đổi mục tiêu khi con cũ chết) + luồng lửa hồ lô
        if (d.cast_fx) { const { dx, dy } = aim(tgt); barrage.schedule(d.s, 0.5, () => { const a = Math.atan2(dy, dx); play(d.cast_fx, me.x + dx * 90, me.y - 12 + dy * 90, 26, { rot: a }); }); }
        barrage.schedule(d.s, d.s / n, () => { const m = c.target(260) || tgt, { dx, dy } = aim(m), j = (Math.random() - 0.5) * 0.25; shot(dx * Math.cos(j) - dy * Math.sin(j), dx * Math.sin(j) + dy * Math.cos(j)); });
        break;
      }
      case 'sweep': { // quét quạt ±60° quanh hướng mục tiêu
        const { dx, dy } = aim(tgt), a0 = Math.atan2(dy, dx);
        barrage.schedule(d.s, d.s / n, (k) => { const a = a0 - 1.05 + (2.1 * k) / Math.max(1, n - 1); shot(Math.cos(a), Math.sin(a)); });
        break;
      }
      case 'wisps': barrage.addOrbit({ n, r: d.r, mul, s: d.s, bolt: 'v.dan-am' }); play('v.hac-dong', me.x, me.y, 50, { ground: true }); break;
      case 'field': {
        play('v.moc-lien', me.x, me.y + 4, 46, { ground: true });
        barrage.schedule(d.s, 1, () => c.heal(c.maxHp() * d.heal));
        barrage.schedule(d.s, 0.3, () => { // mỗi nhịp n mũi, chia cho n con gần nhất (chơi thử 24/10: dồn hết vào 1 con → đánh đám quá yếu)
          const near = mobs.within(me, 220).filter((m) => m.state !== 'dead').sort((a, b) => mobs.distTo(a, me) - mobs.distTo(b, me)); if (!near.length) return;
          for (let j = 0; j < n; j++) { const { dx, dy } = aim(near[j % near.length]); shot(dx, dy, { homing: 1.5, pierce: d.pierce || 0 }); }
        });
        break;
      }
      case 'seal': {
        const m = tgt || { x: me.x + me.facing * 40, y: me.y };
        play(d.fx, m.x, m.y + 4, d.h, { ground: true }); // hoạt ảnh Trấn Sơn Ấn mới đã có nổ đá + đất nứt (chủ dự án 23/10)
        barrage.zap({ kind: 'ring', x: m.x, y: m.y, r: d.r, t: 0.6, color: he.color });
        barrage.hitAround(m.x, m.y, d.r, mul, 'skill', d.stun);
        break;
      }
      case 'rewind': { // Tuế Nguyệt Sa Lậu: quay ngược thời gian — hồi máu + làm mới hồi chiêu (trừ pháp bảo)
        play(d.fx, me.x, me.y + 4, d.h, { ground: true }); c.heal(c.maxHp() * d.heal * scale(t)); c.rewind?.();
        barrage.zap({ kind: 'ring', x: me.x, y: me.y, r: 70, t: 0.8, color: he.color }); break;
      }
      default: return false;
    }
    return true;
  }

  // ---- Có được: phôi pháp bảo ----
  function openBlank(itemId) {
    if (!progress.take(itemId, 1)) return 'Hết phôi';
    const pool = def.list.filter((x) => !x.thien), d = pool[Math.floor(Math.random() * pool.length)]; // pháp bảo Thiên hệ: chỉ từ phó bản
    list().push({ uid: progress.state.uid++, id: d.id, lv: 0, known: false, aw: { tier: null, lines: [], spent: 0 } }); progress.changed();
    return 'Luyện hóa xong: một pháp bảo chưa nhận chủ (Kho → Pháp Bảo)';
  }
  function onKill(m) { // rơi phôi
    const ch = m.void ? def.drop.void : def.drop[m.def.rank] || 0;
    if (Math.random() < ch) { progress.add(def.items[0].id, 1); toast('Nhặt được Phôi Pháp Bảo!', 2200); }
  }

  // ---- Kho: thẻ Pháp Bảo ----
  function entry(t) {
    const d = byId.get(t.id);
    if (!t.known) return { id: `pb:${t.uid}`, key: `pb:${t.uid}`, name: 'Pháp bảo chưa nhận chủ', cat: 'phap-bao', thumb: iconUrl('item.phapbao.phoi.001') || fxIconUrl('v.cong-hu', 0),
      sub: 'Linh quang mờ ảo — chưa biết là pháp bảo gì', detail: 'Nhận chủ để lộ hình và dùng được.',
      actions: [{ id: 'pb-bind', label: `Nhận chủ (${def.bind_cost} LT)`, disabled: progress.state.stone < def.bind_cost },
        { id: 'pb-break', label: 'Phân rã', danger: true, confirm: 'Phân rã pháp bảo chưa nhận chủ?' }] };
    const worn = progress.state.treasureOn === t.uid, cost = def.lv_cost[(t.lv || 0) + 1], aw = craft.awakenCost(t.aw);
    const lines = (craft.norm(t.aw)?.lines || []).map((l) => ({ text: `${STAT[l.k] || l.k} +${l.v}${l.p ? '%' : ''}`, tier: l.t }));
    return { id: `pb:${t.uid}`, key: `pb:${t.uid}`, name: `${d.name}${t.lv ? ` +${t.lv}` : ''}`, cat: 'phap-bao', thumb: pic(d), equipped: worn, tier: t.aw.tier,
      sub: `${d.thien ? '✦ Tiên khí · ' : ''}Pháp bảo · hệ ${d.he} · cấp ${t.lv || 0}/${def.max_lv}${t.aw.tier ? ` · ${tierName(t.aw.tier)}` : ''}`, lines,
      detail: `${fill(d, t)}\nHồi ${d.cd_s} giây · ${d.mp} linh lực · sát thương ×${scale(t).toFixed(2)}. Xếp kỹ năng "Pháp Bảo" vào ô kỹ năng để dùng.`,
      actions: [
        { id: 'pb-wear', label: worn ? 'Tháo' : 'Đeo', disabled: !worn && !c.stageOk(def.unlock) },
        cost ? { id: 'pb-up', label: `Ôn dưỡng lên cấp ${(t.lv || 0) + 1} (${cost} LT${dichNeed(t) ? ` + ${dichNeed(t)} Linh Dịch, có ${progress.count(DICH)}` : ''})`, disabled: progress.state.stone < cost || progress.count(DICH) < dichNeed(t) } : { id: 'pb-up', label: 'Đã ôn dưỡng tối đa', disabled: true },
        aw === null ? { id: 'pb-aw', label: 'Thức tỉnh: đã đạt giới hạn', disabled: true } : { id: 'pb-aw', label: `Thức tỉnh dòng ${t.aw.lines.length + 1} (${aw} LT)`, disabled: progress.state.stone < aw },
        { id: 'pb-break', label: 'Phân rã', danger: true, confirm: `Phân rã ${d.name}?` }] };
  }
  const entries = () => list().map((t) => ({ item: entry(t), count: 1 }));
  function act(key, action) {
    const t = list().find((x) => `pb:${x.uid}` === key); if (!t) return null;
    const d = byId.get(t.id);
    if (action === 'pb-bind') {
      if (progress.state.stone < def.bind_cost) return 'Không đủ Linh thạch';
      progress.addStone(-def.bind_cost); t.known = true; progress.changed(); play(def.bind_fx || 'vong-lua', me.x, me.y + 4, 60, { ground: true });
      return `Nhận chủ thành công: ${d.name}!`;
    }
    if (action === 'pb-wear') {
      if (progress.state.treasureOn === t.uid) progress.state.treasureOn = null;
      else { if (!c.stageOk(def.unlock)) return `Pháp bảo mở ở ${c.stageName?.(def.unlock) || 'cảnh giới cao hơn'}`; progress.state.treasureOn = t.uid; }
      syncSkill(); c.recompute(); progress.changed();
      return progress.state.treasureOn ? `Đeo ${d.name} — xếp kỹ năng "Pháp Bảo" vào ô để dùng` : `Tháo ${d.name}`;
    }
    if (action === 'pb-up') {
      const cost = def.lv_cost[(t.lv || 0) + 1]; if (!cost) return 'Đã tối đa';
      if (progress.state.stone < cost) return 'Không đủ Linh thạch';
      if (dichNeed(t) && !progress.take(DICH, dichNeed(t))) return `Cần ${dichNeed(t)} Ôn Dưỡng Linh Dịch`;
      progress.addStone(-cost); t.lv = (t.lv || 0) + 1; progress.changed(); return `${d.name} ôn dưỡng lên cấp ${t.lv}`;
    }
    if (action === 'pb-aw') { const r = craft.awakenObj(t.aw); c.recompute(); return r.msg; }
    if (action === 'pb-break' || action === 'discard') {
      const back = Math.floor((t.aw.spent + def.lv_cost.slice(0, (t.lv || 0) + 1).reduce((a, b) => a + b, 0)) * def.dismantle_refund);
      if (progress.state.treasureOn === t.uid) progress.state.treasureOn = null;
      progress.state.treasures = list().filter((x) => x !== t); progress.addStone(back); syncSkill(); c.recompute(); progress.changed();
      return `Phân rã${t.known ? ` ${d.name}` : ''}: +${back} Linh thạch`;
    }
    return null;
  }
  // Dòng thức tỉnh của pháp bảo đang đeo (gộp vào chỉ số như pháp khí)
  const worn = () => { const t = on(); return t?.aw?.tier ? [t.aw] : []; };
  const view = () => { const t = on(), d = t && byId.get(t.id); return d ? { thumb: pic(d), cd: d.cd_s, name: d.name } : null; };
  syncSkill(); loadFx([...def.list.map((d) => d.icon[0]), 'v.cong-hu', ...def.list.map((d) => d.cast_fx).filter(Boolean), def.bind_fx].filter(Boolean)); // icon pháp bảo trong Kho / ô kỹ năng
  // Đeo pháp bảo hệ he (đã nhận chủ, cấp cao nhất) — nút "Mặc cả bộ" của Cẩm nang
  function wearHe(he) {
    if (on() && byId.get(on().id)?.he === he) return true;
    const t = list().filter((x) => x.known && byId.get(x.id)?.he === he).sort((a, b) => (b.lv || 0) - (a.lv || 0))[0];
    if (!t || !c.stageOk(def.unlock)) return false;
    progress.state.treasureOn = t.uid; syncSkill(); c.recompute(); progress.changed(); return true;
  }
  return { wearHe, current: () => { const x = on(); return x ? byId.get(x.id) : null; }, use, openBlank, onKill, entries, act, worn, view, isTreasure: (key) => key.startsWith('pb:'), owns: (id) => list().some((x) => x.id === id), grant: (id, lv = 0) => { list().push({ uid: progress.state.uid++, id, lv, known: true, aw: { tier: null, lines: [], spent: 0 } }); progress.changed(); } };
}
