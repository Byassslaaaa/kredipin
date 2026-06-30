/**
 * featureSchema — SINGLE SOURCE OF TRUTH untuk 20 fitur model KrediPin.
 *
 * Selaras dengan kontrak API (CLAUDE.md §12) dan backend `app/schemas.py`
 * (rentang & enum DIKUNCI; di luar daftar -> 422). Dipakai oleh:
 *   - Form "Analisis Nasabah Baru" (M5)
 *   - Validasi & parsing CSV "Import Data Nasabah" (M6)
 *
 * Catatan: seluruh nilai uang dalam IDR (jangan konversi ganda).
 */

// Grup logis untuk tata letak form.
export const FEATURE_GROUPS = [
  { id: "demografi", label: "Informasi Pribadi & Pekerjaan", icon: "users" },
  { id: "keuangan", label: "Informasi Keuangan", icon: "database" },
  { id: "kredit", label: "Riwayat Kredit", icon: "shield-check" },
  { id: "pinjaman", label: "Informasi Pinjaman", icon: "file-text" },
  { id: "rasio", label: "Rasio Keuangan", icon: "bar-chart" },
];

// Enum kategori (cocokkan persis dengan backend).
export const ENUMS = {
  status_pekerjaan: ["Bekerja", "Mahasiswa", "Wiraswasta"],
  tipe_produk: ["Kartu Kredit", "Kredit Berjalan", "Pinjaman Pribadi"],
  tujuan_pinjaman: [
    "Bisnis",
    "Konsolidasi Hutang",
    "Medis",
    "Pendidikan",
    "Pribadi",
    "Renovasi Rumah",
  ],
  jaminan: ["Ada Jaminan", "Tanpa Jaminan"],
  tenor_bulan: [6, 12, 24, 36, 48, 60],
};

/**
 * Definisi tiap fitur.
 * type: "int" | "float" | "select" | "radio"
 * money: true -> nilai IDR (tampilkan prefix Rp)
 * Nilai `example` diselaraskan dengan contoh pada schemas.py (membantu QA & demo).
 */
export const FEATURE_FIELDS = [
  // --- Demografi & pekerjaan ---
  {
    name: "usia",
    label: "Usia",
    group: "demografi",
    type: "int",
    unit: "tahun",
    min: 17,
    max: 80,
    step: 1,
    example: 35,
    help: "Usia pemohon (17–80 tahun).",
  },
  {
    name: "status_pekerjaan",
    label: "Status Pekerjaan",
    group: "demografi",
    type: "select",
    options: ENUMS.status_pekerjaan,
    example: "Bekerja",
  },
  {
    name: "lama_bekerja_tahun",
    label: "Lama Bekerja",
    group: "demografi",
    type: "float",
    unit: "tahun",
    min: 0,
    max: 60,
    step: 0.1,
    example: 8,
  },

  // --- Profil keuangan (IDR) ---
  {
    name: "pendapatan_tahunan",
    label: "Pendapatan Tahunan",
    group: "keuangan",
    type: "float",
    money: true,
    min: 0,
    max: 20_000_000_000,
    step: 1_000_000,
    example: 900_000_000,
    help: "Pendapatan kotor per tahun (IDR).",
  },
  {
    name: "aset_tabungan",
    label: "Aset Tabungan",
    group: "keuangan",
    type: "float",
    money: true,
    min: 0,
    max: 50_000_000_000,
    step: 1_000_000,
    example: 18_000_000,
  },
  {
    name: "hutang_saat_ini",
    label: "Hutang Saat Ini",
    group: "keuangan",
    type: "float",
    money: true,
    min: 0,
    max: 20_000_000_000,
    step: 1_000_000,
    example: 270_000_000,
  },

  // --- Riwayat kredit ---
  {
    name: "skor_kredit",
    label: "Skor Kredit",
    group: "kredit",
    type: "int",
    min: 300,
    max: 900,
    step: 1,
    example: 640,
    help: "Skor kredit pemohon (300–900).",
  },
  {
    name: "lama_riwayat_kredit_tahun",
    label: "Lama Riwayat Kredit",
    group: "kredit",
    type: "float",
    unit: "tahun",
    min: 0,
    max: 60,
    step: 0.1,
    example: 6,
  },
  {
    name: "gagal_bayar_tercatat",
    label: "Gagal Bayar Tercatat",
    group: "kredit",
    type: "int",
    min: 0,
    max: 10,
    step: 1,
    example: 0,
    help: "Jumlah gagal bayar yang tercatat (0–10).",
  },
  {
    name: "tunggakan_2thn_terakhir",
    label: "Tunggakan 2 Tahun Terakhir",
    group: "kredit",
    type: "int",
    min: 0,
    max: 30,
    step: 1,
    example: 1,
  },
  {
    name: "catatan_negatif",
    label: "Catatan Negatif",
    group: "kredit",
    type: "int",
    min: 0,
    max: 20,
    step: 1,
    example: 0,
  },

  // --- Detail pinjaman ---
  {
    name: "tipe_produk",
    label: "Tipe Produk",
    group: "pinjaman",
    type: "select",
    options: ENUMS.tipe_produk,
    example: "Pinjaman Pribadi",
  },
  {
    name: "tujuan_pinjaman",
    label: "Tujuan Pinjaman",
    group: "pinjaman",
    type: "select",
    options: ENUMS.tujuan_pinjaman,
    example: "Pribadi",
  },
  {
    name: "jumlah_pinjaman",
    label: "Jumlah Pinjaman",
    group: "pinjaman",
    type: "float",
    money: true,
    min: 0,
    max: 10_000_000_000,
    step: 1_000_000,
    example: 720_000_000,
  },
  {
    name: "suku_bunga",
    label: "Suku Bunga",
    group: "pinjaman",
    type: "float",
    unit: "%",
    min: 0,
    max: 100,
    step: 0.01,
    example: 15,
    help: "Suku bunga per tahun (%).",
  },
  {
    name: "tenor_bulan",
    label: "Tenor",
    group: "pinjaman",
    type: "select",
    unit: "bulan",
    options: ENUMS.tenor_bulan,
    example: 36,
    help: "Jangka waktu pinjaman (bulan).",
  },
  {
    name: "jaminan",
    label: "Jaminan",
    group: "pinjaman",
    type: "radio",
    options: ENUMS.jaminan,
    example: "Tanpa Jaminan",
  },

  // --- Rasio keuangan (tak bersatuan) ---
  {
    name: "rasio_hutang_terhadap_pendapatan",
    label: "Rasio Hutang / Pendapatan",
    group: "rasio",
    type: "float",
    min: 0,
    max: 10,
    step: 0.01,
    example: 0.35,
    help: "Total hutang dibagi pendapatan (0–10).",
  },
  {
    name: "rasio_pinjaman_terhadap_pendapatan",
    label: "Rasio Pinjaman / Pendapatan",
    group: "rasio",
    type: "float",
    min: 0,
    max: 50,
    step: 0.01,
    example: 0.8,
  },
  {
    name: "rasio_pembayaran_terhadap_pendapatan",
    label: "Rasio Pembayaran / Pendapatan",
    group: "rasio",
    type: "float",
    min: 0,
    max: 10,
    step: 0.01,
    example: 0.27,
  },
];

