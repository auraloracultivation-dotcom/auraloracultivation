// Chỉ số nhân vật và công thức sát thương. Số lấy từ data/stats.json (Lab) + data/gameplay.json (chơi thử).
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function createStats(statsDef, gp) {
  const C = statsDef.combat.const;
  const caps = statsDef.caps;

  // Chỉ số người chơi = nền theo tầng cảnh giới + dòng trang bị + bùa/đan đang có hiệu lực
  function player(stageDef, gearList, buffs = {}) {
    const s = { ...gp.player.base_other, hp: stageDef.hp, linh: stageDef.linh, def: stageDef.def, mp: stageDef.mp };
    for (const g of gearList) for (const l of g.lines) s[l.k] = (s[l.k] || 0) + l.v;
    if (buffs.linh) s.linh *= buffs.linh;
    if (buffs.def) s.def *= buffs.def;
    if (buffs.ne) s.ne *= buffs.ne;
    s.crit = Math.min(caps.crit * 100, s.crit);
    s.hut = Math.min(caps.hut * 100, s.hut);
    s.phan = Math.min(caps.phan * 100, s.phan);
    for (const k of ['hp', 'linh', 'def', 'mp']) s[k] = Math.round(s[k]);
    return s;
  }

  // Quái: Linh lực = ATK của Lab; chính xác / né là hằng chơi thử
  function monster(m) {
    return { linh: m.atk, def: m.dfn, xuyen: 0, chinh: gp.monster.chinh, ne: gp.monster.ne, crit: 0, tocdanh: 0 };
  }

  // Một đòn: att, dfd là bảng chỉ số; opts.atkMul (pháp tướng, kỹ năng), opts.defMul (pháp tướng phòng thủ)
  function hit(att, dfd, opts = {}, rnd = Math.random) {
    const hitP = clamp(att.chinh / (att.chinh + dfd.ne * C.dodge_weight), C.hit_min, C.hit_max);
    if (rnd() > hitP) return { miss: true, dmg: 0 };
    const raw = att.linh * (0.8 + clamp(att.tocdanh / 400, 0, 0.5)) * (opts.atkMul || 1);
    const defEff = dfd.def * (opts.defMul || 1);
    const pen = clamp(att.xuyen / 200, 0, caps.xuyen_reduction);
    const red = (defEff / (defEff + C.def_k)) * (1 - pen);
    let dmg = Math.max(C.min_damage_ratio * raw, raw * (1 - red));
    const crit = rnd() < Math.min(att.crit / 100, caps.crit);
    if (crit) dmg *= C.crit_mul;
    dmg = Math.max(1, Math.round(dmg));
    return { dmg, crit, heal: Math.round(dmg * Math.min((att.hut || 0) / 100, caps.hut)),
      reflect: Math.round(dmg * Math.min((dfd.phan || 0) / 100, caps.phan)) };
  }

  // Giây giữa hai đòn đánh thường
  const interval = (s) => 1 / (1 + clamp(s.tocdanh / (s.tocdanh + 150), 0, caps.tocdanh_haste));

  return { player, monster, hit, interval };
}
