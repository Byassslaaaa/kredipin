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
) -> PredictionHistory:
    """Simpan satu hasil prediksi ke database dan kembalikan recordnya."""
    record = PredictionHistory(
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


def get_recent(db: Session, limit: int = 20) -> List[PredictionHistory]:
    """Ambil riwayat prediksi terbaru."""
    stmt = select(PredictionHistory).order_by(PredictionHistory.id.desc()).limit(limit)
    return list(db.scalars(stmt).all())


def count_predictions(db: Session) -> int:
    from sqlalchemy import func
    return int(db.scalar(select(func.count(PredictionHistory.id))) or 0)
