// Vào khu, chia 2 lớp kênh Realtime (quyết định 2026-10-23, chống lag — xem docs/01):
//  1. Kênh SẢNH  zone:<zoneId>:<tuyến>          — chỉ Presence {id, name} để đếm người + chọn tuyến, và chat chung.
//  2. Kênh Ô LƯỚI cell:<zoneId>:<tuyến>:<cx>:<cy> — thế giới chia ô cell_px; mình gửi vị trí vào ô của mình,
//     và chỉ nghe 3×3 ô quanh mình. Người ở xa không gửi tới máy mình → ít tin nhắn, không vượt hạn mức Supabase.
// Không bao giờ gửi khi kênh chưa "joined" (thư viện sẽ tự gửi qua HTTP, rất chậm và tốn hạn mức).
import { supabase } from './client.js';

const RETRY_MS = [1000, 2000, 4000, 8000, 15000];

export async function joinZone({ zoneId, maxPlayers, maxLines, me, handlers, world, cellPx = 1280, presenceGapMs = 1500 }) {
  for (let line = 1; line <= maxLines; line++) {
    const lobby = await tryLobby(`zone:${zoneId}:${line}`, me, handlers, maxPlayers);
    if (lobby) return createZoneLink({ lobby, line, zoneId, me, handlers, world, cellPx, presenceGapMs });
  }
  throw new Error('Tất cả tuyến đều đầy, thử lại sau.');
}

function tryLobby(topic, me, h, maxPlayers) {
  return new Promise((resolve, reject) => {
    const ch = supabase.channel(topic, { config: { presence: { key: me.id }, broadcast: { self: false } } });
    let decided = false;
    const decide = async () => {
      if (decided) return;
      decided = true;
      const others = Object.keys(ch.presenceState()).filter((k) => k !== me.id).length;
      if (others >= maxPlayers) { await supabase.removeChannel(ch); resolve(null); return; }
      await ch.track({ id: me.id, name: me.name });
      resolve(ch);
    };
    ch.on('presence', { event: 'sync' }, () => { h.onOnline?.(Object.keys(ch.presenceState()).length); decide(); })
      .on('broadcast', { event: 'chat' }, ({ payload }) => h.onChat(payload))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setTimeout(decide, 1500); // tuyến trống: không có sync nào tới
        else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !decided) {
          decided = true;
          reject(new Error('Không kết nối được máy chủ thời gian thực.'));
        }
      });
  });
}