/** Urutan nama fitur (dipakai untuk header CSV & iterasi). */
export const FEATURE_KEYS = FEATURE_FIELDS.map((f) => f.name);

/** Peta cepat name -> definisi fitur. */
export const FIELD_BY_NAME = FEATURE_FIELDS.reduce((acc, f) => {
  acc[f.name] = f;
  return acc;
}, {});

/** Nilai contoh lengkap (untuk prefilling demo / template CSV). */
export const EXAMPLE_VALUES = FEATURE_FIELDS.reduce((acc, f) => {
  acc[f.name] = f.example;
  return acc;
}, {});

/**
 * Validasi satu nilai fitur terhadap skema.
 * @returns {string|null} pesan error (Indonesia) atau null bila valid.
 */
export function validateField(name, rawValue) {
  const field = FIELD_BY_NAME[name];
  if (!field) return `Fitur tidak dikenal: ${name}`;

  const isEmpty = rawValue === "" || rawValue == null;
  if (isEmpty) return "Wajib diisi.";

  if (field.type === "select" || field.type === "radio") {
    const valid = field.options.map(String).includes(String(rawValue));
    return valid ? null : `Pilihan tidak valid (harus salah satu: ${field.options.join(", ")}).`;
  }

  const num = Number(rawValue);
  if (Number.isNaN(num)) return "Harus berupa angka.";
  if (field.type === "int" && !Number.isInteger(num)) return "Harus bilangan bulat.";
  if (field.min != null && num < field.min) return `Minimal ${field.min}.`;
  if (field.max != null && num > field.max) return `Maksimal ${field.max.toLocaleString("id-ID")}.`;
  return null;
}

/**
 * Konversi nilai form/CSV (string) menjadi tipe yang benar untuk payload API.
 * Kategori tenor_bulan harus number; enum lain tetap string.
 */
export function coerceValue(name, rawValue) {
  const field = FIELD_BY_NAME[name];
  if (!field) return rawValue;
  if (field.type === "int" || field.type === "float") return Number(rawValue);
  if (field.name === "tenor_bulan") return Number(rawValue);
  return rawValue;
}

/** Bangun payload bertipe benar dari objek nilai mentah (semua 20 fitur). */
export function buildPayload(values) {
  const payload = {};
  for (const key of FEATURE_KEYS) {
    payload[key] = coerceValue(key, values[key]);
  }
  return payload;
}
