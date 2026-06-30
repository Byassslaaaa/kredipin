"""
Koneksi database SQLite menggunakan SQLAlchemy 2.x.

File database disimpan di folder `database/` (lihat config). `init_db()` membuat
tabel saat startup, dan `get_session` adalah dependency FastAPI per-request.
"""
import logging
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
