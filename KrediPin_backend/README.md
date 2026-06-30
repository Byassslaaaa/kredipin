# KrediPin — Backend FastAPI

REST API untuk **KrediPin — Sistem Pendukung Keputusan Kelayakan Pinjaman Digital**.
Backend ini melayani inferensi model **XGBoost** (artefak Tahap 1) sebagai *model-as-a-service*
dan dikonsumsi oleh frontend **React** (Tahap 3).

> **Disclaimer.** KrediPin adalah **alat bantu** pengambilan keputusan kredit, **bukan keputusan
> akhir**. Keputusan final tetap pada analis/komite kredit.

---

## 1. Arsitektur

```
React (SPA, Vite :5173)
      │  HTTP/JSON
      ▼
FastAPI (:8000)  ── validasi (Pydantic) · ambang keputusan · inferensi .pkl · faktor (SHAP) · riwayat
      │
      ▼
SQLite (database/krediPin_history.db)
```

Model `.pkl` dimuat **sekali** saat startup (tidak ada *training ulang* per request). Karena artefak
adalah objek Python (pipeline sklearn + XGBoost), inferensi dilayani oleh Python/FastAPI — pola MLOps
standar *model-as-a-service*.

## 2. Struktur Proyek

```
KrediPin_backend/
├── app/
│   ├── main.py                # entry point: lifespan, CORS, handler, router (sengaja tipis)
│   ├── config.py              # konfigurasi terpusat (THRESHOLD configurable, path, CORS)
│   ├── schemas.py             # Pydantic: request/response + validasi rentang & enum
│   ├── api/
│   │   └── routes.py          # endpoint: GET / , GET /health , POST /predict , GET /history
│   ├── core/
│   │   └── exceptions.py      # exception & handler 404 / 422 / 500 / 503
│   ├── ml/
│   │   ├── model_loader.py    # muat pipeline .pkl + metadata SEKALI (singleton)
│   │   └── predictor.py       # inferensi + 5 faktor pendukung (SHAP pred_contribs)
│   └── db/
│       ├── database.py        # engine SQLite + session + init_db
│       ├── models.py          # ORM PredictionHistory
│       └── repository.py      # simpan/ambil riwayat (memisahkan logic DB dari route)
├── model/                     # artefak Tahap 1 (TIDAK di-training ulang)
│   ├── model_krediPin.pkl
│   ├── fitur_model.json
│   └── selected_model_info.json
├── database/                  # SQLite runtime (di-gitignore)
├── tests/
│   └── test_api.py            # uji health / predict / 422 / 404
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

Pemisahan tanggung jawab (*clean architecture*): **API** (routes) → **service ML** (predictor) →
**artefak** (model_loader) dan **persistensi** (db). `main.py` tidak memuat logika bisnis.

## 3. Prasyarat

- Python 3.10+ (diuji pada 3.12)
- pip / virtualenv

Versi `scikit-learn` dan `xgboost` **dipin** di `requirements.txt` agar `.pkl` dapat dimuat konsisten
dengan versi saat training.

## 4. Instalasi & Menjalankan

```bash
# 1. Masuk folder backend
cd KrediPin_backend

# 2. Buat & aktifkan virtual environment
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate

# 3. Instal dependensi
pip install -r requirements.txt

# 4. (Opsional) salin konfigurasi
cp .env.example .env             # ubah THRESHOLD bila perlu

# 5. Jalankan server (development)
uvicorn app.main:app --reload --port 8000
```

Server aktif di `http://localhost:8000`. Dokumentasi interaktif otomatis:

- Swagger UI : `http://localhost:8000/docs`
- ReDoc      : `http://localhost:8000/redoc`

