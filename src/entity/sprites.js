// Hình động (quái, linh thú), hiệu ứng và icon vật phẩm — chỉ mục ở data/art/sprites.json (sinh bằng tools/asset_build.py).
// Đổi hình: chạy lại tool hoặc đổi "art" trong data/monsters/monsters.json — không cần sửa code này.
let DEF = null;
const imgs = new Map(); // src → Image
const tints = new Map(); // src|hue → canvas đã đổi màu
const iconUrls = new Map();

const inflight = new Map(); // src → Promise: gọi 2 lần (tải sẵn + lúc vào game) không tải 2 lần
const LOAD_WAIT_MS = 12000; // mạng chậm: quá 12 giây thì vào game trước (vẽ hình khối tạm), hình tới sau tự hiện
const load = (src) => {
  if (imgs.has(src)) return Promise.resolve(imgs.get(src));
  if (!inflight.has(src)) inflight.set(src, new Promise((res) => {
    const im = new Image(), t = setTimeout(() => res(null), LOAD_WAIT_MS);
    im.onload = () => { clearTimeout(t); imgs.set(src, im); res(im); };
    im.onerror = () => { clearTimeout(t); res(null); }; // thiếu hình → vẽ hình khối tạm, không làm hỏng game
    im.src = src;
  }));
  return inflight.get(src);
};

export async function loadSprites(def) {
  DEF = def;
  // lazy: tải khi lần đầu cần vẽ (quái 7 vùng, hiệu ứng chiêu mới) — mở game nhanh, không tải hình vùng chưa tới
  const srcs = new Set([...Object.values(def.sheets), ...Object.values(def.fx)].filter((s) => !s.lazy).map((s) => s.src));
  srcs.add(def.icons.src);
  await Promise.all([...srcs].map(load));
}
const ensure = (s) => { if (s && !imgs.has(s.src)) load(s.src); return s && imgs.get(s.src); }; // load chỉ tải 1 lần mỗi hình
export const hasSheet = (id) => !!ensure(DEF?.sheets[id]);

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
  const im = s && ensure(s) && tinted(s.src, hue);
  if (!im) return false;
  const a = s.anims[anim] || s.anims.idle;
  const n = a.frames ? a.frames.length : a.n; // frames: thứ tự khung trong hàng (vd. đi = [1, 0, 2, 0])
  let f = Math.floor(t * fps);
  f = once ? Math.min(n - 1, f) : f % n;
  if (a.frames) f = a.frames[f];
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

// Ảnh nhỏ (data URL) khung đứng đầu tiên của một tấm hình động — icon thú cưng trong Kho. null khi hình chưa tải xong.
const thumbs = new Map();
export function sheetThumb(id, hue = 0, size = 96) {
  const key = `${id}|${hue}`;
  if (thumbs.has(key)) return thumbs.get(key);
  const s = DEF?.sheets[id];
  if (!s) return null;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const h = Math.min(size - 8, ((size - 8) * s.fh) / s.fw);
  if (!drawSheet(c.getContext('2d'), id, 'idle', 0, size / 2, size - (size - h) / 2, h, 1, { hue })) return null;
  const url = c.toDataURL(); thumbs.set(key, url);
  return url;
}

// Hiệu ứng: p = tiến độ 0..1. anchor theo kiểu cắt (giữa hoặc đáy). rot: góc quay (rad).
export function drawEffect(ctx, id, p, x, y, h, rot = 0, alpha = 1) {
  const s = DEF?.fx[id];
  const im = s && ensure(s);
  if (!im) return false;
  const n = s.anims.play.n, f = Math.min(n - 1, Math.floor(p * n));
  const k = h / s.fh, w = s.fw * k;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = true;
  ctx.translate(x, y); if (rot) ctx.rotate(rot);
  ctx.drawImage(im, f * s.fw, 0, s.fw, s.fh, -w / 2, -h / 2, w, h);
  if (s.glow) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= s.glow; ctx.drawImage(im, f * s.fw, 0, s.fw, s.fh, -w / 2, -h / 2, w, h); } // cộng sáng kiểu My Heroes: rực, chồng nhau cháy trắng
  ctx.restore();
  return true;
}
export const fxGlow = (id) => DEF?.fx[id]?.glow || 0; // hiệu ứng Thiên hệ (t.*): đạn có vệt đuôi
export const fxDuration = (id) => (DEF?.fx[id] ? DEF.fx[id].anims.play.n / DEF.fx[id].fps : 0.5);

// Icon vật phẩm / công pháp / ô trang bị (64×64 trong atlas). Trả về data URL để dùng trong <img>, hoặc null nếu chưa có.
export function iconUrl(id) {
  if (!DEF) return null;
  if (iconUrls.has(id)) return iconUrls.get(id);
  const n = DEF.icons.map[id] ?? DEF.icons.map[id.replace(/\.[a-z]+$/, '.001')], atlas = imgs.get(DEF.icons.src); // biến thể (vd. item.dan.vien-man.ht) dùng hình bản .001
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

// Một khung hiệu ứng làm icon vuông (ô kỹ năng trên HUD), giữ lại sau lần đầu
// Nạp trước ảnh hiệu ứng (lazy) để fxIconUrl có hình ngay — Đồ giám, icon pháp bảo trong Kho
export const loadFx = (ids) => Promise.all(ids.map((id) => DEF?.fx[id] && load(DEF.fx[id].src)));

export function fxIconUrl(id, frame = 0) {
  const key = `fx:${id}:${frame}`;
  if (iconUrls.has(key)) return iconUrls.get(key);
  const f = DEF?.fx[id], im = f && ensure(f);
  if (!im) return null;
  const S = Math.max(f.fw, f.fh), c = document.createElement('canvas'); c.width = c.height = S;
  const n = Math.min(frame, f.anims.play.n - 1);
  c.getContext('2d').drawImage(im, n * f.fw, f.anims.play.row * f.fh, f.fw, f.fh, (S - f.fw) / 2, (S - f.fh) / 2, f.fw, f.fh);
  const url = c.toDataURL();
  iconUrls.set(key, url);
  return url;
}
