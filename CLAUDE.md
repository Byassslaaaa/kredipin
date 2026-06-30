# CLAUDE.md — KrediPin Project Memory

> **Untuk Claude Code:** File ini adalah *single source of truth* konteks proyek KrediPin.
> Baca seluruhnya sebelum melakukan perubahan apa pun. File ini menjelaskan keseluruhan sistem
> sehingga sesi baru tidak perlu menjelaskan ulang konteks. Patuhi **Development Rules (§10)** dan
> **Important Notes (§15)** secara ketat.

---

## 1. Project Overview

- **Nama proyek:** **KrediPin** — Sistem Pendukung Keputusan Kelayakan Pinjaman Digital.
- **Deskripsi:** Aplikasi *data-driven decision support* yang memprediksi kelayakan pengajuan
  pinjaman secara biner (**Layak / Tidak Layak**) beserta probabilitas dan faktor pendukung,
  untuk membantu analis kredit mengambil keputusan yang konsisten dan transparan.
- **Tujuan aplikasi:** Mempercepat dan menstandarkan penilaian kelayakan pinjaman, mengurangi
  keputusan subjektif, dan menjelaskan *alasan* di balik tiap keputusan (interpretabilitas).
- **Masalah bisnis:** Lembaga pembiayaan/fintech menerima banyak pengajuan dan perlu menilai
  risiko gagal bayar secara cepat, objektif, dan dapat dipertanggungjawabkan. Penilaian manual
  lambat, tidak konsisten, dan sulit diaudit.
- **Target pengguna:** Analis/komite kredit dan tim risiko pada lembaga pembiayaan atau fintech.
  Output bersifat **alat bantu**, bukan keputusan akhir.
- **Konteks akademik:** Proyek tugas Case-Based Learning gabungan mata kuliah **DASD** (Desain
  Analisis Sains Data) dan **SIAB** (Sistem Informasi Analitik Bisnis).

**Dua fitur inti penggunaan sistem.** Selain berfungsi sebagai **dashboard analitik**, KrediPin
memiliki dua fitur utama yang menjadi inti pemakaian:
1. **Analisis Nasabah Baru** — prediksi kelayakan untuk **satu** calon nasabah (input manual).
2. **Import Data Nasabah** — prediksi kelayakan untuk **banyak** pengajuan sekaligus via **file CSV**.

Kedua fitur **hanya melakukan inferensi** menggunakan **model XGBoost yang sama** (artefak Tahap 1) —
tidak ada training ulang. Detail alur kedua fitur ada di **§4 (Workflow Sistem)**.

---

## 2. Project Status

| Tahap | Komponen | Status |
|------|----------|--------|
| Tahap 1 | Machine Learning (XGBoost, notebook) | ✅ **Selesai & final** |
| Tahap 2 | Backend FastAPI | ✅ **Selesai & lolos pengujian (9/9)** |
| Tahap 3 | Frontend React (10 milestone) | ✅ **Selesai & lolos audit integrasi end-to-end** |
| Berikutnya | Deployment (Docker), Dokumentasi, PPT, Laporan | ⏳ Belum dikerjakan |

Fokus aktif berikutnya: **Deployment (Docker), Dokumentasi, Laporan & PPT**.

> **Catatan Tahap 3 (frontend):** dibangun di `frontend/` (React + Vite + CSS Modules), 10 milestone
> selesai dan telah melewati *Backend–Frontend Integration Audit* (API, error handling, batch,
> konsistensi data, UI, performa, security). Sebelum menjalankan frontend pertama kali, jalankan
> `npm run prepare-data` (menyiapkan data analitik statis di `public/data/` dari artefak Tahap 1).

---

## 3. Tech Stack

**Machine Learning & Backend (selesai):**
- Python 3.10+ (diuji 3.12)
- FastAPI + Uvicorn
- XGBoost (XGBClassifier)
- scikit-learn (Pipeline, ColumnTransformer, OneHotEncoder, SimpleImputer)
- Joblib (serialisasi model `.pkl`)
- SQLite + SQLAlchemy 2.x (riwayat prediksi)
- Pydantic v2 + pydantic-settings (validasi & konfigurasi)

