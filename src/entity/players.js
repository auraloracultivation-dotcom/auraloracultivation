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
    rig: null, // trạng thái hoạt ảnh nhân vật ghép lớp (rig.js)
    look: null,
  };
}

// Pháp khí người khác gửi qua Presence: chỉ nhận mã hình dạng art.<loại>.<…>, bỏ mọi thứ khác
const LOOK_KEYS = ['outfit', 'weapon', 'wing', 'avatar', 'mask'];
function sanitizeLook(l) {
  if (!l || typeof l !== 'object') return null;
  const out = {};
  for (const k of LOOK_KEYS) if (typeof l[k] === 'string' && /^art\.[a-z]+\.[a-z0-9.-]{1,30}$/.test(l[k])) out[k] = l[k];
  return Object.keys(out).length ? out : null;
}

// worldW/worldH: kích thước thế giới vòng lặp để nội suy đi qua mép không bị kéo ngược cả bản đồ
export function createRemotePlayers(worldW, worldH) {
  const wrap = (d, size) => ((d + size / 2) % size + size) % size - size / 2;
  const list = new Map();

  function ensure(id, name, x, y) {
    let p = list.get(id);
    if (!p) {
      p = { id, name: name || '…', x, y, tx: x, ty: y, facing: 1, moving: false, walkT: 0, chat: null, chatUntil: 0, rig: {}, look: null };
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
        const p = ensure(key, m.name, m.x, m.y);
        p.look = sanitizeLook(m.look);
        p.realm = typeof m.realm === 'string' ? m.realm.slice(0, 48) : null; // chỉ hiển thị
      }
      for (const id of list.keys()) if (!present.has(id)) list.delete(id);
    },
    onMove({ id, x, y, moving, flying }) {
      // chỉ tin người có trong Presence + toạ độ là số (payload broadcast ai cũng gửi được)
      if (!list.has(id) || !Number.isFinite(x) || !Number.isFinite(y)) return;
      const p = ensure(id, null, x, y);
      const dx = wrap(x - p.tx, worldW);
      if (dx) p.facing = dx > 0 ? 1 : -1;
      p.tx = x; p.ty = y; p.moving = moving; p.flying = !!flying;
    },
    onChat({ id, text }, now, seconds) {
      const p = list.get(id);
      if (!p || typeof text !== 'string') return;
      p.chat = text.slice(0, 80); p.chatUntil = now + seconds * 1000;
    },
    update(dt) {
      const k = Math.min(1, dt * 8);
      for (const p of list.values()) {
        const dx = wrap(p.tx - p.x, worldW), dy = wrap(p.ty - p.y, worldH);
        if (Math.hypot(dx, dy) > 200) { p.x = p.tx; p.y = p.ty; } // lệch quá xa: dịch thẳng tới
        else {
          p.x = ((p.x + dx * k) % worldW + worldW) % worldW;
          p.y = ((p.y + dy * k) % worldH + worldH) % worldH;
        }
        const walking = p.moving || Math.hypot(dx, dy) > 1;
        p.walkT = walking ? p.walkT + dt : 0;
      }
    },
  };
}
