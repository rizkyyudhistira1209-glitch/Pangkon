/* pwa.js - Daftarkan service worker (hanya jalan lewat https atau localhost, bukan file://) */
if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function (e) {
      console.warn("Service worker gagal didaftarkan:", e);
    });
  });
}
