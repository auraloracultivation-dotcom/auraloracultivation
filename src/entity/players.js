// Trạng thái người chơi trên màn hình: mình (điều khiển trực tiếp) và người khác (nội suy cho mượt).
export function createLocalPlayer(character) {
  return {
    id: character.user_id,
    name: character.name,
    x: character.x,
    y: character.y,
    facing: 1,
    moving: false,
    walkT: 0,
    chat: null,
    chatUntil: 0,
    isLocal: true,
  };
}

export function createRemotePlayers() {
  const list = new Map();

  function ensure(id, name, x, y) {
    let p = list.get(id);
    if (!p) {
      p = { id, name: name || '…', x, y, tx: x, ty: y, facing: 1, moving: false, walkT: 0, chat: null, chatUntil: 0 };
      list.set(id, p);
    } else if (name) {
      p.name = name;
    }
    return p;
  }

  return {
    list,
    // Đồng bộ danh sách theo Presence: ai rời khu thì xoá
    syncPresence(state, myId) {
      const present = new Set();
      for (const [key, metas] of Object.entries(state)) {
        if (key === myId || !metas.length) continue;
        const m = metas[metas.length - 1];
        present.add(key);
        ensure(key, m.name, m.x, m.y);
      }
      for (const id of list.keys()) if (!present.has(id)) list.delete(id);
    },
    onMove({ id, x, y, moving }) {
      const p = ensure(id, null, x, y);
      if (x !== p.tx) p.facing = x > p.tx ? 1 : -1;
      p.tx = x; p.ty = y; p.moving = moving;
    },
    onChat({ id, text }, now, seconds) {
      const p = list.get(id);
      if (!p) return;
      p.chat = text; p.chatUntil = now + seconds * 1000;
    },
    update(dt) {
      const k = Math.min(1, dt * 8);
      for (const p of list.values()) {
        const dx = p.tx - p.x, dy = p.ty - p.y;
        if (Math.hypot(dx, dy) > 200) { p.x = p.tx; p.y = p.ty; } // lệch quá xa: dịch thẳng tới
        else { p.x += dx * k; p.y += dy * k; }
        const walking = p.moving || Math.hypot(dx, dy) > 1;
        p.walkT = walking ? p.walkT + dt : 0;
      }
    },
  };
}
