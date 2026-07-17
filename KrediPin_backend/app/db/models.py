"""Model ORM untuk menyimpan riwayat prediksi."""
from datetime import datetime, timezone

from sqlalchemy import Boolean, Integer, String, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PredictionHistory(Base):
    """Satu baris = satu pengajuan yang diprediksi."""

    __tablename__ = "prediction_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
    # --- Jejak audit (saran #4) ---
    # Nullable karena baris lama (sebelum autentikasi ada) tidak punya pemilik.
    # Auditor harus dapat menjawab "siapa yang memutuskan ini?".
    dibuat_oleh: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    versi_model: Mapped[str | None] = mapped_column(String(32), nullable=True)

    # Ringkasan hasil
    keputusan: Mapped[str] = mapped_column(String(20), nullable=False)
    probabilitas_layak: Mapped[float] = mapped_column(Float, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    threshold: Mapped[float] = mapped_column(Float, nullable=False)

    # Jejak input & faktor (JSON sebagai teks, agar audit lengkap)
    input_json: Mapped[str] = mapped_column(Text, nullable=False)
    faktor_json: Mapped[str] = mapped_column(Text, nullable=False)

    def __repr__(self) -> str:  # pragma: no cover
        return f"<PredictionHistory id={self.id} keputusan={self.keputusan}>"


class User(Base):
    """
    Pengguna sistem (analis / admin).

    Password TIDAK pernah disimpan apa adanya — hanya hash PBKDF2 berikut
    salt-nya (lihat app/auth/security.py).
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    nama: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    # "analis" = boleh memprediksi & melihat riwayatnya sendiri.
    # "admin"  = boleh melihat seluruh riwayat & mengelola pengguna.
    peran: Mapped[str] = mapped_column(String(16), default="analis", nullable=False)
    aktif: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)
