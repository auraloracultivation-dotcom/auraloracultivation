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
    ['data/items/items.json', 'items'], ['data/items/materials.json', 'materials'], ['data/items/pills.json', 'pills'],
    ['data/monsters/monsters.json', 'monsters'], ['data/skills/cong-phap.json', 'skills'],
    ['data/equipment/blanks.json', 'blanks'], ['data/quests/quests.json', 'quests'], ['data/realms.json', 'realms'],
  ];
  const data = {};
  for (const [file, key] of lists) {
    data[key] = load(file)[key];
    for (const x of data[key]) {
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
  for (const q of data.quests) {
    for (const g of q.goals) {
      if (g.target !== 'any' && !ids.has(g.target) && !placeholders.has(g.target)) {
        errors.push(`${q.id}: mục tiêu "${g.target}" không tồn tại và không nằm trong placeholders`);
      }
    }
    (q.rewards.items || []).forEach((i) => must(i.id, q.id));
    (q.rewards.unlock || []).forEach((u) => { if (!placeholders.has(u)) errors.push(`${q.id}: cờ mở khoá "${u}" chưa khai báo`); });
    q.next.forEach((n) => must(n, q.id));
  }
  return errors;
}
