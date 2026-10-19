// Điểm khởi động: nối các module lại với nhau. Không chứa luật gameplay chi tiết.
import { loadJSON, startLoop, createScreen, createCamera, followCamera, createInput, drawStick } from './core/index.js';
import * as net from './net/index.js';
import { createMap, drawObstacle } from './map/index.js';
import { createLocalPlayer, createRemotePlayers, drawPlayer, drawLabel } from './entity/index.js';
import { showLogin, showCreateCharacter, showFatal, toast, createHud } from './ui/index.js';

async function boot() {
  const config = await loadJSON('data/config.json');
  const screen = createScreen(document.getElementById('game'));

  let session = await net.getSession();
  if (!session) session = await showLogin({ onSignIn: net.signIn, onSignUp: net.signUp });

  let character = await net.getMyCharacter(session.user.id);
  if (!character) character = await showCreateCharacter({ onCreate: net.createCharacter });

  const zoneDef = await loadJSON(`data/zones/${character.zone_id}.json`);
  const map = createMap(zoneDef);
  const me = createLocalPlayer(character);
  const others = createRemotePlayers();
  const cam = createCamera();
  const input = createInput(screen.canvas);
  const maxPlayers = config.zone.max_players;
  let hud = null;

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
    async onLogout() {
      await saver.flush();
      await zone.leave();
      await net.signOut();
      location.reload();
    },
  });
  hud.setOnline(others.list.size + 1, maxPlayers);
  toast(`Chào mừng ${me.name} đến ${zoneDef.name}`);

  const saver = createSaver(me, config.net.position_save_interval_s);
  const speed = config.player.walk_speed_px_per_s;
  const radius = config.player.radius_px;
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
    followCamera(cam, me, screen, map.width, map.height);
  }

  function render() {
    const { ctx, dpr, scale } = screen;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0f1a14';
    ctx.fillRect(0, 0, screen.canvas.width, screen.canvas.height);
    ctx.imageSmoothingEnabled = false;
    const s = dpr * scale;
    ctx.setTransform(s, 0, 0, s, Math.round(-cam.x * s), Math.round(-cam.y * s));
    ctx.drawImage(map.ground, 0, 0);

    // Vẽ theo chiều sâu: vật ở thấp hơn (y lớn) vẽ sau
    const now = performance.now();
    const people = [me, ...others.list.values()];
    const drawables = [
      ...map.visibleObstacles(cam).map((o) => ({ y: o.y, draw: () => drawObstacle(ctx, o) })),
      ...people.map((p) => ({ y: p.y, draw: () => drawPlayer(ctx, p) })),
    ].sort((a, b) => a.y - b.y);
    for (const d of drawables) d.draw();
    for (const p of people) drawLabel(ctx, p, now);

    drawStick(ctx, input.stick, dpr);
  }

  addEventListener('pagehide', () => saver.flush());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saver.flush(); });
  startLoop(update, render);
}

// Lưu vị trí lên máy chủ: khi bắt đầu đi, định kỳ khi đang đi, và khi dừng.
// Nếu máy chủ từ chối (đi quá nhanh) thì kéo nhân vật về vị trí máy chủ giữ.
function createSaver(me, intervalS) {
  let timer = 0;
  let inFlight = null;
  let pending = false;

  async function save() {
    if (inFlight) { pending = true; return inFlight; }
    const sentX = me.x, sentY = me.y;
    inFlight = net.savePosition(sentX, sentY)
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
