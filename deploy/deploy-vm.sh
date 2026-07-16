#!/usr/bin/env bash
# =============================================================================
# deploy-vm.sh — bootstrap deploy KrediPin di VM kampus (Ubuntu 22.04, root).
#
# Idempoten: aman dijalankan berulang. Memasang Docker bila belum ada, meng-clone
# / meng-update repo, lalu menjalankan container via docker-compose.vm.yml.
#
# CARA PAKAI (di dalam VM, sebagai root):
#   ssh root@157.66.9.7 -p 2208
#   curl -fsSL https://raw.githubusercontent.com/Byassslaaaa/kredipin/main/deploy/deploy-vm.sh | bash
#
# atau setelah repo ter-clone:
#   cd ~/kredipin && bash deploy/deploy-vm.sh
#
# Opsi:
#   WEB_PORT=8080 bash deploy/deploy-vm.sh   # bila port 80 tidak di-forward lab
# =============================================================================
set -euo pipefail

REPO_URL="https://github.com/Byassslaaaa/kredipin.git"
APP_DIR="${APP_DIR:-$HOME/kredipin}"
COMPOSE_FILE="docker-compose.vm.yml"
WEB_PORT="${WEB_PORT:-80}"

log() { printf '\n\033[1;32m==>\033[0m %s\n' "$1"; }

# 1) Dependensi dasar -----------------------------------------------------------
log "Memastikan git & curl terpasang"
if ! command -v git >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y git curl ca-certificates
fi

# 2) Docker + plugin compose ----------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  log "Memasang Docker Engine (skrip resmi)"
  curl -fsSL https://get.docker.com | sh
fi
if ! docker compose version >/dev/null 2>&1; then
  log "Memasang plugin docker-compose"
  apt-get update -y && apt-get install -y docker-compose-plugin
fi
systemctl enable --now docker >/dev/null 2>&1 || true

# 3) Clone / update repo --------------------------------------------------------
if [ -d "$APP_DIR/.git" ]; then
  log "Repo sudah ada — git pull"
  git -C "$APP_DIR" pull --ff-only
else
  log "Clone repo ke $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# 4) Build & jalankan -----------------------------------------------------------
log "Build & menjalankan container (WEB_PORT=$WEB_PORT)"
WEB_PORT="$WEB_PORT" docker compose -f "$COMPOSE_FILE" up -d --build

# 5) Buka firewall bila ufw aktif ----------------------------------------------
if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
  log "Membuka port $WEB_PORT di ufw"
  ufw allow "$WEB_PORT"/tcp || true
fi

# 6) Verifikasi -----------------------------------------------------------------
log "Status container"
docker compose -f "$COMPOSE_FILE" ps

log "Cek kesehatan (tunggu ~5 detik untuk backend siap)"
sleep 5
IP=$(hostname -I | awk '{print $1}')
code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${WEB_PORT}/api/health" || true)
printf '  /api/health -> HTTP %s\n' "$code"

log "Selesai. Akses aplikasi di:  http://<IP-PUBLIK-VM>:${WEB_PORT}"
printf '  (IP internal terdeteksi: %s — pastikan port %s di-forward lab bila di balik NAT)\n' "$IP" "$WEB_PORT"
