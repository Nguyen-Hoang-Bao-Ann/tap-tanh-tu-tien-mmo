// ============================================================
// GĐ375: Service Worker cho PWA — THIẾT KẾ ƯU TIÊN KHÔNG KẸT BẢN CŨ:
// - Điều hướng (mở game) + bundle JS/CSS trong /assets/: NETWORK-FIRST.
//   Có mạng là luôn nhận bản mới nhất sau mỗi lần deploy; mất mạng mới
//   dùng bản đã lưu. Đây là lớp chống "kẹt bản cũ" quan trọng nhất.
// - Ảnh tĩnh (sprite, splash, icon...): CACHE-FIRST — khớp chiến lược
//   cache 7 ngày của GĐ340, vào lại game gần như không tải lại hình.
// - TUYỆT ĐỐI KHÔNG đụng: socket.io, /api/, request không phải GET.
// - Muốn ép mọi máy nhận SW mới: tăng số ở CACHE_VER rồi build lại.
// ============================================================
const CACHE_VER = 'ttt-pwa-v375-1';
const CORE = ['/', '/manifest.webmanifest', '/pwa/icon-192.png', '/pwa/icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VER)
      .then((c) => c.addAll(CORE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VER).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return; // POST/PUT... (đăng nhập, hành động game) — để nguyên cho mạng
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // tài nguyên ngoài (nếu có) — không đụng
  if (url.pathname.startsWith('/socket.io/') || url.pathname.startsWith('/api/')) return; // realtime + API — không bao giờ cache

  const isNav = req.mode === 'navigate';
  const isBundle = url.pathname.startsWith('/assets/');
  if (isNav || isBundle) {
    // NETWORK-FIRST: mạng trả gì dùng nấy và cập nhật bản lưu; lỗi mạng mới mở bản lưu.
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE_VER).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  // Còn lại (ảnh/font/tĩnh): CACHE-FIRST, thiếu mới ra mạng rồi lưu lại.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VER).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
