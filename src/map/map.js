// Bản đồ một khu: nền, chướng ngại (cây, đá) và va chạm. Dữ liệu lấy từ data/zones/<id>.json.
const CELL = 64;

export function createMap(def) {
  const width = def.width_tiles * def.tile_size;
  const height = def.height_tiles * def.tile_size;
  const ground = renderGround(def, width, height);

  // Lưới không gian để tra va chạm nhanh
  const grid = new Map();
  for (const o of def.obstacles) {
    const key = cellKey(o.x, o.y);
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key).push(o);
  }

  function nearby(x, y) {
    const out = [];
    const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const list = grid.get(`${cx + i},${cy + j}`);
      if (list) out.push(...list);
    }
    return out;
  }

  function blocked(x, y, r) {
    if (x < r || y < r || x > width - r || y > height - r) return true;
    for (const o of nearby(x, y)) {
      const rr = o.r + r;
      if ((x - o.x) ** 2 + (y - o.y) ** 2 < rr * rr) return true;
    }
    return false;
  }

  // Đi từng trục để trượt dọc theo vật cản thay vì kẹt cứng
  function move(entity, dx, dy, r) {
    if (dx && !blocked(entity.x + dx, entity.y, r)) entity.x += dx;
    if (dy && !blocked(entity.x, entity.y + dy, r)) entity.y += dy;
  }

  function visibleObstacles(cam) {
    const m = 24;
    return def.obstacles.filter((o) =>
      o.x > cam.x - m && o.x < cam.x + cam.viewW + m && o.y > cam.y - m && o.y < cam.y + cam.viewH + m * 2);
  }

  return { def, width, height, ground, blocked, move, visibleObstacles };
}

const cellKey = (x, y) => `${Math.floor(x / CELL)},${Math.floor(y / CELL)}`;

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function renderGround(def, width, height) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const g = c.getContext('2d');
  const t = def.tile_size;
  const shades = ['#4f7a3a', '#557f3e', '#4a7436', '#5a8642'];
  for (let ty = 0; ty < def.height_tiles; ty++) {
    for (let tx = 0; tx < def.width_tiles; tx++) {
      const h = hash(tx, ty);
      g.fillStyle = shades[Math.floor(h * shades.length)];
      g.fillRect(tx * t, ty * t, t, t);
      if (h > 0.82) { // cỏ lấm tấm
        g.fillStyle = '#6d9a4c';
        g.fillRect(tx * t + Math.floor(h * 11), ty * t + Math.floor(h * 7) + 4, 1, 3);
        g.fillRect(tx * t + Math.floor(h * 11) + 2, ty * t + Math.floor(h * 7) + 5, 1, 2);
      } else if (h < 0.03) { // hoa nhỏ
        g.fillStyle = '#e8d36a';
        g.fillRect(tx * t + 7, ty * t + 7, 2, 2);
      }
    }
  }
  // Quảng trường đá quanh điểm xuất hiện
  const s = def.spawn;
  g.fillStyle = '#9b8f78';
  g.beginPath(); g.arc(s.x, s.y, 56, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#b3a78e';
  g.beginPath(); g.arc(s.x, s.y, 48, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#8b806a';
  for (let r = 16; r < 48; r += 16) { g.beginPath(); g.arc(s.x, s.y, r, 0, Math.PI * 2); g.stroke(); }
  return c;
}
