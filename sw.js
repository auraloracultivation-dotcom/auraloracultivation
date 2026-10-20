// Luôn ưu tiên bản mới nhất từ máy chủ (network-first), có mạng thì không bao giờ dùng code cũ.
// Tránh lỗi "code cũ + dữ liệu mới" sau mỗi lần cập nhật. Mất mạng thì dùng bản đã lưu.
const CACHE = 'tu-chan-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith((async () => {
    try {
      const res = await fetch(req, { cache: 'no-cache' }); // hỏi lại máy chủ; không đổi thì nhận 304, rất nhẹ
      if (res.ok) {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch (err) {
      const hit = await caches.match(req);
      if (hit) return hit;
      throw err;
    }
  })());
});