function createZoneLink({ lobby, line, zoneId, me, handlers, world, cellPx, presenceGapMs }) {
  const nx = Math.max(1, Math.round(world.width / cellPx)), ny = Math.max(1, Math.round(world.height / cellPx));
  const cw = world.width / nx, chh = world.height / ny;
  const wrapI = (i, n) => ((i % n) + n) % n;
  const cellOf = (x, y) => [wrapI(Math.floor(x / cw), nx), wrapI(Math.floor(y / chh), ny)];
  const key = (cx, cy) => `${cx}:${cy}`;
  const cells = new Map(); // key → { ch, retry, timer, alive }
  let home = null; // ô của mình (gửi vị trí + Presence ở đây)
  let closed = false;
  let lastTrack = 0, trackTimer = null;

  const myMeta = () => ({ id: me.id, name: me.name, x: Math.round(me.x), y: Math.round(me.y), look: me.look || null, realm: me.realm || null });
  const joined = (ch) => ch && ch.state === 'joined';

  // Gộp Presence của mọi ô đang nghe → danh sách người ở gần
  let syncTimer = null;
  function emitPresence() {
    if (syncTimer) return;
    syncTimer = setTimeout(() => {
      syncTimer = null;
      const state = {};
      for (const c of cells.values()) if (c.ch) Object.assign(state, c.ch.presenceState());
      handlers.onPresence(state);
    }, 50);
  }

  function openCell(k) {
    const [cx, cy] = k.split(':');
    const c = cells.get(k) || { ch: null, retry: 0, timer: null, alive: true };
    cells.set(k, c);
    const ch = supabase.channel(`cell:${zoneId}:${line}:${cx}:${cy}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
    c.ch = ch;
    ch.on('presence', { event: 'sync' }, emitPresence)
      .on('broadcast', { event: 'move' }, ({ payload }) => handlers.onMove(payload))
      .subscribe((status) => {
        if (!c.alive || c.ch !== ch) return;
        if (status === 'SUBSCRIBED') {
          c.retry = 0;
          if (k === home) trackNow();
          emitPresence();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          // rớt kênh (mạng chập chờn, hoặc máy chủ ngắt vì quá tải): nối lại có giãn cách
          supabase.removeChannel(ch);
          c.ch = null;
          clearTimeout(c.timer);
          c.timer = setTimeout(() => { if (c.alive && !closed) openCell(k); }, RETRY_MS[Math.min(c.retry++, RETRY_MS.length - 1)]);
          emitPresence();
        }
      });
  }
  function closeCell(k) {
    const c = cells.get(k);
    if (!c) return;
    c.alive = false;
    clearTimeout(c.timer);
    if (c.ch) supabase.removeChannel(c.ch);
    cells.delete(k);
  }

  function trackNow() {
    clearTimeout(trackTimer); trackTimer = null;
    const c = cells.get(home);
    if (!joined(c?.ch)) return; // ô chưa vào xong: lúc SUBSCRIBED sẽ tự track
    lastTrack = Date.now();
    c.ch.track(myMeta());
  }
  // Presence có hạn mức mỗi máy: gom nhiều thay đổi (trang bị, cảnh giới) thành 1 lần mỗi presenceGapMs
  function trackSoon() {
    if (trackTimer) return;
    const wait = Math.max(0, presenceGapMs - (Date.now() - lastTrack));
    trackTimer = setTimeout(trackNow, wait);
  }

  // Đổi ô có độ trễ (vào sâu ô mới margin điểm) để đứng ở mép ô không đổi kênh liên tục
  function updateCells(x, y) {
    const [cx, cy] = cellOf(x, y);
    const k = key(cx, cy);
    if (home && k !== home) {
      const [hx, hy] = home.split(':').map(Number);
      const margin = Math.min(cw, chh) * 0.08;
      const wd = (d, size) => ((d + size / 2) % size + size) % size - size / 2; // khoảng cách ngắn nhất qua mép
      const dx = Math.abs(wd(x - (hx + 0.5) * cw, world.width)), dy = Math.abs(wd(y - (hy + 0.5) * chh, world.height));
      if (dx <= cw / 2 + margin && dy <= chh / 2 + margin) return; // còn trong vùng đệm của ô cũ
    }
    if (k === home) return;
    const old = cells.get(home);
    if (old?.ch && joined(old.ch)) old.ch.untrack();
    home = k;
    const want = new Set();
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) want.add(key(wrapI(cx + i, nx), wrapI(cy + j, ny)));
    for (const k2 of [...cells.keys()]) if (!want.has(k2)) closeCell(k2);
    for (const k2 of want) if (!cells.has(k2)) openCell(k2);
    trackNow();
    emitPresence();
  }
  updateCells(me.x, me.y);

  return {
    line,
    sendMove(x, y, moving, flying = false) {
      me.x = x; me.y = y;
      updateCells(x, y);
      const ch = cells.get(home)?.ch;
      if (joined(ch)) ch.send({ type: 'broadcast', event: 'move', payload: { id: me.id, x: Math.round(x), y: Math.round(y), moving, flying, t: Date.now() } });
    },
    // Đổi trang bị đang mặc: người gần thấy qua Presence (chỉ là hình ảnh, mã hình art.*)
    setLook(look) { me.look = look; trackSoon(); },
    // Đổi cảnh giới: chữ trên đầu (chỉ hiển thị, máy nhận tự lọc)
    setRealm(realm) { if (me.realm === realm) return; me.realm = realm; trackSoon(); },
    sendChat(text) {
      if (joined(lobby)) lobby.send({ type: 'broadcast', event: 'chat', payload: { id: me.id, name: me.name, text } });
    },
    async leave() {
      closed = true;
      clearTimeout(trackTimer);
      for (const k of [...cells.keys()]) closeCell(k);
      await supabase.removeChannel(lobby);
    },
  };
}
