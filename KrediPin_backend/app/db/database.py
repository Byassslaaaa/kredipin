"""
Koneksi database SQLite menggunakan SQLAlchemy 2.x.

File database disimpan di folder `database/` (lihat config). `init_db()` membuat
tabel saat startup, dan `get_session` adalah dependency FastAPI per-request.
"""
import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.config import settings

logger = logging.getLogger("krediPin")


class Base(DeclarativeBase):
    """Base class untuk seluruh model ORM."""
    pass


# check_same_thread=False diperlukan untuk SQLite + FastAPI (multi-thread).
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    """Buat seluruh tabel bila belum ada. Dipanggil saat startup."""
    # Import model agar ter-registrasi pada metadata sebelum create_all.
    from app.db import models  # noqa: F401

    settings.DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)
    logger.info("Database siap di %s", settings.database_path)


def check_db() -> bool:
    """Cek koneksi database untuk endpoint /health."""
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Database tidak sehat: %s", exc)
        return False


def get_session() -> Generator[Session, None, None]:
    """Dependency FastAPI: sediakan sesi DB lalu tutup otomatis."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_session_langsung() -> Generator[Session, None, None]:
    """
    Session untuk pemakaian DI LUAR request (mis. seeding saat startup).

    get_session() adalah generator dependency FastAPI dan tidak dapat dipakai
    sebagai context manager biasa, sehingga disediakan varian ini.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrasi_ringan() -> None:
    """
    Tambahkan kolom yang hilang pada tabel yang SUDAH ADA.

    KENAPA PERLU: Base.metadata.create_all() hanya membuat tabel yang belum ada
    — ia TIDAK mengubah tabel lama. Akibatnya, saat kolom audit (dibuat_oleh,
    versi_model) ditambahkan ke model, database produksi yang sudah berisi data
    tetap memakai skema lama, sehingga setiap INSERT/SELECT gagal dengan
    "no such column" -> HTTP 500.

    Kegagalan ini TIDAK tertangkap CI karena CI selalu memakai database baru,
    di mana create_all() membuat tabel lengkap dengan kolom terbaru.

    Pendekatan: ALTER TABLE ADD COLUMN yang idempoten (dilewati bila kolom sudah
    ada). Cukup untuk penambahan kolom nullable seperti ini; bila kelak butuh
    perubahan skema yang lebih rumit (rename/ubah tipe/backfill), barulah pindah
    ke alat migrasi seperti Alembic.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    if "prediction_history" not in inspector.get_table_names():
        return  # database baru -> create_all sudah membuat skema terkini.

    kolom_ada = {c["name"] for c in inspector.get_columns("prediction_history")}
    tambahan = {
        "dibuat_oleh": "VARCHAR(64)",
        "versi_model": "VARCHAR(32)",
    }

    with engine.begin() as conn:
        for nama, tipe in tambahan.items():
            if nama in kolom_ada:
                continue
            # Kolom sengaja nullable: baris lama dibuat sebelum autentikasi ada,
            # sehingga memang tidak punya pemilik.
            conn.execute(text(f"ALTER TABLE prediction_history ADD COLUMN {nama} {tipe}"))
            logger.warning("Migrasi: kolom '%s' ditambahkan ke prediction_history.", nama)
