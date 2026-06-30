"""Model ORM untuk menyimpan riwayat prediksi."""
from datetime import datetime, timezone

from sqlalchemy import Integer, String, Float, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class PredictionHistory(Base):
    """Satu baris = satu pengajuan yang diprediksi."""

    __tablename__ = "prediction_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, nullable=False)

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
