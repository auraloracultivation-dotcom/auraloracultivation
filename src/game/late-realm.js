// CẢNH GIỚI CAO (chủ dự án 23/10/2026 23h28) — giữ chân người chơi ở Anh Biến:
//  - Tu vi mỗi ngày (quái + nhiệm vụ) tiến sát daily_linh_khi.cap (= 2% vạch tầng), giảm dần càng gần mốc
//  - Một lượt thưởng nhiệm vụ không quá quest_exp_max (1%) vạch tầng
//  - Bị quái giết: mất death_loss (3%) vạch tầng. Không đủ để trừ → tu vi về 0 + "trọng thương";
//    đang trọng thương mà chết lần nữa → thụt một tầng (giữ drop_keep vạch tầng dưới). Tu vi hồi lại đủ mức trừ thì hết trọng thương.
//  - Tu Vi Đan / Viên Mãn Đan cũ không dùng được ở đây (pills → realm_max)
// Thông số: data/gameplay.json → late_realm. Các tầng khác giữ luật cũ (death_exp_loss).
export function createLateRealm({ gp, progress, gapR, toast }) {
  const L = gp.late_realm || {};
  const on = () => (L.prefixes || []).some((p) => progress.stageDef.id.startsWith(p));
  const need = () => progress.stageDef.exp_need;
  // Thưởng nhiệm vụ: ở cảnh giới cao bị chặn 1 lượt + đi chung giới hạn ngày với quái
  function questExp(n) {
    if (!on() || !(n > 0)) return n;
    return gapR.daily(Math.min(n, Math.round(need() * L.quest_exp_max)), need(), progress.stageDef.id);
  }
  // Chết: trả về chữ báo (hoặc '' nếu không mất gì)
  function death() {
    const st = progress.state;
    if (!on()) {
      const lost = Math.floor(st.exp * (gp.death_exp_loss || 0));
      if (lost <= 0) return '';
      st.exp -= lost; progress.changed(); return `Thân tử đạo tổn: mất ${lost.toLocaleString('vi')} tu vi`;
    }
    const loss = Math.round(need() * L.death_loss);
    if (st.exp >= loss) { st.exp -= loss; st.injured = false; progress.changed(); return `Thân tử đạo tổn: mất ${loss.toLocaleString('vi')} tu vi`; }
    if (!st.injured) { st.exp = 0; st.injured = true; progress.changed(); return 'Trọng thương! Tu vi tan hết — chết thêm lần nữa trước khi hồi phục sẽ thụt cảnh giới'; }
    const i = progress.state.stage - 1, below = gp.player.stages[i];
    progress.setStage(i, below.exp_need * L.drop_keep); st.injured = false;
    return `Đạo cơ vỡ nát — thụt xuống ${below.name}`;
  }
  // Tu vi đã đủ mức trừ một lần chết → hết trọng thương
  function tick() { const st = progress.state; if (st.injured && (!on() || st.exp >= need() * L.death_loss)) { st.injured = false; toast('Đã hồi phục trọng thương', 2000); } }
  const injured = () => !!progress.state.injured;
  return { on, questExp, death, tick, injured };
}
