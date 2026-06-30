# KrediPin Backend — FastAPI + XGBoost
# Memakai versi dependensi TERPIN (requirements.txt) agar cocok dengan versi
# saat training Tahap 1 (scikit-learn 1.8.0) -> tidak ada InconsistentVersionWarning
# & hasil inferensi konsisten.
# Catatan: xgboost==3.3.0 (di requirements) butuh Python >=3.12, jadi base image
# memakai python:3.12-slim.
FROM python:3.12-slim

# libgomp1 dibutuhkan runtime XGBoost.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependensi dulu (layer cache).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Salin kode aplikasi & artefak model (tanpa tests/db lokal — lihat .dockerignore).
COPY app ./app
COPY model ./model

# Folder database SQLite (di-mount sebagai volume agar riwayat persisten).
RUN mkdir -p database

EXPOSE 8000

# THRESHOLD & CORS_ORIGINS dapat di-override lewat environment (lihat docker-compose).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
