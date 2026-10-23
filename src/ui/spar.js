// Màn LUẬN BÀN: hai nhân vật đứng đối mặt, thanh khí huyết, số sát thương bay lên; phát lại trận do src/game/spar.js tính.
// Trận dài bao lâu cũng tua gọn trong ~10 giây. Có nút Bỏ qua / Đấu lại / Đóng.
import { escapeHtml as E } from './screens.js';
import { compactNum as N } from '../core/index.js';

const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild; };

// a, b: { name, sub, img (dataURL|null) }; run() → kết quả simulateDuel (gọi lại khi Đấu lại)
export function showSpar({ a, b, run }) {
  const wrap = el(`<div class="overlay modal-wrap spar-wrap"><div class="spar" role="dialog" aria-label="Luận bàn">
    <div class="spar-head"><b>⚔ Luận bàn</b><button type="button" class="bag-x" aria-label="Đóng">✕</button></div>
    <div class="spar-field">${[a, b].map((p, i) => `<div class="spar-side s${i}">
      <div class="spar-bar"><i></i></div><small class="spar-hp"></small>
      <div class="spar-fig">${p.img ? `<img src="${p.img}" alt="">` : '<span class="spar-none">?</span>'}</div>
      <b>${E(p.name)}</b><small>${E(p.sub || '')}</small></div>`).join('<div class="spar-vs">VS</div>')}</div>
    <p class="spar-msg">Chuẩn bị…</p>
    <div class="spar-acts"><button type="button" class="bag-act" data-a="skip">Bỏ qua</button><button type="button" class="bag-act" data-a="again" disabled>Đấu lại</button></div>
    <p class="bag-note">Đấu với bóng chỉ số của họ ngay trên máy cậu — không mất gì, không có thưởng, họ không bị ảnh hưởng.</p>
  </div></div>`);
  document.getElementById('ui').appendChild(wrap);
  const $ = (s) => wrap.querySelector(s), sides = [$('.s0'), $('.s1')], msg = $('.spar-msg');
  let raf = 0, res = null, start = 0, idx = 0, speed = 1;
  const close = () => { cancelAnimationFrame(raf); wrap.remove(); };
  $('.bag-x').addEventListener('click', close);
  wrap.addEventListener('pointerdown', (e) => { if (e.target === wrap) close(); });

  const setHp = (hp) => sides.forEach((s, i) => {
    const f = Math.max(0, hp[i] / res.maxHp[i]);
    s.querySelector('.spar-bar i').style.width = `${f * 100}%`;
    s.querySelector('.spar-hp').textContent = `${N(Math.round(hp[i]))} / ${N(Math.round(res.maxHp[i]))}`;
  });
  const pop = (side, text, cls) => {
    const n = el(`<span class="spar-pop ${cls}">${E(text)}</span>`);
    n.style.left = `${35 + Math.random() * 30}%`;
    sides[side].querySelector('.spar-fig').appendChild(n); setTimeout(() => n.remove(), 900);
  };
  function show(e) {
    const att = sides[e.from], def = sides[1 - e.from];
    att.classList.remove('lunge'); void att.offsetWidth; att.classList.add('lunge');
    if (e.miss) pop(1 - e.from, 'Né', 'miss');
    else {
      def.classList.remove('hurt'); void def.offsetWidth; def.classList.add('hurt');
      pop(1 - e.from, `${e.skill ? '✦' : ''}-${N(e.dmg)}${e.crit ? '!' : ''}`, e.crit ? 'crit' : e.skill ? 'skill' : '');
      if (e.heal) pop(e.from, `+${N(e.heal)}`, 'heal');
      if (e.reflect) pop(e.from, `-${N(e.reflect)} phản`, '');
    }
    setHp(e.hp);
  }
  function finish() {
    const w = res.winner, name = [a.name, b.name][w];
    sides[1 - w].classList.add('lost');
    msg.innerHTML = `${w === 0 ? '<b class="win">THẮNG</b>' : '<b class="lose">THUA</b>'} — ${E(name)} ${res.timeout ? 'còn nhiều khí huyết hơn khi hết giờ' : 'hạ gục đối phương'} sau ${res.time.toFixed(1)} giây · ${res.events.length} đòn`;
    $('[data-a="again"]').disabled = false; $('[data-a="skip"]').disabled = true;
  }
  function frame(now) {
    const t = ((now - start) / 1000) * speed;
    while (idx < res.events.length && res.events[idx].t <= t) show(res.events[idx++]);
    if (idx >= res.events.length) return finish();
    raf = requestAnimationFrame(frame);
  }
  function go() {
    res = run(); idx = 0;
    speed = Math.max(1, res.time / 10); // tua gọn trong ~10 giây
    sides.forEach((s) => s.classList.remove('lost', 'hurt', 'lunge'));
    setHp(res.maxHp); msg.textContent = speed > 1 ? `Đang đấu… (tua ×${speed.toFixed(1)})` : 'Đang đấu…';
    $('[data-a="again"]').disabled = true; $('[data-a="skip"]').disabled = false;
    start = performance.now() + 500; raf = requestAnimationFrame(frame);
  }
  $('.spar-acts').addEventListener('click', (e) => {
    const k = e.target.closest('[data-a]')?.dataset.a;
    if (k === 'skip' && res) { cancelAnimationFrame(raf); while (idx < res.events.length) idx++; setHp(res.events.at(-1)?.hp || res.maxHp); finish(); }
    else if (k === 'again') go();
  });
  go();
}
