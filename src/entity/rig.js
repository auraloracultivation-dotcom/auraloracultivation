// Nhân vật ghép lớp kiểu My Heroes (docs/06-TRANG-BI.md): pháp tướng · cánh · vũ khí · giày · thân · đầu · tay.
// Mỗi món là 1 hình tĩnh; nhún, chém, ngự kiếm đều do code. Thông số lấy từ data/equipment/he6.json
// (chủ dự án chỉnh và lưu trong Tủ Đồ Tu Chân). Đơn vị: CH = chiều cao nhân vật tới gấu áo, cw = bề ngang áo.
import { MOVES, pose } from './moves.js';

const D = Math.PI / 180;
const BASE_CH = 40; // chiều cao (điểm ảnh thế giới, trước sprite_scale) khi params.than.scale = 1
const ART_CH = 125; // chiều cao tương ứng trong Tủ Đồ — đổi các số tuyệt đối (px) của Tủ Đồ sang thế giới
const ATTACK_S = 0.42;

let R = null; // { art, sets, setOfArt, img, built, open }
const FX = { appear: 2.1, vanish: 0.5 }; // thời gian hoá hình / tan của pháp tướng (giây), lấy từ data/skills/phap-tuong.json
export function avatarFx(def) { FX.appear = def.appear_s || FX.appear; FX.vanish = def.vanish_s || FX.vanish; }

export async function loadRig(loadJSON) {
  const def = await loadJSON('data/equipment/he6.json');
  const img = {};
  const load = (src) => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
  await Promise.all(Object.values(def.art).map(async (a) => { img[a.id] = await load(a.file); }));
  const open = await load(def.hand_open);
  // hình nào thuộc bộ nào: ưu tiên bộ cùng số (art.weapon.he.5 → bộ he.5)
  const setOfArt = {};
  for (const s of def.sets) for (const k of ['outfit', 'weapon', 'wing', 'avatar']) {
    const num = s[k].split('.').pop();
    if (!setOfArt[s[k]] || s.id.endsWith(`.${num}`)) setOfArt[s[k]] = s;
  }
  // Hình 6 hệ chưa thuộc bộ nào (vd. art.weapon.he.3 khi bộ he.3 dùng kiếm he.5) → gán bộ cùng số để vẫn vẽ được
  for (const id of Object.keys(def.art)) {
    const num = id.match(/\.he\.(\d+)$/)?.[1], s = num && def.sets.find((x) => x.id === `he.${num}`);
    if (!setOfArt[id] && s) setOfArt[id] = s;
  }
  // Kho hình chung (data/equipment/art.json, đồ luyện từ phôi): vũ khí / cánh / pháp tướng, nạp khi cần lần đầu
  const extra = {};
  try {
    const idx = await loadJSON('data/equipment/art.json');
    for (const k of ['vu-khi', 'canh', 'phap-tuong', 'mat-na']) for (const a of idx[k] || []) if (!def.art[a.id]) extra[a.id] = { ...a, grip: a.grip || a.anchor };
  } catch (e) { console.warn('Không nạp được kho hình chung', e); }
  R = { art: def.art, sets: def.sets, setOfArt, img, open, built: {}, extra, loading: new Set(), mask: def.mask_default };
  return R;
}
export const rigReady = () => !!R;
export const artInfo = (id) => R?.art[id];
export const artImage = (id) => R?.img[id];

