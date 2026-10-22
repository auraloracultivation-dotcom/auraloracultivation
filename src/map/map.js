// Bản đồ ô vòng lặp: mỗi điểm ảnh của ảnh bản đồ là một ô; đi qua mép phải sẽ ra mép trái.
// Địa hình (đi được, tốc độ, ô dùng để vẽ) lấy từ data/terrain.json; ô vẽ lấy từ atlas data/tiles.json.

import { stampTown, createTown } from './town.js';
import { stampRoads, createDecor } from './decor.js';

// art: data/art/sprites.json (props = công trình thành, decor = cây đá)
export async function createMap(def, terrainDef, tilesDef, art = {}) {
  const props = art.props || {};
  const [mapImg, atlas] = await Promise.all([loadImage(def.map_image), loadImage(tilesDef.atlas)]);
  const W = def.width_tiles, H = def.height_tiles, T = def.tile_size;
  const width = W * T, height = H * T;

  // Đọc ảnh bản đồ → mảng chỉ số địa hình
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(mapImg, 0, 0);
  stampRoads(g, W, H, def.roads, terrainDef.types); // đường đất, qua nước thành cầu gỗ
  stampTown(g, def.town, terrainDef.types); // quảng trường + hào nước của thành (ảnh gốc giữ nguyên)
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

  const town = await createTown(def.town, props, T);
  const decor = await createDecor({ grid, W, H, T, types, rules: terrainDef.decor_rules, art: art.decor, safeAt: (x, y) => !!town?.safeAt(x, y) });
  const isBridge = types.map((t) => !!t.bridge);
  const isPath = types.map((t) => !!t.bridge || t.id === 'duong');
  const wrapX = (x) => ((x % width) + width) % width;
  const wrapY = (y) => ((y % height) + height) % height;
  const typeAt = (x, y) => types[grid[Math.floor(wrapY(y) / T) * W + Math.floor(wrapX(x) / T)]];

  function blocked(x, y, r) {
    for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r], [0, r / 2]]) {
      if (!typeAt(x + ox, y + oy).walk) return true;
    }
    return !!town?.blockedAt(x, y, r) || !!decor?.blockedAt(x, y, r); // chân công trình trong thành, gốc cây, tảng đá
  }

  // Đi từng trục để trượt dọc bờ nước thay vì kẹt cứng; toạ độ luôn quấn trong thế giới
  const canStand = (x, y, r) => !blocked(x, y, r);
  // Chỗ đứng được gần nhất (vd. vị trí cũ nay là gốc cây / hào nước): dò xoắn ốc tối đa `max` ô
  function nearestStand(x, y, r, max = 6) {
    if (canStand(x, y, r)) return { x, y };
    for (let d = 1; d <= max * 2; d++) for (let a = 0; a < 16; a++) {
      const nx = wrapX(x + Math.cos((a / 16) * Math.PI * 2) * d * T / 2), ny = wrapY(y + Math.sin((a / 16) * Math.PI * 2) * d * T / 2);
      if (canStand(nx, ny, r)) return { x: nx, y: ny };
    }
    return { x, y };
  }

  // fly = true: đang ngự kiếm → bay qua nước, núi, mọi địa hình, không bị chậm (yêu cầu chủ dự án 2026-10-21)
  function move(entity, dx, dy, r, fly = false) {
    if (fly) { entity.x = wrapX(entity.x + dx); entity.y = wrapY(entity.y + dy); return; }
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
            // chồng 0.5 để không hở khe trên màn hình mật độ lẻ (ô đất bản 3 đã hoà mép nên chồng không lộ)
            const ov = 0.5;
            if (!isWater[kind] && hash(hy, hx) > 0.5) {
              ctx.save();
              ctx.translate(dx + st, dy);
              ctx.scale(-1, 1);
              ctx.drawImage(atlas, sx, sy, S, S, 0, 0, st + ov, st + ov);
              ctx.restore();
            } else {
              ctx.drawImage(atlas, sx, sy, S, S, dx, dy, st + ov, st + ov);
            }
          }
        }
        if (isBridge[kind]) drawPlanks(ctx, tx * T, ty * T, T, isPath[grid[gy * W + ((gx + 1) % W)]] || isPath[grid[gy * W + ((gx - 1 + W) % W)]]);
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
      let dx = wrapDelta(m.x - x, width) / T, dy = wrapDelta(m.y - y, height) / T;
      if (Math.abs(dx) > radiusTiles || Math.abs(dy) > radiusTiles) {
        if (!m.big) continue;
        const k2 = (radiusTiles * 0.9) / Math.max(Math.abs(dx), Math.abs(dy)); dx *= k2; dy *= k2; // Âm Hư ở xa: chấm ở mép chỉ hướng
      }
      const px = size / 2 + dx * k, py = size / 2 + dy * k;
      ctx.beginPath();
      ctx.arc(px, py, m.self ? dot * 1.2 : m.big ? dot * 1.6 : dot * 0.85, 0, Math.PI * 2);
      ctx.fillStyle = m.self ? '#ffe36a' : m.color || '#ffffff'; // Âm Hư: chấm tím to
      ctx.fill();
      ctx.lineWidth = Math.max(1, dot * 0.45);
      ctx.strokeStyle = '#1b1208';
      ctx.stroke();
    }
  }

  return { def, town, decor, safeAt: (x, y) => !!town?.safeAt(x, y), width, height, typeAt, blocked, canStand, nearestStand, move, drawGround, drawMinimap, overview: c, wrapX, wrapY };
}

// Cầu gỗ trên một ô nước: ván ngang dọc theo hướng đi, hai mép có lan can
function drawPlanks(ctx, x, y, T, horizontal) {
  ctx.save();
  if (!horizontal) { ctx.translate(x + T, y); ctx.rotate(Math.PI / 2); } else ctx.translate(x, y);
  ctx.fillStyle = '#8a5a34'; ctx.fillRect(0, 3, T + 0.5, T - 6);
  ctx.fillStyle = '#6b4226';
  for (let i = 0; i < T; i += 6) ctx.fillRect(i, 3, 1, T - 6); // khe ván
  ctx.fillStyle = '#4a2c18'; ctx.fillRect(0, 2, T + 0.5, 2); ctx.fillRect(0, T - 4, T + 0.5, 2); // lan can
  ctx.restore();
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
