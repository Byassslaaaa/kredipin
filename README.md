# KrediPin — Sistem Pendukung Keputusan Kelayakan Pinjaman Digital

Aplikasi *data-driven decision support* yang memprediksi kelayakan pengajuan pinjaman
(**Layak / Tidak Layak**) beserta probabilitas dan faktor pendukungnya, untuk membantu
analis kredit mengambil keputusan yang konsisten, objektif, dan transparan.

Proyek tugas gabungan **DASD** & **SIAB**.

- **Machine Learning** — XGBoost (Accuracy 92,7% · F1 93,5% · ROC-AUC 98,4%)
- **Backend** — FastAPI + SQLite (riwayat prediksi)
- **Frontend** — React + Vite + CSS Modules (dashboard gaya fintech enterprise)

---

## Struktur Repositori

```
.
├── KrediPin_backend/      # API FastAPI + artefak model (.pkl) — Tahap 2
├── frontend/              # Aplikasi React + Vite — Tahap 3
├── krediPin/              # Notebook ML + dataset + artefak analitik — Tahap 1
├── docker-compose.yml     # Orkestrasi backend + frontend
└── CLAUDE.md              # Konteks proyek (source of truth)
```

Dua fitur inti aplikasi:
1. **Analisis Nasabah Baru** — prediksi satu calon nasabah (form interaktif).
2. **Import Data Nasabah** — prediksi banyak pengajuan via berkas CSV.

---

## Menjalankan — Opsi A: Native (pengembangan)

> Butuh **Node.js 18+** dan **Python 3.12** (artefak model di-pin ke `xgboost==3.3.0`
> yang memerlukan Python ≥3.12). Pada Python 3.11 model tetap berjalan namun memunculkan
> `InconsistentVersionWarning` (kosmetik).

### 1) Backend — Terminal 1
```powershell
cd "c:/Ubay/Kuliah/Sem 6/SIAB/Presentasi/Baru/KrediPin_backend"
pip install -r requirements.txt        # cukup sekali
python -m uvicorn app.main:app --port 8000
```
API: http://localhost:8000 · Dokumentasi interaktif: http://localhost:8000/docs

### 2) Frontend — Terminal 2
```powershell
cd "c:/Ubay/Kuliah/Sem 6/SIAB/Presentasi/Baru/frontend"
npm install                            # cukup sekali
npm run prepare-data                   # cukup sekali (siapkan data analitik statis)
npm run dev
```
Dashboard: http://localhost:5173

> Pastikan frontend berjalan di **port 5173** (origin yang diizinkan CORS). Jika 5173
> dipakai aplikasi lain, Vite pindah ke 5174/5175 — origin tersebut juga sudah diizinkan
> secara default untuk pengembangan.

---

## Menjalankan — Opsi B: Docker (satu perintah)

> Butuh **Docker Desktop** dalam status *Engine running*.

```powershell
cd "c:/Ubay/Kuliah/Sem 6/SIAB/Presentasi/Baru"
docker compose up -d --build
```
- Frontend: http://localhost:5173
- Backend: http://localhost:8000/docs

Hentikan:
```powershell
docker compose down
```

Container backend memakai dependensi **terpin** (scikit-learn 1.8.0, xgboost 3.3.0 di
Python 3.12) sehingga konsisten dengan versi training — tanpa warning versi.

---

## Membersihkan Port (bila tersangkut)

Jika port 8000/5173 masih dipegang proses lama (PowerShell):
```powershell
foreach ($p in 5173,5174,5175,8000) {
  Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
    Where-Object { (Get-Process -Id $_.OwningProcess).ProcessName -match 'node|python' } |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
}
```

---

## Konfigurasi

| Variabel | Lokasi | Default | Keterangan |
|----------|--------|---------|------------|
| `VITE_API_BASE_URL` | `frontend/.env` | `http://localhost:8000` | URL backend yang dipanggil frontend |
| `THRESHOLD` | backend env | `0.5` | Ambang keputusan (probabilitas ≥ ambang → Layak) |
| `CORS_ORIGINS` | backend env | `localhost:5173-5175` | Origin frontend yang diizinkan (koma atau JSON) |

---

## Catatan

- **Nilai uang dalam IDR**; tidak ada konversi ganda di frontend.
- **Prediksi batch** (Import) menjalankan `POST /predict` berulang dari sisi klien —
  bukan endpoint terpisah.
- Setiap prediksi tersimpan ke riwayat (SQLite) dan dapat ditinjau di menu **Riwayat**.
- Hasil prediksi adalah **alat bantu**, bukan keputusan akhir.

Dokumentasi lebih rinci: [`frontend/README.md`](frontend/README.md) ·
[`KrediPin_backend/README.md`](KrediPin_backend/README.md).
