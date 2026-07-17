"""
Uji fungsional ringan backend KrediPin memakai TestClient.

Jalankan:  pytest -q
TestClient memicu lifespan, sehingga model & database ikut diinisialisasi.
"""
import pytest
from fastapi.testclient import TestClient

from app.config import settings
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


@pytest.fixture(scope="module")
def auth(client):
    """
    Header Authorization untuk endpoint terproteksi.

    Memakai kredensial seed yang dibuat otomatis saat startup (lihat
    app/auth/seed.py) — tanpa itu sistem terkunci total setelah autentikasi
    diaktifkan.
    """
    r = client.post(
        "/auth/login",
        json={"username": settings.SEED_ANALIS_USER, "password": settings.SEED_ANALIS_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


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


def test_predict_valid(client, auth):
    r = client.post("/predict", json=INPUT_VALID, headers=auth)
    assert r.status_code == 200
    body = r.json()
    assert body["keputusan"] in {"Layak", "Tidak Layak"}
    assert 0.0 <= body["probabilitas_layak"] <= 1.0
    assert 0.0 <= body["confidence"] <= 1.0
    assert body["threshold"] == 0.5
    assert len(body["faktor"]) == 5
    assert "alat bantu" in body["disclaimer"].lower()
    assert body["id_riwayat"] is not None


def test_admin_tak_boleh_menilai_kredit(client, auth_admin):
    """
    Segregation of duties: admin mengatur sistem, analis memutus kredit.

    Bila admin bisa menyetel ambang SEKALIGUS meloloskan pengajuan, kendali
    internal jadi tak berarti — satu orang mengendalikan aturan dan hasilnya.
    """
    r = client.post("/predict", json=INPUT_VALID, headers=auth_admin)
    assert r.status_code == 403


@pytest.mark.parametrize("nilai", [0.0, 0.1, 0.95, 1.0])
def test_predict_threshold_ekstrem_ditolak(client, auth, nilai):
    """
    Ambang ekstrem harus ditolak.

    Regresi untuk celah keamanan: `threshold=0.0` membuat SEMUA pengajuan
    dinyatakan Layak (probabilitas >= 0 selalu benar), sehingga model
    ter-bypass total dan nasabah berisiko tinggi pun lolos.
    """
    r = client.post("/predict", json=dict(INPUT_VALID, threshold=nilai), headers=auth)
    assert r.status_code == 422


def test_rasio_kiriman_klien_diabaikan(client, auth):
    """
    Regresi untuk celah keamanan: rasio adalah nilai TURUNAN, sehingga nilai
    kiriman klien harus diabaikan dan dihitung ulang di server.

    Sebelum diperbaiki, mengirim rasio_hutang yang mengada-ada membalik
    keputusan dari Layak (100%) menjadi Tidak Layak (0.3%) pada nasabah yang
    datanya sama persis.
    """
    jujur = client.post("/predict", json=INPUT_VALID, headers=auth).json()

    # Kirim rasio yang bertentangan total dengan field dasarnya.
    ngawur = client.post(
        "/predict",
        json=dict(
            INPUT_VALID,
            rasio_hutang_terhadap_pendapatan=9.9,
            rasio_pinjaman_terhadap_pendapatan=49.0,
            rasio_pembayaran_terhadap_pendapatan=9.9,
        ),
        headers=auth,
    ).json()

    # Hasil harus IDENTIK: rasio kiriman tidak berpengaruh sama sekali.
    assert ngawur["keputusan"] == jujur["keputusan"]
    assert ngawur["probabilitas_layak"] == jujur["probabilitas_layak"]


def test_confidence_mengikuti_keputusan(client, auth):
    """
    confidence harus menyatakan keyakinan pada KEPUTUSAN YANG DIAMBIL.

    Regresi: rumus lama max(p, 1-p) mengukur keyakinan pada argmax (0.5),
    sehingga salah arti begitu ambang digeser.
    """
    # Ambang tidak dikirim: analis memakai ambang kebijakan. Rumus confidence
    # tetap harus konsisten dengan keputusan yang diambil.
    body = client.post("/predict", json=INPUT_VALID, headers=auth).json()
    p = body["probabilitas_layak"]
    harapan = p if body["keputusan"] == "Layak" else 1.0 - p
    assert abs(body["confidence"] - harapan) < 1e-4


def test_predict_invalid_enum(client, auth):
    bad = dict(INPUT_VALID, jaminan="Mungkin Ada")
    r = client.post("/predict", json=bad, headers=auth)
    assert r.status_code == 422
    assert r.json()["error"].startswith("Validasi input gagal")


def test_predict_out_of_range(client, auth):
    bad = dict(INPUT_VALID, skor_kredit=9999)
    r = client.post("/predict", json=bad, headers=auth)
    assert r.status_code == 422


def test_predict_extra_field(client, auth):
    bad = dict(INPUT_VALID, kolom_aneh=123)
    r = client.post("/predict", json=bad, headers=auth)
    assert r.status_code == 422


def test_history(client, auth):
    client.post("/predict", json=INPUT_VALID, headers=auth)
    r = client.get("/history?limit=5", headers=auth)
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


# ============================ Autentikasi ============================

def test_predict_tanpa_token_ditolak(client):
    """
    Regresi: endpoint inferensi tidak boleh terbuka tanpa autentikasi.

    Sebelum ada auth, siapa pun yang tahu URL dapat memprediksi dan membaca
    riwayat keputusan nasabah lain.
    """
    assert client.post("/predict", json=INPUT_VALID).status_code == 401


def test_history_tanpa_token_ditolak(client):
    assert client.get("/history").status_code == 401


def test_login_salah_password(client):
    r = client.post(
        "/auth/login",
        json={"username": settings.SEED_ANALIS_USER, "password": "password-salah"},
    )
    assert r.status_code == 401


def test_login_username_tidak_ada_pesannya_sama(client):
    """
    Pesan galat harus IDENTIK dengan kasus password salah — membedakannya akan
    membocorkan username mana yang terdaftar (user enumeration).
    """
    a = client.post("/auth/login", json={"username": "hantu", "password": "apa-saja-123"})
    b = client.post(
        "/auth/login",
        json={"username": settings.SEED_ANALIS_USER, "password": "password-salah"},
    )
    assert a.status_code == b.status_code == 401
    assert a.json()["detail"] == b.json()["detail"]


def test_token_palsu_ditolak(client):
    r = client.post("/predict", json=INPUT_VALID, headers={"Authorization": "Bearer token.palsu.saja"})
    assert r.status_code == 401


def test_auth_me(client, auth):
    r = client.get("/auth/me", headers=auth)
    assert r.status_code == 200
    assert r.json()["username"] == settings.SEED_ANALIS_USER
    assert "password" not in r.text.lower()


def test_prediksi_mencatat_pemiliknya(client, auth):
    """Jejak audit (saran #4): riwayat harus tahu SIAPA yang memutuskan."""
    from app.db.database import get_session_langsung
    from app.db.models import PredictionHistory
    from sqlalchemy import select

    client.post("/predict", json=INPUT_VALID, headers=auth)
    with get_session_langsung() as db:
        baris = db.execute(
            select(PredictionHistory).order_by(PredictionHistory.id.desc())
        ).scalars().first()
    assert baris.dibuat_oleh == settings.SEED_ANALIS_USER


# ======================= Pemisahan peran (RBAC) =======================

@pytest.fixture(scope="module")
def auth_admin(client):
    r = client.post(
        "/auth/login",
        json={"username": settings.SEED_ADMIN_USER, "password": settings.SEED_ADMIN_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_analis_tak_boleh_menggeser_ambang(client, auth):
    """
    Ambang = kebijakan risiko perusahaan, bukan preferensi analis.

    Bila tiap analis bebas menggesernya, dua nasabah identik bisa mendapat
    keputusan berbeda tergantung siapa yang menangani — ketidakkonsistenan yang
    justru jadi alasan sistem ini dibangun.
    """
    r = client.post("/predict", json=dict(INPUT_VALID, threshold=0.8), headers=auth)
    assert r.status_code == 403


def test_analis_tetap_bisa_menilai_tanpa_ambang(client, auth):
    """Pembatasan di atas tidak boleh menghalangi pekerjaan utama analis."""
    r = client.post("/predict", json=INPUT_VALID, headers=auth)
    assert r.status_code == 200
    assert r.json()["threshold"] == 0.5  # ambang kebijakan yang berlaku


def test_admin_ditolak_walau_kirim_ambang(client, auth_admin):
    """Admin tetap ditolak menilai, sekalipun ambangnya sah."""
    r = client.post("/predict", json=dict(INPUT_VALID, threshold=0.8), headers=auth_admin)
    assert r.status_code == 403


def test_analis_hanya_melihat_riwayatnya_sendiri(client, auth, auth_admin):
    """
    Need-to-know: analis tidak boleh melihat keputusan kredit analis lain.
    Filter diterapkan dari identitas token, bukan parameter dari klien.
    """
    client.post("/predict", json=INPUT_VALID, headers=auth)

    r = client.get("/history?limit=100", headers=auth)
    assert r.status_code == 200
    # Seluruh baris yang terlihat analis harus miliknya sendiri.
    from app.db.database import get_session_langsung
    from app.db.models import PredictionHistory
    from sqlalchemy import select

    ids = {b["id"] for b in r.json()}
    with get_session_langsung() as db:
        rows = db.execute(
            select(PredictionHistory).where(PredictionHistory.id.in_(ids))
        ).scalars().all() if ids else []
    assert all(x.dibuat_oleh == settings.SEED_ANALIS_USER for x in rows)


def test_admin_melihat_seluruh_riwayat(client, auth, auth_admin):
    client.post("/predict", json=INPUT_VALID, headers=auth)
    r = client.get("/history?limit=100", headers=auth_admin)
    assert r.status_code == 200
    assert len(r.json()) >= 1
