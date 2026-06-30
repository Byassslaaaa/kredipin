"""
Uji fungsional ringan backend KrediPin memakai TestClient.

Jalankan:  pytest -q
TestClient memicu lifespan, sehingga model & database ikut diinisialisasi.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

INPUT_VALID = {
    "usia": 35,
    "status_pekerjaan": "Bekerja",
    "lama_bekerja_tahun": 8.0,
    "pendapatan_tahunan": 900000000,
    "skor_kredit": 640,
    "lama_riwayat_kredit_tahun": 6.0,
    "aset_tabungan": 18000000,
    "hutang_saat_ini": 270000000,
    "gagal_bayar_tercatat": 0,
    "tunggakan_2thn_terakhir": 1,
    "catatan_negatif": 0,
    "tipe_produk": "Pinjaman Pribadi",
    "tujuan_pinjaman": "Pribadi",
    "jumlah_pinjaman": 720000000,
    "suku_bunga": 15.0,
    "rasio_hutang_terhadap_pendapatan": 0.35,
    "rasio_pinjaman_terhadap_pendapatan": 0.8,
    "rasio_pembayaran_terhadap_pendapatan": 0.27,
    "tenor_bulan": 36,
    "jaminan": "Tanpa Jaminan",
}


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_root(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "aplikasi" in r.json()


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["model_dimuat"] is True
    assert body["database_ok"] is True
    assert body["status"] == "ok"


def test_predict_valid(client):
    r = client.post("/predict", json=INPUT_VALID)
    assert r.status_code == 200
    body = r.json()
    assert body["keputusan"] in {"Layak", "Tidak Layak"}
    assert 0.0 <= body["probabilitas_layak"] <= 1.0
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["threshold"] == 0.5
    assert len(body["faktor"]) == 5
    assert "alat bantu" in body["disclaimer"].lower()
    assert body["id_riwayat"] is not None


def test_predict_threshold_override(client):
    payload = dict(INPUT_VALID, threshold=0.99)
    r = client.post("/predict", json=payload)
    assert r.status_code == 200
    assert r.json()["threshold"] == 0.99


def test_predict_invalid_enum(client):
    bad = dict(INPUT_VALID, jaminan="Mungkin Ada")
    r = client.post("/predict", json=bad)
    assert r.status_code == 422
    assert r.json()["error"].startswith("Validasi input gagal")


def test_predict_out_of_range(client):
    bad = dict(INPUT_VALID, skor_kredit=9999)
    r = client.post("/predict", json=bad)
    assert r.status_code == 422


def test_predict_extra_field(client):
    bad = dict(INPUT_VALID, kolom_aneh=123)
    r = client.post("/predict", json=bad)
    assert r.status_code == 422


def test_history(client):
    client.post("/predict", json=INPUT_VALID)
    r = client.get("/history?limit=5")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_404(client):
    r = client.get("/tidak-ada")
    assert r.status_code == 404
    assert r.json()["error"] == "Endpoint tidak ditemukan."
