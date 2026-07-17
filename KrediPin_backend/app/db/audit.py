"""
Pencatatan jejak audit.

Sengaja hanya menyediakan CATAT dan BACA — tidak ada ubah/hapus. Log yang dapat
disunting tidak bernilai sebagai bukti.
"""
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import AuditLog


def catat(
    db: Session,
    *,
    aktor: str,
    aksi: str,
    target: Optional[str] = None,
    nilai_lama: Optional[str] = None,
    nilai_baru: Optional[str] = None,
) -> None:
    """
    Catat satu tindakan istimewa.

    Kegagalan pencatatan TIDAK boleh menggagalkan tindakannya: audit adalah
    catatan pendamping, bukan syarat. Namun kegagalannya juga tidak boleh
    senyap — karena itu di-log sebagai peringatan agar terlihat operator.
    """
    import logging

    try:
        db.add(
            AuditLog(
                aktor=aktor,
                aksi=aksi,
                target=target,
                nilai_lama=nilai_lama,
                nilai_baru=nilai_baru,
            )
        )
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        logging.getLogger("krediPin").warning("Gagal menulis audit log (%s): %s", aksi, exc)


def terbaru(db: Session, limit: int = 50) -> List[AuditLog]:
    """Ambil jejak audit terbaru."""
    stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())
