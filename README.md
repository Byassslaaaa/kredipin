# KrediPin - Sistem Pendukung Keputusan Kelayakan Pinjaman Digital

Aplikasi *data-driven decision support* yang memprediksi kelayakan pengajuan pinjaman
(**Layak / Tidak Layak**) beserta probabilitas dan faktor pendukungnya, untuk membantu
analis kredit mengambil keputusan yang konsisten, objektif, dan transparan.

Proyek tugas gabungan **DASD** & **SIAB**.

- **Machine Learning**: XGBoost (Accuracy 92,7% · F1 93,5% · ROC-AUC 98,4%)
- **Backend**: FastAPI + SQLite (riwayat prediksi, pengguna, kebijakan, jejak audit)
- **Frontend**: React + Vite + CSS Modules (dashboard gaya fintech enterprise)
- **Keamanan**: autentikasi JWT, peran (analis/admin), rate limit, jejak audit
- **Operasional**: Docker Compose, deploy ke VM via Cloudflare Tunnel, CI/CD GitHub Actions

---

## Struktur Repositori

```
.
├── KrediPin_backend/          # API FastAPI + artefak model (.pkl) - Tahap 2
├── frontend/                  # Aplikasi React + Vite - Tahap 3
├── krediPin/                  # Notebook ML + dataset + artefak analitik - Tahap 1
├── docker-compose.yml         # Orkestrasi lokal (backend + frontend)
├── docker-compose.vm.yml      # Orkestrasi produksi di VM (dipakai CI/CD)
├── .github/workflows/ci-cd.yml# Pipeline: test -> build -> deploy
└── CLAUDE.md                  # Konteks proyek (source of truth)
```

---

## Fitur

**Dua fitur inti (inferensi model yang sama):**
1. **Analisis Nasabah Baru**: prediksi satu calon nasabah lewat form interaktif.
2. **Import Data Nasabah**: prediksi banyak pengajuan via berkas CSV (iterasi `POST /predict`
   dari sisi klien, bukan endpoint terpisah).

**Untuk peran Analis:** Beranda operasional, dua fitur inti di atas, dan **Riwayat Prediksi**
(hanya penilaian miliknya sendiri).

**Untuk peran Admin (pengawasan & teknis):** Beranda teknis, **Eksplorasi Data**,
**Performa Model**, **Proses Data (Colab)**, **Riwayat seluruh analis**, **Monitoring**
(volume & tingkat penyimpangan keputusan), **Jejak Audit** (hanya-tambah), **Kelola Pengguna**,
dan **Kebijakan Ambang** (mengatur ambang keputusan yang berlaku untuk semua).

Setiap prediksi menampilkan **5 faktor** paling berpengaruh (SHAP) dengan arah dukungannya,
dan disertai disclaimer bahwa hasil adalah **alat bantu**, bukan keputusan akhir.

---

## Autentikasi & Peran

Aplikasi mewajibkan login. Tersedia dua peran dengan hak berbeda (pemisahan tugas ala perbankan):

| Peran | Hak akses |
|-------|-----------|
| **analis** | Melakukan prediksi (`/predict`) dan melihat riwayat penilaiannya sendiri |
| **admin** | Pengawasan penuh: monitoring, jejak audit, kelola pengguna, kebijakan ambang, riwayat seluruh analis. Tidak melakukan prediksi. |

**Akun bawaan (seed) untuk pengembangan/demo** - ganti pada deployment nyata:

| Peran | Username | Password |
|-------|----------|----------|
| Admin | `admin` | `admin123` |
| Analis | `analis` | `analis123` |

> Ambang keputusan bukan lagi preferensi per pengguna, melainkan **kebijakan tersimpan** yang
> hanya dapat diubah admin (tercatat di jejak audit). Analis memakai ambang yang berlaku.

---

## Menjalankan - Opsi A: Native (pengembangan)

> Butuh **Node.js 18+** dan **Python 3.12** (artefak model di-pin ke `xgboost-cpu==3.3.0`
> yang memerlukan Python >=3.12). Pada Python 3.11 model tetap berjalan namun memunculkan
> `InconsistentVersionWarning` (kosmetik).

### 1) Backend (Terminal 1)
```powershell
cd "c:/Ubay/Kuliah/Sem 6/SIAB/Presentasi/Baru/KrediPin_backend"
pip install -r requirements.txt        # cukup sekali
python -m uvicorn app.main:app --port 8000
```
API: http://localhost:8000 · Dokumentasi interaktif: http://localhost:8000/docs

### 2) Frontend (Terminal 2)
```powershell
cd "c:/Ubay/Kuliah/Sem 6/SIAB/Presentasi/Baru/frontend"
npm install                            # cukup sekali
npm run prepare-data                   # cukup sekali (siapkan data analitik statis)
npm run dev
```
Dashboard: http://localhost:5173 (masuk dengan akun seed di atas)

