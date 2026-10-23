// Chết → hoá linh hồn trắng (yêu cầu chủ dự án 21/10). Linh hồn: chỉ di chuyển (tốc độ bằng bay, đi qua nước — main.js),
// không tên, không thanh máu (draw.js bỏ qua khi me.soul), không đánh, không kỹ năng, quái không nhìn thấy.
// Bảng chọn: về thành hồi sinh (miễn phí) hoặc hồi sinh tại chỗ trả Linh thạch. Số ở data/gameplay.json → soul.
// autoBack(): lúc chết đang bật Tự động → bảng đếm ngược cfg.auto_town_s giây, hết giờ tự chọn về thành (miễn phí) để farm tiếp (chủ dự án 23/10 21h48)
export function createSoul({ me, hud, progress, cfg, townName, toast, showRevive, onRevive, autoBack = () => false }) {
  let fade = 0, close = null, left = 0;
  const cost = () => cfg.here_stone_base + cfg.here_stone_per_stage * progress.state.stage;

  function ask() {
    left = autoBack() ? (cfg.auto_town_s ?? 10) : 0;
    close = showRevive({
      cost: cost(), stone: progress.state.stone, townName, countdown: left,
      onTown: () => { close = null; left = 0; onRevive(false); },
      onHere: () => {
        const c = cost();
        if (progress.state.stone < c) { toast('Không đủ Linh thạch', 1400); return ask(); }
        progress.addStone(-c); close = null; left = 0; onRevive(true);
      },
    });
  }
  return {
    start() { // vừa gục: thân xác mờ dần rồi linh hồn hiện ra + bảng chọn
      fade = cfg.fade_s; me.flying = false; hud.setToggle('bay', 0);
      toast('Tử vong! Hoá thành linh hồn', 2000);
    },
    tick(dt) {
      if (left > 0 && close) { left -= dt; close.count?.(Math.ceil(left)); if (left <= 0) { close(); close = null; onRevive(false); } return; }
      if (fade <= 0) return;
      fade -= dt; me.alpha = Math.max(0, fade / cfg.fade_s);
      if (fade <= 0) { me.soul = true; me.alpha = 1; ask(); }
    },
    end() { close?.(); close = null; fade = 0; me.soul = false; me.alpha = 1; },
  };
}
