"""Repository: operasi baca/tulis riwayat prediksi (memisahkan logic DB dari route)."""
import json
from typing import List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import PredictionHistory


def save_prediction(
    db: Session,
    *,
    input_data: dict,
    keputusan: str,
    probabilitas_layak: float,
    confidence: float,
    threshold: float,
    faktor: list,
    dibuat_oleh: str | None = None,
) -> PredictionHistory:
    """Simpan satu hasil prediksi ke database dan kembalikan recordnya."""
    record = PredictionHistory(
        # Jejak audit: siapa yang menjalankan penilaian ini (saran #4).
        dibuat_oleh=dibuat_oleh,
        keputusan=keputusan,
        probabilitas_layak=probabilitas_layak,
        confidence=confidence,
        threshold=threshold,
        input_json=json.dumps(input_data, ensure_ascii=False),
        faktor_json=json.dumps(faktor, ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_recent(
    db: Session, limit: int = 20, dibuat_oleh: str | None = None
) -> List[PredictionHistory]:
    """
    Ambil riwayat prediksi terbaru.

    `dibuat_oleh` membatasi hasil ke milik satu pengguna (prinsip need-to-know:
    analis hanya boleh melihat penilaian yang ia buat sendiri). Bila None,
    seluruh riwayat dikembalikan - hanya untuk peran pengawas (admin).
    """
    stmt = select(PredictionHistory)
    if dibuat_oleh is not None:
        stmt = stmt.where(PredictionHistory.dibuat_oleh == dibuat_oleh)
    stmt = stmt.order_by(PredictionHistory.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def count_predictions(db: Session) -> int:
    from sqlalchemy import func
    return int(db.scalar(select(func.count(PredictionHistory.id))) or 0)
