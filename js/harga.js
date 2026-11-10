/* harga.js - Konfigurasi harga & koefisien (dipakai laporan.js dan mixdesign.js)
   PENTING: angka di bawah hanya CONTOH awal. Sesuaikan dengan harga di daerah/proyek Anda.
   Pengguna juga bisa menimpa nilai lewat aplikasi (disimpan di localStorage),
   tanpa mengubah file ini. Lihat Penyimpanan.hargaAktif() di storage.js. */

const HARGA = {
  versi: 1,
  mataUang: "IDR",

  /* Material: harga per satuan (Rupiah) */
  material: {
    semen:   { nama: "Semen (sak 40 kg)", satuan: "sak", harga: 65000 },
    pasir:   { nama: "Pasir beton",       satuan: "m3",  harga: 250000 },
    kerikil: { nama: "Split / kerikil",   satuan: "m3",  harga: 320000 },
    besi:    { nama: "Besi beton",        satuan: "kg",  harga: 15000 },
    kayu:    { nama: "Kayu bekisting",    satuan: "m3",  harga: 2800000 },
    kawat:   { nama: "Kawat bendrat",     satuan: "kg",  harga: 22000 }
  },

  /* Upah tenaga kerja: Rupiah per hari */
  upah: {
    mandor: { nama: "Mandor", satuan: "OH", harga: 190000 },
    kepala: { nama: "Kepala tukang", satuan: "OH", harga: 180000 },
    tukang: { nama: "Tukang", satuan: "OH", harga: 160000 },
    pekerja: { nama: "Pekerja / kenek", satuan: "OH", harga: 120000 }
  },

  /* Sewa alat */
  alat: {
    molen:    { nama: "Molen beton",     satuan: "hari", harga: 250000 },
    vibrator: { nama: "Vibrator beton",  satuan: "hari", harga: 150000 },
    pompaAir: { nama: "Pompa air",       satuan: "hari", harga: 100000 }
  },

  /* Semen: berat per sak (kg). Bisa diganti 50. */
  sakSemenKg: 40,

  /* Ember: volume dan berat isi gembur (kg per liter) */
  EMBER: {
    volumeLiter: 10,
    beratIsi: {
      semen: 1.15,
      pasir: 1.40,
      kerikil: 1.45
    }
  }
};
