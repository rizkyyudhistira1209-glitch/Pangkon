/* mixdesign.js - Kalkulator mix design beton (metode SNI 7656:2012 / ACI 211.1)
   Hasil perkiraan awal: wajib diverifikasi dengan campuran percobaan (trial mix). */

(function () {
  const $ = id => document.getElementById(id);
  const H = Penyimpanan.hargaAktif();
  const P = Penyimpanan.ambilPengaturan();
  let hasilTerakhir = null;

  /* ---- Tabel SNI 7656:2012 / ACI 211.1 (beton tanpa tambahan udara) ---- */
  // Air (kg/m3) untuk slump 25-50 | 75-100 | 150-175 mm, per ukuran maks kerikil (mm)
  const AIR_KG = { "10": [207,228,243], "12.5": [199,216,228], "19": [190,205,216],
                   "25": [179,193,202], "37.5": [166,181,190], "50": [154,169,178] };
  const UDARA = { "10": 3, "12.5": 2.5, "19": 2, "25": 1.5, "37.5": 1, "50": 0.5 }; // % udara terperangkap
  // Volume kerikil padat per m3 beton untuk modulus kehalusan pasir 2,4 | 2,6 | 2,8 | 3,0
  const VOL_KERIKIL = { "10": [.50,.48,.46,.44], "12.5": [.59,.57,.55,.53], "19": [.66,.64,.62,.60],
                        "25": [.71,.69,.67,.65], "37.5": [.75,.73,.71,.69], "50": [.78,.76,.74,.72] };
  const FM_X = [2.4, 2.6, 2.8, 3.0];
  // FAS terhadap kuat tekan rata-rata target f'cr (MPa)
  const FCR_X = [15, 20, 25, 30, 35, 40, 45];
  const FAS_Y = [.79, .69, .61, .54, .47, .42, .38];
  const BJ_SEMEN = 3.15;
  const SEMEN_MIN = 275;       // kg/m3
  const TAMBAH_AIR_PECAH = 10; // kg/m3 tambahan air untuk batu pecah (asumsi)

  function interp(xs, ys, v) {
    if (v <= xs[0]) return ys[0];
    if (v >= xs[xs.length - 1]) return ys[ys.length - 1];
    for (let i = 1; i < xs.length; i++) {
      if (v <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (v - xs[i - 1]) / (xs[i] - xs[i - 1]);
    }
  }

  function tulis(id, angka, d) { $(id).value = Util.formatAngka(angka, d == null ? 2 : d).replace(/\./g, ""); }

  /* ---- Mutu f'c / K ---- */
  function satuan() { return document.querySelector('input[name="satuan"]:checked').value; }

  function fcDariInput() {
    const n = Util.parseAngka($("mutu").value);
    if (isNaN(n)) return NaN;
    return satuan() === "K" ? Util.kToFc(n) : n;
  }

  function perbaruiKetMutu() {
    const fc = fcDariInput();
    $("ketMutu").textContent = isNaN(fc) ? "" : "Setara: " + Util.teksMutu(fc);
  }

  function ubahSatuan() {
    const fc = fcDariInput();
    const k = satuan() === "K";
    $("lblMutu").textContent = k ? "Mutu beton K (kg/cm²)" : "Mutu beton f'c (MPa)";
    if (!isNaN(fc)) $("mutu").value = k ? String(Math.round(Util.fcToK(fc))) : Util.formatAngka(fc, 2);
    Penyimpanan.simpanPengaturan({ satuanMutu: satuan() });
    perbaruiKetMutu();
  }

  /* ---- Hitung ---- */
  function baca(id, nama, opsi) {
    const v = Util.validasiAngka($(id).value, Object.assign({ nama: nama }, opsi));
    if (!v.ok) galat.push(v.pesan);
    return v.nilai;
  }
  let galat = [];

  function hitung() {
    galat = [];
    const fc = fcDariInput();
    if (isNaN(fc) || fc < 10 || fc > 60) galat.push("Mutu beton harus antara f'c 10 dan 60 MPa.");

    const sTeks = $("sdev").value.trim();
    const s = sTeks === "" ? null : baca("sdev", "Standar deviasi", { min: 0.1, max: 10 });

    const fm = baca("fm", "Modulus kehalusan", { min: 1.5, max: 4 });
    const bi = baca("bi", "Berat isi padat kerikil", { min: 1000, max: 2000 });
    const bjP = baca("bjPasir", "Berat jenis pasir", { min: 2, max: 3.2 });
    const bjK = baca("bjKerikil", "Berat jenis kerikil", { min: 2, max: 3.2 });
    const abP = baca("absPasir", "Penyerapan pasir", { min: 0, max: 15 });
    const abK = baca("absKerikil", "Penyerapan kerikil", { min: 0, max: 15 });
    const kaP = baca("kaPasir", "Kadar air pasir", { min: 0, max: 40 });
    const kaK = baca("kaKerikil", "Kadar air kerikil", { min: 0, max: 40 });
    const volE = baca("volEmber", "Volume ember", { min: 1, max: 100 });
    const nSak = baca("jmlSak", "Semen per campuran", { min: 0.25, max: 20 });
    const biP = baca("biPasir", "Berat isi gembur pasir", { min: 0.8, max: 2 });
    const biK = baca("biKerikil", "Berat isi gembur kerikil", { min: 0.8, max: 2 });
    baca("waste", "Cadangan kehilangan", { min: 0, max: 30 });

    if (galat.length) { $("galat").textContent = galat.join(" "); $("hasil").classList.add("sembunyi"); return; }
    $("galat").textContent = "";
    const vb = perbaruiVolume();

    const slump = Util.parseAngka($("slump").value);
    const ukuran = $("ukuran").value;
    const fasMaksPaparan = Number($("paparan").value);
    const sakKg = H.sakSemenKg;

    // 1. Kuat tekan rata-rata target f'cr
    let fcr, rumusFcr;
    if (s !== null) {
      const a = fc + 1.34 * s;
      const b = fc <= 35 ? fc + 2.33 * s - 3.5 : 0.9 * fc + 2.33 * s;
      fcr = Math.max(a, b); rumusFcr = "dari standar deviasi";
    } else if (fc < 21) { fcr = fc + 7.0; rumusFcr = "f'c + 7,0 (tanpa data)"; }
    else if (fc <= 35) { fcr = fc + 8.5; rumusFcr = "f'c + 8,5 (tanpa data)"; }
    else { fcr = 1.1 * fc + 5.0; rumusFcr = "1,1 f'c + 5,0 (tanpa data)"; }

    // 2. Air dan udara
    const baris = slump <= 5 ? 0 : (slump <= 10 ? 1 : 2);
    let air = AIR_KG[ukuran][baris] + ($("jenis").value === "pecah" ? TAMBAH_AIR_PECAH : 0);
    const udara = UDARA[ukuran];

    // 3. FAS (kuat tekan vs paparan) dan semen
    const fasKuat = interp(FCR_X, FAS_Y, fcr);
    let fas = fasMaksPaparan > 0 ? Math.min(fasKuat, fasMaksPaparan) : fasKuat;
    let semen = air / fas;
    const catatan = [];
    if (fcr > 45) catatan.push("f'cr di atas 45 MPa: FAS diambil dari batas tabel, perlu trial mix dan bahan tambah.");
    if (semen < SEMEN_MIN) {
      semen = SEMEN_MIN; fas = air / semen;
      catatan.push("Semen dinaikkan ke batas minimum 275 kg/m³.");
    }

    // 4. Kerikil (volume padat x berat isi), 5. Pasir (volume absolut)
    const volPadat = interp(FM_X, VOL_KERIKIL[ukuran], fm);
    const kerikilKering = volPadat * bi;
    const kerikilSSD = kerikilKering * (1 + abK / 100);
    const vol = air / 1000 + semen / (BJ_SEMEN * 1000) + udara / 100 + kerikilSSD / (bjK * 1000);
    const volPasir = 1 - vol;
    if (volPasir <= 0.05) {
      $("galat").textContent = "Data agregat tidak masuk akal (volume pasir terlalu kecil). Periksa berat isi dan berat jenis kerikil.";
      $("hasil").classList.add("sembunyi"); return;
    }
    const pasirSSD = volPasir * bjP * 1000;

    // 6. Koreksi kadar air lapangan
    const pasirKering = pasirSSD / (1 + abP / 100);
    const pasirLap = pasirKering * (1 + kaP / 100);
    const kerikilLap = kerikilKering * (1 + kaK / 100);
    let airLap = air - pasirKering * (kaP - abP) / 100 - kerikilKering * (kaK - abK) / 100;
    if (airLap < 0) { airLap = 0; catatan.push("Agregat sangat basah: air campuran menjadi nol, periksa kadar air."); }

    // Satuan ember dan campuran
    const f = nSak * sakKg / semen;   // m3 beton per campuran
    const eP = Util.kgKeEmber(pasirLap, biP, volE);
    const eK = Util.kgKeEmber(kerikilLap, biK, volE);
    const eA = airLap / volE;         // 1 liter air = 1 kg

    // Biaya per m3
    const biaya = {
      semen: semen / sakKg * H.material.semen.harga,
      pasir: pasirLap / (biP * 1000) * H.material.pasir.harga,
      kerikil: kerikilLap / (biK * 1000) * H.material.kerikil.harga
    };
    biaya.total = biaya.semen + biaya.pasir + biaya.kerikil;

    hasilTerakhir = {
      waktu: new Date().toISOString(), mutuFc: fc, fcr, fas, volumeEmber: volE, sakPerCampuran: nSak,
      perM3: { semenKg: semen, pasirKg: pasirLap, kerikilKg: kerikilLap, airLiter: airLap },
      perCampuran: { m3: f, semenSak: nSak, pasirEmber: eP * f, kerikilEmber: eK * f, airEmber: eA * f },
      biayaPerM3: biaya.total, volume: vb
    };
    tampil({ fc, fcr, rumusFcr, fas, semen, pasirLap, kerikilLap, airLap, eP, eK, eA, f, nSak, sakKg, biaya, catatan, volE, biP, biK, vTot: vb.total });
  }

  function tampil(r) {
    const n0 = x => Util.formatAngka(x, 0), n1 = x => Util.formatAngka(x, 1), n2 = x => Util.formatAngka(x, 2);
    const E = x => Util.formatEmber(x);
    const kol = r.nSak === 1 ? "1 sak semen" : n1(r.nSak) + " sak semen";
    const T = r.vTot;
    let totalHtml = '<p class="catatan">Isi volume pekerjaan di bagian 2 untuk melihat kebutuhan total material.</p>';
    if (T > 0) {
      const up = x => Util.formatAngka(Math.ceil(x), 0);
      totalHtml =
        '<h3 style="margin-top:16px">Kebutuhan material untuk ' + n2(T) + ' m³ beton</h3>' +
        '<div class="gulir"><table>' +
        '<tr><th>Bahan</th><th class="angka">Jumlah</th><th class="angka">Setara</th></tr>' +
        '<tr><td>Semen</td><td class="angka">' + n0(r.semen * T) + ' kg</td><td class="angka"><b>' + up(r.semen * T / r.sakKg) + ' sak</b></td></tr>' +
        '<tr><td>Pasir</td><td class="angka">' + n0(r.pasirLap * T) + ' kg (' + n1(r.pasirLap * T / (r.biP * 1000)) + ' m³ gembur)</td><td class="angka"><b>' + up(r.eP * T) + ' ember</b></td></tr>' +
        '<tr><td>Kerikil / split</td><td class="angka">' + n0(r.kerikilLap * T) + ' kg (' + n1(r.kerikilLap * T / (r.biK * 1000)) + ' m³ gembur)</td><td class="angka"><b>' + up(r.eK * T) + ' ember</b></td></tr>' +
        '<tr><td>Air</td><td class="angka">' + n0(r.airLap * T) + ' liter</td><td class="angka"><b>' + up(r.eA * T) + ' ember</b></td></tr>' +
        '<tr><td>Jumlah campuran</td><td class="angka">' + up(T / r.f) + ' kali</td><td class="angka">@ ' + kol + '</td></tr>' +
        '<tr><th>Biaya bahan</th><th class="angka" colspan="2">' + Util.formatRupiah(r.biaya.total * T) + '</th></tr>' +
        '</table></div>';
    }
    $("hasil").innerHTML =
      '<h2>Hasil campuran</h2>' +
      '<p class="sorot">' + Util.teksMutu(r.fc) + '<br>FAS ' + n2(r.fas) + ', semen ' + n1(r.semen / r.sakKg) + ' sak per m³</p>' +
      '<p class="bantuan">f\'cr target ' + n2(r.fcr) + ' MPa (' + r.rumusFcr + '). Ember ' + Util.formatAngka(r.volE, 1) + ' liter. Satu campuran (' + kol + ') menghasilkan sekitar ' + n2(r.f) + ' m³ beton.</p>' +
      '<div class="gulir"><table>' +
      '<tr><th>Bahan</th><th class="angka">Per m³ beton</th><th class="angka">Per campuran (' + kol + ')</th></tr>' +
      '<tr><td>Semen</td><td class="angka">' + n0(r.semen) + ' kg (' + n1(r.semen / r.sakKg) + ' sak)</td><td class="angka">' + n1(r.nSak) + ' sak</td></tr>' +
      '<tr><td>Pasir</td><td class="angka">' + n0(r.pasirLap) + ' kg (' + E(r.eP) + ')</td><td class="angka"><b>' + E(r.eP * r.f) + '</b></td></tr>' +
      '<tr><td>Kerikil / split</td><td class="angka">' + n0(r.kerikilLap) + ' kg (' + E(r.eK) + ')</td><td class="angka"><b>' + E(r.eK * r.f) + '</b></td></tr>' +
      '<tr><td>Air</td><td class="angka">' + n0(r.airLap) + ' liter (' + E(r.eA) + ')</td><td class="angka"><b>' + E(r.eA * r.f) + '</b></td></tr>' +
      '</table></div>' + totalHtml +
      '<h3 style="margin-top:16px">Perkiraan biaya bahan per m³</h3>' +
      '<div class="gulir"><table>' +
      '<tr><td>Semen</td><td class="angka">' + Util.formatRupiah(r.biaya.semen) + '</td></tr>' +
      '<tr><td>Pasir</td><td class="angka">' + Util.formatRupiah(r.biaya.pasir) + '</td></tr>' +
      '<tr><td>Kerikil / split</td><td class="angka">' + Util.formatRupiah(r.biaya.kerikil) + '</td></tr>' +
      '<tr><th>Total bahan</th><th class="angka">' + Util.formatRupiah(r.biaya.total) + '</th></tr>' +
      '</table></div>' +
      r.catatan.map(c => '<p class="catatan">' + c + '</p>').join("") +
      '<p class="catatan">Ini perkiraan awal. Buat campuran percobaan dan uji kuat tekan sebelum dipakai untuk struktur. Harga dari harga.js atau pengaturan lokal.</p>' +
      '<button class="tombol sekunder" type="button" id="btnSimpan">Simpan hasil</button> <span id="infoSimpan" class="bantuan"></span>';
    $("hasil").classList.remove("sembunyi");
    $("btnSimpan").addEventListener("click", simpanHasil);
    $("hasil").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function simpanHasil() {
    if (!hasilTerakhir) return;
    const ok = Penyimpanan.simpan("mixdesign_" + Date.now(), hasilTerakhir);
    $("infoSimpan").textContent = ok ? "Hasil tersimpan." : "Gagal menyimpan: penyimpanan browser penuh atau tidak tersedia.";
  }

  /* ---- Volume beton per pekerjaan ---- */
  const JENIS = {
    kolom: { lab: ["Lebar (cm)", "Tebal (cm)", "Tinggi (m)"], f: (a, b, c) => a / 100 * b / 100 * c },
    balok: { lab: ["Lebar (cm)", "Tinggi (cm)", "Panjang (m)"], f: (a, b, c) => a / 100 * b / 100 * c },
    pelat: { lab: ["Panjang (m)", "Lebar (m)", "Tebal (cm)"], f: (a, b, c) => a * b * c / 100 },
    lain:  { lab: ["Volume (m³)", "", ""], f: a => a }
  };
  const daftarVol = $("daftarVol");
  let nomorBaris = 0;

  function tambahBaris() {
    const n = ++nomorBaris;
    const d = document.createElement("div");
    d.className = "pekerjaan";
    const kolom = (k) => '<div class="v-w' + k + '"><label for="v' + k + n + '" class="v-l' + k + '"></label>' +
      '<input id="v' + k + n + '" class="v-' + k + '" type="text" inputmode="decimal"></div>';
    d.innerHTML =
      '<div class="kisi">' +
        '<div><label for="vn' + n + '">Nama / lokasi (opsional)</label><input id="vn' + n + '" class="v-nama" type="text" placeholder="Contoh: K1 lantai 1"></div>' +
        '<div><label for="vj' + n + '">Jenis pekerjaan</label><select id="vj' + n + '" class="v-jenis">' +
          '<option value="kolom">Kolom</option><option value="balok">Balok</option>' +
          '<option value="pelat">Pelat lantai</option><option value="lain">Lainnya (isi m³)</option></select></div>' +
        '<div><label for="vm' + n + '">Jumlah (buah)</label><input id="vm' + n + '" class="v-jml" type="text" inputmode="decimal" value="1"></div>' +
      '</div>' +
      '<div class="kisi">' + kolom("a") + kolom("b") + kolom("c") + '</div>' +
      '<p class="v-hasil"><span class="v-teks"></span><button class="tombol bahaya v-hapus" type="button">Hapus</button></p>';
    daftarVol.appendChild(d);
    ubahJenis(d);
    perbaruiVolume();
  }

  function ubahJenis(baris) {
    const jn = JENIS[baris.querySelector(".v-jenis").value];
    ["a", "b", "c"].forEach((k, i) => {
      baris.querySelector(".v-l" + k).textContent = jn.lab[i];
      baris.querySelector(".v-w" + k).classList.toggle("sembunyi", jn.lab[i] === "");
    });
  }

  function volumeBaris(baris) {
    const jenis = baris.querySelector(".v-jenis").value;
    const n = Util.parseAngka(baris.querySelector(".v-jml").value);
    const a = Util.parseAngka(baris.querySelector(".v-a").value);
    const b = jenis === "lain" ? 1 : Util.parseAngka(baris.querySelector(".v-b").value);
    const c = jenis === "lain" ? 1 : Util.parseAngka(baris.querySelector(".v-c").value);
    if ([n, a, b, c].some(x => isNaN(x) || x <= 0)) return null;
    return JENIS[jenis].f(a, b, c) * n;
  }

  function perbaruiVolume() {
    const rows = [];
    let sub = 0;
    daftarVol.querySelectorAll(".pekerjaan").forEach(baris => {
      const v = volumeBaris(baris);
      baris.querySelector(".v-teks").textContent = v === null ? "Isi semua kolom dengan angka lebih dari 0" : "Volume: " + Util.formatAngka(v, 3) + " m³";
      if (v !== null) {
        sub += v;
        rows.push({ nama: baris.querySelector(".v-nama").value.trim(), jenis: baris.querySelector(".v-jenis").value, m3: v });
      }
    });
    const w = Util.parseAngka($("waste").value);
    const waste = isNaN(w) || w < 0 ? 0 : w;
    const total = sub * (1 + waste / 100);
    $("totalVol").textContent = "Volume dibutuhkan: " + Util.formatAngka(total, 2) + " m³" +
      (sub > 0 ? " (bersih " + Util.formatAngka(sub, 2) + " m³ + " + Util.formatAngka(waste, 1) + "%)" : "");
    return { rows: rows, bersih: sub, wastePersen: waste, total: total };
  }

  daftarVol.addEventListener("input", perbaruiVolume);
  daftarVol.addEventListener("change", function (e) {
    if (e.target.classList.contains("v-jenis")) ubahJenis(e.target.closest(".pekerjaan"));
    perbaruiVolume();
  });
  daftarVol.addEventListener("click", function (e) {
    if (e.target.classList.contains("v-hapus")) { e.target.closest(".pekerjaan").remove(); perbaruiVolume(); }
  });
  $("btnTambah").addEventListener("click", tambahBaris);
  $("waste").addEventListener("input", perbaruiVolume);
  tambahBaris();

  /* ---- Inisialisasi ---- */
  function simpanEmber() {
    const v = Util.parseAngka($("volEmber").value), a = Util.parseAngka($("biPasir").value), b = Util.parseAngka($("biKerikil").value);
    const p = {};
    if (v > 0) p.volumeEmber = v;
    if (a > 0) p.beratIsiPasir = a;
    if (b > 0) p.beratIsiKerikil = b;
    Penyimpanan.simpanPengaturan(p);
  }

  $("volEmber").value = Util.formatAngka(P.volumeEmber, 1);
  $("biPasir").value = Util.formatAngka(P.beratIsiPasir || H.EMBER.beratIsi.pasir, 2);
  $("biKerikil").value = Util.formatAngka(P.beratIsiKerikil || H.EMBER.beratIsi.kerikil, 2);
  if (P.satuanMutu === "K") {
    $("satK").checked = true;
    $("lblMutu").textContent = "Mutu beton K (kg/cm²)";
    $("mutu").value = "250";
  }
  perbaruiKetMutu();

  document.querySelectorAll('input[name="satuan"]').forEach(el => el.addEventListener("change", ubahSatuan));
  $("mutu").addEventListener("input", perbaruiKetMutu);
  ["volEmber", "biPasir", "biKerikil"].forEach(id => $(id).addEventListener("change", simpanEmber));
  $("btnHitung").addEventListener("click", function () { simpanEmber(); hitung(); });
})();