// ---- Tách tay & giày khỏi hình trang phục (một lần cho mỗi bộ) ----
function inEll(x, y, b) {
  const cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, rx = (b[2] - b[0]) / 2, ry = (b[3] - b[1]) / 2;
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
}
function crop(img, b, ell) {
  const w = Math.max(1, Math.round(b[2] - b[0])), h = Math.max(1, Math.round(b[3] - b[1]));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, -b[0], -b[1]);
  if (ell) {
    const d = g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!inEll(x + b[0], y + b[1], b)) d.data[(y * w + x) * 4 + 3] = 0;
    g.putImageData(d, 0, 0);
  }
  return c;
}
function mapBox(b, from, to) {
  const sx = to.w / from.w, sy = to.hem / from.hem, dy = to.hem - from.hem * sy;
  return [b[0] * sx, b[1] * sy + dy, b[2] * sx, b[3] * sy + dy];
}
function build(set) {
  if (R.built[set.id]) return R.built[set.id];
  const it = R.art[set.outfit], img = R.img[set.outfit], r = set.region, w = it.w, h = it.h;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, w, h), a = d.data, src = new Uint8ClampedArray(a);
  const mask = new Uint8Array(w * h);
  for (const b of [r.handL, r.handR]) {
    for (let y = Math.max(0, b[1]); y < Math.min(h, b[3]); y++) {
      for (let x = Math.max(0, b[0]); x < Math.min(w, b[2]); x++) if (inEll(x, y, b)) mask[y * w + x] = 1;
    }
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { // vá chỗ tay cũ bằng màu áo gần nhất cùng hàng
    const p = y * w + x;
    if (!mask[p]) continue;
    let L = -1, Rr = -1;
    for (let q = x - 1; q >= 0; q--) if (!mask[y * w + q] && src[(y * w + q) * 4 + 3] > 0) { L = q; break; }
    for (let q = x + 1; q < w; q++) if (!mask[y * w + q] && src[(y * w + q) * 4 + 3] > 0) { Rr = q; break; }
    if (L < 0 || Rr < 0) { a[p * 4 + 3] = 0; continue; }
    const s = x - L <= Rr - x ? L : Rr;
    for (let q = 0; q < 3; q++) a[p * 4 + q] = src[(y * w + s) * 4 + q];
    a[p * 4 + 3] = 255;
  }
  for (const b of [r.footL, r.footR]) {
    for (let y = Math.max(0, b[1]); y < Math.min(h, b[3]); y++) for (let x = Math.max(0, b[0]); x < Math.min(w, b[2]); x++) a[(y * w + x) * 4 + 3] = 0;
  }
  g.putImageData(d, 0, 0);
  // tay/giày dùng chung từ bộ khác (nếu chủ dự án bật "dùng tay, giày bộ tím")
  const srcArt = set.shared_from ? R.art[set.shared_from] : it;
  const sr = set.region_shared || r;
  const srcImg = R.img[srcArt.id];
  const fb = (b) => (set.shared_from ? mapBox(b, srcArt, it) : b);
  return (R.built[set.id] = {
    body: c, hL: crop(srcImg, sr.handL, 1), hR: crop(srcImg, sr.handR, 1), fL: crop(srcImg, sr.footL, 0), fR: crop(srcImg, sr.footR, 0),
    boxes: { handL: fb(sr.handL), handR: fb(sr.handR), footL: fb(sr.footL), footR: fb(sr.footR) }, srcK: it.hem / srcArt.hem,
  });
}

// look: { outfit, weapon, wing, avatar } — mã hình (art id) hoặc null
// Chỉ giữ mã hình đã nạp (người khác có thể gửi mã máy này chưa có)
function lazyArt(id) { // hình trong kho chung: nạp ảnh lần đầu, xong mới vẽ (dùng thông số bộ của trang phục)
  const a = R.extra[id];
  if (!a || R.art[id] || R.loading.has(id)) return;
  R.loading.add(id);
  const i = new Image();
  i.onload = () => { R.img[id] = i; R.art[id] = a; };
  i.src = a.file;
}
export function knownLook(look) {
  if (!R || !look) return null;
  const out = {};
  for (const k of ['outfit', 'weapon', 'wing', 'avatar', 'mask']) {
    const id = look[k];
    if (!id) continue;
    if (k !== 'outfit') lazyArt(id);
    if (R.art[id] && (R.setOfArt[id] || k !== 'outfit')) out[k] = id; // trang phục cần bộ (vùng cắt tay/giày)
  }
  return Object.keys(out).length ? out : null;
}
export const hasLook = (look) => !!knownLook(look);

// Vệt chém: đường đi của mũi kiếm 0,12 giây gần nhất, nội suy theo góc kiếm (ra cung tròn, không thành nét thẳng)
// — dải sáng 2 tông, thon dần về đuôi (đơn giản kiểu game pixel). tip: { gx, gy, ang, r } (chuôi, góc, bán kính tới mũi)
function drawTrail(ctx, st, tip, now, CH) {
  const tr = (st.trail ||= []);
  if (tip) tr.push({ ...tip, t: now });
  while (tr.length && now - tr[0].t > 0.12) tr.shift();
  if (tr.length < 2) return;
  const pts = [];
  for (let i = 1; i < tr.length; i++) {
    const a = tr[i - 1], b = tr[i];
    for (let k = 0; k < 6; k++) {
      const u = k / 6, ang = a.ang + (b.ang - a.ang) * u, gx = a.gx + (b.gx - a.gx) * u, gy = a.gy + (b.gy - a.gy) * u, r = a.r + (b.r - a.r) * u;
      pts.push([gx + Math.sin(ang) * r, gy - Math.cos(ang) * r]);
    }
  }
  const last = tr[tr.length - 1]; pts.push([last.gx + Math.sin(last.ang) * last.r, last.gy - Math.cos(last.ang) * last.r]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const [col, wMul] of [['rgba(140,210,255,0.3)', 2.6], ['rgba(255,255,255,0.8)', 1]]) {
    ctx.strokeStyle = col;
    for (let i = 1; i < pts.length; i++) {
      ctx.lineWidth = (0.02 + 0.05 * (i / pts.length)) * CH * wMul;
      ctx.beginPath(); ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
    }
  }
  ctx.restore();
}

