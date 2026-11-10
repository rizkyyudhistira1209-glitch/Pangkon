/* laporan.js - Laporan harian & anggaran pelaksanaan */
(function () {
  const $ = id => document.getElementById(id);
  const H = Penyimpanan.hargaAktif();
  const GRUP = {
    tenaga:   { kat: H.upah,     qty: "Jumlah (orang)", satuan: "OH" },
    material: { kat: H.material, qty: "Volume",         satuan: "" },
    alat:     { kat: H.alat,     qty: "Jumlah (hari)",  satuan: "hari" }
  };
  let idAktif = null, no = 0;

  const angka = t => { const n = Util.parseAngka(t); return isNaN(n) ? 0 : n; };
  const teksAngka = n => String(n).replace(".", ",");
  const rp = Util.formatRupiah;

  function el(tag, kelas, teks) {
    const e = document.createElement(tag);
    if (kelas) e.className = kelas;
    if (teks != null) e.textContent = teks;
    return e;
  }

  /* ---- Baris biaya (tenaga, material, alat) ---- */
  function tambahBiaya(grup, data) {
    const g = GRUP[grup], n = ++no;
    const d = el("div", "pekerjaan"); d.dataset.grup = grup;
    d.innerHTML =
      '<div class="kisi">' +
      '<div><label for="i' + n + '">Item</label><select id="i' + n + '" class="b-item"></select></div>' +
      '<div class="b-wnama sembunyi"><label for="m' + n + '">Nama item</label><input id="m' + n + '" class="b-nama" type="text"></div>' +
      '<div><label for="q' + n + '" class="b-lq"></label><input id="q' + n + '" class="b-qty" type="text" inputmode="decimal"></div>' +
      '<div><label for="s' + n + '">Satuan</label><input id="s' + n + '" class="b-sat" type="text"></div>' +
      '<div><label for="h' + n + '">Harga satuan (Rp)</label><input id="h' + n + '" class="b-harga" type="text" inputmode="decimal"></div>' +
      '</div><p class="v-hasil"><span class="b-sub"></span><button class="tombol bahaya tidak-cetak b-hapus" type="button">Hapus</button></p>';
    d.querySelector(".b-lq").textContent = g.qty;
    const sel = d.querySelector(".b-item");
    Object.keys(g.kat).forEach(k => { const o = el("option", null, g.kat[k].nama); o.value = k; sel.appendChild(o); });
    const lain = el("option", null, "Lainnya (isi sendiri)"); lain.value = "lain"; sel.appendChild(lain);
    $("list-" + grup).appendChild(d);

    if (data) {
      sel.value = data.item;
      d.querySelector(".b-nama").value = data.nama || "";
      d.querySelector(".b-qty").value = teksAngka(data.qty);
      d.querySelector(".b-sat").value = data.satuan;
      d.querySelector(".b-harga").value = teksAngka(data.harga);
      d.querySelector(".b-wnama").classList.toggle("sembunyi", data.item !== "lain");
    } else {
      isiDariKatalog(d);
    }
    perbarui();
    return d;
  }

  function isiDariKatalog(d) {
    const g = GRUP[d.dataset.grup], k = d.querySelector(".b-item").value;
    const lain = k === "lain";
    d.querySelector(".b-wnama").classList.toggle("sembunyi", !lain);
    if (!lain) {
      d.querySelector(".b-sat").value = g.kat[k].satuan;
      d.querySelector(".b-harga").value = teksAngka(g.kat[k].harga);
    }
  }

  function bacaBiaya(grup) {
    return Array.from($("list-" + grup).querySelectorAll(".pekerjaan")).map(d => ({
      item: d.querySelector(".b-item").value,
      nama: d.querySelector(".b-nama").value.trim(),
      qty: angka(d.querySelector(".b-qty").value),
      satuan: d.querySelector(".b-sat").value.trim(),
      harga: angka(d.querySelector(".b-harga").value)
    }));
  }

  /* ---- Baris progres ---- */
  function tambahProgres(data) {
    const n = ++no, d = el("div", "pekerjaan");
    d.innerHTML =
      '<div class="kisi"><div style="grid-column: span 2"><label for="u' + n + '">Uraian pekerjaan</label><input id="u' + n + '" class="p-uraian" type="text"></div>' +
      '<div><label for="p' + n + '">Progres hari ini (%)</label><input id="p' + n + '" class="p-persen" type="text" inputmode="decimal"></div></div>' +
      '<p class="v-hasil"><span></span><button class="tombol bahaya tidak-cetak p-hapus" type="button">Hapus</button></p>';
    if (data) { d.querySelector(".p-uraian").value = data.uraian; d.querySelector(".p-persen").value = teksAngka(data.persen); }
    $("list-progres").appendChild(d);
  }

  function bacaProgres() {
    return Array.from($("list-progres").querySelectorAll(".pekerjaan")).map(d => ({
      uraian: d.querySelector(".p-uraian").value.trim(),
      persen: angka(d.querySelector(".p-persen").value)
    })).filter(p => p.uraian !== "" || p.persen > 0);
  }

  /* ---- Ringkasan & akumulasi ---- */
  const jumlah = arr => arr.reduce((s, b) => s + b.qty * b.harga, 0);

  function totalProyekSebelumnya(nama) {
    const kunci = nama.trim().toLowerCase();
    let total = 0;
    Penyimpanan.daftar("laporan_").forEach(k => {
      const l = Penyimpanan.ambil(k);
      if (l && l.id !== idAktif && (l.nama || "").trim().toLowerCase() === kunci) total += l.realisasi || 0;
    });
    return total;
  }

  function perbarui() {
    document.querySelectorAll("#list-tenaga .pekerjaan, #list-material .pekerjaan, #list-alat .pekerjaan").forEach(d => {
      d.querySelector(".b-sub").textContent = "Subtotal: " + rp(angka(d.querySelector(".b-qty").value) * angka(d.querySelector(".b-harga").value));
    });
    const t = jumlah(bacaBiaya("tenaga")), m = jumlah(bacaBiaya("material")), a = jumlah(bacaBiaya("alat"));
    const real = t + m + a;
    const rencana = angka($("anggaranHari").value), total = angka($("anggaranTotal").value);
    const akum = totalProyekSebelumnya($("nama").value) + real;
    const selisih = rencana - real;

    let h = '<div class="gulir"><table>' +
      '<tr><td>Tenaga kerja</td><td class="angka">' + rp(t) + '</td></tr>' +
      '<tr><td>Material</td><td class="angka">' + rp(m) + '</td></tr>' +
      '<tr><td>Peralatan</td><td class="angka">' + rp(a) + '</td></tr>' +
      '<tr><th>Realisasi hari ini</th><th class="angka">' + rp(real) + '</th></tr>';
    if (rencana > 0) {
      h += '<tr><td>Rencana hari ini</td><td class="angka">' + rp(rencana) + '</td></tr>' +
        '<tr><td>Selisih (rencana - realisasi)</td><td class="angka ' + (selisih < 0 ? "lebih" : "hemat") + '">' +
        (selisih < 0 ? "Melebihi " + rp(-selisih) : "Hemat " + rp(selisih)) + '</td></tr>';
    }
    h += '<tr><td>Akumulasi realisasi proyek</td><td class="angka">' + rp(akum) + '</td></tr>';
    if (total > 0) {
      const sisa = total - akum;
      h += '<tr><td>Total anggaran proyek</td><td class="angka">' + rp(total) + '</td></tr>' +
        '<tr><td>Sisa anggaran (' + Util.formatAngka(sisa / total * 100, 1) + '%)</td><td class="angka ' + (sisa < 0 ? "lebih" : "hemat") + '">' + rp(sisa) + '</td></tr>';
    }
    $("ringkasan").innerHTML = h + '</table></div>';
    return real;
  }

  /* ---- Simpan, muat, daftar ---- */
  function kumpulkan() {
    return {
      id: idAktif || Date.now(),
      nama: $("nama").value.trim(), lokasi: $("lokasi").value.trim(), tanggal: $("tanggal").value,
      cuaca: $("cuaca").value, pelaksana: $("pelaksana").value.trim(),
      progresKum: angka($("progresKum").value), catatan: $("catatan").value.trim(),
      anggaranHari: angka($("anggaranHari").value), anggaranTotal: angka($("anggaranTotal").value),
      tenaga: bacaBiaya("tenaga"), material: bacaBiaya("material"), alat: bacaBiaya("alat"),
      progres: bacaProgres(), realisasi: perbarui(), diubah: new Date().toISOString()
    };
  }

  function kosongkan() {
    ["tenaga", "material", "alat", "progres"].forEach(g => { $("list-" + g).innerHTML = ""; });
    ["lokasi", "pelaksana", "progresKum", "catatan", "anggaranHari"].forEach(i => { $(i).value = ""; });
    $("tanggal").value = Util.tanggalISO();
  }

  function muat(l) {
    kosongkan();
    idAktif = l.id;
    $("nama").value = l.nama; $("lokasi").value = l.lokasi; $("tanggal").value = l.tanggal;
    $("cuaca").value = l.cuaca; $("pelaksana").value = l.pelaksana; $("catatan").value = l.catatan;
    $("progresKum").value = l.progresKum ? teksAngka(l.progresKum) : "";
    $("anggaranHari").value = l.anggaranHari ? teksAngka(l.anggaranHari) : "";
    $("anggaranTotal").value = l.anggaranTotal ? teksAngka(l.anggaranTotal) : "";
    ["tenaga", "material", "alat"].forEach(g => (l[g] || []).forEach(b => tambahBiaya(g, b)));
    (l.progres || []).forEach(tambahProgres);
    perbarui();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function simpan() {
    $("galat").textContent = "";
    if ($("nama").value.trim() === "") { $("galat").textContent = "Isi nama proyek dulu."; $("nama").focus(); return; }
    if ($("tanggal").value === "") { $("galat").textContent = "Isi tanggal laporan."; $("tanggal").focus(); return; }
    const l = kumpulkan();
    if (!Penyimpanan.simpan("laporan_" + l.id, l)) {
      $("galat").textContent = "Gagal menyimpan: penyimpanan browser penuh atau tidak tersedia.";
      return;
    }
    idAktif = l.id;
    tampilDaftar();
    $("galat").textContent = "";
    alert("Laporan tersimpan.");
  }

  function tampilDaftar() {
    const w = $("daftar"); w.innerHTML = "";
    const semua = Penyimpanan.daftar("laporan_").map(k => Penyimpanan.ambil(k)).filter(Boolean)
      .sort((a, b) => (b.tanggal || "").localeCompare(a.tanggal || "") || b.id - a.id);
    if (!semua.length) { w.appendChild(el("p", "bantuan", "Belum ada laporan tersimpan. Isi formulir lalu tekan Simpan laporan.")); return; }
    semua.forEach(l => {
      const baris = el("div", "item-laporan"), ket = el("div", "ket");
      ket.appendChild(el("strong", null, l.nama + " - " + Util.formatTanggalID(l.tanggal + "T00:00:00", false)));
      ket.appendChild(el("div", "bantuan", "Realisasi " + rp(l.realisasi || 0) + (l.lokasi ? " | " + l.lokasi : "")));
      const buka = el("button", "tombol sekunder", "Buka"); buka.type = "button";
      buka.addEventListener("click", () => muat(l));
      const hapus = el("button", "tombol bahaya", "Hapus"); hapus.type = "button";
      hapus.addEventListener("click", () => {
        if (confirm("Hapus laporan " + l.nama + " tanggal " + l.tanggal + "?")) {
          Penyimpanan.hapus("laporan_" + l.id);
          if (idAktif === l.id) idAktif = null;
          tampilDaftar(); perbarui();
        }
      });
      baris.append(ket, buka, hapus); w.appendChild(baris);
    });
  }

  /* ---- Ambil dari mix design ---- */
  function isiPilihanMix() {
    const s = $("pilihMix"); s.innerHTML = "";
    const daftar = Penyimpanan.daftar("mixdesign_");
    if (!daftar.length) { const o = el("option", null, "Belum ada hasil mix design tersimpan"); o.value = ""; s.appendChild(o); return; }
    daftar.reverse().forEach(k => {
      const m = Penyimpanan.ambil(k); if (!m) return;
      const v = m.volume && m.volume.total > 0 ? Util.formatAngka(m.volume.total, 2) + " m3" : "per 1 m3";
      const o = el("option", null, Util.formatTanggalID(m.waktu, false) + " | " + Util.teksMutu(m.mutuFc) + " | " + v);
      o.value = k; s.appendChild(o);
    });
  }

  function tambahDariMix() {
    const m = Penyimpanan.ambil($("pilihMix").value);
    if (!m) { $("galat").textContent = "Pilih hasil mix design dulu (simpan dari halaman Mix Design)."; return; }
    $("galat").textContent = "";
    const v = m.volume && m.volume.total > 0 ? m.volume.total : 1;
    const ps = Penyimpanan.ambilPengaturan();
    const biP = ps.beratIsiPasir || H.EMBER.beratIsi.pasir, biK = ps.beratIsiKerikil || H.EMBER.beratIsi.kerikil;
    const add = (item, qty) => tambahBiaya("material", {
      item: item, nama: "", qty: Math.round(qty * 100) / 100,
      satuan: H.material[item].satuan, harga: H.material[item].harga
    });
    add("semen", Math.ceil(m.perM3.semenKg * v / H.sakSemenKg));
    add("pasir", m.perM3.pasirKg * v / (biP * 1000));
    add("kerikil", m.perM3.kerikilKg * v / (biK * 1000));
  }

  /* ---- Pemicu ---- */
  document.addEventListener("click", function (e) {
    const t = e.target;
    if (t.dataset && t.dataset.tambah) tambahBiaya(t.dataset.tambah);
    else if (t.classList.contains("b-hapus") || t.classList.contains("p-hapus")) { t.closest(".pekerjaan").remove(); perbarui(); }
  });
  document.addEventListener("change", function (e) {
    if (e.target.classList.contains("b-item")) isiDariKatalog(e.target.closest(".pekerjaan"));
    perbarui();
  });
  document.addEventListener("input", perbarui);
  $("btnProgres").addEventListener("click", () => tambahProgres());
  $("btnMix").addEventListener("click", tambahDariMix);
  $("btnSimpan").addEventListener("click", simpan);
  $("btnCetak").addEventListener("click", () => window.print());
  $("btnBaru").addEventListener("click", function () {
    if (confirm("Mulai laporan baru? Isian yang belum disimpan akan hilang.")) {
      idAktif = null; kosongkan(); tambahBiaya("tenaga"); perbarui();
    }
  });

  kosongkan();
  tambahBiaya("tenaga");
  tambahProgres();
  isiPilihanMix();
  tampilDaftar();
  perbarui();
})();
