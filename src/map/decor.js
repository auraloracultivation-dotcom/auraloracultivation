// Đường đi + cây cối / đá / hoa cỏ trên bản đồ.
// - Đường (data/zones/*.json → roads): tô lên ảnh bản đồ lúc tải; đoạn qua nước thành cầu gỗ.
// - Cây/đá (data/terrain.json → decor của từng loại đất + decor_rules): rải theo ô, cố định theo toạ độ nên mọi máy thấy giống nhau.
//   Rừng và bãi đá mọc thành cụm (2 trường nhiễu). Cây chặn ở gốc, đá chặn cả khối, cỏ hoa đi xuyên.

function hash(x, y, s = 0) {
  let h = (x * 374761393 + y * 668265263 + s * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Nhiễu giá trị lặp theo mép bản đồ (bản đồ vòng lặp): cell = cỡ cụm tính bằng ô
function noiseField(W, H, cell, seed) {
  const nx = Math.max(1, Math.round(W / cell)), ny = Math.max(1, Math.round(H / cell));
  const sx = nx / W, sy = ny / H;
  const v = (i, j) => hash(((i % nx) + nx) % nx, ((j % ny) + ny) % ny, seed);
  const sm = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x * sx, fy = y * sy, i = Math.floor(fx), j = Math.floor(fy), u = sm(fx - i), w = sm(fy - j);
    const a = v(i, j) + (v(i + 1, j) - v(i, j)) * u, b = v(i, j + 1) + (v(i + 1, j + 1) - v(i, j + 1)) * u;
    return a + (b - a) * w;
  };
}

// Tô đường lên ảnh bản đồ (ImageData của canvas tỉ lệ 1 ô = 1 điểm ảnh)
export function stampRoads(g, W, H, roads, types) {
  if (!roads?.lines?.length) return;
  const road = types.find((t) => t.id === 'duong'), bridge = types.find((t) => t.id === 'cau');
  if (!road || !bridge) return;
  const byColor = new Map(types.map((t) => [t.color.join(','), t]));
  const img = g.getImageData(0, 0, W, H), p = img.data;
  const half = Math.floor((roads.width || 3) / 2);
  const paint = (x, y) => {
    const i = ((((y % H) + H) % H) * W + (((x % W) + W) % W)) * 4;
    const t = byColor.get(`${p[i]},${p[i + 1]},${p[i + 2]}`);
    if (t === road || t === bridge) return;
    const c = (t && (t.id.startsWith('nuoc') || !t.walk) ? bridge : road).color;
    p[i] = c[0]; p[i + 1] = c[1]; p[i + 2] = c[2];
  };
  for (const [x0, y0, x1, y1] of roads.lines) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n), y = Math.round(y0 + ((y1 - y0) * k) / n);
      for (let a = -half; a <= half; a++) for (let b = -half; b <= half; b++) paint(x + a, y + b);
    }
  }
  g.putImageData(img, 0, 0);
}