**Frontend (akan dibangun):**
- React + Vite
- Axios (HTTP client)
- Chart.js (visualisasi)
- Framer Motion (animasi seperlunya)
- CSS Modules (styling — **bukan** Tailwind/Bootstrap/MUI)

**Tooling:** Git.

---

## 4. Arsitektur

```
┌──────────────────────────────┐
│  Frontend React (Vite :5173) │  Form pengajuan + panel hasil + dashboard
└──────────────┬───────────────┘
               │  HTTP / JSON (Axios)
               ▼
┌──────────────────────────────┐
│  FastAPI (:8000)             │  Validasi (Pydantic) · ambang keputusan ·
│                              │  inferensi · faktor SHAP · simpan riwayat
└──────────────┬───────────────┘
               │  joblib.load (sekali saat startup)
               ▼
┌──────────────────────────────┐
│  Model XGBoost (.pkl)        │  Pipeline sklearn (preprocessor + classifier)
└──────────────┬───────────────┘
               ▼
         Prediction (probabilitas_layak)
               ▼
         Response JSON  ──►  ditampilkan oleh React
                              (riwayat → SQLite)
```

Pola: **model-as-a-service**. Model adalah artefak Python; inferensi dilayani Python/FastAPI dan
dikonsumsi React lewat REST. Tidak ada training ulang per request.

### Workflow Sistem (Dua Fitur Inti)

Kedua fitur memakai **endpoint dan model yang sama** (`POST /predict`, XGBoost `.pkl`). Perbedaannya
hanya pada jumlah data dan agregasi hasil di sisi frontend. **Keduanya inferensi saja** — tidak ada
perubahan backend, kontrak API, maupun training ulang.

**A. Analisis Nasabah Baru (prediksi satu nasabah)**
```
Pengguna isi form (semua fitur model, uang dalam IDR)
   → validasi sisi klien
   → Axios POST /predict  (1 request)
   → FastAPI: validasi Pydantic → inferensi XGBoost → 5 faktor (SHAP) → simpan riwayat
   → Response JSON
   → UI tampilkan: keputusan (Layak/Tidak Layak), probabilitas_layak, confidence,
     threshold, 5 faktor paling berpengaruh (+/−), disclaimer (rekomendasi model, bukan
     keputusan akhir)
```

**B. Import Data Nasabah (prediksi banyak nasabah via CSV)**
```
Pengguna unggah file CSV
   → validasi format/header CSV terhadap skema fitur model (§12), uang dalam IDR
   → parsing baris (mis. PapaParse)
   → untuk tiap baris: Axios POST /predict  (iterasi sisi klien, model & kontrak sama;
     dijalankan dengan konkurensi terbatas + progress bar)
   → agregasi hasil di frontend:
        • ringkasan jumlah Layak vs Tidak Layak
        • distribusi prediksi (grafik)
        • rata-rata probabilitas_layak
        • preview tabel hasil
   → sediakan unduhan CSV hasil (kolom input + keputusan + probabilitas_layak)
```

> **Catatan kontrak (penting).** Batch CSV diimplementasikan dengan **mengulang endpoint
> `POST /predict` yang sudah ada** dari sisi frontend — **tanpa** endpoint batch baru, **tanpa**
> mengubah backend/API. Bila kelak dibutuhkan endpoint batch khusus untuk performa data sangat besar,
> itu adalah **perubahan API** dan **harus melalui konfirmasi** lebih dulu (lihat §10.5).

---

## 5. Machine Learning (Tahap 1 — FINAL)

- **Dataset:** `data.csv`, **50.000 baris × 20 kolom**, sintetik/semi-nyata, sektor pembiayaan.
  Tidak ada duplikat; `id_pelanggan` unik. *Missing value* hanya pada `usia` (147) dan
  `status_pekerjaan` (153).
- **Target:** `status_pinjaman` (biner) → **1 = Layak** (55,05%), **0 = Tidak Layak** (44,95%).
  Cukup seimbang; tidak memakai penanganan imbalance khusus.
