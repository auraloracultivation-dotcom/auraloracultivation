// Vào khu: mỗi khu chia tuyến, mỗi tuyến tối đa maxPlayers người.
// Kênh Realtime: zone:<zoneId>:<tuyến>. Presence = ai đang ở đây; Broadcast = di chuyển, chat.
import { supabase } from './client.js';

export async function joinZone({ zoneId, maxPlayers, maxLines, me, handlers }) {
  for (let line = 1; line <= maxLines; line++) {
    const channel = await tryJoin(`zone:${zoneId}:${line}`, me, handlers, maxPlayers);
    if (channel) return createZoneLink(channel, line, me);
  }
  throw new Error('Tất cả tuyến đều đầy, thử lại sau.');
}

function tryJoin(topic, me, h, maxPlayers) {
  return new Promise((resolve, reject) => {
    const ch = supabase.channel(topic, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });
    let decided = false;

    const decide = async () => {
      if (decided) return;
      decided = true;
      const others = Object.keys(ch.presenceState()).filter((k) => k !== me.id).length;
      if (others >= maxPlayers) {
        await supabase.removeChannel(ch);
        resolve(null);
        return;
      }
      await ch.track({ id: me.id, name: me.name, x: me.x, y: me.y, look: me.look || null, realm: me.realm || null });
      resolve(ch);
    };

    ch.on('presence', { event: 'sync' }, () => {
      h.onPresence(ch.presenceState());
      decide();
    })
      .on('broadcast', { event: 'move' }, ({ payload }) => h.onMove(payload))
      .on('broadcast', { event: 'chat' }, ({ payload }) => h.onChat(payload))
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setTimeout(decide, 1500); // khu trống: không có sync nào tới
        else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') && !decided) {
          decided = true;
          reject(new Error('Không kết nối được máy chủ thời gian thực.'));
        }
      });
  });
}

function createZoneLink(channel, line, me) {
  return {
    line,
    sendMove(x, y, moving, flying = false) {
      channel.send({ type: 'broadcast', event: 'move', payload: { id: me.id, x, y, moving, flying, t: Date.now() } });
    },
    // Đổi trang bị đang mặc: cập nhật Presence để người khác thấy (chỉ là hình ảnh, mã hình art.*)
    setLook(look) {
      me.look = look;
      channel.track({ id: me.id, name: me.name, x: me.x, y: me.y, look, realm: me.realm || null });
    },
    // Đổi cảnh giới: người khác thấy dòng cảnh giới trên đầu (chỉ là chữ hiển thị, máy nhận tự lọc)
    setRealm(realm) {
      if (me.realm === realm) return;
      me.realm = realm;
      channel.track({ id: me.id, name: me.name, x: me.x, y: me.y, look: me.look || null, realm });
    },
    sendChat(text) {
      channel.send({ type: 'broadcast', event: 'chat', payload: { id: me.id, text } });
    },
    async leave() {
      await supabase.removeChannel(channel);
    },
  };
}
