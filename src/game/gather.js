// Linh thảo + mỏ khoáng mọc trên bản đồ (THỬ NGHIỆM phía máy khách): mọc quanh người chơi theo vùng địa hình,
// đi tới gần là hái. Loại cây/khoáng lấy theo vùng trong data/items/materials.json. Mốc 3: máy chủ quản lý điểm hái.
import { wrapDelta } from '../map/index.js';

export function createGather({ gp, mats, map }) {
  const G = gp.gather;
  const byZone = {};
  for (const m of mats.materials) if (m.group === 'thao' || m.group === 'khoang') (byZone[m.zone] ||= { thao: [], khoang: [] })[m.group].push(m);
  const list = [];
  let timer = 0;
  const dist = (n, me) => Math.hypot(wrapDelta(n.x - me.x, map.width), wrapDelta(n.y - me.y, map.height));

  function spawn(me) {
    for (let tries = 0; tries < 8; tries++) {
      const a = Math.random() * Math.PI * 2, d = G.spawn_min_px + Math.random() * (G.spawn_max_px - G.spawn_min_px);
      const x = map.wrapX(me.x + Math.cos(a) * d), y = map.wrapY(me.y + Math.sin(a) * d);
      const t = map.typeAt(x, y), pool = t.zone && byZone[t.zone];
      if (!pool || !map.canStand(x, y, 4) || map.safeAt(x, y)) continue;
      const f = map.decor?.field(x, y) || { forest: 0, rock: 0 }; // rừng → nhiều linh thảo, bãi đá → nhiều khoáng
      const herbP = f.forest > f.rock ? G.herb_ratio + (1 - G.herb_ratio) * f.forest * 0.8 : G.herb_ratio * (1 - f.rock * 0.8);
      const group = Math.random() < herbP ? 'thao' : 'khoang';
      // món đầu danh sách mỗi vùng là món phổ biến nhất → hay gặp hơn
      const arr = pool[group], w = arr.map((_, i) => 1 / (i + 1)), sum = w.reduce((s, v) => s + v, 0);
      let r = Math.random() * sum, i = 0;
      while ((r -= w[i]) > 0) i++;
      list.push({ x, y, item: arr[i], group, n: G.amount[0] + Math.floor(Math.random() * (G.amount[1] - G.amount[0] + 1)), sway: Math.random() * 6 });
      return;
    }
  }

  // Trả về các điểm vừa hái được để gameplay cộng vào túi
  function update(dt, me, alive) {
    timer -= dt;
    if (timer <= 0 && list.length < G.max_nodes) { timer = G.spawn_every_s; spawn(me); }
    const picked = [];
    for (let i = list.length - 1; i >= 0; i--) {
      const d = dist(list[i], me);
      if (d > G.despawn_px) list.splice(i, 1);
      else if (alive && !me.flying && d < G.pick_px) picked.push(...list.splice(i, 1));
    }
    return picked;
  }
  // Mở game: rải sẵn vài điểm để không phải chờ
  const seed = (me) => { for (let k = 0; k < G.max_nodes; k++) spawn(me); };
  return { list, update, seed };
}
