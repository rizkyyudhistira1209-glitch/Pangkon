/* sw.js - Cache agar aplikasi bisa dibuka tanpa internet.
   Setiap kali Anda mengubah file aplikasi, naikkan angka VERSI agar HP memuat versi baru. */
const VERSI = "konstruksi-v2";
const BERKAS = [
  "./", "index.html", "laporan.html", "mixdesign.html", "harga.html", "manifest.json",
  "css/style.css", "css/landing.css", "css/laporan.css", "css/print.css",
  "js/harga.js", "js/util.js", "js/storage.js", "js/laporan.js", "js/mixdesign.js", "js/pengaturan.js", "js/pwa.js",
  "icons/icon-192.png", "icons/icon-512.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(BERKAS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (nama) {
      return Promise.all(nama.filter(function (n) { return n !== VERSI; }).map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

/* Tampilkan dari cache dulu (cepat, offline), lalu perbarui cache di latar belakang */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then(function (tersimpan) {
      const jaringan = fetch(e.request).then(function (res) {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          const salinan = res.clone();
          caches.open(VERSI).then(function (c) { c.put(e.request, salinan); });
        }
        return res;
      }).catch(function () { return tersimpan; });
      return tersimpan || jaringan;
    })
  );
});
