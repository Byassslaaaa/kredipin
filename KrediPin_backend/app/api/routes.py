"""
Definisi endpoint KrediPin.

- GET  /          : info aplikasi & daftar endpoint
- GET  /health    : status kesehatan (model + database)
- POST /predict   : prediksi kelayakan + simpan riwayat
- GET  /history   : riwayat prediksi terbaru (audit ringan)
"""
import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app import __version__
from app.config import settings
from app.db.database import check_db, get_session
from app.db.repository import get_recent, save_prediction
from app.ml.model_loader import ModelArtifacts, get_artifacts
from app.ml.predictor import predict
from app.schemas import (
    HealthResponse, HistoryItem, PredictRequest, PredictResponse, RootResponse,
)

logger = logging.getLogger("krediPin")
router = APIRouter()


@router.get("/", response_model=RootResponse, tags=["info"])
async def root() -> RootResponse:
    """Informasi dasar aplikasi."""
    return RootResponse(
        aplikasi=settings.APP_NAME,
        versi=settings.APP_VERSION,
        deskripsi=settings.APP_DESCRIPTION,
        dokumentasi="/docs",
        endpoint={
            "GET /": "Info aplikasi",
            "GET /health": "Status kesehatan",
            "POST /predict": "Prediksi kelayakan pinjaman",
            "GET /history": "Riwayat prediksi terbaru",
        },
    )


@router.get("/health", response_model=HealthResponse, tags=["info"])
async def health() -> HealthResponse:
    """Cek kesiapan model dan database."""
    from app.ml.model_loader import artifacts
    model_ok = artifacts.loaded
    db_ok = check_db()
    return HealthResponse(
        status="ok" if (model_ok and db_ok) else "degraded",
        model_dimuat=model_ok,
        database_ok=db_ok,
        versi=__version__,
        threshold_aktif=settings.THRESHOLD,
    )


@router.post(
    "/predict",
    response_model=PredictResponse,
    status_code=status.HTTP_200_OK,
    tags=["prediksi"],
)
async def predict_endpoint(
    payload: PredictRequest,
    art: ModelArtifacts = Depends(get_artifacts),
    db: Session = Depends(get_session),
) -> PredictResponse:
    """
    Prediksi kelayakan pinjaman.

    Alur: validasi (Pydantic) -> inferensi model -> simpan riwayat -> kembalikan hasil.
    """
    hasil = predict(payload.features(), art, threshold=payload.threshold)

    record = save_prediction(
        db,
        input_data=payload.features(),
        keputusan=hasil["keputusan"],
        probabilitas_layak=hasil["probabilitas_layak"],
        confidence=hasil["confidence"],
        threshold=hasil["threshold"],
        faktor=hasil["faktor"],
    )

    return PredictResponse(
        keputusan=hasil["keputusan"],
        probabilitas_layak=hasil["probabilitas_layak"],
        confidence=hasil["confidence"],
        threshold=hasil["threshold"],
        faktor=hasil["faktor"],
        disclaimer=hasil["disclaimer"],
        id_riwayat=record.id,
        waktu=record.created_at,
    )


@router.get("/history", response_model=list[HistoryItem], tags=["prediksi"])
async def history(limit: int = 20, db: Session = Depends(get_session)) -> list[HistoryItem]:
    """Ambil riwayat prediksi terbaru (default 20)."""
    limit = max(1, min(limit, 100))
    rows = get_recent(db, limit=limit)
    return [
        HistoryItem(
            id=r.id,
            waktu=r.created_at,
            keputusan=r.keputusan,
            probabilitas_layak=r.probabilitas_layak,
            confidence=r.confidence,
            threshold=r.threshold,
        )
        for r in rows
    ]
