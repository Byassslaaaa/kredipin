"""Akses kebijakan risiko (satu baris, id=1)."""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.db.models import Kebijakan


def ambil(db: Session) -> Kebijakan:
    """
    Ambil kebijakan yang berlaku; buat dari default config bila belum ada.

    Dibuat saat diakses (bukan hanya saat startup) agar instance yang databasenya
    sudah terlanjur ada tetap mendapat baris kebijakan tanpa migrasi manual.
    """
    row = db.get(Kebijakan, 1)
    if row is None:
        row = Kebijakan(id=1, ambang=settings.THRESHOLD, diubah_oleh=None)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def ubah_ambang(db: Session, ambang: float, oleh: str) -> Kebijakan:
    """Perbarui ambang + catat siapa & kapan (jejak audit minimal)."""
    row = ambil(db)
    row.ambang = ambang
    row.diubah_oleh = oleh
    row.diubah_pada = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return row