export async function createDecor({ grid, W, H, T, types, rules, art, safeAt }) {
  if (!rules || !art) return null;
  const atlas = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = art.src; });
  if (!atlas) return null;
  const keys = Object.keys(art.items), defs = keys.map((k) => art.items[k]), idx = new Map(keys.map((k, i) => [k, i]));
  const sets = types.map((t) => t.decor && {
    tree: (t.decor.tree || []).map((k) => idx.get(k)).filter((i) => i !== undefined),
    rock: (t.decor.rock || []).map((k) => idx.get(k)).filter((i) => i !== undefined),
    small: (t.decor.small || []).map((k) => idx.get(k)).filter((i) => i !== undefined) });
  const roadKinds = new Set(types.map((t, i) => (t.id === 'duong' || t.id === 'cau' ? i : -1)).filter((i) => i >= 0));
  const forest = noiseField(W, H, rules.forest_cell, 11), rocky = noiseField(W, H, rules.rock_cell, 23);
  const band = (v, cut) => Math.max(0, Math.min(1, (v - cut) / (1 - cut) * 1.6));
  const at = new Int16Array(W * H).fill(-1), ox = new Int8Array(W * H), oy = new Int8Array(W * H);
  const m = rules.road_margin;
  const nearRoad = (x, y) => {
    for (let b = -m; b <= m; b++) for (let a = -m; a <= m; a++) {
      if (roadKinds.has(grid[(((y + b) % H + H) % H) * W + (((x + a) % W + W) % W)])) return true;
    }
    return false;
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x, s = sets[grid[i]];
      if (!s || !types[grid[i]].walk) continue;
      const f = band(forest(x, y), rules.forest_cut), r = band(rocky(x, y), rules.rock_cut);
      const pt = rules.tree_base + rules.tree_forest * f, pr = rules.rock_base + rules.rock_field * r;
      const h = hash(x, y, 7);
      let list = null;
      if (h < pt && s.tree.length) list = s.tree;
      else if (h < pt + pr && s.rock.length) list = s.rock;
      else if (h < pt + pr + rules.small * (0.5 + f) && s.small.length) list = s.small;
      if (!list || nearRoad(x, y) || safeAt((x + 0.5) * T, (y + 0.5) * T)) continue;
      at[i] = list[Math.floor(hash(x, y, 3) * list.length)];
      ox[i] = Math.round((hash(x, y, 5) - 0.5) * T * 0.5); oy[i] = Math.round((hash(x, y, 9) - 0.5) * T * 0.4);
    }
  }
  const tileOf = (v, n) => ((Math.floor(v / T) % n) + n) % n;

  function blockedAt(x, y, r) {
    const tx = Math.floor(x / T), ty = Math.floor(y / T);
    for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) {
      const gx = ((tx + a) % W + W) % W, gy = ((ty + b) % H + H) % H, i = gy * W + gx, d = at[i];
      if (d < 0 || !defs[d].r) continue;
      const bx = (tx + a + 0.5) * T + ox[i], by = (ty + b + 0.5) * T + oy[i];
      if (Math.hypot(x - bx, (y - by) * 2) < defs[d].r + r) return true;
    }
    return false;
  }
  // Lượt vẽ: front = false → mọi thứ có chân ở trên refY (sau lưng) + cỏ hoa; front = true → phần còn lại (che trước người)
  function draw(ctx, cam, refY, front) {
    const x0 = Math.floor(cam.x / T) - 2, x1 = Math.ceil((cam.x + cam.viewW) / T) + 2;
    const y0 = Math.floor(cam.y / T) - 1, y1 = Math.ceil((cam.y + cam.viewH) / T) + 3;
    ctx.imageSmoothingEnabled = true;
    for (let ty = y0; ty <= y1; ty++) {
      const gy = ((ty % H) + H) % H;
      for (let tx = x0; tx <= x1; tx++) {
        const i = gy * W + (((tx % W) + W) % W), d = at[i];
        if (d < 0) continue;
        const def = defs[d], bx = (tx + 0.5) * T + ox[i], by = (ty + 0.5) * T + oy[i];
        const behind = def.kind === 'small' || by <= refY;
        if (behind === front) continue;
        const flip = hash(tx, ty, 13) < 0.5;
        ctx.save();
        ctx.translate(bx, by);
        if (flip && def.kind !== 'rock') ctx.scale(-1, 1);
        ctx.drawImage(atlas, def.x, def.y, def.sw, def.sh, -def.w / 2, -def.h, def.w, def.h);
        ctx.restore();
      }
    }
  }
  return {
    blockedAt,
    drawBehind: (ctx, cam, refY) => draw(ctx, cam, refY, false),
    drawFront: (ctx, cam, refY) => draw(ctx, cam, refY, true),
    // độ rừng / độ đá ở điểm (0..1) — linh thảo mọc nhiều trong rừng, khoáng nhiều ở bãi đá
    field(x, y) { const tx = tileOf(x, W), ty = tileOf(y, H); return { forest: band(forest(tx, ty), rules.forest_cut), rock: band(rocky(tx, ty), rules.rock_cut) }; },
  };
}