- **Konversi mata uang:** kolom uang (`pendapatan_tahunan`, `aset_tabungan`, `hutang_saat_ini`,
  `jumlah_pinjaman`) dikonversi **USD → IDR (kurs 18.000)**. XGBoost invarian skala, sehingga
  konversi tidak mengubah perilaku model.
- **Fitur sintetik terkalibrasi (2):** `tenor_bulan` {6,12,24,36,48,60} dan `jaminan`
  {Ada Jaminan, Tanpa Jaminan} — **tidak ada di dataset publik**, ditambahkan secara sintetik
  yang dikalibrasi literatur kredit:
  - Tenor lebih panjang → risiko lebih tinggi (asosiasi negatif dengan Layak).
  - Ada jaminan → risiko lebih rendah (asosiasi positif dengan Layak).
  - Diturunkan dari indeks risiko (skor kredit, rasio hutang, suku bunga, jumlah pinjaman) + noise.
  - Konstanta `EFEK_LITERATUR = 0.35` (sinyal lemah = realistis; **tidak boleh** dinaikkan agar
    fitur sintetik tampak dominan).
  - ⚠️ **Catatan integritas:** dataset dibuat dengan numpy *seed* 42, sehingga noise augmentasi
    memakai **RNG independen (seed 20250607)** agar tidak membocorkan noise pembuat-label ke fitur.
- **Pipeline:** drop `id_pelanggan`; impute numerik (median) & kategorikal (modus);
  OneHotEncoder (`handle_unknown="ignore"`); `Pipeline` + `ColumnTransformer`; split 80/20
  *stratify* pada target, `random_state=42`.
- **Model:** `XGBClassifier` (n_estimators=400, max_depth=5, learning_rate=0.05, subsample=0.9,
  colsample_bytree=0.9, min_child_weight=2, reg_lambda=1.0, `tree_method="hist"`, random_state=42).

**Evaluasi (test set, terverifikasi dengan menjalankan notebook):**

| Metrik | Nilai |
|--------|-------|
| Accuracy | **0,9274** |
| Precision | **0,9253** |
| Recall | **0,9444** |
| F1-Score | **0,9347** |
| ROC-AUC | **0,9843** |

**Feature importance (dilaporkan jujur, tanpa manipulasi):** dominan = `skor_kredit`,
`gagal_bayar_tercatat`, `rasio_hutang_terhadap_pendapatan`, `tunggakan_2thn_terakhir` (sesuai
literatur credit scoring). Fitur sintetik berada di peringkat sangat rendah: `tenor_bulan`
≈ peringkat 28 (gain), `jaminan` ≈ peringkat 29 — berperan sebagai *modifier sekunder*.

> ⚠️ **Caveat data:** `gagal_bayar_tercatat` nyaris memisahkan kelas secara sempurna (tidak ada
> pemohon Layak dengan gagal bayar tercatat). Metrik tinggi sebagian karena ini; pada data nyata
> hubungan biasanya tidak sebersih ini. Sudah didokumentasikan untuk Q&A dosen.

- **Artefak (di `backend/model/`):** `model_krediPin.pkl`, `fitur_model.json`
  (kontrak fitur, kategori valid, mapping output, kurs), `selected_model_info.json`
  (metadata + evaluasi). Data dashboard di `dashboard_data/` (`summary.json`, `prediksi_lengkap.csv`,
  `analitik_kpi.csv` = KPI utama selaras Feature Importance, dan `analitik_bisnis.csv` = insight
  bisnis pendukung).

> 🔒 **MODEL SUDAH FINAL.** Selama pengembangan frontend, **JANGAN** melatih ulang model,
> mengubah `.pkl`, atau menjalankan ulang notebook. Gunakan artefak yang ada apa adanya.

---

## 6. Backend (Tahap 2 — SELESAI)

FastAPI dengan *clean architecture* (logic terpisah; `main.py` tipis). Model dimuat **sekali**
saat startup (lifespan) via joblib. Riwayat prediksi disimpan ke **SQLite**. CORS diaktifkan untuk
React (`http://localhost:5173`).

