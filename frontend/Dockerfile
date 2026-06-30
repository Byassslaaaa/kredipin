# KrediPin Frontend — React + Vite, disajikan via Nginx (multi-stage build).
#
# Catatan data dashboard: public/data/*.json sudah di-generate (npm run prepare-data)
# dan ikut ter-commit, sehingga build container bersifat deterministik. Bila artefak
# Tahap 1 berubah, jalankan ulang `npm run prepare-data` sebelum build image.

# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# URL backend disuntik saat build (Vite mem-bundle env VITE_*).
# Untuk deploy nyata, override dengan URL backend publik.
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:alpine AS serve
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
