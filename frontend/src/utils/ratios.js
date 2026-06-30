/**
 * ratios — estimasi rasio keuangan dari input dasar (alat bantu pengisian form).
 *
 * Catatan: ini ESTIMASI untuk mempercepat pengisian; pengguna tetap dapat
 * menyesuaikan. Backend menerima ketiga rasio apa adanya (lihat kontrak API §12).
 * Seluruh nilai uang dalam IDR.
 */

function safeDiv(a, b) {
  const x = Number(a);
  const y = Number(b);
  if (!y || Number.isNaN(x) || Number.isNaN(y)) return 0;
  return x / y;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Hitung estimasi ketiga rasio dari nilai form.
 * @returns {{rasio_hutang_terhadap_pendapatan, rasio_pinjaman_terhadap_pendapatan, rasio_pembayaran_terhadap_pendapatan}}
 */
export function computeRatios(values) {
  const pendapatan = Number(values.pendapatan_tahunan) || 0;
  const hutang = Number(values.hutang_saat_ini) || 0;
  const pinjaman = Number(values.jumlah_pinjaman) || 0;
  const sukuBunga = Number(values.suku_bunga) || 0;
  const tenor = Number(values.tenor_bulan) || 12;

  // Rasio hutang & pinjaman terhadap pendapatan tahunan.
  const rasioHutang = safeDiv(hutang, pendapatan);
  const rasioPinjaman = safeDiv(pinjaman, pendapatan);

  // Estimasi angsuran bulanan: pokok per bulan + bunga bulanan, dibandingkan
  // pendapatan bulanan.
  const angsuranPokok = safeDiv(pinjaman, tenor);
  const bungaBulanan = (pinjaman * (sukuBunga / 100)) / 12;
  const pendapatanBulanan = pendapatan / 12;
  const rasioPembayaran = safeDiv(angsuranPokok + bungaBulanan, pendapatanBulanan);

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    rasio_hutang_terhadap_pendapatan: round2(clamp(rasioHutang, 0, 10)),
    rasio_pinjaman_terhadap_pendapatan: round2(clamp(rasioPinjaman, 0, 50)),
    rasio_pembayaran_terhadap_pendapatan: round2(clamp(rasioPembayaran, 0, 10)),
  };
}
