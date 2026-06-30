import { ROUTES } from "./navigation";

/**
 * Metadata judul & subjudul per halaman (dipakai Topbar).
 */
export const PAGE_META = {
  [ROUTES.beranda]: {
    title: "Beranda",
    subtitle: "Ringkasan sistem & analitik kelayakan pinjaman",
  },
  [ROUTES.analisis]: {
    title: "Analisis Nasabah Baru",
    subtitle: "Prediksi kelayakan untuk satu calon nasabah",
  },
  [ROUTES.importData]: {
    title: "Import Data Nasabah",
    subtitle: "Prediksi banyak pengajuan sekaligus melalui file CSV",
  },
  [ROUTES.eksplorasi]: {
    title: "Eksplorasi Data",
    subtitle: "Telusuri distribusi & pola data pinjaman",
  },
  [ROUTES.performa]: {
    title: "Performa Model",
    subtitle: "Metrik evaluasi & interpretabilitas model XGBoost",
  },
  [ROUTES.riwayat]: {
    title: "Riwayat Prediksi",
    subtitle: "Audit ringan prediksi terbaru",
  },
  [ROUTES.dokumentasi]: {
    title: "Dokumentasi",
    subtitle: "Panduan sistem, metodologi, & kontrak API",
  },
};

export function getPageMeta(pathname) {
  return PAGE_META[pathname] || { title: "KrediPin", subtitle: "" };
}
