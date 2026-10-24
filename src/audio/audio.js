// Âm thanh: nhạc nền lặp + tiếng hiệu ứng. Danh sách file và âm lượng ở data/audio.json (code chỉ gọi id).
// Dùng Web Audio: phát được nhiều tiếng chồng nhau, trễ thấp (tiếng kiếm 0,1 giây phải khớp cú chém).
// Trình duyệt (nhất là iPhone) chỉ cho phát tiếng sau lần chạm đầu tiên → mở khoá ở pointerdown/keydown.
export function createAudio(def, settings) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const entries = { ...def.music, ...def.sfx };
  const raw = new Map(); // id → ArrayBuffer (tải trước khi chạm)
  const last = new Map(); // id → lần phát gần nhất (giây, đồng hồ âm thanh)
  const lead = new Map(); // id → giây im lặng đầu file (MP3 tự chèn ~25 ms) — bỏ qua khi phát để tiếng chém khớp cú đánh
  const leadIn = (b) => { const d = b.getChannelData(0); let i = 0; while (i < d.length && Math.abs(d[i]) < 0.001) i++; return Math.min(i, d.length - 1) / b.sampleRate; };
  const buf = new Map(); // id → AudioBuffer (giải mã sau khi mở khoá)
  const on = { sound: settings.sound !== false, music: settings.music !== false };
  let ctx = null, sfxGain = null, musicGain = null, musicSrc = null, musicId = null, vol = { sfx: settings.soundVol ?? 1, music: settings.musicVol ?? 1 }; // âm lượng từ Cài đặt (0..1)

  // Tải trước dữ liệu (không chặn vào game); lỗi tải một file thì bỏ qua file đó
  const loading = Promise.all(Object.entries(entries).map(async ([id, e]) => {
    try {
      const res = await fetch(e.file);
      if (res.ok) raw.set(id, await res.arrayBuffer());
    } catch { /* mất mạng: không có tiếng này */ }
  }));

  const decode = (data) => new Promise((ok, no) => {
    const p = ctx.decodeAudioData(data, ok, no); // Safari cũ chỉ có dạng callback
    if (p?.then) p.then(ok, no);
  });

  async function unlock() {
    if (!AC) return;
    if (!ctx) {
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* iOS < 16.4 */ }
      ctx = new AC();
      sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination); sfxGain.gain.value = vol.sfx;
      musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
      await loading;
      await Promise.all([...raw].map(async ([id, data]) => {
        try { const b = await decode(data); buf.set(id, b); if (!def.music[id]) lead.set(id, leadIn(b)); } catch (e) { console.warn('Không giải mã được âm thanh', id, e); }
      }));
      raw.clear();
      if (musicId) startMusic(musicId);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  const unlockOnce = () => { unlock(); };
  window.addEventListener('pointerdown', unlockOnce, { capture: true });
  window.addEventListener('keydown', unlockOnce, { capture: true });
  // Ẩn tab / tắt màn hình: dừng hẳn để không kêu nền và đỡ tốn pin
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {}); else ctx.resume().catch(() => {});
  });

  // Điểm lặp: bỏ khoảng lặng đầu/cuối do nén MP3 thêm vào, để vòng lặp không bị hẫng
  function loopPoints(b) {
    const d = b.getChannelData(0), th = 0.0005;
    let s = 0, e = d.length - 1;
    while (s < e && Math.abs(d[s]) < th) s++;
    while (e > s && Math.abs(d[e]) < th) e--;
    return [s / b.sampleRate, (e + 1) / b.sampleRate];
  }

  function startMusic(id) {
    if (musicSrc && musicId !== id) { // đổi bài (thám hiểm ↔ phó bản): tắt dần bài cũ rồi vào bài mới
      const old = musicSrc, g = musicGain;
      try { g.gain.setTargetAtTime(0, ctx.currentTime, 0.35); old.stop(ctx.currentTime + 1.2); } catch { /* đã dừng */ }
      musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
      musicSrc = null;
    }
    musicId = id;
    if (!ctx || !on.music || musicSrc) return;
    const b = buf.get(id), e = entries[id];
    if (!b) return;
    musicSrc = ctx.createBufferSource();
    musicSrc.buffer = b;
    musicSrc.loop = e.loop !== false;
    [musicSrc.loopStart, musicSrc.loopEnd] = loopPoints(b);
    musicGain.gain.setValueAtTime(0, ctx.currentTime); // vào nhạc nhẹ nhàng
    musicGain.gain.linearRampToValueAtTime((e.volume ?? 0.5) * vol.music, ctx.currentTime + 1.5);
    musicSrc.connect(musicGain);
    musicSrc.start(0, musicSrc.loopStart);
  }
  function stopMusic() {
    if (!musicSrc) return;
    try { musicSrc.stop(); } catch { /* đã dừng */ }
    musicSrc.disconnect();
    musicSrc = null;
  }

  return {
    // Phát một tiếng hiệu ứng; vol nhân thêm (vd. người khác ở xa nghe nhỏ hơn). Trả về hàm dừng sớm.
    play(id, vol = 1) {
      if (!ctx || !on.sound || ctx.state !== 'running') return () => {};
      const b = buf.get(id), e = entries[id];
      if (!b) return () => {};
      const now = ctx.currentTime;
      if (e?.gap_s && now - (last.get(id) ?? -9) < e.gap_s) return () => {}; // giãn cách: tiếng phát dồn dập (trúng đòn, linh cầu…) không chồng chói tai
      last.set(id, now);
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b;
      if (e?.vary) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * e.vary; // lệch cao độ nhẹ cho đỡ nhàm
      g.gain.value = (entries[id]?.volume ?? 1) * vol;
      src.connect(g); g.connect(sfxGain);
      src.start(0, lead.get(id) || 0);
      return (fade = 0.25) => { // tắt dần (vd. pháp tướng bị thu lại giữa chừng)
        try { g.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); src.stop(ctx.currentTime + fade); } catch { /* đã dừng */ }
      };
    },
    music(id) { startMusic(id); },
    // Áp dụng cài đặt Âm thanh / Nhạc nền ngay khi bấm trong bảng Cài đặt
    apply(s) {
      on.sound = s.sound !== false;
      on.music = s.music !== false;
      vol = { sfx: s.soundVol ?? 1, music: s.musicVol ?? 1 };
      if (sfxGain) sfxGain.gain.value = vol.sfx;
      if (musicGain && musicSrc) musicGain.gain.setTargetAtTime((entries[musicId]?.volume ?? 0.5) * vol.music, ctx.currentTime, 0.05);
      if (on.music && musicId) { unlock(); startMusic(musicId); } else stopMusic();
    },
  };
}
