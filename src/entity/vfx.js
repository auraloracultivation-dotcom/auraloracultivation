// Hiệu ứng ghép kiểu My Heroes (chủ dự án 25/10/2026): mỗi chiêu là một "công thức" ghép các MẢNH SÁNG tĩnh
// (tools/fx_frag.py → assets/effects/v3/frag.webp) — phóng to, xoay, bay, toả hạt, mờ dần — vẽ cộng sáng, đổi màu theo hệ.
// Công thức: data/vfx.json → recipes. Mã hiệu ứng: "x.<công thức>.<hệ>" (vd. x.no.thuy) — drawEffect / fxDuration nhận như hình thường.
// Lớp (layer): f mảnh (hoặc mảng → mỗi hạt chọn ngẫu nhiên), t [t0,t1] phần thời gian, s [s0,s1] cỡ (theo h), a [a0,a1] độ mờ,
//   r [r0,r1] góc (vòng), x / y lệch (theo h), dx / dy dịch chuyển, sy dẹt (mặt đất), n số hạt, spread toả (theo h), rise bay lên,
//   e đường cong ('out' | 'in' | 'io' | 'lin' | 'pop'), glow nhân sáng thêm, norot bỏ góc chiêu, ground đáy mảnh ở điểm neo,
//   flip lật ngang, burst bay ra (âm = hút vào), arc/arc0 giới hạn hướng toả, ring xếp vòng, fall rơi từ trên, jit / rj ngẫu nhiên cỡ / góc, c màu riêng.
let IMG = null, FR = {}, REC = {}, COL = {};
const tints = new Map(); // mảnh|màu → canvas đã đổi màu

export async function loadVfx(loadJSON) {
  const [fr, def, dv] = await Promise.all([loadJSON('data/art/vfx-frag.json'), loadJSON('data/vfx.json'), loadJSON('data/build/dao-van.json')]);
  FR = fr.frag; REC = def.recipes;
  for (const [he, v] of Object.entries(dv.he)) COL[def.slug[he]] = v.color;
  Object.assign(COL, def.colors || {});
  IMG = await new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = fr.src; });
  return def;
}

const parse = (id) => { const m = /^x\.([a-z0-9-]+)\.([a-z0-9-]+)$/.exec(id); return m && REC[m[1]] ? { r: REC[m[1]], c: COL[m[2]] || '#ffffff' } : null; };
export const isVfx = (id) => typeof id === 'string' && id.startsWith('x.');
export const vfxDuration = (id) => parse(id)?.r.dur || 0;
export const vfxColor = (id) => { const c = parse(id)?.c; return c ? `${parseInt(c.slice(1, 3), 16)},${parseInt(c.slice(3, 5), 16)},${parseInt(c.slice(5, 7), 16)}` : null; };

// Đổi màu mảnh: giữ độ sáng từng điểm, thay sắc độ bằng màu hệ (lõi trắng vẫn trắng), làm một lần mỗi cặp
function tinted(name, color) {
  const key = `${name}|${color}`;
  if (tints.has(key)) return tints.get(key);
  const f = FR[name];
  if (!f || !IMG) return null;
  const c = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(IMG, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
  const d = g.getImageData(0, 0, f[2], f[3]), a = d.data;
  let cr = parseInt(color.slice(1, 3), 16) / 255, cg = parseInt(color.slice(3, 5), 16) / 255, cb = parseInt(color.slice(5, 7), 16) / 255;
  { // màu hệ nhạt (Thủy #6fd3ff, Quang #fff1b0…) → đẩy độ đậm lên ≥ 0,8 để mảnh không bạc trắng; lõi sáng vẫn trắng
    const mx = Math.max(cr, cg, cb), mn = Math.min(cr, cg, cb), sat = mx ? (mx - mn) / mx : 0, want = Math.max(sat, 0.8);
    const f = (v) => (mx - (mx - v) * (want / (sat || 1))) / mx; if (sat > 0.01) { cr = Math.max(0, f(cr)); cg = Math.max(0, f(cg)); cb = Math.max(0, f(cb)); } }
  const cmax = Math.max(cr, cg, cb), k = 1.15;
  for (let i = 0; i < a.length; i += 4) {
    const r = a[i] / 255, gg = a[i + 1] / 255, b = a[i + 2] / 255, v = Math.max(r, gg, b);
    if (v <= 0.004) continue;
    const s = Math.min(1, Math.pow(Math.max(0, (v - Math.min(r, gg, b)) / v - 0.06) / 0.5, 0.75) * k); // giữ độ đậm gốc: chỉ điểm gần trắng của mảnh (lõi) mới trắng
    // màu hệ chuẩn hoá theo độ sáng v, trộn về trắng theo (1 - s)
    a[i] = 255 * v * (1 - s + s * (cr / cmax || 1)); a[i + 1] = 255 * v * (1 - s + s * (cg / cmax || 1)); a[i + 2] = 255 * v * (1 - s + s * (cb / cmax || 1));
  }
  g.putImageData(d, 0, 0); tints.set(key, c);
  return c;
}

const EASE = { lin: (t) => t, out: (t) => 1 - (1 - t) ** 3, in: (t) => t * t * t, io: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  pop: (t) => { const c = 1.7; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; } };
const lerp = (v, k) => (Array.isArray(v) ? v[0] + (v[1] - v[0]) * k : v ?? 0);
const rnd = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); }; // ngẫu nhiên cố định theo hạt

