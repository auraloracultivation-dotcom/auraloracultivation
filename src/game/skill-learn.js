// Lĩnh ngộ kỹ năng (chủ dự án 23/10/2026: "kỹ năng từ giờ chỉ rơi ở boss, tỷ lệ siêu thấp 0,5%").
// Kỹ năng chiến đấu phải LĨNH NGỘ mới dùng được (vẫn cần đủ cảnh giới); kỹ năng hệ thống (skill_drop.free) và 1 kỹ năng tặng mỗi đại cảnh giới (skill_drop.realm_gift) mở theo cảnh giới.
// Hạ boss (kể cả Âm Hư) có `chance` lĩnh ngộ 1 kỹ năng chưa có (ngẫu nhiên). Người chơi cũ giữ kỹ năng đã mở trước bản này.
// Lưu progress.state.learned = [mã kỹ năng] — THỬ NGHIỆM phía máy khách, Mốc 4 lên máy chủ.
export function createSkillLearn({ S, cfg, progress, toast, play }) {
  const gift = new Set(Object.values(cfg.realm_gift)); // mỗi đại cảnh giới tặng 1 kỹ năng (chủ dự án 23/10)
  const free = new Set([...cfg.free, ...gift]);
  const isDrop = (id) => !!S[id] && !id.startsWith('_') && S[id].name && !free.has(id);
  const list = () => (progress.state.learned ||= []);
  const learned = (id) => !isDrop(id) || list().includes(id);
  // Bản cũ: giữ kỹ năng đã mở theo cảnh giới và kỹ năng đang xếp trong ô (không phạt người chơi cũ)
  if (!progress.state.learnInit && !(progress.state.stage > 0 || progress.state.exp > 0)) progress.state.learnInit = true; // nhân vật mới: không có gì để giữ
  if (!progress.state.learnInit) {
    const ok = (s) => !s.unlock || progress.stageIndex(s.unlock) <= progress.state.stage;
    for (const id of S._order) if (isDrop(id) && (ok(S[id]) || (progress.state.loadout || []).includes(id)) && !list().includes(id)) list().push(id);
    progress.state.learnInit = true; progress.changed();
  }
  // Đạt cảnh giới mở kỹ năng tặng → báo
  let lastStage = progress.state.stage;
  function tick() {
    if (progress.state.stage === lastStage) return;
    lastStage = progress.state.stage;
    for (const id of gift) if (S[id]?.unlock && progress.stageIndex(S[id].unlock) === lastStage) toast(`✦ Đại cảnh giới tặng kỹ năng: ${S[id].name}! (Kỹ năng → xếp vào ô)`, 4000);
  }
  function onKill(m) {
    if (m.def.rank !== 'boss' || Math.random() >= cfg.chance) return;
    const left = S._order.filter((id) => isDrop(id) && !list().includes(id));
    if (!left.length) return;
    const id = left[Math.floor(Math.random() * left.length)];
    list().push(id); progress.changed();
    play('vong-lua', m.x, m.y - 6, 50);
    toast(`✦ Lĩnh ngộ kỹ năng: ${S[id].name}! (Kỹ năng → xếp vào ô)`, 4000);
  }
  return { tick, gift: (id) => gift.has(id), learned, isDrop, onKill, count: () => list().length, total: () => S._order.filter(isDrop).length, grant: (id) => { if (!list().includes(id)) { list().push(id); progress.changed(); } } };
}
