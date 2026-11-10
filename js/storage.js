/* storage.js - Pembungkus localStorage dengan awalan kunci "konstruksi_"
   Catatan: data hilang jika cache/data situs browser dibersihkan.
   Gunakan ekspor() secara berkala sebagai cadangan. */

const Penyimpanan = (function () {
  const AWALAN = "konstruksi_";
  const K_PENGATURAN = "pengaturan";
  const K_HARGA = "harga_lokal";

  function tersedia() {
    try {
      const uji = AWALAN + "__uji";
      localStorage.setItem(uji, "1");
      localStorage.removeItem(uji);
      return true;
    } catch (e) { return false; }
  }

  /* Mengembalikan true jika berhasil, false jika gagal (kuota penuh / mode privat) */
  function simpan(kunci, data) {
    try {
      localStorage.setItem(AWALAN + kunci, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error("Gagal menyimpan:", kunci, e);
      return false;
    }
  }

  function ambil(kunci, bawaan = null) {
    try {
      const mentah = localStorage.getItem(AWALAN + kunci);
      return mentah === null ? bawaan : JSON.parse(mentah);
    } catch (e) {
      console.error("Gagal membaca:", kunci, e);
      return bawaan;
    }
  }

  function hapus(kunci) {
    try { localStorage.removeItem(AWALAN + kunci); return true; }
    catch (e) { return false; }
  }

  /* Daftar kunci (tanpa awalan) yang diawali teks tertentu, mis. "laporan_" */
  function daftar(awalan = "") {
    const hasil = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(AWALAN + awalan)) hasil.push(k.slice(AWALAN.length));
      }
    } catch (e) {}
    return hasil.sort();
  }

  /* Pengaturan pengguna: volume ember, satuan mutu terakhir, berat sak semen, dll. */
  function ambilPengaturan() {
    const bawaan = {
      volumeEmber: HARGA.EMBER.volumeLiter,   // 10 liter
      satuanMutu: "fc",                       // "fc" (utama) atau "K"
      sakSemenKg: HARGA.sakSemenKg            // 40 kg
    };
    return Object.assign(bawaan, ambil(K_PENGATURAN, {}));
  }

  function simpanPengaturan(sebagian) {
    return simpan(K_PENGATURAN, Object.assign(ambilPengaturan(), sebagian));
  }

  /* Harga aktif = HARGA bawaan + timpaan lokal pengguna.
     Bentuk timpaan: { material: {semen: 70000}, upah: {tukang: 170000}, alat: {...} } */
  function hargaAktif() {
    const lokal = ambil(K_HARGA, {});
    const salin = JSON.parse(JSON.stringify(HARGA));
    ["material", "upah", "alat"].forEach(grup => {
      const t = lokal[grup] || {};
      Object.keys(t).forEach(id => {
        if (salin[grup][id] && isFinite(t[id])) salin[grup][id].harga = t[id];
      });
    });
    const p = ambilPengaturan();
    salin.EMBER.volumeLiter = p.volumeEmber;
    salin.sakSemenKg = p.sakSemenKg;
    return salin;
  }

  function simpanHargaLokal(grup, id, harga) {
    const lokal = ambil(K_HARGA, {});
    lokal[grup] = lokal[grup] || {};
    lokal[grup][id] = harga;
    return simpan(K_HARGA, lokal);
  }

  function resetHargaLokal() { return hapus(K_HARGA); }

  /* Cadangan: ekspor semua data aplikasi ke berkas JSON */
  function ekspor() {
    const isi = {};
    daftar("").forEach(k => { isi[k] = ambil(k); });
    const blob = new Blob(
      [JSON.stringify({ aplikasi: "konstruksi-app", diekspor: new Date().toISOString(), data: isi }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "cadangan-konstruksi-" + Util.tanggalISO() + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* Pulihkan dari berkas JSON (objek File). Mengembalikan Promise<jumlah kunci>. */
  function impor(berkas) {
    return new Promise((selesai, gagal) => {
      const pembaca = new FileReader();
      pembaca.onerror = () => gagal(new Error("Berkas tidak bisa dibaca."));
      pembaca.onload = () => {
        try {
          const obj = JSON.parse(pembaca.result);
          if (obj.aplikasi !== "konstruksi-app" || typeof obj.data !== "object")
            throw new Error("Berkas bukan cadangan aplikasi ini.");
          let n = 0;
          Object.keys(obj.data).forEach(k => { if (simpan(k, obj.data[k])) n++; });
          selesai(n);
        } catch (e) { gagal(e); }
      };
      pembaca.readAsText(berkas);
    });
  }

  return {
    tersedia, simpan, ambil, hapus, daftar,
    ambilPengaturan, simpanPengaturan,
    hargaAktif, simpanHargaLokal, resetHargaLokal,
    ekspor, impor
  };
})();
