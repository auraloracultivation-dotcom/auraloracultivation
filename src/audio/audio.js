// Âm thanh: nhạc nền lặp + tiếng hiệu ứng. Danh sách file và âm lượng ở data/audio.json (code chỉ gọi id).
// Dùng Web Audio: phát được nhiều tiếng chồng nhau, trễ thấp (tiếng kiếm 0,1 giây phải khớp cú chém).
// Trình duyệt (nhất là iPhone) chỉ cho phát tiếng sau lần chạm đầu tiên → mở khoá ở pointerdown/keydown.
export function createAudio(def, settings) {
  const AC = window.AudioContext || window.webkitAudioContext;
  const entries = { ...def.music, ...def.sfx };
  const raw = new Map(); // id → ArrayBuffer (tải trước khi chạm)
  const buf = new Map(); // id → AudioBuffer (giải mã sau khi mở khoá)
  const on = { sound: settings.sound !== false, music: settings.music !== false };
  let ctx = null, sfxGain = null, musicGain = null, musicSrc = null, musicId = null;

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
      sfxGain = ctx.createGain(); sfxGain.connect(ctx.destination);
      musicGain = ctx.createGain(); musicGain.connect(ctx.destination);
      await loading;
      await Promise.all([...raw].map(async ([id, data]) => {
        try { buf.set(id, await decode(data)); } catch (e) { console.warn('Không giải mã được âm thanh', id, e); }
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
    musicId = id;
    if (!ctx || !on.music || musicSrc) return;
    const b = buf.get(id), e = entries[id];
    if (!b) return;
    musicSrc = ctx.createBufferSource();
    musicSrc.buffer = b;
    musicSrc.loop = e.loop !== false;
    [musicSrc.loopStart, musicSrc.loopEnd] = loopPoints(b);
    musicGain.gain.setValueAtTime(0, ctx.currentTime); // vào nhạc nhẹ nhàng
    musicGain.gain.linearRampToValueAtTime(e.volume ?? 0.5, ctx.currentTime + 1.5);
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
      const b = buf.get(id);
      if (!b) return () => {};
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = b;
      g.gain.value = (entries[id]?.volume ?? 1) * vol;
      src.connect(g); g.connect(sfxGain);
      src.start();
      return (fade = 0.25) => { // tắt dần (vd. pháp tướng bị thu lại giữa chừng)
        try { g.gain.setTargetAtTime(0, ctx.currentTime, fade / 3); src.stop(ctx.currentTime + fade); } catch { /* đã dừng */ }
      };
    },
    music(id) { startMusic(id); },
    // Áp dụng cài đặt Âm thanh / Nhạc nền ngay khi bấm trong bảng Cài đặt
    apply(s) {
      on.sound = s.sound !== false;
      on.music = s.music !== false;
      if (on.music && musicId) { unlock(); startMusic(musicId); } else stopMusic();
    },
  };
}
