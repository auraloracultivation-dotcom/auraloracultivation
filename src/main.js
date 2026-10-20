// Điểm khởi động: nối các module lại với nhau. Không chứa luật gameplay chi tiết.
import { loadJSON, startLoop, createScreen, createCamera, followCamera, createInput, drawStick } from './core/index.js';
import { createMap, wrapDelta } from './map/index.js';
import { createLocalPlayer, createRemotePlayers, drawPlayer, drawLabel } from './entity/index.js';
import {
  showLoading, showLogin, shouldForgetSession, showCreateCharacter, showNewPassword,
  showConfirm, showFatal, toast, createHud,
} from './ui/index.js';

async function boot() {
  let loading = showLoading('Đang mở cổng Tu Chân giới…');
  loading.set(10);
  // Nạp mạng sau khi màn hình tải đã hiện, để mạng chậm không thấy màn đen
  const net = await import('./net/index.js');
  const config = await loadJSON('data/config.json');
  const screen = createScreen(document.getElementById('game'));
  loading.set(30, 'Kiểm tra đạo tịch…');

  let session = await net.getSession();
  if (session && shouldForgetSession()) { await net.signOut(); session = null; }
  if (session && net.isPasswordRecovery()) {
    loading.hide();
    await showNewPassword({ onSave: net.updatePassword });
    toast('Đã đổi mật khẩu');
    loading = showLoading('Đang vào game…');
  }
  if (!session) {
    loading.hide();
    session = await showLogin({
      onSignIn: net.signIn, onSignUp: net.signUp, onResetPassword: net.requestPasswordReset,
    });
    loading = showLoading('Đang vào game…');
  }
  loading.set(50, 'Tìm nhân vật…');

  let character = await net.getMyCharacter(session.user.id);
  if (!character) {
    loading.hide();
    character = await showCreateCharacter({ onCreate: net.createCharacter });
    loading = showLoading('Nhập thế…');
  }
  loading.set(65, 'Dựng bản đồ…');

  const zoneDef = await loadJSON(`data/zones/${character.zone_id}.json`);
  const [terrainDef, tilesDef] = await Promise.all([loadJSON('data/terrain.json'), loadJSON('data/tiles.json')]);
  const map = await createMap(zoneDef, terrainDef, tilesDef);
  const me = createLocalPlayer(character);
  me.x = map.wrapX(me.x); me.y = map.wrapY(me.y);
  const others = createRemotePlayers(map.width, map.height);
  const cam = createCamera();
  const input = createInput(screen.canvas);
  const maxPlayers = config.zone.max_players;
  let hud = null;
  loading.set(80, 'Kết nối đạo hữu trong khu…');

  const zone = await net.joinZone({
    zoneId: zoneDef.id,
    maxPlayers,
    maxLines: config.zone.max_lines,
    me: { id: me.id, name: me.name, x: me.x, y: me.y },
    handlers: {
      onPresence(state) {
        others.syncPresence(state, me.id);
        hud?.setOnline(Object.keys(state).length, maxPlayers);
      },
      onMove: (p) => others.onMove(p),
      onChat: (p) => others.onChat(p, performance.now(), config.net.chat_bubble_s),
    },
  });

  hud = createHud({
    zoneName: zoneDef.name,
    line: zone.line,
    maxChars: config.net.chat_max_chars,
    onChat(text) {
      me.chat = text;
      me.chatUntil = performance.now() + config.net.chat_bubble_s * 1000;
      zone.sendChat(text);
    },
    async onSettings() {
      if (!(await showConfirm('Rời Tu Chân giới', 'Thoát game và đăng xuất?'))) return;
      await saver.flush();
      await zone.leave();
      await net.signOut();
      location.reload();
    },
  });
  hud.setOnline(others.list.size + 1, maxPlayers);
  loading.set(100, 'Hoàn tất');
  setTimeout(() => loading.hide(), 300);
  toast(`Chào mừng ${me.name} đến ${zoneDef.name}`);

  const saver = createSaver(me, config.net.position_save_interval_s, net.savePosition);
  const speed = config.player.walk_speed_px_per_s;
  const radius = config.player.radius_px;
  const sprite = config.player.sprite_scale;
  const sendEvery = 1 / config.net.position_broadcast_hz;
  let sendTimer = 0;

  function update(dt) {
    const dir = input.getMove();
    const wasMoving = me.moving;
    me.moving = dir.x !== 0 || dir.y !== 0;
    if (me.moving) {
      if (!wasMoving) saver.saveNow(); // mốc thời gian mới cho máy chủ trước khi đi
      if (dir.x) me.facing = dir.x > 0 ? 1 : -1;
      map.move(me, dir.x * speed * dt, dir.y * speed * dt, radius);
      me.walkT += dt;
      sendTimer += dt;
      if (sendTimer >= sendEvery) { sendTimer = 0; zone.sendMove(me.x, me.y, true); }
    } else {
      me.walkT = 0;
      if (wasMoving) { zone.sendMove(me.x, me.y, false); saver.saveNow(); sendTimer = sendEvery; }
    }
    saver.tick(dt, me.moving);
    others.update(dt);
    followCamera(cam, me, screen, map.width, map.height, zoneDef.wrap);
  }

  function render() {
    const { ctx, dpr, scale } = screen;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1a14';
    ctx.fillRect(0, 0, screen.canvas.width, screen.canvas.height);
    ctx.imageSmoothingEnabled = false;
    const s = dpr * scale;
    ctx.setTransform(s, 0, 0, s, Math.round(-cam.x * s), Math.round(-cam.y * s));
    ctx.imageSmoothingEnabled = true; // ô đất vẽ ở độ phân giải cao, thu nhỏ mượt
    map.drawGround(ctx, cam);
    ctx.imageSmoothingEnabled = false;

    // Người khác vẽ ở vị trí gần mình nhất trên thế giới vòng lặp; thấp hơn (y lớn) vẽ sau
    const now = performance.now();
    const people = [me, ...[...others.list.values()].map((p) => ({
      ...p,
      x: me.x + wrapDelta(p.x - me.x, map.width),
      y: me.y + wrapDelta(p.y - me.y, map.height),
    }))].sort((a, b) => a.y - b.y);
    for (const p of people) drawPlayer(ctx, p, sprite);
    for (const p of people) drawLabel(ctx, p, now, sprite);

    drawStick(ctx, input.stick, dpr);
  }

  // Chế độ thử (?debug): dịch chuyển để soi bản đồ. Chỉ phía máy khách — máy chủ vẫn từ chối vị trí sai.
  if (new URLSearchParams(location.search).has('debug')) {
    window.__tp = (x, y) => { me.x = map.wrapX(x); me.y = map.wrapY(y); };
    window.__me = () => ({ x: me.x, y: me.y });
  }

  addEventListener('pagehide', () => saver.flush());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saver.flush(); });
  startLoop(update, render);
}

// Lưu vị trí lên máy chủ: khi bắt đầu đi, định kỳ khi đang đi, và khi dừng.
// Nếu máy chủ từ chối (đi quá nhanh) thì kéo nhân vật về vị trí máy chủ giữ.
function createSaver(me, intervalS, savePosition) {
  let timer = 0;
  let inFlight = null;
  let pending = false;

  async function save() {
    if (inFlight) { pending = true; return inFlight; }
    const sentX = me.x, sentY = me.y;
    inFlight = savePosition(sentX, sentY)
      .then((row) => {
        if (row && Math.hypot(row.x - sentX, row.y - sentY) > 2) {
          me.x = row.x; me.y = row.y;
          toast('Vị trí được máy chủ điều chỉnh');
        }
      })
      .catch((e) => console.warn('Lưu vị trí lỗi', e))
      .finally(() => {
        inFlight = null;
        if (pending) { pending = false; save(); }
      });
    return inFlight;
  }

  return {
    saveNow() { timer = 0; save(); },
    tick(dt, moving) {
      if (!moving) return;
      timer += dt;
      if (timer >= intervalS) { timer = 0; save(); }
    },
    flush: () => save(),
  };
}

boot().catch((e) => {
  console.error(e);
  showFatal(e.message || String(e));
});
