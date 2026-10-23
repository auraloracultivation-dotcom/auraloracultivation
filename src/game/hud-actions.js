// Bộ nút góc dưới phải (HUD v3, chủ dự án 23/10/2026): dx/dy tính từ TÂM nút Đánh, size = đường kính (px).
//   vòng trong 4 ô kỹ năng, vòng ngoài 3 ô + Bay + Tự động, mép trái nút xếp kỹ năng (✦) và 2 ô đan dùng nhanh.
// Ô kỹ năng tự xếp: kỹ năng nằm ở ô i (bảng Kỹ năng). Pháp tướng / đan dược xử lý ở đây, còn lại là chiêu.
const ICON = (n) => `assets/ui/icons/hud-${n}.png`;
const SLOT = 'assets/ui/frames/hud-o-ky-nang.png'; // ô trống: khung tròn, hình kỹ năng hiện trong lòng
const fan = (deg, r = 122) => ({ dx: Math.round(Math.cos((deg * Math.PI) / 180) * r), dy: -Math.round(Math.sin((deg * Math.PI) / 180) * r) });

// game(): gameplay (tạo sau HUD); S(n): ảnh nút cũ assets/ui/skills/<n>.png
export function hudActions({ game, S, attack, usePhapTuong, flight, toast }) {
  function useSlot(i) {
    const g = game(), id = g.slotSkill(i);
    if (!id) return g.openSkills(i);
    if (id === 'phap-tuong') return usePhapTuong();
    if (id === 'dan-duoc') return g.healPill();
    g.skill(id);
  }
  const slot = (i, pos, size) => ({ id: `s${i + 1}`, name: `Ô kỹ năng ${i + 1}`, icon: SLOT, cls: 'slot', ...pos, size, locked: true,
    onUse: () => useSlot(i), onLocked: () => (game().slotSkill(i) ? false : (game().openSkills(i), true)) });
  return {
    blankIcon: SLOT,
    actions: [
      { id: 'attack', name: 'Đánh thường', icon: ICON('nut-danh'), dx: 0, dy: 0, size: 100, onUse: () => attack() },
      // vòng trong r=118: 4 ô; vòng ngoài r=200: 3 ô + Bay + Tự động; mép trái: ✦ xếp kỹ năng, Đan
      slot(0, fan(180, 118), 58), slot(1, fan(150, 118), 58), slot(2, fan(120, 118), 58), slot(3, fan(90, 118), 58),
      slot(4, fan(184, 200), 54), slot(5, fan(160, 200), 54), slot(6, fan(136, 200), 54),
      { id: 'ky-nang', name: 'Kỹ năng: xếp ô', icon: ICON('nut-xep-ky-nang'), dx: -250, dy: -130, size: 42, onUse: () => game().openSkills() },
      {
        id: 'bay', name: 'Bay', icons: [S('bay'), S('chay')], names: ['Bay', 'Chạy bộ'], ...fan(112, 200), size: 50,
        onUse: (state) => { // ngự kiếm (src/game/flight.js): phải cầm kiếm; bay tốn linh lực theo thời gian
          if (game().dead) { toast('Linh hồn không dùng được kỹ năng', 1200); return 'keep'; }
          if (!flight().set(state === 1)) return 'keep';
        },
      },
      { id: 'auto', name: 'Tự động đánh', icon: ICON('nut-tu-dong'), ...fan(90, 200), size: 54, onUse: () => game().toggleAuto() },
      // 2 ô đan dùng nhanh: chạm ô trống = chọn đan ghim, chạm ô đã ghim = uống, giữ = đổi (src/game/quick-pill.js xử lý)
      { id: 'dan1', name: 'Đan dùng nhanh 1', icon: 'assets/ui/frames/hud-o-nho.png', cls: 'pill', dx: -262, dy: -40, size: 50, onUse: () => {} },
      { id: 'dan2', name: 'Đan dùng nhanh 2', icon: 'assets/ui/frames/hud-o-nho.png', cls: 'pill', dx: -262, dy: 30, size: 50, onUse: () => {} },
    ],
  };
}
