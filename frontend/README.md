# KrediPin — Frontend (Tahap 3)

Antarmuka web KrediPin: **React + Vite** dengan **CSS Modules**. Mengonsumsi backend
FastAPI (lihat `../KrediPin_backend`) tanpa mengubah kontrak API.

## Prasyarat

- Node.js 18+ (diuji pada Node 24)
- Backend KrediPin berjalan di `http://localhost:8000`

## Menjalankan

```bash
cd frontend
npm install
cp .env.example .env   # sesuaikan VITE_API_BASE_URL bila perlu
npm run prepare-data   # siapkan data dashboard statis (public/data/*.json)
npm run dev            # http://localhost:5173
```

> `npm run prepare-data` mengubah artefak analitik Tahap 1 (read-only) menjadi JSON
> ringan di `public/data/`. Wajib dijalankan sekali sebelum halaman Beranda / Eksplorasi
> / Performa menampilkan data. Halaman prediksi (Analisis & Import) tetap butuh backend aktif.

Build produksi:

```bash
npm run build
npm run preview
```

## Konfigurasi

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | URL dasar backend FastAPI |

## Struktur

```
src/
├── app/          # App.jsx + router
├── layouts/      # DashboardLayout (Sidebar + Topbar)
├── components/   # ui/ (reusable) + common/
├── pages/        # Beranda, AnalisisNasabah, ImportData, EksplorasiData, PerformaModel, Riwayat, Dokumentasi
├── services/     # apiClient (Axios) + service per domain
├── hooks/        # custom hooks (useTheme, usePredict, ...)
├── constants/    # navigasi, metadata halaman, skema fitur
├── styles/       # tokens.css (design tokens) + global.css
└── utils/        # helper (format IDR, csv, ...)
```

## Catatan arsitektur

- **Frontend mengikuti backend** — tidak ada endpoint baru. Batch CSV (Import Data)
  diimplementasikan dengan mengulang `POST /predict` dari sisi klien.
- **Nilai uang dalam IDR** (sesuai kontrak API); tidak ada konversi ganda.
- **Styling hanya CSS Modules** — tanpa Tailwind/Bootstrap/MUI/inline style.
- Tema light sebagai default; design tokens sudah disiapkan untuk dark mode.
