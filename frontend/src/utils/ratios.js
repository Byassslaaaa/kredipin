/**
 * ratios - hitung ketiga rasio keuangan dari field dasar.
 *
 * PENTING: formula ini HARUS identik dengan yang dipakai backend
 * (KrediPin_backend/app/schemas.py::hitung_rasio), yang telah diverifikasi
 * cocok 5.000/5.000 terhadap data.csv:
 *   - rasio_hutang    = hutang_saat_ini / pendapatan_tahunan
 *   - rasio_pinjaman  = jumlah_pinjaman / pendapatan_tahunan
 *   - rasio_pembayaran= (jumlah_pinjaman / 3) / pendapatan_tahunan
 *     (dataset mengasumsikan pelunasan 3 tahun tetap, tanpa komponen bunga)
 *
 * Nilai ini hanya untuk DITAMPILKAN ke analis (read-only). Server tetap
 * menghitung ulang sendiri dan mengabaikan nilai kiriman klien, sehingga rasio
 * tidak dapat dipakai memanipulasi keputusan. Menyamakan formula di sini membuat
 * yang DILIHAT analis = yang DIPAKAI model.
 *
 * Seluruh nilai uang dalam IDR.
 */

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @returns {{rasio_hutang_terhadap_pendapatan, rasio_pinjaman_terhadap_pendapatan, rasio_pembayaran_terhadap_pendapatan}}
 */
export function computeRatios(values) {
  const pendapatan = Number(values.pendapatan_tahunan) || 0;
  const hutang = Number(values.hutang_saat_ini) || 0;
  const pinjaman = Number(values.jumlah_pinjaman) || 0;

  if (pendapatan <= 0) {
    // Pendapatan 0/kosong -> rasio belum dapat dihitung. Kembalikan string kosong
    // agar field tampil kosong (bukan 0 yang menyesatkan) sampai pendapatan diisi.
    return {
      rasio_hutang_terhadap_pendapatan: "",
      rasio_pinjaman_terhadap_pendapatan: "",
      rasio_pembayaran_terhadap_pendapatan: "",
    };
  }

  return {
    rasio_hutang_terhadap_pendapatan: round2(clamp(hutang / pendapatan, 0, 10)),
    rasio_pinjaman_terhadap_pendapatan: round2(clamp(pinjaman / pendapatan, 0, 50)),
    rasio_pembayaran_terhadap_pendapatan: round2(clamp(pinjaman / 3 / pendapatan, 0, 10)),
  };
}
