// TRẬN NHÃN các vùng (chủ dự án 23/10/2026 17h): mỗi vành có một trận pháp truyền tống cổ + nhà + 2 NPC canh giữ.
// Cốt truyện "Thiên Cơ Đại Trận": sáu tổ sư dựng trận nhãn giữ các vành; người chơi đi tới đâu thắp sáng tới đó.
//   - Tới gần trận nhãn lần đầu (≤ light_px) = thắp sáng, lưu progress.state.stations[id].
//   - Chạm trận pháp đã sáng (hoặc Truyền Tống Trận trong Thanh Vân Thành) = chọn nơi đến trong các trận nhãn đã sáng.
//   - Phí = cost Linh thạch của nơi đến (về thành miễn phí). Không bay qua được vành chưa tự tay tới.
// Vị trí trên máy chủ: chơi thật phải gọi RPC teleport_to_station (migration 0007) — máy chủ kiểm "đang đứng cạnh trận pháp"
// và chỉ đưa tới toạ độ cố định; chưa có hàm đó thì báo chưa khai thông, không tự dời vị trí (save_position sẽ chặn).
// Số liệu + lời thoại: data/zones/zone.start.json → town.stations.
import { wrapDelta } from '../map/index.js';
import { showSheet, escapeHtml as E } from '../ui/index.js';
import { sound } from '../audio/index.js';

const LIGHT_PX = 150, USE_PX = 190;

export function createStations({ map, me, net, game, toast, onMoved }) {
  const T = map.town, list = T?.stations || [];
  const S = () => (game.progress.state.stations ||= {});
  const dist = (s) => Math.hypot(wrapDelta(s.x - me.x, map.width), wrapDelta(s.y - me.y, map.height));
  const lit = (s) => !!S()[s.id];
  const home = { id: 'town', name: T?.name || 'Thanh Vân Thành', x: T?.cx ?? map.width / 2, y: (T?.cy ?? map.height / 2) + 30, cost: 0 };
  const near = () => (T && Math.hypot(me.x - T.cx, me.y - T.cy) < 420 ? home : list.find((s) => dist(s) < USE_PX)); // đang đứng cạnh trận pháp nào
  let check = 0;

  function light(s) {
    if (lit(s)) return false;
    S()[s.id] = Date.now(); game.progress.changed();
    toast(`✦ Thắp sáng ${s.name}! Từ nay truyền tống tới đây được.`, 3200);
    return true;
  }

  let busy = false; // đang chờ máy chủ: chạm thêm không gửi lần 2, không trừ phí 2 lần
  async function go(dest, close) {
    if (busy) return;
    const from = near();
    if (!from) return toast('Phải đứng cạnh trận pháp mới truyền tống được', 1600);
    if (from.id === dest.id) return toast('Đạo hữu đang ở đây rồi', 1200);
    const w = game.wallet;
    if (dest.cost && w.get('linh-thach') < dest.cost) return toast(`Cần ${dest.cost} Linh thạch để khởi động trận pháp`, 1800);
    let row = null; busy = true;
    try { row = await net.teleportToStation(dest.id); }
    catch (e) { console.warn('Truyền tống lỗi', e); return toast('Trận pháp chưa khai thông với máy chủ — tạm thời hãy bay tới', 2600); }
    finally { busy = false; }
    if (dest.cost) { w.add('linh-thach', -dest.cost); game.progress.changed(); }
    if (row) { me.x = row.x; me.y = row.y; } else ({ x: me.x, y: me.y } = map.nearestStand(dest.x, dest.y + 30, 6, 20));
    close?.(); onMoved(me.x, me.y);
    sound('sfx.truyen-tong'); toast(`Truyền tống tới ${dest.name}${dest.cost ? ` (−${dest.cost} Linh thạch)` : ''}`, 2200);
  }

  function open(at) {
    const rows = () => [home, ...list].map((s) => {
      const on = s === home || lit(s), here = at.id === s.id;
      return `<div class="row ${on ? '' : 'locked'}"><div class="row-h"><b>${E(s.name)}</b><em>${here ? 'đang ở đây' : !on ? 'chưa thắp sáng' : s.cost ? `${s.cost} Linh thạch` : 'miễn phí'}</em></div>
        ${s.lore ? `<p>${E(s.lore)}</p>` : ''}
        ${on && !here ? `<button type="button" class="bag-act sm" data-act="go" data-arg="${s.id}">Truyền tống</button>` : ''}</div>`;
    }).join('');
    showSheet({ title: `Truyền tống · ${at.name}`, tabs: [{ id: 'all', name: 'Trận nhãn' }], render: rows,
      note: 'Trận nhãn phải tự tay tới thắp sáng một lần. Phí theo nơi đến.',
      onAction: (act, id, close) => { if (act === 'go') go(id === 'town' ? home : list.find((s) => s.id === id), close); } });
  }

  return {
    // gọi mỗi khung hình: tự thắp trận nhãn khi đi ngang qua
    tick(dt) { if ((check -= dt) > 0) return; check = 0.5; for (const s of list) if (!lit(s) && dist(s) < LIGHT_PX) light(s); },
    // chạm công trình: 'tram:<id>' (trận pháp ngoài vùng) hoặc 'truyen-tong' (trong thành). true = đã xử lý.
    tap(prop) {
      if (prop === 'truyen-tong') { open(home); return true; }
      if (!prop?.startsWith('tram:')) return false;
      const s = list.find((x) => x.id === prop.slice(5));
      if (!s) return false;
      if (dist(s) > USE_PX) { toast(`${s.name} — lại gần hơn để dùng`, 1400); return true; }
      light(s); open(s); return true;
    },
    lit: () => list.filter(lit).map((s) => s.id),
  };
}
