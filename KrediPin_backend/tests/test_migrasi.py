"""
Regresi migrasi skema.

KENAPA FILE TERPISAH: test_api.py memakai database yang dibuat create_all()
sehingga skemanya selalu terkini — kondisi itu TIDAK pernah mewakili produksi,
di mana database sudah berisi data dengan skema lama. Celah inilah yang membuat
CI hijau sementara aplikasi live mengembalikan 500 pada /predict dan /history.

Di sini kondisi produksi direproduksi secara eksplisit: buat tabel dengan skema
LAMA, jalankan migrasi, lalu pastikan kolom baru muncul tanpa merusak data.
"""
import pytest
from sqlalchemy import create_engine, inspect, text


SKEMA_LAMA = """
CREATE TABLE prediction_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at DATETIME NOT NULL,
    keputusan VARCHAR(16) NOT NULL,
    probabilitas_layak FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    threshold FLOAT NOT NULL,
    input_json TEXT,
    faktor_json TEXT
)
"""


@pytest.fixture
def db_lama(tmp_path, monkeypatch):
    """Database berisi data dengan skema SEBELUM kolom audit ditambahkan."""
    berkas = tmp_path / "lama.db"
    eng = create_engine(f"sqlite:///{berkas}")
    with eng.begin() as conn:
        conn.execute(text(SKEMA_LAMA))
        conn.execute(text(
            "INSERT INTO prediction_history "
            "(created_at, keputusan, probabilitas_layak, confidence, threshold) "
            "VALUES ('2026-01-01 00:00:00', 'Layak', 0.9, 0.9, 0.5)"
        ))
    return eng


def test_migrasi_menambahkan_kolom_audit(db_lama, monkeypatch):
    from app.db import database

    monkeypatch.setattr(database, "engine", db_lama)

    sebelum = {c["name"] for c in inspect(db_lama).get_columns("prediction_history")}
    assert "dibuat_oleh" not in sebelum  # memastikan kondisi awal benar-benar "lama"

    database.migrasi_ringan()

    sesudah = {c["name"] for c in inspect(db_lama).get_columns("prediction_history")}
    assert "dibuat_oleh" in sesudah
    assert "versi_model" in sesudah


def test_migrasi_tidak_merusak_data_lama(db_lama, monkeypatch):
    """Baris lama harus tetap utuh; pemiliknya NULL karena dibuat sebelum ada auth."""
    from app.db import database

    monkeypatch.setattr(database, "engine", db_lama)
    database.migrasi_ringan()

    with db_lama.connect() as conn:
        baris = conn.execute(
            text("SELECT keputusan, dibuat_oleh FROM prediction_history")
        ).fetchall()
    assert len(baris) == 1
    assert baris[0][0] == "Layak"
    assert baris[0][1] is None


def test_migrasi_idempoten(db_lama, monkeypatch):
    """Dijalankan berulang tidak boleh gagal — lifespan memanggilnya tiap startup."""
    from app.db import database

    monkeypatch.setattr(database, "engine", db_lama)
    database.migrasi_ringan()
    database.migrasi_ringan()  # tidak boleh melempar "duplicate column name"