> Pastikan frontend berjalan di **port 5173** (origin yang diizinkan CORS). Jika 5173
> dipakai aplikasi lain, Vite pindah ke 5174/5175 yang juga sudah diizinkan untuk pengembangan.

---

## Menjalankan - Opsi B: Docker (satu perintah)

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

Container backend memakai dependensi **terpin** (scikit-learn 1.8.0, xgboost-cpu 3.3.0 di
Python 3.12) agar konsisten dengan versi training, tanpa warning versi. Varian `xgboost-cpu`
dipilih agar image tidak menarik pustaka GPU NVIDIA (~400 MB) yang tidak diperlukan.

---

## Deployment Produksi: VM + Cloudflare Tunnel + CI/CD

Produksi berjalan di **VM** yang di-*expose* lewat **Cloudflare Tunnel** (tanpa membuka port
publik), dengan **Nginx** menyajikan frontend dan mem-proxy `/api/*` ke backend (same-origin,
**tanpa CORS**). Berkas: [`docker-compose.vm.yml`](docker-compose.vm.yml).

Alamat produksi: **https://dasd.kredipin.my.id** (API di **/api**).

**Alur otomatis (CI/CD).** Setiap push ke `main` memicu
[`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml):
1. **Backend - pytest** (harus lulus)
2. **Frontend - build** (harus lulus)
3. **Deploy ke VM** lewat SSH: `git pull` lalu `docker compose -f docker-compose.vm.yml up -d --build`.

Deploy hanya berjalan bila test dan build lulus.

### Menjalankan manual di VM
```bash
git clone https://github.com/Byassslaaaa/kredipin.git
cd kredipin

# WAJIB: set SECRET_KEY acak sebelum start (lihat catatan keamanan di bawah)
echo "SECRET_KEY=$(openssl rand -hex 32)" >> .env

docker compose -f docker-compose.vm.yml up -d --build
```

> ⚠️ **Keamanan penting.** `SECRET_KEY` bawaan (`dev-only-ganti-di-produksi`) hanya untuk
> pengembangan. Pada produksi **wajib** di-override lewat `.env`; bila tidak, token admin
> palsu dapat dibuat dan seluruh kontrol peran/audit bisa dilewati. Ganti pula password akun
> seed. Backend menampilkan peringatan di log startup selama `SECRET_KEY` masih default.

### Opsi lain
- **VPS dengan domain + HTTPS otomatis (Caddy):** [`docker-compose.prod.yml`](docker-compose.prod.yml) + [`Caddyfile`](Caddyfile).
- **VPS yang sudah memakai Apache/Nginx:** [`docker-compose.vps.yml`](docker-compose.vps.yml) + [`deploy/kredipin-apache.conf`](deploy/kredipin-apache.conf).

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

## Konfigurasi (environment backend)

| Variabel | Default | Keterangan |
|----------|---------|------------|
| `SECRET_KEY` | `dev-only-ganti-di-produksi` | **Kunci tanda tangan JWT. WAJIB diganti di produksi.** |
| `THRESHOLD` | `0.5` | Ambang keputusan awal (probabilitas >= ambang -> Layak). Setelahnya diatur admin lewat Kebijakan Ambang. |
| `TOKEN_EXPIRE_MINUTES` | `480` | Masa berlaku token (8 jam kerja). |
| `SEED_ADMIN_USER` / `SEED_ADMIN_PASSWORD` | `admin` / `admin123` | Akun admin awal (ganti di produksi). |
| `SEED_ANALIS_USER` / `SEED_ANALIS_PASSWORD` | `analis` / `analis123` | Akun analis awal (ganti di produksi). |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | `600` / `60` | Batas request per IP per jendela (detik). |
| `CORS_ORIGINS` | `localhost:5173-5175` | Origin frontend yang diizinkan (koma atau JSON). Tak diperlukan pada deploy same-origin. |
| `VITE_API_BASE_URL` (frontend) | `http://localhost:8000` | URL backend saat dev. Pada produksi frontend memanggil path relatif `/api`. |

---

## Catatan

- **Nilai uang dalam IDR**; tidak ada konversi ganda di frontend.
- **Rasio keuangan dihitung otomatis** di server dari data dasar; frontend menampilkannya
  read-only agar yang dilihat analis sama dengan yang dipakai model.
- **Prediksi batch** (Import) menjalankan `POST /predict` berulang dari sisi klien,
  bukan endpoint terpisah.
- Setiap prediksi tersimpan ke riwayat (SQLite) dengan pemiliknya dan dapat ditinjau di menu **Riwayat**.
- Keputusan analis dicatat terpisah dari rekomendasi model; alasan wajib diisi bila menyimpang.
- Hasil prediksi adalah **alat bantu**, bukan keputusan akhir.

Dokumentasi lebih rinci: [`frontend/README.md`](frontend/README.md) ·
[`KrediPin_backend/README.md`](KrediPin_backend/README.md).
