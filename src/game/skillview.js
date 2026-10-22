// Bảng Kỹ năng (chủ dự án 23/10): chạm một kỹ năng → hiện các ô 1..N → chạm ô là kỹ năng nằm vào ô đó trên HUD.
// Mở từ nút "Kỹ năng" cạnh bộ nút đánh, hoặc chạm một ô đang trống (khi đó chọn kỹ năng là xếp thẳng vào ô ấy).
import { showSheet, escapeHtml as E } from '../ui/index.js';

const fill = (text, s) => text.replace(/\{(\w+)(%?)\}/g, (_, k, pct) => (s[k] === undefined ? '' : pct ? `${Math.round(s[k] * 100)}%` : s[k]));

export function openSkillPanel({ S, loadout, bar, progress, stageName, slot = -1, toast }) {
  let sel = null; // kỹ năng đang chọn để xếp
  const unlocked = (s) => !s.unlock || progress.stageIndex(s.unlock) <= progress.state.stage;

  function row(id) {
    const s = S[id], ok = unlocked(s), at = loadout.slotOf(id), img = bar.art(id);
    const meta = ok ? [s.mp ? `${s.mp} linh lực` : null, s.cd_s ? `hồi ${s.cd_s}s` : null].filter(Boolean).join(' · ') : `mở ở ${E(stageName(s.unlock))}`;
    const slots = sel === id ? `<div class="sk-slots">${Array.from({ length: loadout.size }, (_, i) =>
      `<button type="button" class="bag-act sm ${at === i ? 'on' : ''}" data-act="put" data-arg="${E(`${id}|${i}`)}">Ô ${i + 1}${loadout.get(i) && loadout.get(i) !== id ? ` · ${E(S[loadout.get(i)]?.name || '')}` : ''}</button>`).join('')}
      ${at >= 0 ? `<button type="button" class="bag-act sm" data-act="off" data-arg="${E(id)}">Bỏ khỏi ô</button>` : ''}</div>` : '';
    return `<div class="row sk-row ${ok ? '' : 'locked'} ${sel === id ? 'sel' : ''}">
      <div class="row-h"><b>${img ? `<img class="ico sk-ico" src="${img}" alt="">` : ''}${E(s.name || id)}</b><em>${at >= 0 ? `<span class="own yes">Ô ${at + 1}</span>` : ''}</em></div>
      <p class="src">${E(fill(s.desc || '', s))}</p><p class="need">${meta}</p>
      ${ok ? `<button type="button" class="bag-act sm" data-act="pick" data-arg="${E(id)}">${slot >= 0 ? `Xếp vào ô ${slot + 1}` : sel === id ? 'Đóng' : 'Xếp vào ô…'}</button>` : ''}
      ${slots}</div>`;
  }

  showSheet({
    title: 'Kỹ năng',
    tabs: [{ id: 'all', name: slot >= 0 ? `Chọn kỹ năng cho ô ${slot + 1}` : 'Chạm kỹ năng → chọn ô' }],
    note: 'Ô kỹ năng lưu trên máy này (bản thử nghiệm). Tự động đánh sẽ dùng các kỹ năng trong ô.',
    render: () => loadout.catalog().map(row).join(''),
    onAction(act, arg) {
      if (act === 'pick') {
        if (slot >= 0) { loadout.set(slot, arg); toast(`${S[arg].name} → ô ${slot + 1}`, 1000); slot = -1; sel = null; return; }
        sel = sel === arg ? null : arg;
      } else if (act === 'put') {
        const [id, i] = arg.split('|');
        loadout.set(+i, id); sel = null; toast(`${S[id].name} → ô ${+i + 1}`, 1000);
      } else if (act === 'off') { loadout.remove(arg); sel = null; }
    },
  });
}
