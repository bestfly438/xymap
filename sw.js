// 新塬应急 PWA Service Worker：仅缓存静态资源，网络优先、缓存兜底
var CACHE = 'xinyuan-v1';
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(ks) {
      return Promise.all(ks.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});
self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = req.url;
  // 禁止缓存密钥校验与数据接口
  if (url.indexOf('/api/') >= 0) return;
  if (url.indexOf('version.txt') >= 0) return;
  e.respondWith(
    fetch(req).then(function(res) {
      if (res && res.status === 200 && url.indexOf(self.location.origin) === 0) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, copy); });
      }
      return res;
    }).catch(function() { return caches.match(req); })
  );
});
