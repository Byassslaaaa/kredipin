/**
 * Metadata aplikasi (konstanta global non-rahasia).
 */
export const APP = {
  name: "KrediPin",
  tagline: "Sistem Pendukung Keputusan Kelayakan Pinjaman Digital",
  shortDesc: "Prediksi kelayakan pinjaman berbasis machine learning (XGBoost).",
  version: "1.0.0",
};

/** Disclaimer wajib ditampilkan pada setiap output prediksi (lihat kontrak API). */
export const DISCLAIMER_FALLBACK =
  "Hasil ini merupakan alat bantu pengambilan keputusan berbasis model statistik, " +
  "BUKAN keputusan akhir. Keputusan kredit final tetap berada pada analis/komite kredit.";
