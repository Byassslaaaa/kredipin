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
    # 0.8 masih dalam rentang kebijakan yang diizinkan (0.2-0.9).
    payload = dict(INPUT_VALID, threshold=0.8)
    r = client.post("/predict", json=payload)
    assert r.status_code == 200
    assert r.json()["threshold"] == 0.8


@pytest.mark.parametrize("nilai", [0.0, 0.1, 0.95, 1.0])
def test_predict_threshold_ekstrem_ditolak(client, nilai):
    """
    Ambang ekstrem harus ditolak.

    Regresi untuk celah keamanan: `threshold=0.0` membuat SEMUA pengajuan
    dinyatakan Layak (probabilitas >= 0 selalu benar), sehingga model
    ter-bypass total dan nasabah berisiko tinggi pun lolos.
    """
    r = client.post("/predict", json=dict(INPUT_VALID, threshold=nilai))
    assert r.status_code == 422


def test_rasio_kiriman_klien_diabaikan(client):
    """
    Regresi untuk celah keamanan: rasio adalah nilai TURUNAN, sehingga nilai
    kiriman klien harus diabaikan dan dihitung ulang di server.

    Sebelum diperbaiki, mengirim rasio_hutang yang mengada-ada membalik
    keputusan dari Layak (100%) menjadi Tidak Layak (0.3%) pada nasabah yang
    datanya sama persis.
    """
    jujur = client.post("/predict", json=INPUT_VALID).json()

    # Kirim rasio yang bertentangan total dengan field dasarnya.
    ngawur = client.post(
        "/predict",
        json=dict(
            INPUT_VALID,
            rasio_hutang_terhadap_pendapatan=9.9,
            rasio_pinjaman_terhadap_pendapatan=49.0,
            rasio_pembayaran_terhadap_pendapatan=9.9,
        ),
    ).json()

    # Hasil harus IDENTIK: rasio kiriman tidak berpengaruh sama sekali.
    assert ngawur["keputusan"] == jujur["keputusan"]
    assert ngawur["probabilitas_layak"] == jujur["probabilitas_layak"]


def test_confidence_mengikuti_keputusan(client):
    """
    confidence harus menyatakan keyakinan pada KEPUTUSAN YANG DIAMBIL.

    Regresi: rumus lama max(p, 1-p) mengukur keyakinan pada argmax (0.5),
    sehingga salah arti begitu ambang digeser.
    """
    body = client.post("/predict", json=dict(INPUT_VALID, threshold=0.9)).json()
    p = body["probabilitas_layak"]
    harapan = p if body["keputusan"] == "Layak" else 1.0 - p
    assert abs(body["confidence"] - harapan) < 1e-4


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


def test_rate_limit_melindungi_predict(client, monkeypatch):
    """
    /predict dibatasi per-IP untuk mengerem model extraction.

    Batas asli (600/menit) sengaja longgar agar fitur Import Data Nasabah —
    yang melakukan N x POST /predict — tidak mati. Di sini batasnya diturunkan
    sementara agar perilakunya dapat diuji tanpa mengirim 600 request.
    """
    from app.core import rate_limit

    limiter = rate_limit.RateLimiter(maks=3, jendela_detik=60)
    monkeypatch.setattr(limiter, "maks", 3)

    boleh = [limiter.izinkan("1.2.3.4")[0] for _ in range(5)]
    assert boleh == [True, True, True, False, False]

    # IP berbeda punya kuota sendiri — batch satu pengguna tidak memblokir yang lain.
    assert limiter.izinkan("9.9.9.9")[0] is True


def test_rate_limit_tidak_menyentuh_endpoint_lain(client):
    """Hanya /predict yang dibatasi; /health harus tetap bebas diakses."""
    for _ in range(10):
        assert client.get("/health").status_code == 200
