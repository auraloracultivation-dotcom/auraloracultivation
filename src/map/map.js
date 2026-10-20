// Bản đồ ô vòng lặp: mỗi điểm ảnh của ảnh bản đồ là một ô; đi qua mép phải sẽ ra mép trái.
// Địa hình (đi được, tốc độ, ô dùng để vẽ) lấy từ data/terrain.json; ô vẽ lấy từ atlas data/tiles.json.

export async function createMap(def, terrainDef, tilesDef) {
  const [mapImg, atlas] = await Promise.all([loadImage(def.map_image), loadImage(tilesDef.atlas)]);
  const W = def.width_tiles, H = def.height_tiles, T = def.tile_size;
  const width = W * T, height = H * T;

  // Đọc ảnh bản đồ → mảng chỉ số địa hình
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(mapImg, 0, 0);
  const px = g.getImageData(0, 0, W, H).data;
  const types = terrainDef.types;
  const byColor = new Map(types.map((t, i) => [t.color.join(','), i]));
  const grid = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const key = `${px[i * 4]},${px[i * 4 + 1]},${px[i * 4 + 2]}`;
    grid[i] = byColor.get(key) ?? 0;
  }

  // Bảng chọn biến thể ô theo trọng số
  const pickers = types.map((t) => {
    const list = [];
    for (const [name, weight] of t.tiles) {
      const pos = tilesDef.tiles[name];
      if (!pos) { console.warn('Thiếu ô', name); continue; }
      for (let k = 0; k < weight; k++) list.push(pos);
    }
    return list;
  });
  const isWater = types.map((t) => t.id.startsWith('nuoc'));

  const wrapX = (x) => ((x % width) + width) % width;
  const wrapY = (y) => ((y % height) + height) % height;
  const typeAt = (x, y) => types[grid[Math.floor(wrapY(y) / T) * W + Math.floor(wrapX(x) / T)]];

  function blocked(x, y, r) {
    for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r], [0, r / 2]]) {
      if (!typeAt(x + ox, y + oy).walk) return true;
    }
    return false;
  }

  // Đi từng trục để trượt dọc bờ nước thay vì kẹt cứng; toạ độ luôn quấn trong thế giới
  function move(entity, dx, dy, r) {
    const speed = typeAt(entity.x, entity.y).speed || 1;
    dx *= speed; dy *= speed;
    if (dx && !blocked(entity.x + dx, entity.y, r)) entity.x = wrapX(entity.x + dx);
    if (dy && !blocked(entity.x, entity.y + dy, r)) entity.y = wrapY(entity.y + dy);
  }

  // Vẽ các ô trong khung nhìn (toạ độ camera có thể âm hoặc vượt mép — tự quấn)
  function drawGround(ctx, cam) {
    const S = tilesDef.size;
    const x0 = Math.floor(cam.x / T), y0 = Math.floor(cam.y / T);
    const x1 = Math.ceil((cam.x + cam.viewW) / T), y1 = Math.ceil((cam.y + cam.viewH) / T);
    for (let ty = y0; ty <= y1; ty++) {
      const gy = ((ty % H) + H) % H;
      for (let tx = x0; tx <= x1; tx++) {
        const gx = ((tx % W) + W) % W;
        const kind = grid[gy * W + gx];
        const opts = pickers[kind];
        const h = hash(gx, gy);
        const [sx, sy] = opts[Math.floor(h * opts.length)];
        const flip = !isWater[kind] && hash(gy, gx) > 0.5;
        if (flip) {
          ctx.save();
          ctx.translate(tx * T + T, ty * T);
          ctx.scale(-1, 1);
          ctx.drawImage(atlas, sx, sy, S, S, 0, 0, T + 0.5, T + 0.5);
          ctx.restore();
        } else {
          ctx.drawImage(atlas, sx, sy, S, S, tx * T, ty * T, T + 0.5, T + 0.5); // chồng 0.5 để không hở khe trên màn hình mật độ lẻ
        }
      }
    }
  }

  return { def, width, height, typeAt, blocked, move, drawGround, wrapX, wrapY };
}

// Khoảng cách ngắn nhất trên thế giới vòng lặp (âm/dương), dùng để vẽ và nội suy người khác
export function wrapDelta(d, size) {
  return ((d + size / 2) % size + size) % size - size / 2;
}

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Không tải được ${src}`));
    img.src = src;
  });
}
