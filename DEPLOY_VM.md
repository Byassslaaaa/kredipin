# Dokumentasi Deployment KrediPin ke VM Kampus (Lab PSTI)

Panduan **dari nol** men-deploy aplikasi KrediPin (FastAPI + React) ke VM yang
diberikan kampus melalui Sistem Lab PSTI. Ditulis agar dapat diikuti langkah demi
langkah oleh siapa pun, dan dilampirkan sebagai dokumentasi deployment pada laporan.

---

## 1. Ringkasan

- **Yang di-deploy:** 2 container Docker — **frontend** (React di-serve Nginx) dan
  **backend** (FastAPI + model XGBoost). Nginx frontend sekaligus mem-proxy `/api/*`
  ke backend, sehingga keduanya **satu origin** (tanpa CORS) dan tidak butuh reverse
  proxy terpisah.
- **Sumber kode:** GitHub `https://github.com/Byassslaaaa/kredipin` (branch `main`).
- **Metode:** Docker Compose. Model disimpan sebagai `.pkl` dan dimuat sekali saat
  startup (tidak ada training ulang).
- **Hasil akhir:** aplikasi dapat diakses via `http://<IP-VM>` (atau via domain, lihat §8).

**Arsitektur di VM:**

```
        Internet
           │  http (port 80 / port yang di-forward lab)
           ▼
┌──────────────────────────────┐
│ container: frontend (Nginx)  │  menyajikan React (SPA)
│  - /            → React       │  + mem-proxy /api/* ke backend
│  - /api/*       → backend:8000 │
└───────────────┬──────────────┘
                │ jaringan internal Docker
                ▼
┌──────────────────────────────┐
│ container: backend (FastAPI) │  inferensi model XGBoost (.pkl)
│  (tidak diekspos ke publik)  │  + SQLite (riwayat) di volume
└──────────────────────────────┘
```

---

## 2. Informasi VM (dari Sistem Lab PSTI)

| Item | Nilai |
|------|-------|
| **URL aplikasi (LIVE)** | **http://157.66.9.7:8008** |
| Host IP | `157.66.9.7` |
| Username | `root` |
| Password | `dasd8` |
| Port SSH | `2208` (bukan 22) |
| Perintah SSH | `ssh root@157.66.9.7 -p 2208` |
| Sistem Operasi | Ubuntu 22.04 |
| Masa aktif | 14 Jul 2026 – 21 Jul 2026 (**7 hari**) |
| Keperluan | Tugas akhir Desain Aplikasi Sains Data |

> ⚠️ **Catatan keamanan:** password `dasd8` singkat dan bersifat sementara. Untuk demo
> 7 hari boleh dibiarkan, namun jangan menaruh data sensitif nyata di VM. VM otomatis
> nonaktif pada 21 Jul 2026.

---

## 3. Prasyarat & Pemeriksaan Awal (PENTING)

VM berada **di balik NAT**: `157.66.9.7` adalah **gateway bersama**, sedangkan IP asli VM
adalah **192.168.37.179** (lihat `hostname -I`). Karena itu tiap layanan perlu **di-forward**
oleh admin lab, dan nomor port publiknya mengikuti **urutan VM** (VM ini bernomor **08**).

**Pemetaan port yang berlaku (sudah dikonfirmasi admin — request "Buka Port" selesai):**

| Layanan | Port publik (gateway) | Diteruskan ke | Status |
|---------|----------------------|---------------|--------|
| SSH | `157.66.9.7:2208` | `192.168.37.179:22` | ✅ aktif |
| **HTTP (web)** | **`157.66.9.7:8008`** | `192.168.37.179:80` | ✅ **aktif** |

→ **Aplikasi diakses di http://157.66.9.7:8008**

> **Penting:** container tetap listen di **port 80** di dalam VM (`WEB_PORT` default = 80).
> Forwarding 8008 → 80 dilakukan di sisi gateway kampus, **bukan** di VM. Jadi tidak ada
> konfigurasi yang perlu diubah. Frontend memanggil API secara relatif (`/api`), sehingga
> browser otomatis memakai origin yang sama berikut portnya
> (`http://157.66.9.7:8008/api/...`) — same-origin tetap terjaga, tanpa CORS.

Jika suatu saat mendapat VM baru dengan nomor urut berbeda, tanyakan kembali ke admin lab:
*"Port publik mana yang di-forward ke VM saya untuk layanan web (HTTP)?"*

---

## 4. Langkah 1 — Login ke VM

Dari komputer/laptop, buka terminal lalu:

