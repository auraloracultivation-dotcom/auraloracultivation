// Thành trì giữa bản đồ (data/zones/<khu>.json → town): tô địa hình (quảng trường, hào nước, lối vào),
// đặt công trình (hình ở data/art/sprites.json → props), chặn đi xuyên công trình, và vùng an toàn.

// Tô địa hình thành lên ảnh bản đồ TRƯỚC khi đọc lưới ô (ảnh gốc giữ nguyên trên đĩa)
export function stampTown(g, town, types) {
  if (!town?.stamp) return;
  const [cx, cy] = town.center_tile;
  for (const s of town.stamp) {
    const t = types.find((x) => x.id === s.terrain);
    if (!t) continue;
    const [x0, y0, x1, y1] = s.rect;
    g.fillStyle = `rgb(${t.color.join(',')})`;
    g.fillRect(cx + x0, cy + y0, x1 - x0 + 1, y1 - y0 + 1);
  }
}

export async function createTown(town, props, tileSize) {
  if (!town) return null;
  const T = tileSize;
  const cx = (town.center_tile[0] + 0.5) * T, cy = (town.center_tile[1] + 0.5) * T;
  const imgs = new Map();
  await Promise.all([...new Set(town.props.map((p) => p.id))].map((id) => new Promise((res) => {
    const def = props[id];
    if (!def) return res();
    const im = new Image();
    im.onload = () => { imgs.set(id, im); res(); };
    im.onerror = () => res();
    im.src = def.src;
  })));
  const items = town.props.filter((p) => props[p.id]).map((p) => {
    const d = props[p.id];
    const x = cx + p.dx, y = cy + p.dy;
    const blocks = p.layer === 'ground' ? [] : (p.block || [[-d.w * 0.42, -Math.min(22, d.h * 0.25), d.w * 0.42, 0]])
      .map(([a, b, c, e]) => [x + a, y + b, x + c, y + e]);
    return { ...p, x, y, w: d.w, h: d.h, blocks };
  });
  const ground = items.filter((i) => i.layer === 'ground');
  const standing = items.filter((i) => i.layer !== 'ground').sort((a, b) => a.y - b.y);
  const allBlocks = items.flatMap((i) => i.blocks);
  const half = town.safe.half_px;

  const draw = (ctx, it) => { const im = imgs.get(it.id); if (im) ctx.drawImage(im, it.x - it.w / 2, it.y - it.h, it.w, it.h); };
  const visible = (it, cam) => it.x + it.w / 2 > cam.x && it.x - it.w / 2 < cam.x + cam.viewW && it.y > cam.y && it.y - it.h < cam.y + cam.viewH;

  return {
    name: town.name, cx, cy, regenMul: town.safe.regen_mul || 1,
    // điểm (x, y) trên thế giới nằm trong vùng an toàn? (thành ở giữa bản đồ nên không cần xét quấn mép)
    safeAt: (x, y) => Math.abs(x - cx) <= half && Math.abs(y - cy) <= half,
    // điểm có vướng chân công trình không (r = bán kính người/quái)
    blockedAt: (x, y, r = 0) => allBlocks.some(([a, b, c, d]) => x + r > a && x - r < c && y + r * 0.5 > b && y - r * 0.5 < d),
    // Công trình (đứng) ở điểm chạm, ưu tiên cái gần phía trước
    propAt(x, y) {
      for (let i = standing.length - 1; i >= 0; i--) {
        const it = standing[i];
        if (x > it.x - it.w * 0.4 && x < it.x + it.w * 0.4 && y > it.y - it.h * 0.85 && y < it.y) return it.id;
      }
      return null;
    },
    // Vẽ: lớp sát đất trước; công trình đứng chia 2 lượt theo chân người chơi (sau lưng / che trước)
    drawGround(ctx, cam) { ctx.imageSmoothingEnabled = true; for (const it of ground) if (visible(it, cam)) draw(ctx, it); },
    drawBehind(ctx, cam, refY) { ctx.imageSmoothingEnabled = true; for (const it of standing) if (it.y <= refY && visible(it, cam)) draw(ctx, it); },
    drawFront(ctx, cam, refY) { ctx.imageSmoothingEnabled = true; for (const it of standing) if (it.y > refY && visible(it, cam)) draw(ctx, it); },
  };
}
