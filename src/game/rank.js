// Gửi ảnh chụp tiến trình lên bảng xếp hạng (THỬ NGHIỆM: tiến trình còn ở máy khách — docs/08).
// Gửi khi lên tầng / đổi trang bị, và tối đa mỗi luc_chien.submit_every_s giây nếu có thay đổi. Máy chủ còn chặn 20 giây/lần.
const KEYS = ['hp', 'mp', 'linh', 'def', 'xuyen', 'chinh', 'ne', 'crit', 'hut', 'tocdanh', 'tocchay', 'phan'];

export function powerOf(stats, weights) {
  let p = 0;
  for (const [k, w] of Object.entries(weights)) p += (Number(stats?.[k]) || 0) * w;
  return Math.max(0, Math.round(p));
}

// info(): { stageIndex, stageName, exp, stats, voidKills }; submit(payload) → Promise (src/net)
export function createRankReporter({ gp, info, me, submit }) {
  const L = gp.luc_chien;
  let timer = 5, lastKey = '', lastStage = -1, busy = false;

  function payload() {
    const i = info();
    const stats = {};
    for (const k of KEYS) if (Number.isFinite(i.stats?.[k])) stats[k] = Math.round(i.stats[k] * 100) / 100;
    return { stageIndex: i.stageIndex, stageName: i.stageName, exp: Math.max(0, Math.round(i.exp)), power: powerOf(stats, L.weights),
      voidKills: i.voidKills, stats, look: me.look || null };
  }

  async function send(force = false) {
    if (busy) return;
    const p = payload(), key = JSON.stringify(p);
    if (!force && key === lastKey) return;
    busy = true;
    try { await submit(p); lastKey = key; } catch (e) { console.warn('Bảng xếp hạng: gửi lỗi', e?.message || e); }
    busy = false;
  }

  return {
    tick(dt) {
      timer -= dt;
      const st = info().stageIndex;
      if (st !== lastStage && lastStage !== -1) timer = Math.min(timer, 1); // vừa lên tầng: gửi sớm
      lastStage = st;
      if (timer <= 0) { timer = L.submit_every_s; send(); }
    },
    flush: () => send(),
    power: () => payload().power,
  };
}
