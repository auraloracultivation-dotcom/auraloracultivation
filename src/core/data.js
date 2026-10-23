// Nạp định nghĩa từ data/ — nguồn sự thật duy nhất cho nội dung game.
// Lưu PROMISE (không đợi xong mới lưu): gọi trước để tải sẵn (prefetchJSON), lần gọi sau dùng lại, không tải 2 lần.
// Mạng điện thoại chập chờn: mỗi lần tải tối đa 15 giây, hỏng thì thử lại 2 lần — không treo màn hình chờ mãi.
const cache = new Map();
const TIMEOUT_MS = 15000, TRIES = 3;

async function fetchJSON(path) {
  let err;
  for (let i = 0; i < TRIES; i++) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(path, { cache: 'no-cache', signal: ac.signal });
      if (!res.ok) throw new Error(`Không tải được ${path} (${res.status})`);
      return await res.json();
    } catch (e) { err = e; } finally { clearTimeout(t); }
  }
  throw err;
}

export function loadJSON(path) {
  if (!cache.has(path)) cache.set(path, fetchJSON(path).catch((e) => { cache.delete(path); throw e; }));
  return cache.get(path);
}

// Tải sẵn song song (không chờ, lỗi bỏ qua — lúc dùng thật loadJSON sẽ thử lại)
export function prefetchJSON(paths) {
  for (const p of paths) loadJSON(p).catch(() => {});
}