// Bắt đầu cú chém (chỉ hình ảnh)
export function rigAttack(p, kind = 'chem') { const st = (p.rig ||= {}); st.atk = 0; st.move = MOVES[kind] ? kind : 'chem'; st.trail = []; } // kind: chem | choc | xoay (src/entity/moves.js)

// Vẽ nhân vật ghép lớp, neo ở chân (0,0) sau khi caller đã translate tới p.x, p.y và scale(sprite).
// drawFallbackBody(ctx, lift): vẽ thân mặc định khi chưa mặc trang phục.
export function drawRig(ctx, p, look, drawFallbackBody) {
  const now = performance.now() / 1000;
  const st = (p.rig ||= {});
  if (st.T === undefined) Object.assign(st, { T: 0, ph: 0, flyT: 0, atk: st.atk ?? -1, last: now });
  const dt = Math.min(0.05, Math.max(0, now - st.last)); st.last = now; st.T += dt;
  const outfitSet = look.outfit ? R.setOfArt[look.outfit] : null;
  const P = (outfitSet || R.setOfArt[look.weapon] || R.setOfArt[look.wing] || R.setOfArt[look.avatar] || R.sets[0]).params;
  const pw = (id) => (id && R.setOfArt[id] ? R.setOfArt[id].params : P);
  const it = outfitSet ? R.art[look.outfit] : null;
  const CH = BASE_CH * P.than.scale, f = CH / (ART_CH * P.than.scale);
  const k = it ? CH / it.hem : 1, cw = it ? it.w * k : CH * 0.85;

  st.flyT += ((p.flying ? 1 : 0) - st.flyT) * Math.min(1, dt * 4);
  const fl = st.flyT, moving = !!(p.moving || p.walkT) && st.atk < 0;
  if (moving && fl < 0.5) st.ph += dt * P.than.step;
  let bL = 0, hL = 0, sq = 0, sw = null, kk = 0, flyL = 0;
  if (moving && fl < 0.5) {
    const b = Math.abs(Math.sin(st.ph)), hb = Math.abs(Math.sin(st.ph - P.than.headLag));
    bL = b * P.than.bodyBob * CH; hL = hb * P.than.headBob * CH; sq = (1 - b) * 0.05;
  } else { bL = Math.sin(st.T * 2.2) * 0.005 * CH; hL = Math.sin(st.T * 2.2 - 0.6) * 0.011 * CH; }
  if (fl > 0) {
    flyL = fl * (0.19 * CH + Math.sin(st.T * 2.4) * 4 * f); bL += flyL;
    hL += fl * (0.19 * CH + Math.sin(st.T * 2.4 - 0.5) * 5.5 * f);
  }
  const PV = pw(look.weapon), rest = PV.vukhi.rest * D;
  let pz = null; // tư thế đòn đang ra (Chém / Chọc / Xoay)
  if (st.atk >= 0) {
    st.atk += dt / (MOVES[st.move]?.dur || ATTACK_S);
    pz = pose(st.move || 'chem', Math.min(1, st.atk), rest, P.tay.hold);
    sq = pz.sq; hL = pz.head * 40 * f; sw = pz.ang; kk = pz.kk;
    if (st.atk >= 1) { st.atk = -1; st.trail = []; }
  }
  const st1 = moving && fl < 0.5 ? Math.sin(st.ph) : 0;

  ctx.save();
  ctx.imageSmoothingEnabled = true; // hình gốc độ phân giải cao, thu nhỏ mượt
  { // bóng
    const B = P.bong, sf = 1 - fl * B.fly;
    if (B.s > 0 && B.h > 0) {
      ctx.fillStyle = `rgba(0,0,0,${B.a})`; ctx.beginPath();
      ctx.ellipse((p.facing || 1) * B.x * cw, B.y * CH, (cw * B.s / 2) * sf, (CH * B.h / 2) * sf, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.scale(p.facing < 0 ? -1 : 1, 1);
  if (pz) ctx.translate(pz.lean * CH, -pz.hop * CH); // lao tới (chọc), nhảy (xoay); quay người chỉ co thân (xem dưới)
  const hem = it ? it.hem : 1, base0 = it ? -(it.h - it.hem) * k : 0, by = base0 - bL;
  // pháp tướng: chỉ hiện khi bật kỹ năng; hoá hình hiện dần + loé sáng, thu lại thì tan dần (xem avatarFx)
  if (look.avatar) {
    if (st.avId !== look.avatar) { st.avId = look.avatar; st.avK = st.avK || 0; st.avFlash = 0; }
    const before = st.avK;
    st.avK = Math.min(1, st.avK + dt / FX.appear);
    if (before < 1 && st.avK >= 1) st.avFlash = 1; // đúng cao trào tiếng hoá hình
    st.avOut = false;
  } else if (st.avId) {
    st.avOut = true;
    st.avK -= dt / FX.vanish;
    if (st.avK <= 0) { st.avId = null; st.avK = 0; }
  }
  if (st.avId) {
    const a = R.art[st.avId], Q = pw(st.avId).phaptuong, kA = st.avK;
    const grow = st.avOut ? 1 + (1 - kA) * 0.15 : 0.6 + 0.4 * (1 - (1 - kA) ** 3);
    const h = CH * Q.s * Q.sh * grow, w = CH * Q.s * (a.w / a.h) * Q.sw * grow;
    const x = Q.x * cw - w / 2, y = Q.y * CH - h + 6 * f - bL * 0.5;
    ctx.globalAlpha = Q.a * Math.min(1, kA * 1.3); ctx.drawImage(R.img[a.id], x, y, w, h);
    const glow = st.avOut ? 0 : Math.max(st.avFlash * 0.8, kA < 1 ? (0.25 + Math.sin(st.T * 14) * 0.15) * kA : 0);
    if (glow > 0.01) { // ánh sáng cộng màu: lấp lánh khi đang hoá hình, loé mạnh lúc thành hình
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = glow; ctx.drawImage(R.img[a.id], x, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }
    st.avFlash = Math.max(0, st.avFlash - dt / 0.45);
    ctx.globalAlpha = 1;
  }
  if (look.wing) { // cánh
    const a = R.art[look.wing], Q = pw(look.wing).canh;
    const w0 = cw * Q.s, w = w0 * Q.sw, h = w0 * (a.h / a.w) * Q.sh;
    ctx.globalAlpha = Q.a; ctx.drawImage(R.img[a.id], Q.x * cw - w / 2, by + Q.y * CH - h / 2, w, h); ctx.globalAlpha = 1;
  }
  if (look.weapon) { // vũ khí: xoay quanh chuôi, luôn sau người; bay = nằm ngang dưới chân
    const a = R.art[look.weapon], Q = PV.vukhi, L = CH * Q.s, s = L / Math.hypot(a.w, a.h);
    const grip = [Q.x * cw, by + Q.y * CH];
    const ang = fl > 0.02 ? rest + (Math.PI / 2 - rest) * fl : (sw ?? rest);
    const gx = fl > 0.02 ? grip[0] + (-L * 0.37 - grip[0]) * fl : (grip[0] + (pz ? pz.gx * CH : 0)) * (pz ? pz.sx : 1); // xoay: chuôi theo tay khi thân quay
    const gy = fl > 0.02 ? grip[1] + (-bL + 2 * f - grip[1]) * fl : grip[1] + (pz ? pz.gy * CH : 0);
    ctx.save(); ctx.translate(gx, gy); ctx.rotate(ang - a.angle * D);
    ctx.drawImage(R.img[a.id], -a.grip[0] * s, -a.grip[1] * s, a.w * s, a.h * s); ctx.restore();
    if (pz) drawTrail(ctx, st, pz.trail ? { gx, gy, ang, r: L * 0.82 } : null, now, CH);
  }
  if (pz && pz.sx !== 1) ctx.scale(pz.sx, 1); // xoay: thân quay một vòng (kiếm, cánh không co)
  if (!it) { // chưa mặc đạo bào: thân mặc định
    ctx.save(); ctx.translate(0, -bL); drawFallbackBody(ctx); ctx.restore(); ctx.restore(); return;
  }
  const B = build(outfitSet), r = outfitSet.region, TG = outfitSet.toggles || {};
  const ox = -(it.w / 2) * k, neckY = r.neck * hem, headB = Math.min(hem, (r.neck + P.than.overlap) * hem);
  const sk = B.srcK * k, fy = -flyL;
  const foot = (img, b, side, lift) => {
    const w = img.width * sk * P.giay.s, h = img.height * sk * P.giay.s;
    const cx = ox + ((b[0] + b[2]) / 2) * k + side * P.giay.x * cw, cy = base0 + ((b[1] + b[3]) / 2 - hem) * k + P.giay.y * CH + fy - lift;
    ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
  };
  foot(B.fL, B.boxes.footL, -1, Math.max(0, st1) * P.giay.lift * CH);
  foot(B.fR, B.boxes.footR, 1, Math.max(0, -st1) * P.giay.lift * CH);
  ctx.save(); ctx.translate(0, by); ctx.scale(1 + sq * 0.8, 1 - sq); // thân
  ctx.drawImage(B.body, 0, neckY, it.w, hem - neckY, ox, -(hem - neckY) * k, it.w * k, (hem - neckY) * k); ctx.restore();
  const top = by - (hem - neckY) * k * (1 - sq) - (hL - bL); // đầu (trễ nhịp so với thân)
  ctx.drawImage(B.body, 0, 0, it.w, headB, ox, top - neckY * k, it.w * k, headB * k);
  if (look.mask && R.img[look.mask]) { // mặt nạ che mặt: thông số matna của bộ (Tủ Đồ → thẻ Mặt nạ), thiếu thì mask_default
    const a = R.art[look.mask], M = { ...R.mask, ...(P.matna || {}) }, w = cw * M.s, h = w * a.h / a.w;
    ctx.globalAlpha = M.a ?? 1;
    ctx.drawImage(R.img[look.mask], M.x * cw - w / 2, top - neckY * k + M.y * neckY * k - h / 2, w, h);
    ctx.globalAlpha = 1;
  }
  const hand = (img, b, side, extra, open) => {
    const s = sk * P.tay.s * (1 + extra), w = img.width * s, h = img.height * s;
    const cx = ox + ((b[0] + b[2]) / 2) * k + side * P.tay.x * cw, cy = by + ((b[1] + b[3]) / 2 - hem) * k * (1 - sq) + P.tay.y * CH;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((side < 0 ? 1 : -1) * P.tay.rot * D);
    if (open) {
      ctx.rotate(P.tay.orot * D); if (TG.flipOpen) ctx.scale(-1, 1);
      const ow = w * P.tay.os, oh = ow * (R.open.height / R.open.width);
      ctx.drawImage(R.open, -ow / 2, -oh / 2, ow, oh);
    } else { if (TG.flip) ctx.scale(-1, 1); ctx.drawImage(img, -w / 2, -h / 2, w, h); }
    ctx.restore();
  };
  const swing = (v) => Math.max(0, v) * P.tay.swing * CH;
  const imgL = TG.swap ? B.hR : B.hL, imgR = TG.swap ? B.hL : B.hR, atkR = !TG.swapOpen;
  const hx = pz ? pz.gx * CH : 0, hy = pz ? pz.gy * CH : 0; // tay cầm kiếm theo chuôi khi lao tới (chọc) / nhảy (xoay)
  ctx.save(); ctx.translate(atkR ? 0 : -kk * P.tay.reach * cw - hx, -swing(-st1) - (atkR ? 0 : kk * CH * P.tay.ry - hy));
  hand(imgL, B.boxes.handL, -1, atkR ? 0 : kk * P.tay.grow, !atkR && kk > 0.3); ctx.restore();
  ctx.save(); ctx.translate(atkR ? kk * P.tay.reach * cw + hx : 0, -swing(st1) - (atkR ? kk * CH * P.tay.ry - hy : 0));
  hand(imgR, B.boxes.handR, 1, atkR ? kk * P.tay.grow : 0, atkR && kk > 0.3); ctx.restore();
  ctx.restore();
}

// Chiều cao đầu nhân vật (để đặt tên phía trên), theo đơn vị thế giới trước sprite_scale
export function rigHeadHeight(look) {
  if (!R || !look?.outfit) return 33;
  const s = R.setOfArt[look.outfit], it = R.art[look.outfit];
  return BASE_CH * s.params.than.scale * (it.h / it.hem) + 4;
}
