// Nạp định nghĩa từ data/ — nguồn sự thật duy nhất cho nội dung game.
const cache = new Map();

export async function loadJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Không tải được ${path} (${res.status})`);
  const json = await res.json();
  cache.set(path, json);
  return json;
}
