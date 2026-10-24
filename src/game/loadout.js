// Ô kỹ năng tự xếp (chủ dự án 23/10): người chơi chọn kỹ năng nào nằm ở ô nào trên HUD.
// Lưu cùng tiến trình chơi thử (localStorage) — data/gameplay.json → skills._slots / _default_loadout.
export function createLoadout(progress, S) {
  const N = S._slots;
  const known = (id) => !!S[id] && !id.startsWith('_') && id !== 'cong_phap_effects' && id !== 'luot'; // Lướt là nút riêng cạnh Bay (25/10/2026)
  const fix = () => {
    let l = progress.state.loadout;
    if (!Array.isArray(l)) l = S._default_loadout.slice();
    l = l.slice(0, N).map((id) => (known(id) ? id : null));
    while (l.length < N) l.push(null);
    progress.state.loadout = l;
    return l;
  };
  fix();
  const list = () => progress.state.loadout || fix(); // tiến trình vừa đặt lại (chuyển thế) → dựng lại
  return {
    size: N,
    get: (i) => list()[i] || null,
    slotOf: (id) => list().indexOf(id),
    // Đặt kỹ năng vào ô i; kỹ năng đã nằm ô khác thì đổi chỗ với thứ đang ở ô i
    set(i, id) {
      const l = list(), j = l.indexOf(id), old = l[i];
      if (j === i) return;
      if (j >= 0) l[j] = old;
      l[i] = id;
      progress.changed();
    },
    remove(id) { const l = list(), j = l.indexOf(id); if (j >= 0) { l[j] = null; progress.changed(); } },
    ids: () => list().slice(),
    catalog: () => S._order.filter(known),
  };
}
