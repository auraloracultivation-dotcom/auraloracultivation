// Dùng đan dược + đột phá cảnh giới (tách khỏi gameplay.js). Thông số: data/gameplay.json → pills, data/realms.json → breakthrough.
// c: { gp, realms, progress, itemDefs, life, quests, pt, buffs, cds, me, HEAD, toast, say, play, addExp, recompute,
//      now(), dead(), hp(), setHp(v), ps() }
export function createPillUse(c) {
  const { gp, realms, progress, itemDefs, life, quests, pt, buffs, cds, me, toast, say, play } = c;
  function usePill(id) {
    const p = gp.pills[id], now = c.now(), ps = c.ps();
    if (!p || c.dead()) return false;
    if ((cds.pill || 0) > now) { toast('Đan dược đang hồi', 900); return false; }
    if (p.life_add) { const r = life.canEat(); if (!r.ok) { toast(r.msg, 2200); return false; } }
    const sid = progress.stageDef.tier, major = sid.startsWith('lk') ? 'lk' : sid.slice(0, 2), ORD = c.majors || []; // mã đại cảnh giới (lk/tc/…) theo bậc tương ứng của cấp
    if (p.realm && p.realm !== major) { toast(`Chỉ dùng ở ${c.realmName?.(p.realm) || p.realm} — đang ở ${progress.stageDef.name}`, 2200); return false; } // Viên Mãn Đan theo đại cảnh giới
    if (p.realm_max && ORD.indexOf(major) > ORD.indexOf(p.realm_max)) { toast(`${itemDefs.get(id)?.name || 'Đan'} không còn tác dụng ở ${progress.stageDef.name}`, 2200); return false; }
    const full = (p.exp_pct || p.exp_fill) && (progress.atPeak() || progress.state.exp >= progress.stageDef.exp_need);
    if (full) { toast(progress.nextStageDef() ? 'Tu vi đã đầy — hãy bấm Đột phá' : 'Đã ở cảnh giới cao nhất', 1800); return false; }
    if (!progress.take(id, 1)) { toast(`Hết ${itemDefs.get(id)?.name || 'đan'}`, 1200); return false; }
    cds.pill = now + gp.pills.use_cooldown_s;
    if (p.heal_hp) { c.setHp(Math.min(ps.hp, c.hp() + ps.hp * p.heal_hp)); say(me.x, me.y - c.HEAD, `+${Math.round(ps.hp * p.heal_hp)} khí huyết`, '#5dff7a', true); }
    if (p.heal_mp) pt.gain(ps.mp * p.heal_mp);
    if (p.buff === 'pt_drain') pt.setDrainMul(p.mul, p.s);
    else if (p.buff) { buffs[p.buff] = { mul: p.mul, until: now + p.s }; c.recompute(); }
    if (p.life_add) { toast(life.eat(), 2400); play('vong-lua', me.x, me.y - 8, 34); c.recompute(); }
    if (p.exp_pct) c.addExp(Math.ceil(progress.stageDef.exp_need * p.exp_pct));
    if (p.exp_fill) c.addExp(Math.max(0, progress.stageDef.exp_need - progress.state.exp));
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
    const rate = Math.min(1, realm.breakthrough.rate + (charm ? realm.breakthrough.charm_add ?? realms.breakthrough_rules.protect_charm.add_rate_points : 0)); // Anh Biến: phù chỉ cộng rất ít
    if (charm) toast('Bảo hộ phù sáng lên — vận khí tăng', 1500);
    if (Math.random() < rate) {
      progress.advanceStage(); c.setHp(Infinity); c.recompute(); c.setHp(c.ps().hp);
      toast(`Đột phá thành công: ${progress.stageDef.name}! Thọ nguyên tối đa ${life.max()} năm`, 3000);
    } else if (realm.breakthrough.fail_to) { // Anh Biến: thất bại rơi thẳng về tầng chỉ định (Hóa Thần Trung kỳ), tu vi về 0
      const i = progress.stageIndex(realm.breakthrough.fail_to); progress.setStage(i, 0); c.recompute(); c.setHp(Math.min(c.hp(), c.ps().hp));
      toast(`Đột phá thất bại — thiên kiếp đánh nát đạo cơ: rơi về ${progress.stageDef.name}`, 4000);
    } else { const lost = Math.floor(progress.state.exp * (gp.breakthrough_fail_exp_loss ?? 0.5)); progress.state.exp -= lost; progress.changed?.();
      toast(`Đột phá thất bại — thiên kiếp phản phệ: mất ${pill.name} và ${lost.toLocaleString('vi')} tu vi`, 3500); }
    progress.changed();
  }
  // Đan cần cho lần đột phá đại cảnh giới kế tiếp (null = không cần / chưa tới đỉnh) — Đạo Tâm dùng để bù đan khi đột phá thất bại
  function breakthroughPill() {
    const next = progress.nextStageDef(), rid = next && gp.major_realm_first_stage[next.id];
    if (!rid || !progress.atPeak()) return null;
    return realms.realms.find((r) => r.id === rid)?.breakthrough?.pill || null;
  }
  return { usePill, breakthrough, breakthroughPill };
}
