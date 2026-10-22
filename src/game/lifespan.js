// Thọ nguyên (chủ dự án 23/10/2026) — THỬ NGHIỆM phía máy khách, số liệu: data/lifespan.json.
// 1 ngày thật theo giờ Việt Nam (qua 0h) = 1 năm tuổi, kể cả khi không vào game. Giờ lấy từ máy chủ (serverNow).
// Thọ nguyên tối đa = base_max + tổng gain các tầng đã đạt + số năm Trường Sinh Đan đã cộng.
// Tuổi ≥ thọ nguyên tối đa → tọa hóa (chết hẳn): main.js hiện bảng chuyển thế và xoá tiến trình (src/ui/toahoa.js).
// Ngày sinh = ngày tạo nhân vật (characters.created_at trên máy chủ, giờ VN) — mỗi người một tuổi khác nhau (chủ dự án 23/10).
// Chuyển thế sau tọa hóa: ngày sinh = ngày chuyển thế (src: 'reborn'). Mốc 4: máy chủ tự tính tuổi, không tin máy khách.

export function createLifespan({ def, progress, stages, serverNow = Date.now, bornAt = null }) {
  const DAY = 86400000, TZ = def.tz_offset_hours * 3600000;
  const today = () => Math.floor((serverNow() + TZ) / DAY); // số ngày (giờ VN) kể từ 1/1/1970
  const dayOf = (t) => Math.floor((new Date(t).getTime() + TZ) / DAY);
  const accDay = bornAt && Number.isFinite(new Date(bornAt).getTime()) ? Math.min(dayOf(bornAt), today()) : null; // ngày tạo nhân vật
  const st = () => (progress.state.life ||= { born: accDay ?? today(), bonus: 0, pillDay: -1, src: accDay !== null ? 'acc' : 'local' });
  // Bản cũ (born = ngày bật tính năng) → chuyển sang ngày tạo nhân vật; đời sau chuyển thế giữ ngày chuyển thế
  if (accDay !== null && !['acc', 'reborn'].includes(st().src)) { st().born = accDay; st().src = 'acc'; }
  progress.changed();

  const gainUpTo = (idx) => { let s = 0; for (let i = 1; i <= idx; i++) s += def.gain[stages[i].id] || 0; return s; };
  const age = () => def.start_age + Math.max(0, today() - st().born);
  const max = () => def.base_max + gainUpTo(progress.state.stage) + (st().bonus || 0);
  const left = () => max() - age();
  const dead = () => left() <= 0;
  const label = (stageName) => `${stageName} (Thọ nguyên ${age()}/${max()} năm)`;

  // Trường Sinh Đan: mỗi ngày (giờ VN) một viên. Trả về { ok, msg }; ok = được ăn (nơi gọi trừ đan).
  function canEat() {
    if (st().pillDay === today()) return { ok: false, msg: 'Hôm nay đã dùng Trường Sinh Đan — mai hãy dùng tiếp (qua 0h giờ Việt Nam)' };
    return { ok: true };
  }
  function eat() {
    const s = st();
    s.pillDay = today(); s.bonus = (s.bonus || 0) + def.pill.add_max;
    progress.changed();
    return `Thọ nguyên tối đa +${def.pill.add_max} năm (${age()}/${max()})`;
  }

  // Cảnh báo sắp hết thọ (30 / 10 / 3 / 1 năm): mỗi mốc báo một lần mỗi ngày
  let warned = -1;
  function warning() {
    const l = left(), d = today();
    if (warned === d || l <= 0) return null;
    const w = def.warn_left.find((x) => l <= x);
    if (w === undefined) return null;
    warned = d;
    return `Thọ nguyên chỉ còn ${l} năm — đột phá hoặc dùng Trường Sinh Đan (hái Thọ Nguyên Thảo ở Vùng Xanh)`;
  }
  // Gọi mỗi khung hình; kiểm tra mỗi check_every_s giây. Chỉ xét tọa hóa khi đã có giờ máy chủ (synced).
  let t = 0, over = false;
  function watch(dt, { synced, onTick, onDead, onWarn }) {
    if (over || (t -= dt) > 0) return;
    t = def.check_every_s; onTick();
    if (synced() && dead()) { over = true; onDead(summary()); return; }
    const w = warning(); if (w) onWarn(w);
  }
  const summary = () => ({ age: age(), max: max(), lived: Math.max(0, today() - st().born) });
  // Chuyển thế: đời mới sinh hôm nay (không lấy ngày tạo nhân vật nữa, kẻo vừa sinh đã hết thọ)
  const reborn = () => { progress.state.life = { born: today(), bonus: 0, pillDay: -1, src: 'reborn' }; };
  return { age, max, left, dead, label, canEat, eat, warning, summary, today, watch, reborn };
}
