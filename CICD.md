# CI/CD KrediPin (GitHub Actions → VM Kampus)

Dokumentasi penerapan **Continuous Integration / Continuous Deployment**.
Memenuhi komponen DASD: DevOps/MLOps & continuous deployment.

## Alur

```
git push ke main
      │
      ▼
GitHub Actions (cloud)
  ├── CI: pytest backend (9 uji)         ─┐  harus lolos
  ├── CI: build frontend (Vite)          ─┘
      │  (jika lolos)
      ▼
  CD: SSH ke VM (157.66.9.7:2208)
        cd ~/kredipin
        git pull
        docker compose -f docker-compose.vm.yml up -d --build
```

- **CI** jalan pada setiap `push` dan `pull_request` → memastikan kode tidak rusak.
- **CD** jalan hanya pada `push` ke `main` **dan** hanya jika CI lolos → deploy otomatis.
- **Tidak butuh port 80 di-forward** — deploy memakai **SSH (port 2208)** yang sudah publik.
  Jadi CI/CD berfungsi meski akses web dari luar belum dibuka admin.

File pipeline: [`.github/workflows/ci-cd.yml`](.github/workflows/ci-cd.yml).

## Yang perlu disiapkan (sekali)

CD butuh 4 *secret* di GitHub. Ikuti langkah berikut.

### 1. Buat SSH key khusus deploy (di komputermu)

```bash
ssh-keygen -t ed25519 -C "kredipin-cicd" -f kredipin_deploy -N ""
```
Menghasilkan 2 berkas: `kredipin_deploy` (private) & `kredipin_deploy.pub` (public).

### 2. Pasang public key ke VM

```bash
# tampilkan public key
cat kredipin_deploy.pub
```
Salin isinya, lalu di VM (via SSH) tambahkan ke authorized_keys:
```bash
ssh root@157.66.9.7 -p 2208
mkdir -p ~/.ssh && chmod 700 ~/.ssh
echo "ISI_PUBLIC_KEY_DI_SINI" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
exit
```
Uji tanpa password:
```bash
ssh -i kredipin_deploy -p 2208 root@157.66.9.7 "echo OK"
```

### 3. Tambahkan secrets di GitHub

Repo → **Settings → Secrets and variables → Actions → New repository secret**, buat 4:

| Nama secret | Nilai |
|-------------|-------|
| `VM_HOST` | `157.66.9.7` |
| `VM_PORT` | `2208` |
| `VM_USER` | `root` |
| `VM_SSH_KEY` | **seluruh isi** berkas private `kredipin_deploy` (termasuk baris `-----BEGIN...` s.d. `-----END...`) |

### 4. Selesai

Push berikutnya ke `main` akan otomatis menjalankan CI lalu deploy ke VM. Pantau di
tab **Actions** repo GitHub.

## Menjalankan deploy manual (tanpa push)

Tab **Actions** → workflow **CI/CD** → **Run workflow** (aktif berkat `workflow_dispatch`
opsional bisa ditambah; saat ini deploy terpicu oleh push ke main).

## Catatan

- **VM sementara (7 hari, s.d. 21 Jul 2026).** Setelah VM nonaktif, job `deploy` akan gagal
  (wajar) — nonaktifkan sementara atau perbarui secret bila dapat VM baru.
- **Keamanan:** memakai SSH **key** (bukan password) untuk deploy. Private key hanya tersimpan
  sebagai secret terenkripsi GitHub, tidak pernah masuk ke kode. Disarankan mengganti password
  root VM yang lemah bila memungkinkan.
- **Gating:** `deploy` memakai `needs: [backend-tests, frontend-build]` sehingga deploy hanya
  terjadi bila kedua uji lolos — mencegah men-deploy kode rusak.
