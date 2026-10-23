// Điểm khởi động: nối các module lại với nhau. Không chứa luật gameplay chi tiết.
import { loadJSON, startLoop, createScreen, createCamera, followCamera, createInput, drawStick, createSaver, sha256 } from './core/index.js';
import { createMap, wrapDelta } from './map/index.js';
import { createLocalPlayer, createRemotePlayers, drawPlayer, drawLabel, drawSlash, setTextScale, loadRig, rigAttack, artInfo, renderPortrait, avatarFx, iconUrl } from './entity/index.js';
import { createAudio } from './audio/index.js';
import { createPhapTuong } from './combat/index.js';
import { createGameplay, createRankReporter, createFlight, hudActions, createNavi, createQuickPill, createStations } from './game/index.js';

// Luôn lấy code mới nhất (xem sw.js) — tránh lẫn code cũ với dữ liệu mới sau mỗi lần cập nhật
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
import {
  showLoading, showLogin, shouldForgetSession, showCreateCharacter, showNewPassword,
  showConfirm, showFatal, toast, createHud, showCharacterPanel, showSettings, showWorldMap, drawRoundMap, createStatsDock, enableFastTap,
  showBag, showItemActions, showSlotPicker, loadSettings, createTestBag, showLeaderboard, showToaHoa, showSpar,
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
  net.syncServerTime(); // lịch Âm Hư theo giờ máy chủ (không chờ)

  const zoneDef = await loadJSON(`data/zones/${character.zone_id}.json`);
  const [terrainDef, tilesDef] = await Promise.all([loadJSON('data/terrain.json'), loadJSON('data/tiles.json')]);
  const [art, stArt] = await Promise.all([loadJSON('data/art/sprites.json'), loadJSON('data/art/stations-art.json')]); // + hình trận nhãn (tools/station_slice.py)
  const map = await createMap(zoneDef, terrainDef, tilesDef, { ...art, props: { ...art.props, ...stArt.props } });
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
  let game = null, dock = null, navi = null, pills = null, stations = null; // luật chơi thử nghiệm: quái, chiến đấu, tu vi, nhiệm vụ (src/game)
  const hasAvatar = () => !!(bag.equippedItem('phap-tuong') || game?.forgedLook().avatar);
  const lookNow = () => { // đồ đang mặc + pháp tướng (chỉ khi kỹ năng đang bật)
    const forged = game?.forgedLook() || {}; // đồ luyện từ phôi đang mặc
    const l = { ...bag.look(), ...forged }, av = bag.equippedItem('phap-tuong')?.art || forged.avatar;
    delete l.avatar;
    if (pt.active && av) l.avatar = av;
    return Object.keys(l).length ? l : null;
  };
  me.look = lookNow();
  const gift = bag.starterGift(); // tân thủ: thông báo bộ trang phục vừa nhận
  me.x = map.wrapX(me.x); me.y = map.wrapY(me.y);
  ({ x: me.x, y: me.y } = map.nearestStand(me.x, me.y, config.player.radius_px)); // đứng kẹt trong gốc cây / hào nước → bước ra
  const others = createRemotePlayers(map.width, map.height);
  const cam = createCamera();
  const input = createInput(screen.canvas);
  const maxPlayers = config.zone.max_players;
  let hud = null;
  let onlineN = 1;
  loading.set(80, 'Kết nối đạo hữu trong khu…');

  const zone = await net.joinZone({
    zoneId: zoneDef.id,
    maxPlayers,
    maxLines: config.zone.max_lines,
    me: { id: me.id, name: me.name, x: me.x, y: me.y, look: me.look },
    world: { width: map.width, height: map.height },
    cellPx: config.net.cell_px,
    presenceGapMs: config.net.presence_gap_ms,
    handlers: {
      onOnline: (n) => { onlineN = n; hud?.setOnline(n, maxPlayers); }, // cả tuyến (kênh sảnh)
      onPresence(state) {
        const hadAv = new Map([...others.list].map(([id, p]) => [id, !!p.look?.avatar]));
        others.syncPresence(state, me.id);
        for (const [id, p] of others.list) { // đạo hữu gần mình vừa hoá pháp tướng → nghe nhỏ hơn
          const near = Math.hypot(wrapDelta(p.x - me.x, map.width), wrapDelta(p.y - me.y, map.height)) < audioDef.remote_sfx_range_px;
          if (p.look?.avatar && hadAv.get(id) === false && near) audio.play(ptDef.sound, audioDef.remote_sfx_volume);
        }
      },
      onMove: (p) => others.onMove(p),
      onChat: (p) => {
        others.onChat(p, performance.now(), config.net.chat_bubble_s);
        hud?.addChatLine(others.list.get(p.id)?.name || (typeof p.name === 'string' ? p.name.slice(0, 16) : 'Đạo hữu'), p.text);
      },
    },
  });

  const realmName = character.realm > 0 ? `Cảnh giới ${character.realm}` : 'Phàm nhân'; // tạm, chờ dữ liệu cảnh giới
  const drawMe = (ctx) => drawPlayer(ctx, { x: 0, y: 0, facing: 1, walkT: 0, isLocal: true }, 1); // ảnh đại diện lúc mới vào (trước khi nạp chân dung)
  const SLOT_ORDER = ['mat-na', 'trang-phuc', 'vu-khi', 'nhan', 'canh', 'phap-tuong', 'linh-thu', 'day-chuyen']; // thứ tự ô bảng Nhân vật
  const S = (n) => `assets/ui/skills/${n}.png`;
  const markers = () => [...(game?.markers() || []), { x: me.x, y: me.y, self: true }, ...[...others.list.values()].map((p) => ({ x: p.x, y: p.y }))];

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
    const n = bag.grantAll() + (c.grant === 'full' ? game.grantFull(c.gift) : c.grant === 'god' ? game.grantGod(c.gift) : c.grant === 'hopnhat' ? game.grantHopNhat(c.gift) : 0); // 'full': nguyên liệu, đan, phôi, tiền · 'god': đồ 10 dòng Đen + thú Âm Hư
    return `${c.message}: ${n} vật phẩm vào Kho`;
  }

  const setLook = () => { me.look = lookNow(); zone.setLook(me.look); refreshAvatar(); };
  let stopPtSound = null;
  const PT_MSG = { 'no-avatar': 'Chưa đeo pháp tướng (Kho → Trang bị)', cooldown: 'Pháp tướng đang hồi', 'no-mp': 'Linh lực không đủ để hoá hình' };
  function phapTuongOff(msg) {
    stopPtSound?.(); stopPtSound = null; // thu lại giữa chừng: tắt dần tiếng hoá hình
    setLook();
    if (msg) toast(msg, 1600);
  }
  // Bảng Nhân vật: ô có đồ → Tháo / Thức tỉnh / Phân rã / Vứt; ô trống → bảng ngang chọn đồ trong kho. Đổi xong vẽ lại bảng.
  let closeChar = null;
  function openCharacter() {
    closeChar?.();
    const reopen = () => setTimeout(openCharacter, 200);
    closeChar = showCharacterPanel({
      name: me.name, realmName: game.realmName(), portrait: () => ({ full: renderPortrait(me.look), body: renderPortrait(me.look, { body: true }) }),
      equipment: SLOT_ORDER.map((sl) => { const it = game.slotItem(sl); return it && { name: it.name, icon: it.thumb }; }),
      onSlot: (i) => showItemActions({ getItem: () => game.slotItem(SLOT_ORDER[i]), onAction: (it, a) => { game.itemAction(it.key, a); reopen(); } }),
      onEmpty: (i, slotName) => showSlotPicker({ title: `Chọn ${slotName}`, items: game.slotCandidates(SLOT_ORDER[i]),
        onPick: (key) => { game.itemAction(key, 'equip'); reopen(); } }),
    });
  }
  const BAG_IC = () => ({ 'tat-ca': 'assets/ui/icons/tui-do.png', 'linh-duoc': iconUrl('item.thao.linh-chi-non.001'), 'linh-dan': iconUrl('item.dan.tieu-hoi-huyet.001'), 'dan-phuong': iconUrl('item.danphuong.truc-co.001'),
    'phap-khi': 'assets/ui/icons/tan-cong.png', 'cong-phap': iconUrl('item.congphap.tamphap.luyen-khi.001'), 'trang-bi': 'assets/ui/icons/nguoi.png', 'thu-cung': S('linh-thu'),
    'phap-bao': iconUrl('item.phapbao.phoi.001'), 'than-phu': iconUrl('card.phu.lien-thanh'), khac: iconUrl('item.khoang.huyen-thiet.001') }); // icon mục Kho (atlas nạp xong mới có)
  const openBag = (tab) => showBag({ tab, tabIcons: Object.fromEntries(Object.entries(BAG_IC()).filter(([, v]) => v)), onShop: () => game.openShop(), categories: itemsDef.categories, getEntries: () => game.bagEntries(), wallet: () => game.wallet.list(), note: 'Đồ thử nghiệm: chỉ lưu trên máy này, chưa lưu máy chủ.',
    onAction: (it, a) => game.itemAction(it.key, a) }); // Sử dụng / Tháo / Thức tỉnh / Phân rã / Vứt / Dùng / Luyện
  function onLookChanged() { // đồ trên người đổi từ bảng Tu luyện
    if (pt.active && !hasAvatar()) { pt.cancel(); phapTuongOff(); } else setLook();
  }
  function usePhapTuong() {
    if (game.dead) return toast('Linh hồn không dùng được kỹ năng', 1200);
    const r = pt.toggle(hasAvatar());
    if (r === 'off') return phapTuongOff();
    if (r !== 'on') return toast(PT_MSG[r], 1400);
    stopPtSound = audio.play(ptDef.sound);
    setLook(); // ô kỹ năng tự sáng viền khi pháp tướng đang hiện (skillbar.js)
  }
  async function recall() { // thoát kẹt (cây đá vây kín, vị trí lỗi): máy chủ đưa về trận pháp giữa thành
    if (!(await showConfirm('Về Thanh Vân Thành', 'Dịch chuyển về trận pháp giữa thành?', { yes: 'Về thành' }))) return;
    try { const row = await net.respawnAtTown(); if (row) { me.x = row.x; me.y = row.y; } else ({ x: me.x, y: me.y } = map.nearestStand(map.width / 2, map.height / 2 + 30, radius, 30)); }
    catch (e) { toast('Chưa về được, thử lại sau'); return; }
    me.flying = false; hud.setToggle('bay', 0); zone.sendMove(me.x, me.y, false, false); toast('Đã về Thanh Vân Thành');
  }

  // Tọa hóa → chuyển thế: xoá tiến trình + Kho trên máy, đưa về trận pháp giữa thành, tải lại (bắt đầu lại từ Luyện Khí 1)
  async function rebirth() {
    game.reincarnate(); bag.wipe();
    try { const row = await net.respawnAtTown(); if (row) { me.x = row.x; me.y = row.y; } await saver.flush(); } catch (e) { console.warn('Về thành lỗi', e); }
    location.reload();
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
    onOpenCharacter: () => openCharacter(),
    onSettings() { showSettings({ onLogout: logout, onRedeem: redeemCode, onChange: (st) => audio.apply(st), onRecall: recall }); },
    onOpenBag: () => openBag(),
    onBreakthrough: () => game.breakthrough(),
    onMenu(id) {
      if (id === 'quests') game.openQuests();
      else if (id === 'skills') game.openCodex(); // nút sách = Đồ giám (Tu luyện vẫn mở ở Lò luyện đan / Tế đàn trong thành)
      else if (id === 'sect') game.openShop(); // Vạn Bảo Lâu (chỉ mở trong Thanh Vân Thành)
      else if (id === 'rank') showLeaderboard({ myId: me.id, fetchBoard: (k) => net.fetchLeaderboard(k), fetchMine: (k) => net.fetchMyRank(k, me.id), myLook: me.look, portrait: (look) => { try { return renderPortrait(look, { body: true, zoom: 2 }).toDataURL(); } catch { return null; } }, // Bảng xếp hạng
        onSpar: (r, img, mine) => showSpar({ a: { name: me.name, sub: game.realmName(), img: mine }, b: { name: r.name, sub: r.stage_name, img }, run: () => game.spar(r.stats) }) }); // luận bàn
      else return false;
      return true;
    },
    onOpenMap() {
      showWorldMap({
        zoneName: zoneDef.name,
        draw: (off, radiusTiles) => map.drawMinimap(off, me.x, me.y, radiusTiles, markers()),
      });
    },
    onStats: () => dock?.openFull(), // nút Nhân Vật: bảng chỉ số đầy đủ
    onTreasure: () => game?.skill('phap-bao'), // nút Pháp Bảo: dùng pháp bảo đang đeo
    onCards: () => openBag('than-phu'), // nút Thần Phù: gắn phù (Thần Phù là bị động, đổi cách đạn bay)
    onShop: () => game?.openShop(),
    onTrack: (id) => navi?.start(id), // chạm dòng nhiệm vụ → dẫn đường
    ...hudActions({ game: () => game, S, attack, usePhapTuong, flight: () => flight, toast }), // nút đánh, ô kỹ năng, Tự động, 2 ô đan
  });
  hud.setOnline(onlineN, maxPlayers);
  const flight = createFlight({ me, map, hud, pt, toast, radius: config.player.radius_px, cfg: config.player, sendMove: (fl) => zone.sendMove(me.x, me.y, me.moving, fl) });
  const refreshAvatar = () => hud.setPortrait(renderPortrait(me.look, { body: true }));
  refreshAvatar();
  loading.set(90, 'Thả yêu thú vào rừng…');
  game = await createGameplay({ onRespawn: async () => { // máy chủ xác nhận vị trí hồi sinh (dịch chuyển xa bị chặn kiểm tốc độ)
    try { const row = await net.respawnAtTown(); if (row) { me.x = row.x; me.y = row.y; } } catch (e) { console.warn('Hồi sinh máy chủ lỗi', e); }
    zone.sendMove(me.x, me.y, false, false); hud.setToggle('bay', 0);
  }, loadJSON, map, me, hud, pt, toast, audio, userId: me.id, bag, onLook: () => onLookChanged(), onRealm: (r) => zone.setRealm(r), serverNow: net.serverNow, bornAt: character.created_at, timeSynced: net.timeSynced,
    onToaHoa: (sum) => showToaHoa({ name: me.name, ...sum, onRebirth: rebirth }) }); // thọ nguyên tận → chết hẳn
  me.onAutoSwing = swing;
  navi = createNavi({ map, me, game, flight, toast }); // dẫn đường tới nơi làm nhiệm vụ
  game.setGo((id) => navi.start(id)); // nút "Đi tới" trong bảng Nhiệm vụ đầy đủ
  pills = createQuickPill({ game: () => game, hud, pick: showSlotPicker, iconUrl, toast }); // 2 ô đan dùng nhanh
  stations = createStations({ map, me, net, game, toast, onMoved: (x, y) => { me.flying = false; hud.setToggle('bay', 0); zone.sendMove(x, y, false, false); } }); // trận nhãn + truyền tống
  const rank = createRankReporter({ gp: game.gp, info: game.rankInfo, me, submit: net.submitLeaderboard }); // ảnh chụp tiến trình → bảng xếp hạng
  dock = createStatsDock({ getValue: (id) => game.statValue(id), compact: false }); // HUD v3: bảng chỉ số mở bằng nút Nhân Vật
  game.setDock(dock);
  enableFastTap(); // nút bấm được cả khi tay kia đang giữ cần điều khiển
  let targetId = null; // đạo hữu đang được chọn (chạm vào nhân vật bằng tay phải)
  let shownMp = -1;
  let miniTimer = 0;
  window.addEventListener('keydown', (e) => { // máy tính: phím cách = tấn công
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === 'Space') { e.preventDefault(); attack(); }
    const k = /^Digit([1-7])$/.exec(e.code); // phím tắt máy tính: 1–7 = ô kỹ năng
    if (k) document.querySelector(`[data-act="s${k[1]}"]`)?.dispatchEvent(new PointerEvent('pointerdown'));
    if (e.code === 'KeyQ') game.healPill();
  });
  loading.set(100, 'Hoàn tất');
  setTimeout(() => loading.hide(), 300);
  toast(gift ? `Quà tân thủ: ${gift.name} (hệ ${gift.he}) đã mặc sẵn — xem trong Kho` : `Chào mừng ${me.name} đến ${zoneDef.name}`, gift ? 4000 : 2500);

  const saver = createSaver(me, config.net.position_save_interval_s, net.savePosition, toast);
  const speed = config.player.walk_speed_px_per_s;
  const flySpeed = config.player.fly_speed_px_per_s || speed;
  const radius = config.player.radius_px;
  const sprite = config.player.sprite_scale;
  const sendEvery = 1 / config.net.position_broadcast_hz;
  let sendTimer = 0;

  function update(dt) {
    // Cần điều khiển luôn ưu tiên; thả tay mà đang bật Tự động thì đi theo hướng autoplay (quái / nguyên liệu gần nhất)
    const stick = game.stunned() ? { x: 0, y: 0 } : input.getMove(), ad = game.stunned() ? null : game.autoDir(); // bị boss trói: đứng yên
    const nd = navi?.update(dt, !!(stick.x || stick.y)); // đang tự đi theo dẫn đường
    const dir = stick.x || stick.y ? stick : nd || (ad || stick);
    if (dir === ad && ad.fly !== undefined && ad.fly !== !!me.flying && !game.dead) flight.set(ad.fly, true); else if (stick.x || stick.y) game.autoMoved(); // Tự động: bay qua chướng ngại rồi hạ; tự kéo cần thì neo vùng farm đi theo
    const wasMoving = me.moving;
    me.moving = dir.x !== 0 || dir.y !== 0;
    if (me.moving) {
      if (!wasMoving) saver.saveNow(); // mốc thời gian mới cho máy chủ trước khi đi
      if (dir.x) me.facing = dir.x > 0 ? 1 : -1;
      const v = me.flying || game.dead ? flySpeed : game.speed() || speed; // Lướt: nhanh hơn nhưng vẫn dưới max_speed máy chủ; linh hồn = tốc độ bay
      map.move(me, dir.x * v * dt, dir.y * v * dt, radius, !!me.flying || game.dead); // linh hồn bay qua nước như ngự kiếm
      me.walkT += dt;
      sendTimer += dt;
      if (sendTimer >= sendEvery) { sendTimer = 0; zone.sendMove(me.x, me.y, true, me.flying); }
    } else {
      me.walkT = 0;
      if (wasMoving) { zone.sendMove(me.x, me.y, false, me.flying); saver.saveNow(); sendTimer = sendEvery; }
    }
    saver.tick(dt, me.moving);
    if (pt.tick(dt, me.flying) === 'empty') phapTuongOff('Linh lực cạn — pháp tướng tan biến');
    flight.tick(dt);
    const mpNow = Math.round(pt.mp);
    if (mpNow !== shownMp) { shownMp = mpNow; hud.setBar('mp', mpNow, pt.max); }
    game.update(dt); stations.tick(dt);
    rank.tick(dt);
    others.update(dt);
    for (const tap of input.takeTaps()) { // chạm vào nhân vật khác → chọn / bỏ chọn
      const wx = cam.x + tap.x / screen.scale, wy = cam.y + tap.y / screen.scale;
      if (game.tap(wx, wy)) continue; // chạm trúng quái → chọn quái
      const prop = map.town?.propAt(wx, wy);
      if (prop && (stations.tap(prop) || game.onProp(prop))) continue; // chạm công trình trong thành (kho hàng = cửa hàng…)
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
      dock.refresh(); hud.setWallet(game.wallet.list()); hud.setQuests(game.questBrief()); pills.refresh(); // ô tiền, khung nhiệm vụ, ô đan
      for (const [k, u] of Object.entries(game.hudArt())) hud.setRoundIcon(k, u); // nút tròn: ảnh vật phẩm đang dùng
    }
    followCamera(cam, me, screen, map.width, map.height, zoneDef.wrap);
  }

  function render() {
    const { ctx, dpr, scale } = screen;
    setTextScale(screen.textScale);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#26232a'; // cùng màu viền ô đất (data/terrain.json, tools/tiles_v2.py)
    ctx.fillRect(0, 0, screen.canvas.width, screen.canvas.height);
    ctx.imageSmoothingEnabled = false;
    const s = dpr * scale;
    ctx.setTransform(s, 0, 0, s, Math.round(-cam.x * s), Math.round(-cam.y * s));
    ctx.imageSmoothingEnabled = true; // ô đất vẽ ở độ phân giải cao, thu nhỏ mượt
    map.drawGround(ctx, cam);
    map.town?.drawGround(ctx, cam); // pháp trận, cầu đá
    map.town?.drawBehind(ctx, cam, me.y); // công trình sau lưng nhân vật
    map.decor?.drawBehind(ctx, cam, me.y); // cây, đá sau lưng + cỏ hoa
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
    map.town?.drawFront(ctx, cam, me.y); // công trình che trước nhân vật
    map.decor?.drawFront(ctx, cam, me.y);
    ctx.imageSmoothingEnabled = false;
    for (const p of people) drawLabel(ctx, p, now, sprite);
    game.renderAbove(ctx, now); // tên/máu quái, số sát thương, kiếm khí
    navi.render(ctx, now); // mũi tên dẫn đường

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

boot().catch((e) => {
  console.error(e);
  showFatal(e.message || String(e));
});
