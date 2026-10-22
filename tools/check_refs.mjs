// Kiểm tra tham chiếu ID trong dữ liệu thiết kế: ID không trùng, mọi nguyên liệu/quái/nhiệm vụ được trỏ tới phải tồn tại.
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(p, 'utf8'));

export function checkRefs() {
  const errors = [];
  const ids = new Map();
  const add = (id, file) => {
    if (ids.has(id)) errors.push(`${file}: trùng ID ${id} (đã có trong ${ids.get(id)})`);
    ids.set(id, file);
  };
  const lists = [
    ['data/items/items.json', 'items'], ['data/items/materials.json', 'materials'], ['data/items/pills.json', 'pills'], ['data/items/quest-items.json', 'items'], ['data/items/recipes.json', 'items'], ['data/items/premium.json', 'items'],
    ['data/monsters/monsters.json', 'monsters'], ['data/skills/cong-phap.json', 'skills'],
    ['data/equipment/blanks.json', 'blanks'], ['data/quests/quests.json', 'quests'], ['data/realms.json', 'realms'],
  ];
  const data = {};
  for (const [file, key] of lists) {
    const arr = load(file)[key];
    data[key] = [...(data[key] || []), ...arr];
    for (const x of arr) {
      if (!/^[a-z0-9-]+(\.[a-z0-9_-]+)+$/.test(x.id)) errors.push(`${file}: ID sai quy tắc "${x.id}"`);
      add(x.id, file);
    }
  }
  const must = (id, where) => { if (!ids.has(id)) errors.push(`${where}: trỏ tới ID không tồn tại "${id}"`); };
  const inputs = (arr, where) => (arr || []).forEach((i) => must(i.id, where));

  for (const p of data.pills) {
    inputs(p.recipe.inputs, p.id);
    (p.recipe.alt_inputs || []).forEach((a) => inputs(a, p.id));
  }
  for (const b of data.blanks) inputs(b.inputs, b.id);
  for (const s of data.skills) inputs(s.learn?.inputs, s.id);
  for (const r of data.realms) {
    if (r.breakthrough) must(r.breakthrough.pill, r.id);
    if (r.unlock_skill.startsWith('skill.')) must(r.unlock_skill, r.id);
  }

  const qfile = load('data/quests/quests.json');
  const placeholders = new Set(qfile.placeholders);
  const wild = new Set(Object.keys(qfile.wildcards || {}));
  for (const q of data.quests) {
    for (const g of q.goals) {
      if (!wild.has(g.target) && !ids.has(g.target) && !placeholders.has(g.target)) {
        errors.push(`${q.id}: mục tiêu "${g.target}" không tồn tại và không nằm trong placeholders`);
      }
    }
    (q.rewards.items || []).forEach((i) => must(i.id, q.id));
    (q.rewards.unlock || []).forEach((u) => { if (!placeholders.has(u)) errors.push(`${q.id}: cờ mở khoá "${u}" chưa khai báo`); });
    q.next.forEach((n) => must(n, q.id));
  }
  // Thông số chơi thử phải trỏ đúng
  const gp = load('data/gameplay.json');
  for (const id of Object.keys(gp.pills)) if (id.startsWith('item.')) must(id, 'gameplay.json pills');
  const stageIds = new Set(gp.player.stages.map((s) => s.id));
  for (const [st, realm] of Object.entries(gp.major_realm_first_stage)) {
    if (!stageIds.has(st)) errors.push(`gameplay.json: tầng "${st}" không có`);
    must(realm, 'gameplay.json major_realm_first_stage');
  }
  for (const q of load('data/items/quest-items.json').items) if (q.drop.from) must(q.drop.from, q.id);
  for (const r of load('data/items/recipes.json').items) if (r.teaches) must(r.teaches, r.id);
  for (const s of load('data/shop.json').stock) must(s.id, 'shop.json');
  // Luật cảnh giới (chủ dự án 23/10): boss mạnh nhất một đại cảnh giới ≤ quái thường yếu nhất Sơ kỳ cảnh giới kế tiếp, từng chỉ số
  const mon = load('data/monsters/monsters.json');
  const realmOfZone = Object.fromEntries(mon.zones.map((z) => [z.id, `realm.${z.realm}`]));
  const order = mon.rule.order;
  for (let i = 0; i + 1 < order.length; i++) {
    const top = mon.monsters.filter((m) => realmOfZone[m.zone] === order[i]);
    const next = mon.monsters.filter((m) => realmOfZone[m.zone] === order[i + 1]);
    const firstStage = next.find((m) => m.rank === 'thuong' || m.void)?.stages[0];
    const low = next.filter((m) => (m.rank === 'thuong' || m.void) && m.stages[0] === firstStage);
    if (!top.length || !low.length) { errors.push(`monsters.json: thiếu quái cho ${order[i]} hoặc ${order[i + 1]}`); continue; }
    for (const k of ['hp', 'atk', 'def']) {
      const hi = Math.max(...top.map((m) => m[k][1])), lo = Math.min(...low.map((m) => m[k][0]));
      if (hi > lo) errors.push(`monsters.json: ${order[i]} có quái ${k} tối đa ${hi} > quái yếu nhất ${order[i + 1]} (${lo}) — vi phạm luật cảnh giới`);
    }
  }
  return errors;
}
