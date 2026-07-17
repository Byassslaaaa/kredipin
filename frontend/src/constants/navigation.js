/**
 * Definisi item navigasi utama (dipakai Sidebar & routing).
 * `icon` merujuk nama pada komponen <Icon />.
 *
 * PEMBAGIAN PERAN (mengikuti praktik perbankan)
 * ---------------------------------------------
 * Bank memisahkan peran karena tiga tuntutan: segregation of duties (yang
 * menilai kredit ≠ yang mengatur sistem), need-to-know (hanya lihat yang jadi
 * tanggung jawabnya), dan auditability.
 *
 * - ANALIS = petugas kredit. Fokus pada PEKERJAAN: menilai pengajuan dan
 *   memproses berkas. Tidak diberi akses ke isi teknis (dataset mentah,
 *   notebook, metrik model) karena bukan wewenangnya dan menambah permukaan
 *   kebocoran data tanpa manfaat operasional.
 *
 * - ADMIN = pengelola sistem & pengawas. Memegang isi TEKNIS (eksplorasi data,
 *   proses Colab, performa model), pemantauan, dan riwayat seluruh analis.
 *   SENGAJA TIDAK diberi menu penilaian kredit: bila admin bisa menyetel ambang
 *   sekaligus meloloskan pengajuan, kendali internal menjadi tak berarti.
 */

export const ROUTES = {
  beranda: "/",
  analisis: "/analisis-nasabah",
  importData: "/import-data",
  eksplorasi: "/eksplorasi-data",
  proses: "/proses-colab",
  performa: "/performa-model",
  riwayat: "/riwayat",
  dokumentasi: "/dokumentasi",
};

/** Peran yang dikenal sistem. */
export const PERAN = { ANALIS: "analis", ADMIN: "admin" };

/**
 * Navigasi dikelompokkan agar sidebar terstruktur (gaya dashboard SaaS).
 * `peran` = daftar peran yang boleh melihat & mengakses item tersebut.
 */
export const NAV_GROUPS = [
  {
    label: "Utama",
    items: [
      { to: ROUTES.beranda, label: "Beranda", icon: "home", end: true, peran: ["analis", "admin"] },
    ],
  },
  {
    label: "Penilaian Kredit",
    // Pekerjaan inti analis. Admin tidak diberi akses: segregation of duties.
    items: [
      { to: ROUTES.analisis, label: "Analisis Nasabah Baru", icon: "user-plus", badge: "Inti", peran: ["analis"] },
      { to: ROUTES.importData, label: "Import Data Nasabah", icon: "upload", badge: "Inti", peran: ["analis"] },
    ],
  },
  {
    label: "Riwayat",
    // Analis melihat penilaiannya sendiri; admin melihat seluruhnya (pengawasan).
    items: [
      { to: ROUTES.riwayat, label: "Riwayat Prediksi", icon: "history", peran: ["analis", "admin"] },
    ],
  },
  {
    label: "Teknis & Pemantauan",
    // Wilayah admin: data mentah, pipeline model, dan metrik performa.
    items: [
      { to: ROUTES.eksplorasi, label: "Eksplorasi Data", icon: "bar-chart", peran: ["admin"] },
      { to: ROUTES.proses, label: "Proses Data (Colab)", icon: "database", peran: ["admin"] },
      { to: ROUTES.performa, label: "Performa Model", icon: "gauge", peran: ["admin"] },
    ],
  },
  {
    label: "Lainnya",
    items: [
      { to: ROUTES.dokumentasi, label: "Dokumentasi", icon: "file-text", peran: ["analis", "admin"] },
    ],
  },
];

/**
 * Saring navigasi sesuai peran, buang grup yang jadi kosong.
 * Dipakai Sidebar; penegakan sebenarnya tetap di backend + route guard —
 * menyembunyikan menu saja bukan kontrol keamanan.
 */
export function navUntukPeran(peran) {
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !i.peran || i.peran.includes(peran)),
  })).filter((g) => g.items.length > 0);
}

/** Semua rute yang boleh diakses satu peran — dipakai route guard. */
export function ruteUntukPeran(peran) {
  return NAV_GROUPS.flatMap((g) => g.items)
    .filter((i) => !i.peran || i.peran.includes(peran))
    .map((i) => i.to);
}
