// Hình động (quái, linh thú), hiệu ứng và icon vật phẩm — chỉ mục ở data/art/sprites.json (sinh bằng tools/asset_build.py).
// Đổi hình: chạy lại tool hoặc đổi "art" trong data/monsters/monsters.json — không cần sửa code này.
let DEF = null;
const imgs = new Map(); // src → Image
const tints = new Map(); // src|hue → canvas đã đổi màu
const iconUrls = new Map();

const load = (src) => new Promise((res) => {
  if (imgs.has(src)) return res(imgs.get(src));
  const im = new Image();
  im.onload = () => { imgs.set(src, im); res(im); };
  im.onerror = () => res(null); // thiếu hình → vẽ hình khối tạm, không làm hỏng game
  im.src = src;
});

export async function loadSprites(def) {
  DEF = def;
  const srcs = new Set([...Object.values(def.sheets), ...Object.values(def.fx)].map((s) => s.src));
  srcs.add(def.icons.src);
  await Promise.all([...srcs].map(load));
}
export const hasSheet = (id) => !!(DEF?.sheets[id] && imgs.get(DEF.sheets[id].src));

// Đổi sắc độ (hue, độ) một lần rồi giữ lại — dùng cho quái dùng chung hình nhưng khác vùng
function tinted(src, hue) {
  const im = imgs.get(src);
  if (!im || !hue) return im;
  const key = `${src}|${hue}`;
  if (tints.has(key)) return tints.get(key);
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const cos = Math.cos((hue * Math.PI) / 180), sin = Math.sin((hue * Math.PI) / 180);
  // ma trận xoay sắc độ (giống CSS hue-rotate)
  const m = [0.213 + cos * 0.787 - sin * 0.213, 0.715 - cos * 0.715 - sin * 0.715, 0.072 - cos * 0.072 + sin * 0.928,
    0.213 - cos * 0.213 + sin * 0.143, 0.715 + cos * 0.285 + sin * 0.140, 0.072 - cos * 0.072 - sin * 0.283,
    0.213 - cos * 0.213 - sin * 0.787, 0.715 - cos * 0.715 + sin * 0.715, 0.072 + cos * 0.928 + sin * 0.072];
  for (let i = 0; i < p.length; i += 4) {
    if (!p[i + 3]) continue;
    const r = p[i], gg = p[i + 1], b = p[i + 2];
    p[i] = r * m[0] + gg * m[1] + b * m[2]; p[i + 1] = r * m[3] + gg * m[4] + b * m[5]; p[i + 2] = r * m[6] + gg * m[7] + b * m[8];
  }
  g.putImageData(d, 0, 0);
  tints.set(key, c);
  return c;
}

// Vẽ một khung của hoạt ảnh `anim` (thiếu thì lùi về idle). x, y = giữa chân; h = chiều cao trên thế giới.
// t: giây đã chạy; once: chạy một lần rồi đứng ở khung cuối (chết). face: 1 nhìn phải, -1 nhìn trái.
export function drawSheet(ctx, id, anim, t, x, y, h, face = 1, { hue = 0, once = false, fps = 8, alpha = 1 } = {}) {
  const s = DEF?.sheets[id];
  const im = s && tinted(s.src, hue);
  if (!im) return false;
  const a = s.anims[anim] || s.anims.idle;
  let f = Math.floor(t * fps);
  f = once ? Math.min(a.n - 1, f) : f % a.n;
  const k = h / s.fh, w = s.fw * k;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = s.fh > 60; // hình vẽ lớn thu nhỏ mượt; pixel nhỏ giữ sắc
  ctx.translate(x, y);
  if (face * (s.face || 1) < 0) ctx.scale(-1, 1);
  ctx.drawImage(im, f * s.fw, a.row * s.fh, s.fw, s.fh, -w / 2, -h, w, h);
  ctx.restore();
  return true;
}

// Hiệu ứng: p = tiến độ 0..1. anchor theo kiểu cắt (giữa hoặc đáy). rot: góc quay (rad).
export function drawEffect(ctx, id, p, x, y, h, rot = 0, alpha = 1) {
  const s = DEF?.fx[id];
  const im = s && imgs.get(s.src);
  if (!im) return false;
  const n = s.anims.play.n, f = Math.min(n - 1, Math.floor(p * n));
  const k = h / s.fh, w = s.fw * k;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(im, f * s.fw, 0, s.fw, s.fh, -w / 2, -h / 2, w, h);
  ctx.restore();
  return true;
}
export const fxDuration = (id) => (DEF?.fx[id] ? DEF.fx[id].anims.play.n / DEF.fx[id].fps : 0.5);

// Icon vật phẩm / công pháp / ô trang bị (64×64 trong atlas). Trả về data URL để dùng trong <img>, hoặc null nếu chưa có.
export function iconUrl(id) {
  if (!DEF) return null;
  if (iconUrls.has(id)) return iconUrls.get(id);
  const n = DEF.icons.map[id], atlas = imgs.get(DEF.icons.src);
  if (n === undefined || !atlas) return null;
  const S = DEF.icons.size, c = document.createElement('canvas'); c.width = c.height = S;
  c.getContext('2d').drawImage(atlas, (n % DEF.icons.cols) * S, Math.floor(n / DEF.icons.cols) * S, S, S, 0, 0, S, S);
  const url = c.toDataURL();
  iconUrls.set(id, url);
  return url;
}
// Vẽ icon thẳng lên canvas (linh thảo / khoáng trên bản đồ)
export function drawIcon(ctx, id, x, y, size) {
  const n = DEF?.icons.map[id], atlas = DEF && imgs.get(DEF.icons.src);
  if (n === undefined || !atlas) return false;
  const S = DEF.icons.size;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  ctx.drawImage(atlas, (n % DEF.icons.cols) * S, Math.floor(n / DEF.icons.cols) * S, S, S, x - size / 2, y - size, size, size);
  ctx.restore();
  return true;
}
