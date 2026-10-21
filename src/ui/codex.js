// Bảng Đồ giám (nút sách trên HUD, yêu cầu chủ dự án 21/10): mọi thứ trong game kèm ẢNH + tên + mã + thông tin,
// đánh dấu món nào đã có ảnh / ảnh tạm / chưa có — để chủ dự án biết cần làm (GPT) ảnh nào.
// Mục có chuyển động (quái, hiệu ứng, NPC) có nút ▶ để chạy. Dữ liệu do src/game/codex.js dựng.
// sections: [{ id, name, hint, entries: [{ id, name, status: 'ok'|'tam'|'none', note, info: [..], img, anim: { list, draw(ctx, w, h, anim, t) } }] }]
import { el } from './stage.js';
import { escapeHtml as E } from './screens.js';

const STATUS = { ok: ['Đã có ảnh', 'ok'], tam: ['Ảnh tạm', 'tam'], none: ['Chưa có ảnh', 'none'] };

export function showCodex({ title, sections }) {
  const wrap = el('<div class="overlay modal-wrap bag-wrap"></div>');
  document.getElementById('ui').appendChild(wrap);
  let raf = 0;
  const close = () => { cancelAnimationFrame(raf); wrap.classList.add('fade-out'); setTimeout(() => wrap.remove(), 180); };
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });
  const all = sections.flatMap((s) => s.entries);
  const count = (st) => all.filter((e) => e.status === st).length;
  const box = el(`<div class="bag sheet codex" role="dialog" aria-label="${E(title)}">
    <div class="bag-head"><b>${E(title)}</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>
    <div class="codex-tabs">${sections.map((s, i) => `<button type="button" data-tab="${s.id}" aria-pressed="${i === 0}">${E(s.name)}</button>`).join('')}</div>
    <div class="codex-filter">
      <button type="button" data-f="all" aria-pressed="true">Tất cả ${all.length}</button>
      <button type="button" data-f="none" class="none">Chưa có ảnh ${count('none')}</button>
      <button type="button" data-f="tam" class="tam">Ảnh tạm ${count('tam')}</button>
      <button type="button" data-f="ok" class="ok">Đã có ${count('ok')}</button>
    </div>
    <div class="sheet-body codex-body"></div>
  </div>`);
  wrap.appendChild(box);
  const body = box.querySelector('.codex-body');
  let tab = sections[0].id, filter = 'all';
  const playing = new Map(); // canvas → { e, anim, t0 }

  function card(e, i) {
    const [label, cls] = STATUS[e.status];
    const pic = e.anim ? `<canvas width="144" height="144" data-i="${i}"></canvas>`
      : e.img ? `<img src="${E(e.img)}" alt="" loading="lazy">` : '<span class="codex-empty">Chưa có<br>ảnh</span>';
    return `<div class="codex-card">
      <div class="codex-pic">${pic}</div>
      <div class="codex-txt">
        <div class="codex-name"><b>${E(e.name)}</b><em class="codex-st ${cls}">${label}</em></div>
        <code>${E(e.id)}</code>
        ${e.note ? `<p class="codex-note">${E(e.note)}</p>` : ''}
        ${(e.info || []).filter(Boolean).map((l) => `<p>${E(l)}</p>`).join('')}
        ${e.anim ? `<button type="button" class="bag-act sm" data-play="${i}">▶ Chạy: ${E(e.anim.list[0])}</button>` : ''}
      </div></div>`;
  }
  let shown = [];
  function paint() {
    playing.clear();
    const sec = sections.find((s) => s.id === tab);
    shown = sec.entries.filter((e) => filter === 'all' || e.status === filter);
    body.innerHTML = `${sec.hint ? `<p class="codex-hint">${E(sec.hint)}</p>` : ''}`
      + (shown.length ? shown.map(card).join('') : '<p class="codex-hint">Không có mục nào.</p>');
    body.scrollTop = 0;
    for (const c of body.querySelectorAll('canvas')) still(c);
  }
  const ctxOf = (c) => { const g = c.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height); return g; };
  function still(c) { const e = shown[+c.dataset.i]; e.anim.draw(ctxOf(c), c.width, c.height, e.anim.list[0], 0); }
  function loop(now) {
    for (const [c, p] of playing) p.e.anim.draw(ctxOf(c), c.width, c.height, p.anim, (now - p.t0) / 1000);
    raf = playing.size ? requestAnimationFrame(loop) : 0;
  }

  box.querySelector('.bag-x').addEventListener('click', close);
  box.querySelector('.codex-tabs').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tab]'); if (!b) return;
    tab = b.dataset.tab; box.querySelectorAll('[data-tab]').forEach((x) => x.setAttribute('aria-pressed', x === b)); paint();
  });
  box.querySelector('.codex-filter').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-f]'); if (!b) return;
    filter = b.dataset.f; box.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', x === b)); paint();
  });
  body.addEventListener('click', (ev) => { // ▶: lần bấm sau chuyển sang chuyển động kế tiếp (đứng → đi → đánh → chết…)
    const b = ev.target.closest('[data-play]'); if (!b) return;
    const i = +b.dataset.play, e = shown[i], c = body.querySelector(`canvas[data-i="${i}"]`), p = playing.get(c);
    const anim = p ? e.anim.list[(e.anim.list.indexOf(p.anim) + 1) % e.anim.list.length] : e.anim.list[0];
    playing.set(c, { e, anim, t0: performance.now() });
    const next = e.anim.list[(e.anim.list.indexOf(anim) + 1) % e.anim.list.length];
    b.textContent = e.anim.list.length > 1 ? `▶ Đang chạy: ${anim} · bấm: ${next}` : `▶ Đang chạy: ${anim}`;
    if (!raf) raf = requestAnimationFrame(loop);
  });
  paint();
  return close;
}
