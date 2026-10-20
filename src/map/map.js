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
  const subdiv = types.map((t) => t.grid || 1);

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
        const g = subdiv[kind];
        const st = T / g; // cạnh ô vẽ: đất chia 2×2 (ô nhỏ có viền đen), nước 1 ô liền
        for (let j = 0; j < g; j++) {
          for (let i = 0; i < g; i++) {
            const hx = gx * g + i, hy = gy * g + j;
            const [sx, sy] = opts[Math.floor(hash(hx, hy) * opts.length)];
            const dx = tx * T + i * st, dy = ty * T + j * st;
            // chồng 0.5 để không hở khe trên màn hình mật độ lẻ
            if (!isWater[kind] && hash(hy, hx) > 0.5) {
              ctx.save();
              ctx.translate(dx + st, dy);
              ctx.scale(-1, 1);
              ctx.drawImage(atlas, sx, sy, S, S, 0, 0, st + 0.5, st + 0.5);
              ctx.restore();
            } else {
              ctx.drawImage(atlas, sx, sy, S, S, dx, dy, st + 0.5, st + 0.5);
            }
          }
        }
      }
    }
  }

  // Bản đồ nhỏ: vùng radiusTiles ô quanh (x, y), quấn qua mép; đầu vào canvas tròn trên HUD
  function drawMinimap(canvas, x, y, radiusTiles, markers) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const k = size / (radiusTiles * 2); // điểm ảnh minimap mỗi ô
    const ox = x / T - radiusTiles, oy = y / T - radiusTiles;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#10192d';
    ctx.fillRect(0, 0, size, size);
    const bx = Math.floor(ox / W), by = Math.floor(oy / H);
    for (let i = bx; i <= bx + 1; i++) for (let j = by; j <= by + 1; j++) {
      ctx.drawImage(c, (i * W - ox) * k, (j * H - oy) * k, W * k, H * k);
    }
    // Dấu định vị: chấm nhỏ vừa đủ nhận ra (mình vàng có viền, người khác trắng nhỏ hơn)
    const dot = Math.max(2, size / 70);
    for (const m of markers) {
      const dx = wrapDelta(m.x - x, width) / T, dy = wrapDelta(m.y - y, height) / T;
      if (Math.abs(dx) > radiusTiles || Math.abs(dy) > radiusTiles) continue;
      const px = size / 2 + dx * k, py = size / 2 + dy * k;
      ctx.beginPath();
      ctx.arc(px, py, m.self ? dot * 1.2 : dot * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = m.self ? '#ffe36a' : '#ffffff';
      ctx.fill();
      ctx.lineWidth = Math.max(1, dot * 0.45);
      ctx.strokeStyle = '#1b1208';
      ctx.stroke();
    }
  }

  return { def, width, height, typeAt, blocked, move, drawGround, drawMinimap, overview: c, wrapX, wrapY };
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
