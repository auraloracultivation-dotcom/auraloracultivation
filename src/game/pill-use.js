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
    const rate = Math.min(1, realm.breakthrough.rate + (charm ? realms.breakthrough_rules.protect_charm.add_rate_points : 0));
    if (charm) toast('Dùng Bảo hộ phù: +15% tỷ lệ', 1500);
    if (Math.random() < rate) {
      progress.advanceStage(); c.setHp(Infinity); c.recompute(); c.setHp(c.ps().hp);
      toast(`Đột phá thành công: ${progress.stageDef.name}! Thọ nguyên tối đa ${life.max()} năm`, 3000);
    } else toast(`Đột phá thất bại (${Math.round(rate * 100)}%) — mất ${pill.name}, tu vi giữ nguyên`, 3000);
    progress.changed();
  }
  return { usePill, breakthrough };
}
