// Ngự kiếm phi hành: bật/tắt (nút Bay hoặc Tự động khi bị kẹt), hạ cánh bắt buộc khi hết linh lực / tháo kiếm.
// Phải cầm kiếm; đang bay mất player.fly_mp_per_s linh lực mỗi giây (data/config.json). Trên nước/núi không hạ được.
import { sound } from '../audio/index.js';
export function createFlight({ me, map, hud, pt, toast, sendMove, radius, cfg }) {
  // on = true: cất cánh; false: hạ xuống. quiet: không báo (Tự động). Trả về false nếu không làm được.
  function set(on, quiet = false) {
    if (on === !!me.flying) return true;
    if (on && !me.look?.weapon) { if (!quiet) toast('Cần cầm kiếm mới ngự kiếm phi hành được', 1600); return false; }
    if (on && pt.mp < 5) { if (!quiet) toast('Linh lực không đủ để ngự kiếm', 1400); return false; }
    if (!on && !map.canStand(me.x, me.y, radius)) { if (!quiet) toast('Không thể hạ xuống ở đây', 1400); return false; }
    me.flying = on; sound(on ? 'sfx.bay' : 'sfx.ha-canh');
    hud.setToggle('bay', on ? 1 : 0);
    sendMove(me.flying);
    if (!quiet) toast(on ? 'Ngự khí phi hành' : 'Hạ xuống mặt đất', 1200);
    return true;
  }
  // Hạ cánh bắt buộc; đang trên nước/núi thì bước ra chỗ đứng được gần nhất
  function land(msg) {
    me.flying = false;
    if (!map.canStand(me.x, me.y, radius)) ({ x: me.x, y: me.y } = map.nearestStand(me.x, me.y, radius, 30));
    hud.setToggle('bay', 0); sendMove(false); if (msg) toast(msg, 1600);
  }
  // Mỗi khung hình: đang bay thì trừ linh lực; cạn hoặc tháo kiếm → hạ
  function tick(dt) {
    if (me.flying && (!pt.spend(cfg.fly_mp_per_s * dt) || !me.look?.weapon)) land(me.look?.weapon ? 'Linh lực cạn — hạ xuống mặt đất' : 'Đã tháo kiếm — hạ xuống mặt đất');
  }
  return { set, land, tick, canFly: () => !!me.look?.weapon && pt.mp >= 15 };
}
