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

## Deployment ke VPS (produksi · domain + HTTPS otomatis)

Memakai **Caddy** sebagai reverse proxy: satu domain melayani frontend dan
mem-proxy `/api/*` ke backend (same-origin, **tanpa CORS**), TLS otomatis dari
Let's Encrypt. Berkas: [`Caddyfile`](Caddyfile) + [`docker-compose.prod.yml`](docker-compose.prod.yml).

### 1) Arahkan domain
Buat **A record** `kredipin.contoh.com` → **IP VPS** (tunggu propagasi DNS).

### 2) Pasang Docker di VPS (Ubuntu/Debian)
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker   # agar bisa tanpa sudo
docker --version && docker compose version
```

### 3) Buka firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80,443/tcp
sudo ufw enable
```

### 4) Clone & konfigurasi
```bash
git clone https://github.com/Byassslaaaa/kredipin.git
cd kredipin
cp .env.prod.example .env
nano .env        # isi DOMAIN dan TLS_EMAIL
```

### 5) Jalankan
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Caddy otomatis menerbitkan sertifikat HTTPS. Akses: **https://DOMAIN**
(dok API: **https://DOMAIN/api/docs**).

### Operasional
```bash
docker compose -f docker-compose.prod.yml logs -f        # lihat log
git pull && docker compose -f docker-compose.prod.yml up -d --build   # update
docker compose -f docker-compose.prod.yml down           # hentikan
```

> Riwayat prediksi (SQLite) persisten di volume `kredipin_db`. Disarankan VPS
> RAM **≥2GB** (XGBoost/scikit-learn). Frontend memanggil API lewat path relatif
> `/api`, sehingga tidak perlu mengubah kode untuk domain berbeda.

---

## Deployment ke VPS yang sudah punya Apache/Nginx (reverse proxy bersama)

Jika VPS sudah menjalankan situs lain di port 80/443 (mis. via Apache), **jangan**
pakai Caddy di atas. KrediPin dijalankan di **port localhost** dan reverse proxy
yang ada (Apache) melayani `kredipin.my.id`. Berkas:
[`docker-compose.vps.yml`](docker-compose.vps.yml) + [`deploy/kredipin-apache.conf`](deploy/kredipin-apache.conf).

```bash
# 1) DNS: A record kredipin.my.id -> IP VPS (lakukan lebih dulu)

# 2) Clone & jalankan container di localhost (8090 frontend, 8091 backend)
git clone https://github.com/Byassslaaaa/kredipin.git
cd kredipin
docker compose -f docker-compose.vps.yml up -d --build

# 3) Verifikasi lokal
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8090        # 200 frontend
curl -s http://127.0.0.1:8091/health                                  # status ok backend

# 4) Pasang VirtualHost Apache
cp deploy/kredipin-apache.conf /etc/apache2/sites-available/kredipin.conf
a2ensite kredipin
apache2ctl configtest && systemctl reload apache2

# 5) Terbitkan HTTPS (mengikuti certbot yang sudah ada)
certbot --apache -d kredipin.my.id
```

Akses: **https://kredipin.my.id** · API: **https://kredipin.my.id/api/docs**.
Same-origin (`/api` di-proxy ke backend) → tanpa CORS. Tidak ada situs lain yang
terganggu karena port 80/443 tetap dikelola Apache.

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