**Endpoint:**

| Method & Path | Fungsi |
|---------------|--------|
| `GET /` | Info aplikasi & daftar endpoint |
| `GET /health` | Status kesehatan: `model_dimuat`, `database_ok`, `threshold_aktif` |
| `POST /predict` | Validasi → inferensi → simpan riwayat → kembalikan hasil |
| `GET /history?limit=N` | Riwayat prediksi terbaru (audit ringan) |

**Cara kerja `/predict`:**
1. Pydantic memvalidasi input (rentang + enum dikunci, `extra="forbid"`) → invalid = **422**.
2. Pipeline `.pkl` menghitung `predict_proba` → `probabilitas_layak`.
3. **Ambang keputusan**: `probabilitas_layak ≥ threshold` → "Layak", selain itu "Tidak Layak".
   Threshold default **0.5** dari `app/config.py`, dapat **di-override per-request** (field
   opsional `threshold`).
4. **5 faktor pendukung** dihitung via **SHAP `pred_contribs` bawaan XGBoost** (tanpa paket `shap`),
   diagregasi dari kolom one-hot ke fitur asal, diambil top-5 berdasarkan |kontribusi| dengan arah
   (+ mendukung LAYAK / − mendukung TIDAK LAYAK).
5. Hasil disimpan ke SQLite (input + hasil + faktor) lalu dikembalikan.

**`confidence`** = `max(probabilitas_layak, 1 − probabilitas_layak)` (keyakinan pada keputusan terpilih).

**Error handling:** 404 (endpoint tak ada), 422 (validasi), 500 (internal/inferensi gagal),
503 (model belum siap). Format seragam: `{"error", "detail", "status_code"}`.

**Catatan satuan:** seluruh nilai uang pada `/predict` **dalam IDR** (model dilatih pada IDR).

**Pengujian:** `pytest` — **9/9 lulus** (health, predict valid, override threshold, 422 enum/rentang/
field asing, history, 404). Versi `scikit-learn==1.8.0` & `xgboost==3.3.0` **dipin** agar `.pkl`
dapat dimuat konsisten.

---

## 7. Frontend Plan (Tahap 3)

- Seluruh frontend dibangun memakai **Claude Code**, stack **React + Vite**.
- Gunakan **UI UX Pro Max Skill** untuk seluruh keputusan desain dan implementasi UI.
- **Target kualitas:** setara produk **fintech enterprise**, **production-ready**, bergaya
  **dashboard SaaS**, **responsive** (mobile → desktop), dengan **reusable component**.