Produksi (contoh):

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
```

## 5. Konfigurasi

Seluruh setelan ada di `app/config.py` dan dapat di-override via `.env`/environment:

| Variabel        | Default                                   | Keterangan                                  |
|-----------------|-------------------------------------------|---------------------------------------------|
| `THRESHOLD`     | `0.5`                                     | Ambang keputusan; `prob ≥ THRESHOLD` → Layak |
| `CORS_ORIGINS`  | `["http://localhost:5173", ...]`          | Origin React yang diizinkan                  |
| `DATABASE_FILE` | `krediPin_history.db`                     | Nama file SQLite                             |

Ambang juga dapat di-override **per-request** lewat field opsional `threshold` pada body `/predict`.

## 6. Endpoint

### `GET /`
Info aplikasi & daftar endpoint.

### `GET /health`
```json
{ "status": "ok", "model_dimuat": true, "database_ok": true, "versi": "1.0.0", "threshold_aktif": 0.5 }
```

### `POST /predict`
Seluruh nilai uang dikirim **dalam IDR (Rupiah)**.

**Request:**
```json
{
  "usia": 29, "status_pekerjaan": "Bekerja", "lama_bekerja_tahun": 5.0,
  "pendapatan_tahunan": 540000000, "skor_kredit": 569, "lama_riwayat_kredit_tahun": 2.6,
  "aset_tabungan": 24000000, "hutang_saat_ini": 408000000, "gagal_bayar_tercatat": 1,
  "tunggakan_2thn_terakhir": 2, "catatan_negatif": 0, "tipe_produk": "Kartu Kredit",
  "tujuan_pinjaman": "Pendidikan", "jumlah_pinjaman": 608000000, "suku_bunga": 22.72,
  "rasio_hutang_terhadap_pendapatan": 0.798, "rasio_pinjaman_terhadap_pendapatan": 1.189,
  "rasio_pembayaran_terhadap_pendapatan": 0.396, "tenor_bulan": 60, "jaminan": "Tanpa Jaminan"
}
```

**Response (200):**
```json
{
  "keputusan": "Tidak Layak",
  "probabilitas_layak": 0.0,
  "confidence": 1.0,
  "threshold": 0.5,
  "faktor": [
    {"fitur": "Rasio hutang terhadap pendapatan", "nilai_input": "0.798", "kontribusi": -5.1654, "arah": "mendukung TIDAK LAYAK"},
    {"fitur": "Riwayat gagal bayar", "nilai_input": "1", "kontribusi": -4.3907, "arah": "mendukung TIDAK LAYAK"},
    {"fitur": "Skor kredit", "nilai_input": "569", "kontribusi": -1.5608, "arah": "mendukung TIDAK LAYAK"},
    {"fitur": "Tujuan pinjaman", "nilai_input": "Pendidikan", "kontribusi": 1.0733, "arah": "mendukung LAYAK"},
    {"fitur": "Tunggakan 2 tahun terakhir", "nilai_input": "2", "kontribusi": -0.7353, "arah": "mendukung TIDAK LAYAK"}
  ],
  "disclaimer": "Hasil ini merupakan alat bantu ... BUKAN keputusan akhir ...",
  "id_riwayat": 1,
  "waktu": "2026-06-29T14:12:32"
}
```

Field response: `keputusan`, `probabilitas_layak`, `confidence` (keyakinan pada keputusan terpilih),
`threshold`, **5** `faktor` pendukung (kontribusi SHAP + arah), `disclaimer`, `id_riwayat`, `waktu`.

### `GET /history?limit=20`
Riwayat prediksi terbaru (audit ringan) dari SQLite.

### Contoh `curl`
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d @contoh_request.json
```

## 7. Penanganan Error

| Kode | Kapan |
|------|-------|
| `422` | Input tidak valid (rentang/enum/tipe/field asing). Pesan terstruktur per-field. |
| `404` | Endpoint tidak ditemukan. |
| `500` | Kesalahan internal / inferensi gagal. |
| `503` | Artefak model belum siap dimuat. |

Semua error berbentuk seragam: `{"error": ..., "detail": ..., "status_code": ...}`.

## 8. Pengujian

```bash
pytest -q
```
Mencakup: `GET /health`, `POST /predict` (valid + override threshold), validasi `422`
(enum salah, di luar rentang, field asing), `GET /history`, dan `404`.

## 9. Catatan Keamanan (relevan CPMK DASD)

- **Validasi input ketat** (Pydantic: rentang + enum dikunci, `extra="forbid"`) → cegah input
  menyimpang/menyebabkan error.
- **Rahasia tidak di-*hardcode*** → konfigurasi via `.env`; `.env` & file `.db` masuk `.gitignore`.
- **CORS dibatasi** ke origin frontend yang dikenal, bukan `*`.
- **Endpoint inferensi tidak mengekspos artefak** model; hanya menerima fitur & mengembalikan hasil.
- **Audit trail** tersimpan di SQLite untuk telusur keputusan.
- **Mitigasi bias**: response selalu menyertakan *disclaimer* bahwa model adalah alat bantu.

## 10. Integrasi Frontend (Tahap 3)

Frontend React (Vite, port 5173) memanggil `POST /predict`. CORS sudah disetel untuk
`http://localhost:5173`. Panel hasil menampilkan badge LAYAK/TIDAK LAYAK, probabilitas + ambang,
dan 5 faktor pendukung beserta arah (+/−) dari response API ini.
