// Dựng nội dung Đồ giám (src/ui/codex.js) từ data/: linh thảo, khoáng, đan, đan phương, công pháp, trang bị, phôi,
// quái, kỹ năng người + quái, hiệu ứng, NPC, vật phẩm khác. Trạng thái ảnh:
//   ok   = ảnh riêng của chủ dự án đã dùng trong game
//   tam  = ảnh thử nghiệm / gói miễn phí / dùng chung / mượn hình khác → nên thay
//   none = chưa có ảnh (đang vẽ tạm bằng code hoặc ô trống)
import { iconUrl, drawSheet, drawEffect, drawNpc, drawVoidPreview } from '../entity/index.js';
import { showCodex } from '../ui/index.js';

const ZONE = { xanh: 'Vùng Xanh', cam: 'Vùng Cam', xam: 'Vùng Xám Khói', trang: 'Vùng Trắng', than: 'Vùng Xám Than', den: 'Vùng Đen', tim: 'Vùng Tím', huvo: 'Hư Vô (khắp nơi)' };
const RANK = { thuong: 'Quái thường', elite: 'Tinh anh', boss: 'Boss' };
const SLOT = { 'trang-phuc': 'Trang phục', 'vu-khi': 'Vũ khí', canh: 'Cánh', 'phap-tuong': 'Pháp tướng', 'mat-na': 'Mặt nạ', nhan: 'Nhẫn', 'day-chuyen': 'Dây chuyền', 'linh-thu': 'Linh thú' };
const OWNER_SHEETS = new Set(['soi-loi', 'ran-ba-dau', 'xuc-tu', 'ky-lan-loi', 'thu-tim']); // quái chủ dự án vẽ
const OWNER_FX = new Set(['kiem-bang-bay', 'kiem-bang-no', 'moc-troi', 'tho-vong', 'hoa-cot', 'may-kiep', 'set-danh']);
const LOOK_SLOTS = new Set(['trang-phuc', 'vu-khi', 'canh', 'phap-tuong']); // ô hiện hình trên người

// Hoạt ảnh trong khung vuông: quái (sheet), hiệu ứng (fx, lặp lại), NPC
const sheetAnim = (sheet, anims, hue = 0) => ({ list: anims, draw(g, w, h, anim, t) { drawSheet(g, sheet, anim, t, w / 2, h * 0.92, h * 0.8, 1, { hue, fps: 8 }); } });
const fxAnim = (ids, dur) => ({ list: ids, draw(g, w, h, anim, t) { const d = dur(anim) || 0.6; drawEffect(g, anim, (t % (d + 0.3)) / d, w / 2, h / 2, h * 0.8); } });
const npcAnim = (n) => ({ list: ['đứng', 'đi', 'vung kiếm'], draw(g, w, h, anim, t) {
  drawNpc(g, { ...n, t, walkT: t, moving: anim === 'đi', facing: 1, swingT: anim === 'vung kiếm' ? 0.35 - (t % 0.7) / 2 : 0 }, w / 2, h * 0.92, h * 0.8);
} });

