// Điểm khởi động: nối các module lại với nhau. Không chứa luật gameplay chi tiết.
import { loadJSON, startLoop, createScreen, createCamera, followCamera, createInput, drawStick } from './core/index.js';
import { createMap, wrapDelta } from './map/index.js';
import { createLocalPlayer, createRemotePlayers, drawPlayer, drawLabel, drawSlash, setTextScale, loadRig, rigAttack, artInfo, renderPortrait, avatarFx } from './entity/index.js';
import { createAudio } from './audio/index.js';
import { createPhapTuong } from './combat/index.js';
import { createGameplay } from './game/index.js';

// Luôn lấy code mới nhất (xem sw.js) — tránh lẫn code cũ với dữ liệu mới sau mỗi lần cập nhật
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
import {
  showLoading, showLogin, shouldForgetSession, showCreateCharacter, showNewPassword,
  showConfirm, showFatal, toast, createHud, showCharacterPanel, showSettings, showWorldMap, drawRoundMap, createStatsDock, enableFastTap,
  showBag, loadSettings, createTestBag,
} from './ui/index.js';

async function boot() {
  let loading = showLoading('Đang mở cổng Tu Chân giới…');
  loading.set(10);
  // Nạp mạng sau khi màn hình tải đã hiện, để mạng chậm không thấy màn đen
  // ?offline: chơi thử một mình không cần mạng (src/net/offline.js) — để thử luật chơi và kiểm thử tự động
  const net = await import(new URLSearchParams(location.search).has('offline') ? './net/offline.js' : './net/index.js');
  const config = await loadJSON('data/config.json');
  const screen = createScreen(document.getElementById('game'), config.camera?.zoom || 1);
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
  loading.set(72, 'Nạp trang bị…');
  const [itemsDef, codesDef, , audioDef, ptDef] = await Promise.all([loadJSON('data/items/items.json'), loadJSON('data/codes.json'),
    loadRig(loadJSON), loadJSON('data/audio.json'), loadJSON('data/skills/phap-tuong.json')]);
  const audio = createAudio(audioDef, loadSettings()); // tiếng chỉ phát sau lần chạm đầu (luật trình duyệt)
  audio.music('bgm.tuchan');
  const pt = createPhapTuong(ptDef); // kỹ năng Pháp tướng: đeo rồi phải bấm mới hiện, hiện thì hao linh lực
  avatarFx(ptDef);
  const me = createLocalPlayer(character);
  me.rig = {};
  const bag = createTestBag(character.user_id, itemsDef.items);
  const lookNow = () => { // đồ đang mặc + pháp tướng (chỉ khi kỹ năng đang bật)
    const l = { ...bag.look() }, av = bag.equippedItem('phap-tuong');
    if (pt.active && av) l.avatar = av.art;
    return Object.keys(l).length ? l : null;
  };
  me.look = lookNow();
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
    me: { id: me.id, name: me.name, x: me.x, y: me.y, look: me.look },
    handlers: {
      onPresence(state) {
        const hadAv = new Map([...others.list].map(([id, p]) => [id, !!p.look?.avatar]));
        others.syncPresence(state, me.id);
        for (const [id, p] of others.list) { // đạo hữu gần mình vừa hoá pháp tướng → nghe nhỏ hơn
          const near = Math.hypot(wrapDelta(p.x - me.x, map.width), wrapDelta(p.y - me.y, map.height)) < audioDef.remote_sfx_range_px;
          if (p.look?.avatar && hadAv.get(id) === false && near) audio.play(ptDef.sound, audioDef.remote_sfx_volume);
        }
        hud?.setOnline(Object.keys(state).length, maxPlayers);
      },
      onMove: (p) => others.onMove(p),
      onChat: (p) => {
        others.onChat(p, performance.now(), config.net.chat_bubble_s);
        hud?.addChatLine(others.list.get(p.id)?.name || 'Đạo hữu', p.text);
      },
    },
  });

  const realmName = character.realm > 0 ? `Cảnh giới ${character.realm}` : 'Phàm nhân'; // tạm, chờ dữ liệu cảnh giới
  const drawMe = (ctx) => drawPlayer(ctx, { x: 0, y: 0, facing: 1, walkT: 0, isLocal: true }, 1); // ảnh đại diện lúc mới vào (trước khi nạp chân dung)
  const SLOT_ORDER = ['mat-na', 'trang-phuc', 'vu-khi', 'nhan', 'canh', 'phap-tuong', 'linh-thu', 'day-chuyen']; // thứ tự ô bảng Nhân vật
  const S = (n) => `assets/ui/skills/${n}.png`;
  const fan = (deg, r = 122) => ({ dx: Math.round(Math.cos((deg * Math.PI) / 180) * r), dy: -Math.round(Math.sin((deg * Math.PI) / 180) * r) });
  const markers = () => [{ x: me.x, y: me.y, self: true }, ...[...others.list.values()].map((p) => ({ x: p.x, y: p.y }))];

  let game = null; // luật chơi thử nghiệm: quái, chiến đấu, tu vi, nhiệm vụ (src/game)
  function attack() { if (game.attack()) swing(); }
  function swing() {
    if (me.look?.outfit || me.look?.weapon) rigAttack(me); // nhân vật ghép lớp: đưa tay (và xoay kiếm nếu có)
    if (me.look?.weapon) audio.play('sfx.kiem.chem'); // tiếng kiếm 0,1 giây lúc chém ra
    if (!me.look?.weapon) me.slashT = 0.22; // tay không: vẫn có vệt chém nhỏ
  }
  // Mã quà tặng: so dấu SHA-256 với data/codes.json (mã gốc không nằm trong mã nguồn)
  async function redeemCode(code) {
    const hex = await sha256(code.trim().toLowerCase());
    const c = codesDef.codes.find((x) => x.sha256 === hex);
    if (!c) throw new Error('Mã không đúng hoặc đã hết hạn.');
    const n = bag.grantAll();
    return `${c.message}: ${n} vật phẩm vào Kho`;
  }

  const setLook = () => { me.look = lookNow(); zone.setLook(me.look); refreshAvatar(); };
  let stopPtSound = null;
  const PT_MSG = { 'no-avatar': 'Chưa đeo pháp tướng (Kho → Trang bị)', cooldown: 'Pháp tướng đang hồi', 'no-mp': 'Linh lực không đủ để hoá hình' };
  function phapTuongOff(msg) {
    stopPtSound?.(); stopPtSound = null; // thu lại giữa chừng: tắt dần tiếng hoá hình
    hud.setActive('phap-tuong', false); setLook();
    if (msg) toast(msg, 1600);
  }
  function onLookChanged() { // đồ trên người đổi từ bảng Tu luyện
    if (pt.active && !bag.equippedItem('phap-tuong')) { pt.cancel(); phapTuongOff(); } else setLook();
  }
  function usePhapTuong() {
    const r = pt.toggle(!!bag.equippedItem('phap-tuong'));
    if (r === 'off') return phapTuongOff();
    if (r !== 'on') return toast(PT_MSG[r], 1400);
    stopPtSound = audio.play(ptDef.sound);
    hud.setActive('phap-tuong', true); setLook();
  }

  async function logout() {
    if (!(await showConfirm('Đăng xuất', 'Rời Tu Chân giới và đăng xuất?', { yes: 'Đăng xuất' }))) return;
    await saver.flush();
    await zone.leave();
    await net.signOut();
    location.reload();
  }

  hud = createHud({
    zoneName: zoneDef.name,
    line: zone.line,
    maxChars: config.net.chat_max_chars,
    player: { name: me.name, realmName, drawAvatar: drawMe },
    onChat(text) {
      me.chat = text;
      me.chatUntil = performance.now() + config.net.chat_bubble_s * 1000;
      zone.sendChat(text);
      hud.addChatLine(me.name, text, true);
    },
    onOpenCharacter() {
      showCharacterPanel({
        name: me.name, realmName: game.realmName(), portrait: () => ({ full: renderPortrait(me.look), body: renderPortrait(me.look, { body: true }) }),
        equipment: SLOT_ORDER.map((sl) => { const it = bag.equippedItem(sl); return it && { name: it.name, icon: artInfo(it.art)?.file }; }),
      });
    },
    onSettings() { showSettings({ onLogout: logout, onRedeem: redeemCode, onChange: (st) => audio.apply(st) }); },
    onOpenBag() {
      showBag({
        categories: itemsDef.categories, getEntries: () => [...bag.entries(), ...game.bagEntries()], isEquipped: bag.isEquipped,
        thumb: (it) => it.icon || artInfo(it.art)?.file || '', note: 'Đồ thử nghiệm: chỉ lưu trên máy này, chưa lưu máy chủ.',
        onUse: (it) => game.onBagUse(it),
        onToggle(it) {
          bag.toggle(it); game.onBagEquip(it);
          if (pt.active && !bag.equippedItem('phap-tuong')) { pt.cancel(); phapTuongOff(); } else setLook(); // tháo pháp tướng → thu lại
        },
      });
    },
    onBreakthrough: () => game.breakthrough(),
    onMenu(id) {
      if (id === 'quests') game.openQuests();
      else if (id === 'skills') game.openCultivate();
      else return false;
      return true;
    },
    onOpenMap() {
      showWorldMap({
        zoneName: zoneDef.name,
        draw: (off, radiusTiles) => map.drawMinimap(off, me.x, me.y, radiusTiles, markers()),
      });
    },
    // Bộ kỹ năng hình quạt (yêu cầu chủ dự án 2026-10-20). dx/dy tính từ tâm nút Tấn công; chưa có hệ thống → khoá.
    actions: [
      { id: 'attack', name: 'Đánh thường', icon: S('tan-cong'), dx: 0, dy: 0, size: 96, onUse: () => attack() },
      // vòng quạt 4 kỹ năng (từ trái lên trên)
      { id: 'kiem-khi', name: 'Kiếm khí', icon: S('kiem-khi'), ...fan(184), size: 60, locked: true, lockedHint: 'mở ở Trúc Cơ', onUse: () => game.skill('kiem-khi') },
      { id: 'linh-thu', name: 'Kỹ năng linh thú', icon: S('linh-thu'), ...fan(151), size: 60, locked: true, lockedHint: 'mở ở Kết Đan', onUse: () => game.skill('linh-thu') },
      { id: 'phap-tuong', name: 'Kỹ năng pháp tướng', icon: S('phap-tuong'), ...fan(118), size: 60, onUse: () => usePhapTuong() },
      { id: 'khong-che', name: 'Khống chế (Trúc Cơ)', icon: S('khong-che'), ...fan(85), size: 60, locked: true, lockedHint: 'mở ở Trúc Cơ', onUse: () => game.skill('khong-che') },
      // bên trái bộ kỹ năng
      { id: 'nguyen-anh', name: 'Nguyên Anh: tấn công diện rộng', icon: S('nguyen-anh'), dx: -200, dy: -66, size: 54, locked: true, lockedHint: 'mở ở Nguyên Anh', onUse: () => game.skill('nguyen-anh') },
      { id: 'dan-duoc', name: 'Đan dược trị thương', icon: S('dan-duoc'), dx: -200, dy: 4, size: 54, onUse: () => game.healPill() },
      // phía trên: Lướt + Bay/Chạy song song, trên cùng: Tự động
      { id: 'luot', name: 'Lướt', icon: S('luot'), dx: -92, dy: -192, size: 50, locked: true, lockedHint: 'mở ở Kết Đan', onUse: () => game.skill('luot') },
      {
        id: 'bay', name: 'Bay', icons: [S('bay'), S('chay')], names: ['Bay', 'Chạy bộ'], dx: -34, dy: -200, size: 50,
        onUse: (state) => { // hiện chỉ là hình ảnh, chưa đổi tốc độ / va chạm
          me.flying = state === 1;
          if (!me.flying && !map.canStand(me.x, me.y, radius)) { // đang trên nước/núi: chưa hạ được
            me.flying = true; toast('Không thể hạ xuống ở đây', 1400); return 'keep';
          }
          zone.sendMove(me.x, me.y, me.moving, me.flying);
          toast(me.flying ? 'Ngự khí phi hành' : 'Hạ xuống mặt đất', 1200);
        },
      },
      { id: 'auto', name: 'Tự động đánh', icon: S('auto'), dx: 26, dy: -192, size: 50, onUse: () => game.toggleAuto() }, // cùng hàng Lướt, sát phải
    ],
  });
  hud.setOnline(others.list.size + 1, maxPlayers);
  const refreshAvatar = () => hud.setPortrait(renderPortrait(me.look, { body: true }));
  refreshAvatar();
  loading.set(90, 'Thả yêu thú vào rừng…');
  game = await createGameplay({ loadJSON, map, me, hud, pt, toast, audio, userId: me.id, bag, onLook: () => onLookChanged(), onRealm: (r) => zone.setRealm(r) });
  me.onAutoSwing = swing;
  const dock = createStatsDock({ getValue: (id) => game.statValue(id) });
  game.setDock(dock);
  enableFastTap(); // nút bấm được cả khi tay kia đang giữ cần điều khiển
  let targetId = null; // đạo hữu đang được chọn (chạm vào nhân vật bằng tay phải)
  let shownMp = -1;
  let miniTimer = 0;
  window.addEventListener('keydown', (e) => { // máy tính: phím cách = tấn công
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === 'Space') { e.preventDefault(); attack(); }
    const k = { Digit1: 'kiem-khi', Digit2: 'khong-che', Digit3: 'linh-thu', Digit4: 'luot', Digit5: 'nguyen-anh' }[e.code]; // phím tắt máy tính
    if (k) document.querySelector(`[data-act="${k}"]`)?.dispatchEvent(new PointerEvent('pointerdown'));
    if (e.code === 'KeyQ') game.healPill();
  });
  loading.set(100, 'Hoàn tất');
  setTimeout(() => loading.hide(), 300);
  toast(`Chào mừng ${me.name} đến ${zoneDef.name}`);

  const saver = createSaver(me, config.net.position_save_interval_s, net.savePosition);
  const speed = config.player.walk_speed_px_per_s;
  const flySpeed = config.player.fly_speed_px_per_s || speed;
  const radius = config.player.radius_px;
  const sprite = config.player.sprite_scale;
  const sendEvery = 1 / config.net.position_broadcast_hz;
  let sendTimer = 0;

  function update(dt) {
    const dir = game.dead ? { x: 0, y: 0 } : input.getMove(); // trọng thương: đứng yên chờ hồi phục
    const wasMoving = me.moving;
    me.moving = dir.x !== 0 || dir.y !== 0;
    if (me.moving) {
      if (!wasMoving) saver.saveNow(); // mốc thời gian mới cho máy chủ trước khi đi
      if (dir.x) me.facing = dir.x > 0 ? 1 : -1;
      const v = me.flying ? flySpeed : game.speed() || speed; // Lướt: nhanh hơn nhưng vẫn dưới max_speed máy chủ
      map.move(me, dir.x * v * dt, dir.y * v * dt, radius, !!me.flying);
      me.walkT += dt;
      sendTimer += dt;
      if (sendTimer >= sendEvery) { sendTimer = 0; zone.sendMove(me.x, me.y, true, me.flying); }
    } else {
      me.walkT = 0;
      if (wasMoving) { zone.sendMove(me.x, me.y, false, me.flying); saver.saveNow(); sendTimer = sendEvery; }
    }
    saver.tick(dt, me.moving);
    if (pt.tick(dt) === 'empty') phapTuongOff('Linh lực cạn — pháp tướng tan biến');
    const mpNow = Math.round(pt.mp);
    if (mpNow !== shownMp) { shownMp = mpNow; hud.setBar('mp', mpNow, pt.max); }
    game.update(dt);
    others.update(dt);
    for (const tap of input.takeTaps()) { // chạm vào nhân vật khác → chọn / bỏ chọn
      const wx = cam.x + tap.x / screen.scale, wy = cam.y + tap.y / screen.scale;
      if (game.tap(wx, wy)) continue; // chạm trúng quái → chọn quái
      let best = null, bestD = 22;
      for (const p of others.list.values()) {
        const px = me.x + wrapDelta(p.x - me.x, map.width), py = me.y + wrapDelta(p.y - me.y, map.height) - 12 * sprite;
        const d = Math.hypot(px - wx, py - wy);
        if (d < bestD) { best = p; bestD = d; }
      }
      targetId = best ? (best.id === targetId ? null : best.id) : null;
      if (best && targetId) toast(`Chọn: ${best.name}`, 1000);
    }
    if (targetId && !others.list.has(targetId)) targetId = null;
    if (me.slashT > 0) me.slashT -= dt;
    miniTimer -= dt;
    if (miniTimer <= 0) {
      miniTimer = 0.25;
      drawRoundMap(hud.miniCanvas, (off) => map.drawMinimap(off, me.x, me.y, 40, markers()));
      dock.refresh();
    }
    followCamera(cam, me, screen, map.width, map.height, zoneDef.wrap);
  }

  function render() {
    const { ctx, dpr, scale } = screen;
    setTextScale(screen.textScale);
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
    const tgt = targetId && people.find((p) => p.id === targetId);
    if (tgt) { // vòng chọn mục tiêu dưới chân
      ctx.save();
      ctx.strokeStyle = '#ffd36a'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.6 + Math.sin(now / 180) * 0.3;
      ctx.beginPath(); ctx.ellipse(tgt.x, tgt.y + 1, 9 * sprite + 2, 4 * sprite + 1, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    game.renderBelow(ctx, now); // quái + linh thú (hình tạm)
    for (const p of people) drawPlayer(ctx, p, sprite);
    if (!me.look?.weapon) drawSlash(ctx, me, sprite);
    for (const p of people) drawLabel(ctx, p, now, sprite);
    game.renderAbove(ctx, now); // tên/máu quái, số sát thương, kiếm khí

    drawStick(ctx, input.stick, dpr);
  }

  // Chế độ thử (?debug): dịch chuyển để soi bản đồ. Chỉ phía máy khách — máy chủ vẫn từ chối vị trí sai.
  if (new URLSearchParams(location.search).has('debug')) {
    window.__tp = (x, y) => { me.x = map.wrapX(x); me.y = map.wrapY(y); };
    window.__me = () => ({ x: me.x, y: me.y });
    window.__game = game; // kiểm thử tự động
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

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

boot().catch((e) => {
  console.error(e);
  showFatal(e.message || String(e));
});
