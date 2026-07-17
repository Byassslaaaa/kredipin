"""
Definisi endpoint KrediPin.

- GET  /          : info aplikasi & daftar endpoint
- GET  /health    : status kesehatan (model + database)
- POST /predict   : prediksi kelayakan + simpan riwayat
- GET  /history   : riwayat prediksi terbaru (audit ringan)
"""
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import __version__
from app.config import settings
from app.db.database import check_db, get_session
from app.db.repository import get_recent, save_prediction
from app.ml.model_loader import ModelArtifacts, get_artifacts
from app.ml.predictor import predict
from app.auth.deps import get_current_user
from app.auth.security import buat_token, verify_password
from app.db.models import User
from app.schemas import (
    HealthResponse, HistoryItem, LoginRequest, LoginResponse, PredictRequest,
    PredictResponse, RootResponse, UserInfo,
)
from sqlalchemy import select

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


@router.post("/auth/login", response_model=LoginResponse, tags=["auth"])
async def login(payload: LoginRequest, db: Session = Depends(get_session)) -> LoginResponse:
    """
    Tukar username+password dengan token sesi.

    Pesan galat sengaja SAMA untuk username tidak ada maupun password salah —
    membedakannya akan membocorkan username mana yang terdaftar (user enumeration).
    """
    user = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
    if user is None or not user.aktif or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Username atau password salah.")

    return LoginResponse(
        access_token=buat_token(user.username, user.peran),
        expires_in_minutes=settings.TOKEN_EXPIRE_MINUTES,
        user=UserInfo(username=user.username, nama=user.nama, peran=user.peran),
    )


@router.get("/auth/me", response_model=UserInfo, tags=["auth"])
async def siapa_saya(user: User = Depends(get_current_user)) -> UserInfo:
    """Identitas pemilik token — dipakai frontend memulihkan sesi saat refresh."""
    return UserInfo(username=user.username, nama=user.nama, peran=user.peran)


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
    user: User = Depends(get_current_user),
) -> PredictResponse:
    """
    Prediksi kelayakan pinjaman.

    Alur: validasi (Pydantic) -> inferensi model -> simpan riwayat -> kembalikan hasil.
    """
    # Segregation of duties: penilaian kredit adalah wewenang ANALIS.
    #
    # Admin memegang kendali sistem (ambang, pengguna, pemantauan). Bila ia juga
    # dapat menilai, satu orang bisa menyetel ambang lalu meloloskan pengajuan
    # dengan ambang yang ia buat sendiri — kendali internal jadi tak berarti.
    # Inilah alasan bank memisahkan "yang mengatur aturan" dari "yang memutus".
    if user.peran == "admin":
        raise HTTPException(
            status_code=403,
            detail=(
                "Penilaian kredit adalah wewenang analis. Admin mengelola sistem dan "
                "kebijakan, tidak memutus pengajuan (pemisahan tugas)."
            ),
        )

    # Ambang keputusan = KEBIJAKAN RISIKO perusahaan, bukan preferensi individu.
    #
    # Bila tiap analis bebas menggeser ambang, dua nasabah dengan profil identik
    # bisa mendapat keputusan berbeda hanya karena ditangani orang berbeda —
    # yaitu ketidakkonsistenan yang justru menjadi alasan sistem ini dibangun.
    # Karena itu override hanya diizinkan bagi admin (mewakili komite risiko);
    # analis memakai ambang kebijakan yang berlaku.
    if payload.threshold is not None and user.peran != "admin":
        raise HTTPException(
            status_code=403,
            detail=(
                "Ambang keputusan adalah kebijakan risiko dan hanya dapat diubah "
                "admin. Penilaian Anda memakai ambang kebijakan yang berlaku."
            ),
        )

    hasil = predict(payload.features(), art, threshold=payload.threshold)

    record = save_prediction(
        db,
        input_data=payload.features(),
        keputusan=hasil["keputusan"],
        probabilitas_layak=hasil["probabilitas_layak"],
        confidence=hasil["confidence"],
        threshold=hasil["threshold"],
        faktor=hasil["faktor"],
        dibuat_oleh=user.username,
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
async def history(
    limit: int = 20,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> list[HistoryItem]:
    """Ambil riwayat prediksi terbaru (default 20)."""
    limit = max(1, min(limit, 100))

    # Need-to-know: analis hanya melihat penilaian yang ia buat sendiri; admin
    # (peran pengawas) melihat seluruhnya. Filter diterapkan di SERVER dari
    # identitas token — bukan dari parameter yang bisa dikirim klien.
    pemilik = None if user.peran == "admin" else user.username
    rows = get_recent(db, limit=limit, dibuat_oleh=pemilik)
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