export async function openCodex(o) {
  const { loadJSON, gp, mats, pills, recipes, cp, monsters, blanks, qItems, artDef, info, cpText, fxDuration } = o;
  const [items, he6, artIdx, npcDef] = await Promise.all(['data/items/items.json', 'data/equipment/he6.json', 'data/equipment/art.json', 'data/npcs.json'].map((p) => loadJSON(p)));
  const icon = (id) => iconUrl(id);
  const iconEntry = (d, extra = []) => ({ id: d.id, name: d.name, img: icon(d.id), status: icon(d.id) ? 'ok' : 'none', info: [info.effect(d), ...extra, info.source(d) && `Nơi có: ${info.source(d)}`] });

  const sheetUse = {};
  for (const m of monsters) if (m.art.sheet) (sheetUse[m.art.sheet] ||= []).push(m.name);
  const mon = monsters.map((m) => {
    if (m.art.code) return { id: m.id, name: m.name, status: 'none', note: 'Vẽ tạm bằng code — chờ ảnh của chủ dự án',
      anim: { list: ['đứng', 'đánh'], draw: (g, w, h, anim, t) => drawVoidPreview(g, w, h, m, anim, t) },
      info: [`Âm Hư · ${ZONE[m.zone]} · cảnh giới ${m.realm}`, `Khí huyết ${m.hp.join('–')} · Công ${m.atk.join('–')} · Thủ ${m.def.join('–')}`,
        'Xuất hiện theo lịch ở một chỗ bất kỳ ngoài thành, hết giờ thì tan biến'] };
    const sh = artDef.sheets[m.art.sheet], shared = sheetUse[m.art.sheet].filter((n) => n !== m.name);
    const owner = OWNER_SHEETS.has(m.art.sheet) && !shared.length && !m.art.hue;
    const notes = [!OWNER_SHEETS.has(m.art.sheet) && 'Hình thử nghiệm (gói miễn phí / chưa rõ nguồn)', shared.length && `Dùng chung hình với: ${shared.join(', ')}`,
      m.art.hue && 'Đổi màu từ hình khác', m.art.still && 'Chỉ 1 hình đứng yên, chưa có chuyển động đi / đánh / chết'].filter(Boolean);
    return { id: m.id, name: m.name, status: owner ? 'ok' : 'tam', note: notes.join(' · '), anim: sheetAnim(m.art.sheet, Object.keys(sh.anims), m.art.hue),
      info: [`${RANK[m.rank]} · ${ZONE[m.zone]} · cảnh giới ${m.realm}`, `Khí huyết ${m.hp.join('–')} · Công ${m.atk.join('–')} · Thủ ${m.def.join('–')}`,
        `Đòn nặng mỗi ${gp.monster.heavy.every_n_attacks} đòn (×${gp.monster.heavy.mul} sát thương, vòng đỏ báo trước)`] };
  });

  const S = gp.skills, fx = (id) => ({ status: OWNER_FX.has(id) ? 'ok' : 'tam', anim: fxAnim([id], fxDuration) });
  const skill = (id, name, icon, effects, lines, note) => {
    const st = effects.length ? (effects.every((e) => OWNER_FX.has(e)) ? 'ok' : 'tam') : 'none';
    return { id, name, status: st, img: effects.length ? null : icon, anim: effects.length ? fxAnim(effects, fxDuration) : null,
      note: [note, `Nút: ${icon.split('/').pop()}`, !effects.length && 'Chưa có hình hiệu ứng'].filter(Boolean).join(' · '), info: lines };
  };
  const U = 'assets/ui/skills/';
  const skills = [
    skill('skill.attack', 'Đánh thường', `${U}tan-cong.png`, ['chem-x'], ['Chém vũ khí vào mục tiêu gần nhất']),
    skill('skill.kiem-khi', 'Kiếm khí', `${U}kiem-khi.png`, ['kiem-bang-bay', 'kiem-bang-no'], [`Bắn kiếm khí ×${S['kiem-khi'].mul} sát thương · ${S['kiem-khi'].mp} linh lực · hồi ${S['kiem-khi'].cd_s}s · mở ở Trúc Cơ`]),
    skill('skill.khong-che', 'Khống chế', `${U}khong-che.png`, ['moc-troi'], [`Trói mục tiêu ${S['khong-che'].stun_s}s · ${S['khong-che'].mp} linh lực · hồi ${S['khong-che'].cd_s}s · mở ở Trúc Cơ`]),
    { ...skill('skill.linh-thu', 'Linh thú', `${U}linh-thu.png`, [], [`Gọi linh thú đánh cùng ${S['linh-thu'].last_s}s · hồi ${S['linh-thu'].cd_s}s · mở ở Kết Đan, cần đeo linh thú`]),
      status: 'tam', img: null, anim: sheetAnim('cho-trang', ['idle', 'walk']), note: 'Linh thú đang dùng chó trắng (gói miễn phí) · chưa có hình linh thú riêng' },
    skill('skill.luot', 'Lướt', `${U}luot.png`, [], [`Tăng né ×${S.luot.ne_mul} và tốc độ trong ${S.luot.last_s}s · hồi ${S.luot.cd_s}s · mở ở Kết Đan`]),
    skill('skill.nguyen-anh', 'Nguyên Anh (diện rộng)', `${U}nguyen-anh.png`, ['tho-vong'], [`Đánh quanh mình ×${S['nguyen-anh'].mul} · ${S['nguyen-anh'].mp} linh lực · mở ở Nguyên Anh`]),
    skill('skill.phap-tuong', 'Pháp tướng hoá hình', `${U}phap-tuong.png`, [], [`+${Math.round((S['phap-tuong'].atk_mul - 1) * 100)}% công, +${Math.round((S['phap-tuong'].def_mul - 1) * 100)}% thủ khi hiện; tốn linh lực liên tục`], 'Hình = pháp tướng đang đeo (xem Trang bị)'),
    skill('skill.bay', 'Ngự kiếm phi hành', `${U}bay.png`, [], ['Cầm kiếm mới bay được · tốn linh lực mỗi giây']),
    skill('skill.dot-pha', 'Đột phá (thiên kiếp)', `${U}dan-duoc.png`, ['may-kiep', 'set-danh'], ['Mây kiếp tụ trên đầu rồi sét đánh khi đột phá đại cảnh giới']),
    skill('skill.len-tang', 'Lên tầng / hồi sinh', `${U}tan-cong.png`, ['vong-lua'], ['Vòng sáng khi lên tầng nhỏ hoặc hồi sinh']),
  ];
  const mskills = [
    skill('mskill.thuong', 'Quái: đòn thường', `${U}tan-cong.png`, ['cham-mau'], ['Máu bắn khi người chơi trúng đòn']),
    skill('mskill.nang', 'Quái: đòn nặng', `${U}tan-cong.png`, ['sao-den'], [`Mỗi ${gp.monster.heavy.every_n_attacks} đòn: vòng đỏ ${gp.monster.heavy.windup_s}s rồi đánh ×${gp.monster.heavy.mul} · chạy khỏi vòng để né`]),
    skill('mskill.boss', 'Boss: đòn nặng', `${U}tan-cong.png`, ['hoa-cot'], ['Như đòn nặng, hình cột lửa']),
    skill('mskill.chet', 'Quái gục', `${U}tan-cong.png`, ['khoi'], ['Khói tan khi quái chết']),
  ];
  const usedFx = new Set([...skills, ...mskills].flatMap((s) => s.anim?.list || []));
  const otherFx = Object.keys(artDef.fx).filter((id) => !usedFx.has(id)).map((id) => ({ id: `fx.${id}`, name: `Hiệu ứng ${id}`, ...fx(id), note: 'Chưa gắn vào kỹ năng nào', info: [] }));

  const artOf = (id) => he6.art[id]?.file;
  const gear = items.items.map((it) => ({ id: it.id, name: it.name, img: artOf(it.art), status: artOf(it.art) ? 'ok' : 'none',
    info: [`${SLOT[it.slot]} · hệ ${it.he}`, 'Đồ Kho: thức tỉnh để có chỉ số'] }));
  const emptySlots = ['mat-na', 'nhan', 'day-chuyen', 'linh-thu'].map((sl) => ({ id: `slot.${sl}`, name: `${SLOT[sl]} (đồ 6 hệ)`, status: 'none',
    note: LOOK_SLOTS.has(sl) ? '' : 'Ô này chưa hiện trên người — cần ảnh icon + (nếu muốn) ảnh mặc lên người', info: ['Chưa có món nào trong Kho cho ô này'] }));
  const phoi = blanks.blanks.map((b) => {
    const pool = (artIdx[b.slot] || []).filter((a) => !/\.he\./.test(a.id)).length;
    return { id: b.id, name: `Phôi ${SLOT[b.slot]}`, status: LOOK_SLOTS.has(b.slot) && pool ? 'tam' : 'none',
      note: LOOK_SLOTS.has(b.slot) && pool ? `Đang mượn ngẫu nhiên 1 trong ${pool} hình kho chung` : 'Chưa có hình',
      info: [`Tên mẫu: ${(b.sample_names || []).join(', ')}`, `Mở ở ${b.unlock} · tỷ lệ ${Math.round(b.rate * 100)}%`] };
  });
  const npcs = npcDef.npcs.map((n) => ({ id: n.id, name: n.name, status: 'ok', anim: npcAnim(n), info: [`Trang phục #${n.outfit + 1} · vũ khí #${n.weapon + 1} · ${n.home.area === 'town' ? 'trong thành' : 'dọc đường'}`] }));
  const misc = [
    { id: 'linh-thach', name: 'Linh thạch', img: icon('linh-thach'), status: 'tam', note: 'Icon gói miễn phí', info: ['Tiền tệ: mua ở Vạn Bảo Lâu, hồi sinh tại chỗ'] },
    ...Object.keys(SLOT).map((sl) => ({ id: `slot.${sl}`, name: `Icon ô ${SLOT[sl]}`, img: icon(`slot.${sl}`), status: 'tam', note: 'Icon gói miễn phí (bảng Nhân vật, ô trống)', info: [] })),
    ...qItems.items.map((d) => iconEntry(d)),
  ];
  const mat = (g) => mats.materials.filter((d) => d.group === g).map((d) => iconEntry(d, [ZONE[d.zone]]));
  const cpList = cp.skills.map((s) => ({ id: s.id, name: s.name, img: icon(s.id), status: icon(s.id) ? 'ok' : 'none', note: 'Ảnh = sách bí kíp',
    info: [s.desc, cpText(s.id), `Mở ở ${s.unlock} · tối đa cấp ${s.max_level}`] }));

  showCodex({
    title: 'Đồ giám',
    sections: [
      { id: 'thao', name: 'Linh thảo · khoáng', hint: 'Icon vuông, nền trong suốt (≈256×256). Đặt tên file theo mã (dòng chữ nhỏ dưới tên).', entries: [...mat('thao'), ...mat('khoang'), ...mat('dacbiet')] },
      { id: 'dan', name: 'Đan dược', hint: 'Icon viên đan, nền trong suốt.', entries: pills.pills.map((d) => iconEntry(d)).concat(recipes.items.filter((d) => d.cat === 'khac').map((d) => iconEntry(d))) },
      { id: 'phuong', name: 'Đan phương · công thức', hint: 'Icon trục cuộn / sách, nền trong suốt.', entries: recipes.items.filter((d) => d.cat === 'dan-phuong' || d.cat === 'phap-khi').map((d) => iconEntry(d)) },
      { id: 'congphap', name: 'Công pháp', hint: 'Icon sách bí kíp. Muốn có hình chiêu thức riêng: gửi kèm 1 dải hiệu ứng (nhiều khung xếp ngang).', entries: cpList },
      { id: 'kynang', name: 'Kỹ năng người', hint: 'Mỗi kỹ năng: 1 icon nút tròn + 1 dải hiệu ứng (nhiều khung xếp ngang, nền trong suốt). Bấm ▶ để xem.', entries: skills },
      { id: 'quaiskill', name: 'Kỹ năng quái · hiệu ứng', hint: 'Hiệu ứng khi quái đánh / chết, và các hiệu ứng chưa dùng.', entries: [...mskills, ...otherFx] },
      { id: 'quai', name: 'Quái vật', hint: 'Mỗi quái: dải hình đứng / đi / đánh / chết (cùng cỡ khung, nền trong suốt). Bấm ▶ nhiều lần để xem từng chuyển động.', entries: mon },
      { id: 'trangbi', name: 'Trang bị', hint: 'Đồ 6 hệ trong Kho (hình mặc lên người) và các ô chưa có đồ.', entries: [...gear, ...emptySlots] },
      { id: 'phoi', name: 'Phôi luyện', hint: 'Đồ luyện từ phôi chưa có hình riêng — mỗi tên mẫu cần 1 ảnh.', entries: phoi },
      { id: 'npc', name: 'NPC', hint: '50 NPC (hình riêng, không phải vật phẩm).', entries: npcs },
      { id: 'khac', name: 'Khác', hint: 'Tiền tệ, icon ô trang bị, vật phẩm nhiệm vụ.', entries: misc },
    ],
  });
}
