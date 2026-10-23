// Bộ nút góc dưới phải (HUD v3, chủ dự án 23/10/2026): dx/dy tính từ TÂM nút Đánh, size = đường kính (px).
//   vòng trong 4 ô kỹ năng, vòng ngoài 3 ô + Bay + Tự farm. group 'left' = hàng nút góc dưới TRÁI (Tự nhiệm vụ, 2 ô đan, xếp kỹ năng)
//   — bố cục 25/50/25 (chủ dự án 24/10/2026): cụm nút không lấn lên nửa giữa màn hình.
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
      { id: 'attack', name: 'Đánh thường', icon: ICON('nut-danh'), dx: 0, dy: 0, size: 96, onUse: () => attack() },
      // gọn về góc phải (chủ dự án 23/10): vòng trong r=104 4 ô, vòng ngoài r=172 3 ô + Bay + Tự động,
      // hàng trên cùng: 2 ô đan dùng nhanh + nút xếp kỹ năng (✦) — không lấn sang nửa trái màn dọc
      slot(0, fan(180, 104), 54), slot(1, fan(150, 104), 54), slot(2, fan(120, 104), 54), slot(3, fan(90, 104), 54),
      slot(4, fan(180, 172), 50), slot(5, fan(157, 172), 50), slot(6, fan(134, 172), 50),
      {
        id: 'bay', name: 'Bay', icons: [S('bay'), S('chay')], names: ['Bay', 'Chạy bộ'], ...fan(112, 172), size: 46,
        onUse: (state) => { // ngự kiếm (src/game/flight.js): phải cầm kiếm; bay tốn linh lực theo thời gian
          if (game().dead) { toast('Linh hồn không dùng được kỹ năng', 1200); return 'keep'; }
          if (!flight().set(state === 1)) return 'keep';
        },
      },
      { id: 'auto', name: 'Tự farm', icon: ICON('nut-tu-dong'), ...fan(90, 172), size: 50, onUse: () => game().toggleAuto() },
      // Tự làm nhiệm vụ (chủ dự án 24/10: tách hẳn khỏi Tự farm) — src/game/questauto.js
      { id: 'autoq', name: 'Tự nhiệm vụ', icon: ICON('nut-nhiem-vu'), group: 'left', size: 42, onUse: () => game().toggleQuestAuto?.() },
      // 2 ô đan dùng nhanh: chạm ô trống = chọn đan ghim, chạm ô đã ghim = uống, giữ = đổi (src/game/quick-pill.js xử lý)
      { id: 'dan1', name: 'Đan dùng nhanh 1', icon: 'assets/ui/frames/hud-o-nho.png', cls: 'pill', group: 'left', size: 42, onUse: () => {} },
      { id: 'dan2', name: 'Đan dùng nhanh 2', icon: 'assets/ui/frames/hud-o-nho.png', cls: 'pill', group: 'left', size: 42, onUse: () => {} },
      { id: 'ky-nang', name: 'Kỹ năng: xếp ô', icon: ICON('nut-xep-ky-nang'), group: 'left', size: 42, onUse: () => game().openSkills() },
    ],
  };
}
