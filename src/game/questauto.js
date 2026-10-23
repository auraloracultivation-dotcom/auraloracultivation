// TỰ LÀM NHIỆM VỤ (chủ dự án 24/10/2026: tách hẳn khỏi Tự farm). Đi theo chuỗi Đạo Tâm (daotam.js):
//  - Bước cần tới NPC / trận nhãn: tự đi (ngự kiếm nếu được) tới nơi; tới gần NPC thì hội thoại tự mở và tự chạy chữ.
//  - Bước đánh quái / hái / lên cấp: tự đi tới đúng vùng rồi farm theo nhiệm vụ (autoplay.js chế độ 'quest').
//  - Bước làm tại chỗ (mặc đồ, thức tỉnh, xếp kỹ năng, gắn phù, đeo pháp bảo, mua / uống đan, đột phá): tự làm, có báo.
//  - Chọn hệ Đạo Tâm: mở bảng chọn và chờ người chơi chọn.
// Kéo cần điều khiển hoặc bấm Tự farm = tắt Tự làm nhiệm vụ.
import { wrapDelta } from '../map/index.js';

export function createQuestAuto({ game, navi, map, me, toast }) {
  let on = false, t = 0, hereT = 0;
  const dt = () => game.daotam;
  const far = (p) => Math.hypot(wrapDelta(p.x - me.x, map.width), wrapDelta(p.y - me.y, map.height));

  function set(v, quiet = false) {
    if (v === on) return;
    on = v; dt().setAuto(v); game.setAutoQ(v);
    if (!v) { if (game.autoMode() === 'quest') game.setAuto(null); navi.cancel(); }
    if (!quiet) toast(v ? 'Tự làm nhiệm vụ: bật — tự đi, tự đánh, tự trò chuyện' : 'Tự làm nhiệm vụ: tắt', 1800);
  }
  function tick(d) {
    if (!on) return;
    if (game.autoMode() === 'farm') return set(false, true); // người chơi bật Tự farm
    t -= d; hereT -= d; if (t > 0) return; t = 0.5;
    const D = dt();
    if (game.dead || D.talking()) return;
    if (D.done()) { toast('Đã hoàn thành Con đường Đạo Tâm!', 3000); return set(false, true); }
    const pl = D.place();
    if (!pl) { // làm tại chỗ
      if (game.autoMode() === 'quest') game.setAuto(null);
      if (hereT <= 0) { hereT = 1.6; D.doHere(); }
      return;
    }
    if (navi.traveling()) return;
    if (pl.point) { if (far(pl.point) > 60) navi.go(pl); return; } // tới nơi: hội thoại tự mở (daotam.tick)
    const inZone = map.typeAt(me.x, me.y).zone === pl.zone;
    if (inZone && game.autoMode() === 'quest') return; // đang farm đúng vùng
    navi.go(pl); // tới nơi navi tự bật farm theo nhiệm vụ
  }
  return { tick, toggle: () => set(!on), stop: () => set(false), on: () => on };
}