```bash
ssh root@157.66.9.7 -p 2208
# saat diminta password, ketik: dasd8
```

Jika berhasil, prompt berubah menjadi `root@...:~#`.

---

## 5. Langkah 2 — Deploy (Cara Otomatis, disarankan)

Repo menyediakan skrip bootstrap `deploy/deploy-vm.sh` yang **idempoten** (aman diulang):
memasang Docker bila belum ada, meng-clone/meng-update kode, mem-build, dan menjalankan
container.

**Jika port 80 di-forward (default):**
```bash
curl -fsSL https://raw.githubusercontent.com/Byassslaaaa/kredipin/main/deploy/deploy-vm.sh | bash
```

**Jika port web di-forward ke port lain (mis. 8080):**
```bash
curl -fsSL https://raw.githubusercontent.com/Byassslaaaa/kredipin/main/deploy/deploy-vm.sh | WEB_PORT=8080 bash
```

Skrip akan menampilkan status container dan hasil health check di akhir. Lompat ke §7 (Verifikasi).

---

## 6. Langkah 2 (Alternatif) — Deploy Manual, per Perintah

Jika ingin memahami tiap langkah (atau skrip otomatis gagal), lakukan manual:

**6.1. Pasang Docker Engine + plugin Compose + Git**
```bash
curl -fsSL https://get.docker.com | sh
apt-get update -y && apt-get install -y docker-compose-plugin git
systemctl enable --now docker
```
Verifikasi:
```bash
docker --version            # mis. Docker version 27.x
docker compose version      # mis. Docker Compose version v2.x
```

**6.2. Ambil kode dari GitHub**
```bash
git clone https://github.com/Byassslaaaa/kredipin.git ~/kredipin
cd ~/kredipin
```

**6.3. Build & jalankan container**
```bash
# default port 80:
docker compose -f docker-compose.vm.yml up -d --build

# atau bila port web = 8080:
WEB_PORT=8080 docker compose -f docker-compose.vm.yml up -d --build
```
Proses build pertama kali memakan beberapa menit (mengunduh image & meng-install
dependensi Python/Node).

**6.4. Buka firewall (bila ufw aktif)**
```bash
ufw status                       # cek apakah aktif
ufw allow 80/tcp                 # atau: ufw allow 8080/tcp
```

---

## 7. Langkah 3 — Verifikasi

**7.1. Status container** — keduanya harus `Up`:
```bash
cd ~/kredipin
docker compose -f docker-compose.vm.yml ps
```

**7.2. Health check dari dalam VM** — harus mengembalikan JSON `status: ok`:
```bash
curl -s http://127.0.0.1/api/health
# contoh: {"status":"ok","model_dimuat":true,"database_ok":true,...}
```
(Ganti ke `http://127.0.0.1:8080/api/health` bila memakai WEB_PORT lain.)

**7.3. Akses dari browser:**
- Aplikasi: **http://157.66.9.7:8008**
- Health API: **http://157.66.9.7:8008/api/health**

Uji fitur inti: buka **Analisis Nasabah Baru**, isi form, klik prediksi — hasil
(keputusan + probabilitas + 5 faktor) harus tampil. Ini juga membuktikan frontend
berhasil memanggil backend lewat proxy `/api`.

---

## 8. Langkah 4 (Opsional) — Memakai Domain kredipin.my.id

