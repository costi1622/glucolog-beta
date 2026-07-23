/* Nivelo service worker — funcționare 100% offline */
const CACHE = 'glucolog-v1.22';
const SHELL = ['./', './index.html', './privacy.html',
               './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  // NU folosim cache.addAll: e totul-sau-nimic. Dacă UN singur fișier din listă
  // lipsește sau dă eroare (de exemplu privacy.html neîncărcat în repo), întreaga
  // instalare eșuează, service worker-ul nu se activează, iar Chrome nu mai oferă
  // „Instalează aplicația" — doar „Create shortcut". Punem fișierele unul câte unul
  // și tolerăm eșecurile individuale.
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => null))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Manifestul NU trece prin service worker. Îl lăsăm complet în seama browserului:
  // el decide cum îl ia și îl reîmprospătează. Orice intervenție aici riscă să strice
  // instalarea aplicației (Chrome ar oferi doar „Create shortcut"), iar offline
  // manifestul oricum nu e necesar — la instalare ești conectat.
  if (new URL(e.request.url).pathname.endsWith('.webmanifest')) return;

  e.respondWith(
    caches.match(e.request, {ignoreSearch: true}).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => caches.match('./index.html'))
    )
  );
});