// p: tiến độ 0..1 (công thức loop: lặp theo p), (x, y) điểm neo, h cỡ chuẩn (px), rot góc chiêu (rad)
export function drawVfx(ctx, id, p, x, y, h, rot = 0, alpha = 1) {
  const P = parse(id);
  if (!P || !IMG) return false;
  const R = P.r;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = true;
  for (let li = 0; li < R.layers.length; li++) {
    const L = R.layers[li], t0 = L.t?.[0] ?? 0, t1 = L.t?.[1] ?? 1;
    let k = R.loop ? ((p - t0) / (t1 - t0)) : (p - t0) / (t1 - t0);
    if (R.loop) k = ((k % 1) + 1) % 1; else if (k < 0 || k > 1) continue;
    const e = (EASE[L.e] || EASE.out)(k);
    const n = L.n || 1;
    for (let j = 0; j < n; j++) {
      const names = Array.isArray(L.f) ? L.f : [L.f], name = names[Math.floor(rnd(li, j + 7) * names.length) % names.length];
      const img = tinted(name, L.c ? (COL[L.c] || L.c) : P.c);
      if (!img) continue;
      const jit = L.jit ? 1 + (rnd(li, j) - 0.5) * 2 * L.jit : 1;
      const sz = lerp(L.s ?? 1, e) * h * jit;
      let a = (L.a ? lerp(L.a, k) : R.loop ? 1 : Math.min(1, k * 8, (1 - k) * 3)) * alpha;
      if (L.flick) a *= 0.7 + 0.3 * Math.sin((p * 40 + j * 2.1) * (L.flick || 1));
      if (a <= 0.01 || sz <= 0.5) continue;
      let ox = (L.x || 0) * h, oy = (L.y || 0) * h;
      if (L.spread || L.burst) { // hạt: vị trí ngẫu nhiên trong vòng, bay ra ngoài theo e
        const ang = (L.arc ? (rnd(li, j + 3) - 0.5) * L.arc * Math.PI * 2 + (L.arc0 || 0) : rnd(li, j + 3) * Math.PI * 2), r0 = (L.spread || 0) * Math.sqrt(rnd(li, j + 5));
        const rr = (r0 + (L.burst || 0) * e) * h;
        ox += Math.cos(ang) * rr; oy += Math.sin(ang) * rr * (L.sy || 1);
      }
      if (L.ring) { const ang = (j / n) * Math.PI * 2 + lerp(L.ring_r || 0, e) * Math.PI * 2; ox += Math.cos(ang) * L.ring * h; oy += Math.sin(ang) * L.ring * h * (L.sy || 1); }
      ox += lerp(L.dx || 0, e) * h; oy += lerp(L.dy || 0, e) * h - (L.rise || 0) * e * h * (0.6 + 0.8 * rnd(li, j + 9));
      if (L.fall) oy += L.fall * h * (e - 1) * (0.7 + 0.6 * rnd(li, j + 11));
      const ang = (L.norot ? 0 : rot) + lerp(L.r || 0, R.loop ? k : e) * Math.PI * 2 + (L.rj ? (rnd(li, j + 13) - 0.5) * L.rj * Math.PI * 2 : 0);
      const w = sz * (img.width / Math.max(img.width, img.height)), hh = sz * (img.height / Math.max(img.width, img.height));
      ctx.save();
      const c = L.norot || !rot ? 1 : 1; ctx.translate(x + (L.norot ? ox : ox * Math.cos(rot) - oy * Math.sin(rot)) * c, y + (L.norot ? oy : ox * Math.sin(rot) + oy * Math.cos(rot)) * c);
      if (L.sy && !L.spread && !L.ring) ctx.scale(1, L.sy);
      ctx.rotate(ang); if (L.flip) ctx.scale(-1, 1);
      ctx.globalAlpha = Math.min(1, a);
      const by = L.ground ? -hh : -hh / 2;
      ctx.drawImage(img, -w / 2, by, w, hh);
      if (L.glow) { ctx.globalAlpha = Math.min(1, a * L.glow); ctx.drawImage(img, -w / 2, by, w, hh); }
      ctx.restore();
    }
  }
  ctx.restore();
  return true;
}