Domain `kredipin.my.id` sebelumnya dipakai pada VPS lama (mengarah ke `195.88.211.35`).
Domain dapat dialihkan ke VM ini, **tetapi HTTPS hanya berfungsi jika port 80 & 443
VM terbuka dari internet** (Let's Encrypt memvalidasi domain lewat kedua port tersebut).

> Mengubah DNS ke VM akan memutus domain dari VPS lama, dan VM hanya aktif 7 hari
> (setelah 21 Jul 2026 domain menunjuk ke VM mati — perlu dikembalikan ke VPS).

### Skenario A — Port 80 & 443 di-forward ke VM (HTTPS penuh)

1. **Ubah DNS di panel Rumahweb:** A record `kredipin.my.id` → `157.66.9.7`
   (hapus/timpa yang lama ke `195.88.211.35`). Tunggu propagasi (menit hingga jam).
   Cek propagasi: `nslookup kredipin.my.id` harus menampilkan `157.66.9.7`.

2. **Di VM**, gunakan compose produksi berbasis Caddy (auto-HTTPS) yang sudah tersedia:
   ```bash
   cd ~/kredipin
   printf 'DOMAIN=kredipin.my.id\nTLS_EMAIL=sidesaweb@gmail.com\n' > .env
   docker compose -f docker-compose.prod.yml up -d --build
   ```
   Caddy otomatis menerbitkan sertifikat Let's Encrypt.

3. Akses **https://kredipin.my.id** (HTTP otomatis dialihkan ke HTTPS).

### Skenario B — Hanya port kustom yang di-forward (tanpa HTTPS otomatis)

Let's Encrypt tidak dapat memvalidasi tanpa 80/443. Pilihan:
- **HTTP + domain di port kustom:** arahkan A record ke `157.66.9.7`, deploy seperti §5/§6
  dengan `WEB_PORT` sesuai, lalu akses `http://kredipin.my.id:<port>` (tanpa gembok HTTPS).
- **HTTPS via DNS-01 challenge:** memungkinkan di balik NAT, tetapi butuh API DNS Rumahweb
  + plugin Caddy. Lebih kompleks — siapkan hanya bila HTTPS benar-benar diperlukan.

---

## 9. Operasional (Update, Log, Restart)

```bash
cd ~/kredipin

# Update setelah ada perubahan di GitHub
git pull && docker compose -f docker-compose.vm.yml up -d --build

# Melihat status & log
docker compose -f docker-compose.vm.yml ps
docker compose -f docker-compose.vm.yml logs -f backend
docker compose -f docker-compose.vm.yml logs -f frontend

# Restart / menghentikan
docker compose -f docker-compose.vm.yml restart
docker compose -f docker-compose.vm.yml down
```

Data riwayat prediksi (SQLite) tersimpan di volume `kredipin_db` sehingga aman saat restart.

---

## 10. Troubleshooting

| Gejala | Kemungkinan penyebab | Solusi |
|--------|----------------------|--------|
| Browser tak bisa membuka `http://157.66.9.7:8008` | Container mati, atau forwarding gateway berubah | Cek `docker compose ... ps` & `curl http://127.0.0.1/api/health` dari dalam VM; bila lokal OK, konfirmasi forwarding ke admin lab |
| Build gagal `no space left on device` | Disk VM hanya 5.8 GB, image ML besar | `docker compose ... down` → `docker system prune -af` → build ulang. Solusi permanen: ajukan **Tambah Storage** ke ~20 GB |
| `curl 127.0.0.1/api/health` gagal | Backend belum siap / gagal | `docker compose -f docker-compose.vm.yml logs backend` |
| Build backend gagal saat import numpy | CPU VM tanpa `x86-64-v2` | Sudah diatasi: `numpy==2.0.2` dipin di `requirements.txt` (tak perlu tindakan) |
| Halaman tampil tapi prediksi error | Proxy `/api` tidak jalan | Pastikan pakai `docker-compose.vm.yml` (memuat `frontend/nginx.vm.conf`) |
| HTTPS gagal terbit (Skenario A) | Port 80/443 tidak sampai ke VM, atau DNS belum propagasi | Cek `nslookup kredipin.my.id` = `157.66.9.7`; konfirmasi forwarding 80/443 |
| Perubahan tak muncul di browser | Cache aset lama | Hard refresh (Ctrl+Shift+R) |

---

## 11. Berkas Terkait di Repo

| Berkas | Fungsi |
|--------|--------|
| `docker-compose.vm.yml` | Orkestrasi deploy VM (IP saja, port 80/kustom) |
| `frontend/nginx.vm.conf` | Nginx frontend + proxy `/api` ke backend (same-origin) |
| `deploy/deploy-vm.sh` | Skrip bootstrap otomatis (Docker + clone + build + run) |
| `docker-compose.prod.yml` + `Caddyfile` | Deploy berbasis domain + HTTPS otomatis (Skenario A) |
| `KrediPin_backend/Dockerfile` | Image backend (Python 3.12) |
| `frontend/Dockerfile` | Image frontend (build Vite → Nginx) |
| `KrediPin_backend/requirements.txt` | Dependensi Python (versi dipin) |

---

## 12. Ringkasan Cepat (TL;DR)

```bash
# 1) Login
ssh root@157.66.9.7 -p 2208            # password: dasd8

# 2) Deploy satu perintah (port 80 default; ganti WEB_PORT bila perlu)
curl -fsSL https://raw.githubusercontent.com/Byassslaaaa/kredipin/main/deploy/deploy-vm.sh | bash

# 3) Verifikasi
curl -s http://127.0.0.1/api/health    # → {"status":"ok",...}
# buka http://157.66.9.7:8008 di browser
```
