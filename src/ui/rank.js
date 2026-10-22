// Bảng xếp hạng: 3 bảng (Cảnh giới, Lực chiến, Trảm Âm Hư) + xem chỉ số + hình trang bị của từng người.
// Dữ liệu do main.js đưa vào (lấy qua src/net) — module này chỉ vẽ.
import { showSheet } from './sheet.js';
import { escapeHtml as E } from './screens.js';
import { compactNum as N } from '../core/index.js';

const TABS = [{ id: 'realm', name: 'Cảnh giới' }, { id: 'power', name: 'Lực chiến' }, { id: 'void', name: 'Trảm Âm Hư' }];
const STAT_NAMES = [['hp', 'Khí huyết'], ['mp', 'Linh lực (MP)'], ['linh', 'Tấn công'], ['def', 'Phòng thủ'], ['xuyen', 'Xuyên giáp'],
  ['chinh', 'Chính xác'], ['ne', 'Né tránh'], ['crit', 'Bạo kích %'], ['hut', 'Hút máu %'], ['tocdanh', 'Tốc đánh'], ['tocchay', 'Tốc chạy'], ['phan', 'Phản đòn %']];
const MEDAL = ['🥇', '🥈', '🥉'];

// fetchBoard(kind) → [hàng]; fetchMine(kind) → { rank, row } | null; portrait(look) → dataURL | null
export function showLeaderboard({ myId, fetchBoard, fetchMine, portrait }) {
  const cache = {};
  const load = (kind, force = false) => {
    if (cache[kind] && !force) return;
    cache[kind] = { loading: true, rows: [], mine: null };
    Promise.all([fetchBoard(kind), fetchMine(kind).catch(() => null)])
      .then(([rows, mine]) => { cache[kind] = { rows: rows || [], mine }; })
      .catch((e) => { cache[kind] = { error: e?.message || 'Không tải được', rows: [] }; });
  };
  const value = (kind, r) => (kind === 'realm' ? `${E(r.stage_name || '—')}` : kind === 'power' ? `Lực chiến ${N(r.power)}` : `${r.void_kills} Âm Hư`);
  const sub = (kind, r) => (kind === 'realm' ? `${N(r.exp)} tu vi · Lực chiến ${N(r.power)}` : E(r.stage_name || ''));
  const row = (kind, r, i) => `
    <button type="button" class="row rank-row${r.user_id === myId ? ' me' : ''}" data-act="view" data-arg="${E(r.user_id)}">
      <span class="rank-no">${MEDAL[i] || `#${i + 1}`}</span>
      <span class="rank-main"><b>${E(r.name)}</b><small>${sub(kind, r)}</small></span>
      <em>${value(kind, r)}</em>
    </button>`;

  function render(kind) {
    load(kind);
    const c = cache[kind];
    if (c.loading) return '<p class="rank-empty">Đang tải bảng xếp hạng…</p>';
    if (c.error) return `<p class="rank-empty">Lỗi: ${E(c.error)}</p><button type="button" class="bag-act" data-act="reload" data-arg="${kind}">Thử lại</button>`;
    const mine = c.mine ? `<div class="rank-mine">Hạng của bạn: <b>#${c.mine.rank}</b> · ${value(kind, c.mine.row)}</div>`
      : '<div class="rank-mine">Bạn chưa có trên bảng — chơi thêm chút, bảng tự cập nhật mỗi phút.</div>';
    const list = c.rows.length ? c.rows.map((r, i) => row(kind, r, i)).join('') : '<p class="rank-empty">Chưa có ai trên bảng.</p>';
    return `${mine}${list}<button type="button" class="bag-act" data-act="reload" data-arg="${kind}">Làm mới</button>`;
  }

  function showPlayer(id) {
    const r = Object.values(cache).flatMap((c) => [...(c.rows || []), ...(c.mine ? [c.mine.row] : [])]).find((x) => x.user_id === id);
    if (!r) return;
    const img = r.look ? portrait(r.look) : null;
    const stats = STAT_NAMES.filter(([k]) => r.stats?.[k] !== undefined)
      .map(([k, n]) => `<div class="rank-stat"><span>${n}</span><b>${N(r.stats[k])}</b></div>`).join('');
    showSheet({
      title: r.name, tabs: [{ id: 'info', name: 'Chỉ số' }], onAction: () => {},
      note: r.source === 'client' ? 'Chỉ số do máy người chơi gửi lên (bản thử nghiệm) — chỉ để tham khảo.' : '',
      render: () => `<div class="rank-card">${img ? `<img src="${img}" alt="">` : ''}
        <div><b>${E(r.stage_name)}</b><small>Lực chiến ${N(r.power)} · ${N(r.exp)} tu vi · trảm ${r.void_kills} Âm Hư</small></div></div>
        <div class="rank-stats">${stats || '<p class="rank-empty">Chưa có chỉ số.</p>'}</div>`,
    });
  }

  showSheet({
    title: 'Bảng xếp hạng', tabs: TABS, render,
    note: 'Bản thử nghiệm: tiến trình còn lưu trên máy người chơi, chưa dùng để phát thưởng.',
    onAction(act, arg) { if (act === 'reload') load(arg, true); else if (act === 'view') showPlayer(arg); },
  });
}
