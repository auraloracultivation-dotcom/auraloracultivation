// Luôn ưu tiên bản mới nhất từ máy chủ (network-first), có mạng thì không bao giờ dùng code cũ.
// Tránh lỗi "code cũ + dữ liệu mới" sau mỗi lần cập nhật. Mất mạng thì dùng bản đã lưu.
const CACHE = 'tu-chan-v3'; // đổi tên khi cần dọn sạch bản lưu cũ

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => { // xoá các bản cache cũ (v1…) cho đỡ đầy bộ nhớ máy
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // Hình / âm thanh (assets/): đã lưu thì trả NGAY rồi lặng lẽ hỏi bản mới cho lần sau — vào game nhanh trên 4G.
  // Code + dữ liệu vẫn hỏi máy chủ trước (không bao giờ chạy code cũ với dữ liệu mới).
  if (url.pathname.includes('/assets/')) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE), key = url.origin + url.pathname, hit = await cache.match(key);
      const fresh = fetch(req).then((res) => { if (res.ok) cache.put(key, res.clone()); return res; });
      if (hit) { e.waitUntil(fresh.catch(() => {})); return hit; }
      return fresh;
    })());
    return;
  }
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' }); // hỏi lại máy chủ; không đổi thì nhận 304, rất nhẹ
      if (res.ok) {
        const cache = await caches.open(CACHE);
        // bỏ query (?v=129, ?offline…) khi lưu: mỗi file chỉ một bản, không phình theo số phiên bản
        cache.put(url.pathname === '/' || url.pathname.endsWith('.html') ? req : url.origin + url.pathname, res.clone());
      }
      return res;
    } catch (err) {
      const hit = (await caches.match(req)) || (await caches.match(url.origin + url.pathname));
      if (hit) return hit;
      throw err;
    }
  })());
});
