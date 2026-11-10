/* pengaturan.js - Layar pengaturan harga (disimpan sebagai timpaan lokal di localStorage) */
(function () {
  const $ = id => document.getElementById(id);
  const aktif = Penyimpanan.hargaAktif();
  const P = Penyimpanan.ambilPengaturan();
  const GRUP = [["material", "g-material"], ["upah", "g-upah"], ["alat", "g-alat"]];
  const kolom = []; // { grup, id, input }

  const teks = n => String(n).replace(".", ",");

  GRUP.forEach(function (g) {
    const wadah = $(g[1]);
    Object.keys(HARGA[g[0]]).forEach(function (id) {
      const bawaan = HARGA[g[0]][id];
      const nama = id === "semen" ? "Semen (per sak)" : bawaan.nama;
      const kotak = document.createElement("div");
      const label = document.createElement("label");
      const input = document.createElement("input");
      const ket = document.createElement("p");
      input.id = "h_" + g[0] + "_" + id;
      input.type = "text";
      input.inputMode = "decimal";
      input.value = teks(aktif[g[0]][id].harga);
      label.htmlFor = input.id;
      label.textContent = nama + " (Rp per " + bawaan.satuan + ")";
      ket.className = "bantuan";
      ket.textContent = "Harga bawaan: " + Util.formatRupiah(bawaan.harga);
      kotak.append(label, input, ket);
      wadah.appendChild(kotak);
      kolom.push({ grup: g[0], id: id, input: input, nama: nama });
    });
  });

  $("sakKg").value = teks(P.sakSemenKg);
  $("volEmber").value = teks(P.volumeEmber);

  function simpan() {
    $("galat").textContent = ""; $("info").textContent = "";
    const galat = [], timpaan = {};

    kolom.forEach(function (k) {
      const n = Util.parseAngka(k.input.value);
      if (isNaN(n) || n < 0) { galat.push(k.nama + " harus berupa angka 0 atau lebih."); return; }
      if (n !== HARGA[k.grup][k.id].harga) {
        timpaan[k.grup] = timpaan[k.grup] || {};
        timpaan[k.grup][k.id] = n;
      }
    });
    const sak = Util.validasiAngka($("sakKg").value, { min: 10, max: 100, nama: "Berat sak semen" });
    const ember = Util.validasiAngka($("volEmber").value, { min: 1, max: 100, nama: "Volume ember" });
    if (!sak.ok) galat.push(sak.pesan);
    if (!ember.ok) galat.push(ember.pesan);

    if (galat.length) { $("galat").textContent = galat.join(" "); return; }

    const ok1 = Object.keys(timpaan).length ? Penyimpanan.simpan("harga_lokal", timpaan) : Penyimpanan.resetHargaLokal();
    const ok2 = Penyimpanan.simpanPengaturan({ sakSemenKg: sak.nilai, volumeEmber: ember.nilai });
    if (ok1 && ok2) $("info").textContent = "Harga tersimpan.";
    else $("galat").textContent = "Gagal menyimpan: penyimpanan browser penuh atau tidak tersedia.";
  }

  function reset() {
    if (!confirm("Kembalikan semua harga, berat sak, dan volume ember ke nilai bawaan?")) return;
    Penyimpanan.resetHargaLokal();
    Penyimpanan.simpanPengaturan({ sakSemenKg: HARGA.sakSemenKg, volumeEmber: HARGA.EMBER.volumeLiter });
    location.reload();
  }

  $("btnSimpan").addEventListener("click", simpan);
  $("btnReset").addEventListener("click", reset);
})();
