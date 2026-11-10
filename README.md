# Aplikasi Pelaksana Konstruksi

Aplikasi web (HTML/CSS/JavaScript murni) untuk pelaksana proyek konstruksi:

1. **Laporan Harian & Anggaran Pelaksanaan**: tenaga kerja, material, peralatan, progres, realisasi vs rencana biaya, akumulasi proyek, cetak/PDF.
2. **Kalkulator Mix Design Beton**: mutu f'c (MPa) atau K, volume beton dari dimensi kolom/balok/pelat, kebutuhan material dalam kg, sak, dan **ember**, serta perkiraan biaya.

## Struktur

```
konstruksi-app/
├── index.html  laporan.html  mixdesign.html  harga.html
├── manifest.json  sw.js            (agar bisa dipasang di HP dan jalan offline)
├── icons/                          (ikon aplikasi)
├── css/  style.css  landing.css  laporan.css  print.css
└── js/   harga.js  util.js  storage.js  laporan.js  mixdesign.js  pengaturan.js  pwa.js
```

## Menjalankan di komputer

Klik dua kali `index.html`, atau di VS Code klik kanan lalu **Open with Live Server**.
Mode offline (service worker) tidak aktif jika dibuka lewat `file://`; fitur lain tetap jalan.

## Memasang di HP (offline)

Service worker hanya berjalan lewat **https** (atau localhost), jadi folder ini perlu di-hosting dulu. Cara gratis: GitHub Pages.

1. Buat repositori di GitHub, unggah seluruh isi folder `konstruksi-app`.
2. Buka **Settings > Pages**, pilih branch `main` dan folder `/ (root)`, lalu simpan.
3. Buka alamat `https://NAMAANDA.github.io/NAMAREPO/` di Chrome HP.
4. Menu Chrome > **Tambahkan ke layar utama** / **Instal aplikasi**.

Setelah dibuka sekali dengan internet, aplikasi bisa dipakai tanpa sinyal.
Jika Anda mengubah file aplikasi, naikkan angka `VERSI` di `sw.js` (misalnya `konstruksi-v2`) agar HP memuat versi terbaru.

## Mengubah harga

Cara termudah: buka **Pengaturan harga** dari halaman depan, ubah angka, lalu **Simpan harga**. Harga tersimpan di browser perangkat itu. Tombol *Kembalikan ke harga bawaan* menghapus perubahan.

Untuk mengubah harga bawaan semua pengguna, buka `js/harga.js` dan ubah angka `harga` pada blok `material`, `upah`, dan `alat`. Di blok yang sama:

- `sakSemenKg`: berat sak semen (40 atau 50).
- `EMBER.volumeLiter`: volume ember (bawaan 10 liter). Volume ember juga bisa diubah langsung di halaman Mix Design.
- `EMBER.beratIsi`: berat isi gembur semen, pasir, kerikil (kg/liter).

Semua harga bawaan hanya **contoh**; sesuaikan dengan harga di daerah proyek. Di halaman Laporan, harga tiap baris juga bisa diubah langsung untuk laporan itu saja.

## Data dan cadangan

Data tersimpan di `localStorage` browser, terpisah untuk tiap HP/browser, dan **hilang jika data situs dibersihkan**.
Di halaman depan ada tombol **Simpan cadangan data** (mengunduh berkas JSON) dan **Pulihkan dari cadangan**. Buat cadangan secara rutin.

## Catatan mix design

- Metode mengikuti SNI 7656:2012 (ACI 211.1) untuk beton normal tanpa tambahan udara.
- Asumsi yang dipakai sendiri oleh aplikasi: tambahan air +10 kg/m³ untuk batu pecah, semen minimum 275 kg/m³, FAS maksimum 0,50 (basah) dan 0,45 (air laut/sulfat).
- Konversi mutu: f'c = 0,083 x K.
- Hasil adalah perkiraan awal. Lakukan campuran percobaan dan uji kuat tekan sebelum dipakai untuk struktur.
- Berat isi gembur pasir dan kerikil sangat memengaruhi jumlah ember; timbang sendiri di proyek.
