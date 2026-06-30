/**
 * Definisi item navigasi utama (dipakai Sidebar & routing).
 * `icon` merujuk nama pada komponen <Icon />.
 */

export const ROUTES = {
  beranda: "/",
  analisis: "/analisis-nasabah",
  importData: "/import-data",
  eksplorasi: "/eksplorasi-data",
  performa: "/performa-model",
  riwayat: "/riwayat",
  dokumentasi: "/dokumentasi",
};

/**
 * Navigasi dikelompokkan agar sidebar terstruktur (gaya dashboard SaaS).
 */
export const NAV_GROUPS = [
  {
    label: "Utama",
    items: [
      { to: ROUTES.beranda, label: "Beranda", icon: "home", end: true },
    ],
  },
  {
    label: "Prediksi",
    items: [
      {
        to: ROUTES.analisis,
        label: "Analisis Nasabah Baru",
        icon: "user-plus",
        badge: "Inti",
      },
      {
        to: ROUTES.importData,
        label: "Import Data Nasabah",
        icon: "upload",
        badge: "Inti",
      },
    ],
  },
  {
    label: "Analitik",
    items: [
      { to: ROUTES.eksplorasi, label: "Eksplorasi Data", icon: "bar-chart" },
      { to: ROUTES.performa, label: "Performa Model", icon: "gauge" },
      { to: ROUTES.riwayat, label: "Riwayat Prediksi", icon: "history" },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { to: ROUTES.dokumentasi, label: "Dokumentasi", icon: "file-text" },
    ],
  },
];
