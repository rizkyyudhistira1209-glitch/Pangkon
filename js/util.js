/* util.js - Fungsi pendukung umum */

const Util = (function () {
  const FAKTOR_K = 0.083; // f'c (MPa) = 0,083 x K (kg/cm2). K-250 -> 20,75 MPa

  /* Ubah teks angka Indonesia ("1.250,5" atau "1,5") menjadi Number. */
  function parseAngka(teks) {
    if (typeof teks === "number") return teks;
    if (teks == null) return NaN;
    let s = String(teks).trim().replace(/\s/g, "");
    if (s === "") return NaN;
    if (s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, ""); // 1.250.000 -> 1250000
    }
    const n = Number(s);
    return isFinite(n) ? n : NaN;
  }

  function formatAngka(n, desimal = 2) {
    if (!isFinite(n)) return "-";
    return n.toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: desimal
    });
  }

  function formatRupiah(n) {
    if (!isFinite(n)) return "Rp -";
    return "Rp " + Math.round(n).toLocaleString("id-ID");
  }

  function formatTanggalID(tgl = new Date(), denganHari = true) {
    const d = tgl instanceof Date ? tgl : new Date(tgl);
    return d.toLocaleDateString("id-ID", {
      weekday: denganHari ? "long" : undefined,
      day: "numeric", month: "long", year: "numeric"
    });
  }

  /* Tanggal ISO lokal (yyyy-mm-dd) untuk <input type="date"> */
  function tanggalISO(tgl = new Date()) {
    const z = n => String(n).padStart(2, "0");
    return tgl.getFullYear() + "-" + z(tgl.getMonth() + 1) + "-" + z(tgl.getDate());
  }

  /* Konversi mutu beton */
  function kToFc(k) { return k * FAKTOR_K; }
  function fcToK(fc) { return fc / FAKTOR_K; }

  /* Teks mutu dua satuan: "f'c 20,75 MPa (setara K-250)" */
  function teksMutu(fc) {
    const k = Math.round(fcToK(fc) / 25) * 25; // K dibulatkan ke kelipatan 25
    return "f'c " + formatAngka(fc, 2) + " MPa (setara K-" + k + ")";
  }

  /* kg -> jumlah ember (angka desimal) */
  function kgKeEmber(kg, beratIsiKgPerLiter, volumeEmberLiter) {
    return kg / (beratIsiKgPerLiter * volumeEmberLiter);
  }

  /* Bulatkan ke 1/4 ember dan tampilkan pecahan: 2,47 -> "2½ ember" */
  function formatEmber(n, denganSatuan = true) {
    if (!isFinite(n)) return "-";
    const q = Math.round(n * 4) / 4;
    const bulat = Math.floor(q);
    const sisa = q - bulat;
    const pecahan = { 0: "", 0.25: "¼", 0.5: "½", 0.75: "¾" }[sisa];
    let teks = (bulat === 0 && sisa > 0) ? pecahan : bulat + pecahan;
    if (q === 0) teks = "0";
    return denganSatuan ? teks + " ember" : teks;
  }

  /* Validasi: angka positif. Kembalikan {ok, nilai, pesan} */
  function validasiAngka(teks, { min = 0, max = Infinity, nama = "Nilai" } = {}) {
    const n = parseAngka(teks);
    if (isNaN(n)) return { ok: false, pesan: nama + " harus berupa angka." };
    if (n < min) return { ok: false, pesan: nama + " minimal " + formatAngka(min) + "." };
    if (n > max) return { ok: false, pesan: nama + " maksimal " + formatAngka(max) + "." };
    return { ok: true, nilai: n };
  }

  return {
    FAKTOR_K, parseAngka, formatAngka, formatRupiah, formatTanggalID, tanggalISO,
    kToFc, fcToK, teksMutu, kgKeEmber, formatEmber, validasiAngka
  };
})();
