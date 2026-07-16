# Deploy KrediPin ke VM Kampus (Lab PSTI)

Panduan deploy ke VM yang diberikan kampus. Berbeda dari VPS (kredipin.my.id):
**VM ini hanya punya IP, tanpa domain**, sehingga deploy memakai HTTP di port 80
(tanpa HTTPS/Let's Encrypt), dan frontend Nginx sekaligus mem-proxy `/api`
ke backend (same-origin, tanpa reverse proxy eksternal).

## Data VM (dari Sistem Lab PSTI)

| Item | Nilai |
|------|-------|
| Host IP | `157.66.9.7` |
| Username | `root` |
| Password | `dasd8` |
| SSH | `ssh root@157.66.9.7 -p 2208` (port **2208**) |
| OS | Ubuntu 22.04 |
| Aktif | 14 Jul 2026 – 21 Jul 2026 (**7 hari**) |

> ⚠️ **Keamanan:** password `dasd8` singkat & kini tercatat. Untuk demo 7 hari ini
> boleh dibiarkan, tapi jangan menaruh data sensitif di VM. VM otomatis nonaktif 21 Jul.

## ⚠️ Cek dulu: port HTTP yang di-forward

SSH ada di port **2208** (bukan 22) → besar kemungkinan VM di **balik NAT**
(banyak VM berbagi satu IP publik, tiap VM dipetakan ke port berbeda). Artinya
**port 80 belum tentu bisa diakses dari luar**.

**Tanyakan ke admin lab:** port publik mana yang di-forward ke VM untuk web (HTTP)?
- Jika **port 80** langsung → akses `http://157.66.9.7`
- Jika port lain (mis. **8080**) → deploy dengan `WEB_PORT=8080` lalu akses `http://157.66.9.7:8080`

Deployment Docker-nya sama saja; hanya port publiknya yang menyesuaikan.

## Cara Deploy (Otomatis — disarankan)

Login ke VM lalu jalankan skrip bootstrap (memasang Docker, clone repo, build, run):

```bash
ssh root@157.66.9.7 -p 2208
# password: dasd8

curl -fsSL https://raw.githubusercontent.com/Byassslaaaa/kredipin/main/deploy/deploy-vm.sh | bash
```

Bila port 80 tidak di-forward (pakai port lain, mis. 8080):

```bash
curl -fsSL https://raw.githubusercontent.com/Byassslaaaa/kredipin/main/deploy/deploy-vm.sh | WEB_PORT=8080 bash
```

## Cara Deploy (Manual — langkah per langkah)

```bash
# 1) Login
ssh root@157.66.9.7 -p 2208

# 2) Pasang Docker (bila belum ada)
curl -fsSL https://get.docker.com | sh
apt-get install -y docker-compose-plugin git

# 3) Ambil kode
git clone https://github.com/Byassslaaaa/kredipin.git ~/kredipin
cd ~/kredipin

# 4) Build & jalankan (ganti WEB_PORT bila perlu)
docker compose -f docker-compose.vm.yml up -d --build

# 5) Verifikasi
docker compose -f docker-compose.vm.yml ps
curl -s http://127.0.0.1:80/api/health      # harus {"status":"ok",...}
```

## Verifikasi & Akses

- Web: `http://157.66.9.7` (atau `:PORT` sesuai forwarding lab)
- API health: `http://157.66.9.7/api/health`
- Dari dalam VM: `curl http://127.0.0.1/api/health`

## Operasional

```bash
cd ~/kredipin

# Update setelah ada perubahan di GitHub
git pull && docker compose -f docker-compose.vm.yml up -d --build

# Log & status
docker compose -f docker-compose.vm.yml ps
docker compose -f docker-compose.vm.yml logs -f backend
docker compose -f docker-compose.vm.yml logs -f frontend

# Restart / stop
docker compose -f docker-compose.vm.yml restart
docker compose -f docker-compose.vm.yml down
```

## Catatan Teknis

- **Arsitektur:** `docker-compose.vm.yml` menjalankan 2 container — `frontend`
  (Nginx, publik di port `WEB_PORT`) dan `backend` (FastAPI, internal saja).
  Nginx mem-proxy `/api/*` → `backend:8000` (lihat `frontend/nginx.vm.conf`).
- **Tanpa CORS:** frontend & API berbagi origin yang sama.
- **Data persisten:** riwayat prediksi (SQLite) di volume `kredipin_db` (aman saat restart).
- **CPU lama:** `numpy==2.0.2` sudah dipin di `requirements.txt` agar jalan di CPU
  tanpa `x86-64-v2` (masalah yang sama sudah diatasi saat deploy VPS).
- **Firewall:** skrip otomatis `ufw allow` port web bila ufw aktif.
