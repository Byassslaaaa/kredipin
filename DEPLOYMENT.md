# Ringkasan Deployment — KrediPin

Dokumen ini merangkum bagaimana KrediPin di-deploy ke produksi.

- **URL produksi:** https://kredipin.my.id
- **API:** https://kredipin.my.id/api · dokumentasi: https://kredipin.my.id/api/docs
- **Repository:** https://github.com/Byassslaaaa/kredipin
- **Status:** Live, HTTPS aktif (Let's Encrypt, auto-renew), redirect HTTP→HTTPS.

---

## Arsitektur Produksi

```
                    Internet (HTTPS :443)
                            │
                            ▼
        ┌──────────────────────────────────────┐
        │  Apache (reverse proxy, sudah ada)    │  kredipin.my.id
        │  TLS Let's Encrypt + redirect 80->443 │
        └───────────────┬───────────────┬───────┘
            /  (SPA)     │               │   /api/*  (prefix di-strip)
                         ▼               ▼
              ┌────────────────┐  ┌────────────────────┐
              │ frontend (Nginx)│  │ backend (FastAPI)  │
              │ 127.0.0.1:8090 │  │ 127.0.0.1:8091     │
              │  React + Vite  │  │  + model XGBoost   │
              └────────────────┘  └─────────┬──────────┘
                  (Docker)            (Docker) │
                                              ▼
                                     SQLite (volume kredipin_db)
```

- Frontend & backend berjalan sebagai **container Docker** yang hanya listen di
  **localhost** (tidak diekspos publik).
- **Apache yang sudah ada** di VPS bertindak sebagai reverse proxy: `/` → frontend,
  `/api/*` → backend. Karena satu origin, **tidak ada CORS**.
- Situs lain di VPS (ismafarsi.my.id, sidesabumdes.id, msalman.my.id, container
  medisync/hospital) **tidak terganggu** — port 80/443 tetap dikelola Apache.

---

## Lingkungan

| Item | Nilai |
|------|-------|
| VPS | ArenHost KVM-3, Ubuntu 22.04, RAM 3.8 GB |
| IP publik | 195.88.211.35 |
| Domain | kredipin.my.id (DNS dikelola Rumahweb, NS `nsid*.rumahweb.*`) |
| Reverse proxy | Apache 2.4 (modul proxy, proxy_http, ssl, rewrite) |
| Container runtime | Docker + Docker Compose |
| TLS | Let's Encrypt via `certbot --apache` (auto-renew) |

**Berkas deployment di repo:**
- `docker-compose.vps.yml` — menjalankan frontend (127.0.0.1:8090) & backend (127.0.0.1:8091)
- `deploy/kredipin-apache.conf` — VirtualHost Apache (proxy `/` & `/api`)
- `KrediPin_backend/Dockerfile` — image backend (Python 3.12)
- `frontend/Dockerfile` + `frontend/nginx.conf` — image frontend (build Vite → Nginx, SPA fallback)

---

## Langkah Deployment (yang dijalankan)

```bash
# 1. DNS: A record  kredipin.my.id -> 195.88.211.35  (di panel Rumahweb)

# 2. Di VPS — clone & jalankan container (localhost-only)
git clone https://github.com/Byassslaaaa/kredipin.git
cd kredipin
docker compose -f docker-compose.vps.yml up -d --build

# 3. Verifikasi container
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8090   # frontend 200
curl -s http://127.0.0.1:8091/health                             # backend ok

# 4. Pasang VirtualHost Apache
cp deploy/kredipin-apache.conf /etc/apache2/sites-available/kredipin.conf
a2ensite kredipin
apache2ctl configtest && systemctl reload apache2

# 5. Terbitkan HTTPS (DNS harus sudah mengarah)
certbot --apache -d kredipin.my.id     # pilih opsi Redirect (2)
```

Hasil akhir: `https://kredipin.my.id` → 200, `/api/health` → `{"status":"ok",...}`,
`http://` otomatis redirect ke `https://`.

---

## Kendala & Solusi

**CPU VPS tanpa x86-64-v2.** VPS memakai "QEMU Virtual CPU 2.5+" yang hanya mendukung
SSE/SSE2/SSE3 (tanpa SSE4.2/SSSE3/POPCNT). NumPy ≥ 2.1 dibangun dengan baseline
x86-64-v2 sehingga **crash saat import** (`NumPy was built with baseline optimizations (X86_V2)...`).
**Solusi:** pin `numpy==2.0.2` (baseline SSE3, tetap ABI numpy 2.x) + `scipy==1.13.1`
di `requirements.txt`. Image backend memakai `python:3.12-slim` agar cocok dengan
`xgboost==3.3.0` (butuh Python ≥ 3.12) dan `scikit-learn==1.8.0` (versi training).

---

## Operasional

```bash
cd ~/kredipin

# Update aplikasi setelah ada perubahan di GitHub
git pull && docker compose -f docker-compose.vps.yml up -d --build

# Status & log
docker compose -f docker-compose.vps.yml ps
docker compose -f docker-compose.vps.yml logs -f backend

# Restart / stop
docker compose -f docker-compose.vps.yml restart
docker compose -f docker-compose.vps.yml down
```

- **Sertifikat** diperbarui otomatis oleh timer certbot. Cek: `certbot certificates`.
- **Riwayat prediksi** (SQLite) persisten pada volume `kredipin_db` (aman saat restart).
- **Data analitik** statis sudah ter-generate di `frontend/public/data/` (jika artefak
  Tahap 1 berubah, jalankan `npm run prepare-data` lalu rebuild image frontend).