- **Halaman (rencana):**
  - **Beranda** — penjelasan tujuan aplikasi & ringkasan analitik (dashboard).
  - **🟢 Analisis Nasabah Baru** (fitur inti #1) — prediksi **satu** calon nasabah. Form memuat
    seluruh fitur model termasuk `tenor_bulan` (select {6,12,24,36,48,60}) dan `jaminan`
    (radio {Ada Jaminan, Tanpa Jaminan}); nilai uang dalam **IDR**. Setelah submit, kirim ke
    `POST /predict` lalu **panel hasil** menampilkan: badge **LAYAK** (hijau)/**TIDAK LAYAK** (merah),
    `probabilitas_layak` (persentase + progress bar), `confidence`, garis **threshold**, **5 faktor**
    paling berpengaruh (+/−), dan **disclaimer** bahwa hasil adalah rekomendasi model ML, bukan
    keputusan akhir. **Jangan pakai `<form>` HTML; gunakan handler `onClick`.**
  - **🟢 Import Data Nasabah** (fitur inti #2) — prediksi **banyak** pengajuan via **file CSV**.
    Alur: unggah CSV → **validasi format/header** terhadap skema fitur model (§12) → proses tiap
    baris memakai **model XGBoost yang sama** (iterasi `POST /predict` sisi klien, dengan progress
    bar) → tampilkan **ringkasan** jumlah Layak vs Tidak Layak, **distribusi prediksi** (grafik),
    **rata-rata probabilitas**, **preview** hasil, dan **unduhan CSV** berisi hasil prediksi
    (input + keputusan + probabilitas_layak). Lihat workflow lengkap di §4.
  - **Eksplorasi Data**, **Performa Model**, **Riwayat** (konsumsi `GET /history`), **Dokumentasi**.

> Kedua fitur inti **hanya inferensi** dengan model & kontrak API yang sama — tidak mengubah backend.

---

## 8. Design Principle

- **Professional, minimal, clean, modern.**
- **Glassmorphism ringan** (jangan berlebihan).
- **Palet warna:** Blue + Emerald (hijau) sebagai aksen utama; merah untuk status negatif.
- **Sudut membulat** (rounded) konsisten.
- **Animasi seperlunya** (Framer Motion) — mendukung, tidak mengganggu.
- **Accessibility:** kontras memadai, label form jelas, navigasi keyboard, `aria-*` bila perlu.
- Konsistensi visual lewat **design tokens** (warna, spacing, radius, tipografi).

---

## 9. Coding Rules

- **Clean Architecture** & **Single Responsibility Principle**.
- **Reusable Component** + **Small Component** (komponen kecil, fokus).
- **Custom Hook** untuk logic stateful (mis. `usePredict`).
- **Axios Service** terpusat (satu layer service, bukan `axios` tersebar di komponen).
- **No duplicated code**; kode **readable**; **meaningful naming**.
- **No inline styling.** **No Bootstrap. No Tailwind. No Material UI.** Gunakan **CSS Modules**.

---

## 10. Development Rules (WAJIB DIPATUHI)

1. **Jangan mengubah model machine learning** (tidak ada retraining, tidak mengubah `.pkl`).
2. **Jangan mengubah backend** kecuali ada **bug** nyata.
3. **Jangan mengubah kontrak API.** Frontend **menyesuaikan** backend, bukan sebaliknya.
4. **Selalu baca struktur project** (§11) sebelum membuat file baru, untuk menghindari duplikasi.
5. Jika **perubahan API benar-benar diperlukan**, lakukan **hanya setelah meminta konfirmasi**
   eksplisit, dan dokumentasikan alasannya.
6. Patuhi Coding Rules (§9) dan Design Principle (§8) pada setiap file.

---

## 11. Folder Structure

> Struktur target (monorepo). Backend yang sudah jadi saat ini dikirim sebagai `KrediPin_backend/`;
> tempatkan sebagai `backend/` di repo. `frontend/` dibuat pada Tahap 3.

```
KrediPin/
├── CLAUDE.md                       # file ini (project memory)
├── notebook/
│   └── SIAB_DASD.ipynb             # Tahap 1 (ML) — final, jangan dijalankan ulang
├── backend/                        # Tahap 2 (FastAPI) — SELESAI
│   ├── app/
│   │   ├── main.py                 # entry: lifespan, CORS, handler, router (tipis)
│   │   ├── config.py               # THRESHOLD configurable, path, CORS
│   │   ├── schemas.py              # Pydantic request/response (validasi rentang & enum)
│   │   ├── api/routes.py           # GET / , GET /health , POST /predict , GET /history
│   │   ├── core/exceptions.py      # handler 404 / 422 / 500 / 503
│   │   ├── ml/
│   │   │   ├── model_loader.py     # muat .pkl + metadata SEKALI (singleton)
│   │   │   └── predictor.py        # inferensi + 5 faktor (SHAP pred_contribs)
│   │   └── db/
│   │       ├── database.py         # engine SQLite + session + init_db
│   │       ├── models.py           # ORM PredictionHistory
│   │       └── repository.py       # simpan/ambil riwayat
│   ├── model/                      # model_krediPin.pkl, fitur_model.json, selected_model_info.json
│   ├── database/                   # SQLite runtime (gitignored)
│   ├── tests/test_api.py           # 9/9 lulus
│   ├── requirements.txt            # versi sklearn/xgboost dipin
│   ├── .env.example
│   ├── .gitignore
│   └── README.md
└── frontend/                       # Tahap 3 (React + Vite) — AKAN DIBUAT
```

---

## 12. API Contract

> **Stabil — jangan diubah tanpa konfirmasi.** Frontend mengikuti kontrak ini.

### Request — `POST /predict`
Seluruh nilai uang **dalam IDR**. Kategori dikunci (enum); di luar daftar → **422**.

| Field | Tipe | Aturan / Enum |
|-------|------|---------------|
| `usia` | int | 17–80 |
| `status_pekerjaan` | str | `Bekerja` \| `Mahasiswa` \| `Wiraswasta` |
| `lama_bekerja_tahun` | float | 0–60 |
| `pendapatan_tahunan` | float | ≥0 (IDR) |
| `skor_kredit` | int | 300–900 |
| `lama_riwayat_kredit_tahun` | float | 0–60 |
| `aset_tabungan` | float | ≥0 (IDR) |
| `hutang_saat_ini` | float | ≥0 (IDR) |
| `gagal_bayar_tercatat` | int | 0–10 |
| `tunggakan_2thn_terakhir` | int | 0–30 |
| `catatan_negatif` | int | 0–20 |
| `tipe_produk` | str | `Kartu Kredit` \| `Kredit Berjalan` \| `Pinjaman Pribadi` |
| `tujuan_pinjaman` | str | `Bisnis` \| `Konsolidasi Hutang` \| `Medis` \| `Pendidikan` \| `Pribadi` \| `Renovasi Rumah` |
| `jumlah_pinjaman` | float | ≥0 (IDR) |
| `suku_bunga` | float | 0–100 (%) |
| `rasio_hutang_terhadap_pendapatan` | float | 0–10 |
| `rasio_pinjaman_terhadap_pendapatan` | float | 0–50 |
| `rasio_pembayaran_terhadap_pendapatan` | float | 0–10 |
| `tenor_bulan` | int | `6` \| `12` \| `24` \| `36` \| `48` \| `60` |
| `jaminan` | str | `Ada Jaminan` \| `Tanpa Jaminan` |
| `threshold` | float? | opsional, 0–1 (override ambang) |

### Response — `200`
```json
{
  "keputusan": "Layak | Tidak Layak",
  "probabilitas_layak": 0.0-1.0,
  "confidence": 0.0-1.0,
  "threshold": 0.0-1.0,
  "faktor": [
    { "fitur": "string (label ramah)",
      "nilai_input": "string",
      "kontribusi": -inf..inf,
      "arah": "mendukung LAYAK | mendukung TIDAK LAYAK" }
    /* tepat 5 item */
  ],
  "disclaimer": "string (alat bantu, bukan keputusan akhir)",
  "id_riwayat": 1,
  "waktu": "ISO-8601 datetime"
}
```

**Field penting:** `keputusan` (badge), `probabilitas_layak` (progress bar), `confidence`,
`threshold` (garis ambang), `faktor[5]` (daftar +/−), `disclaimer` (wajib ditampilkan).

### `GET /health` → `{status, model_dimuat, database_ok, versi, threshold_aktif}`
### `GET /history?limit=N` → `[{id, waktu, keputusan, probabilitas_layak, confidence, threshold}]`
### Error → `{error, detail, status_code}`

---

## 13. Pending Task

**Frontend (Tahap 3): ✅ SELESAI** (di `frontend/`, terverifikasi via integration audit)
- [x] Setup React + Vite + struktur folder (components, hooks, services, pages, styles)
- [x] Axios service terpusat + custom hook `usePredict` (dan hook untuk batch, `useBatchPredict`)
- [x] Halaman Beranda
- [x] **Fitur inti #1 — Analisis Nasabah Baru** (form lengkap + `POST /predict` + panel hasil:
      badge, progress bar, threshold, 5 faktor, disclaimer)
- [x] **Fitur inti #2 — Import Data Nasabah** (upload CSV + validasi format + iterasi `POST /predict`
      + ringkasan Layak/Tidak Layak + distribusi + rata-rata probabilitas + preview + unduh CSV hasil)
- [x] Halaman Eksplorasi Data
- [x] Halaman Performa Model
- [x] Halaman **Riwayat** (konsumsi `GET /history`)
- [x] Halaman Dokumentasi
- [x] Responsiveness + accessibility pass + code-splitting (lazy routes)

**Dokumentasi & deliverable tugas:**
- [ ] Dokumentasi sistem (Dokumentasi)
- [ ] Deployment + **Docker** (Docker Compose: React build, FastAPI/uvicorn)
- [ ] **Laporan** proyek (format `DASD_SIAB_Laporan_Kelompok[nomor].pdf`)
- [ ] **PPT** (format `DASD_SIAB_PPT_Kelompok[nomor].pptx`)
- [ ] **Jurnal** pendukung (≥5 untuk tiap topik: XGBoost credit scoring; interpretabilitas/feature
      importance; peran tenor & jaminan) — wajib nyata & terverifikasi
- [ ] **Analisis Risiko** keamanan TI (≥5 risiko: dataset, source code, model, dashboard/API, input,
      deployment)
- [ ] **Q&A Dosen** (antisipasi pertanyaan: feature importance fitur sintetik, gagal_bayar,
      kenapa XGBoost, dst.)
- [ ] Etika/privasi/bias, Agile, MLOps, pengujian, optimasi & skalabilitas (komponen wajib DASD)

---

## 14. Future Development

Ide pengembangan lanjutan (di luar lingkup tugas inti):
- **Authentication** & sesi pengguna
- **User Management** & **Role** (mis. analis vs admin)
- **Logging** terstruktur & **Monitoring** (drift model, latensi)
- **Retraining** terjadwal + validasi data baru
- **Cloud Deployment** (container registry, managed DB)
- **CI/CD** (lint, test, build, deploy otomatis)
- **MLOps** penuh (model registry, versioning, monitoring performa, rollback)

---

## 15. Important Notes (selalu diingat)

- **Model XGBoost sudah final** — jangan retraining, jangan ubah `.pkl`, jangan jalankan ulang notebook.
- **Backend FastAPI sudah selesai dan lolos pengujian (9/9)** — jangan diubah kecuali ada bug.
- **Frontend adalah fokus utama berikutnya** (Tahap 3, React + Vite, via Claude Code).
- **Dua fitur inti aplikasi:** (1) **Analisis Nasabah Baru** — prediksi satu nasabah lewat
  `POST /predict`; (2) **Import Data Nasabah** — prediksi banyak nasabah via CSV. Selain itu ada
  dashboard analitik.
- **Kedua fitur hanya inferensi** dengan **model XGBoost yang sama** — tidak ada training ulang.
- **Batch CSV = iterasi `POST /predict` dari sisi frontend**, BUKAN endpoint baru. Tidak ada
  perubahan backend/API; bila endpoint batch dibutuhkan kelak → konfirmasi dulu (§10.5).
- **Validasi CSV** pada Import Data Nasabah harus mengikuti skema fitur model (§12), uang dalam IDR.
- **Gunakan UI UX Pro Max Skill** untuk seluruh keputusan desain.
- **Prioritaskan kualitas UX** dibanding kecepatan implementasi.
- **Jangan mengubah API tanpa alasan kuat** dan tanpa konfirmasi.
- **Dokumentasikan setiap keputusan arsitektur penting** (catat di sini atau di README terkait).
- **Nilai uang di API dalam IDR**; jangan lakukan konversi ganda di frontend.
- **Jangan pakai `<form>` HTML** pada React; gunakan handler `onClick`.
- **Styling: hanya CSS Modules** — tanpa Tailwind/Bootstrap/MUI/inline style.
- **Integritas metodologi:** laporkan feature importance apa adanya; jangan menaikkan `EFEK_LITERATUR`
  agar fitur sintetik tampak dominan.

---

*Versi CLAUDE.md: 1.1 · Sinkron dengan Tahap 1 (ML final) & Tahap 2 (Backend FastAPI, 9/9 tes lulus).
Pembaruan 1.1: dokumentasi dua fitur inti — Analisis Nasabah Baru & Import Data Nasabah (inferensi
saja, model & kontrak API tetap).*
