"""
Definisi endpoint KrediPin.

- GET  /          : info aplikasi & daftar endpoint
- GET  /health    : status kesehatan (model + database)
- POST /predict   : prediksi kelayakan + simpan riwayat
- GET  /history   : riwayat prediksi terbaru (audit ringan)
"""
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import __version__
from app.config import settings
from app.db.database import check_db, get_session
from app.db import audit as audit_repo
from app.db import monitoring as monitoring_repo
from app.db import kebijakan as kebijakan_repo
from app.db.models import PredictionHistory
from app.db.repository import get_recent, save_prediction
from app.ml.model_loader import ModelArtifacts, get_artifacts
from app.ml.predictor import predict
from app.auth.deps import get_current_user, require_admin
from app.auth.security import buat_token, hash_password, verify_password
from app.db.models import User
from app.schemas import (
    AuditItem, HealthResponse, MonitoringResponse, KeputusanAnalisRequest, KeputusanAnalisResponse, HistoryItem, KebijakanResponse, LoginRequest, LoginResponse,
    PredictRequest, PredictResponse, RootResponse, UbahAmbangRequest, UserBuatRequest,
    UserInfo, UserItem, UserUbahRequest,
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


@router.get("/monitoring", response_model=MonitoringResponse, tags=["monitoring"])
async def monitoring(
    hari: int = 30,
    db: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> MonitoringResponse:
    """
    Pemantauan operasional & sinyal drift — khusus admin.

    Sinyal utama: tingkat penyimpangan analis dari model. Bila naik, model mulai
    tidak sesuai kenyataan lapangan — peringatan paling dini bahwa model perlu
    ditinjau, jauh sebelum metrik formal tersedia.
    """
    hari = max(1, min(hari, 365))
    ringkas = monitoring_repo.ringkasan(db, hari=hari)
    tren = monitoring_repo.tren_harian(db, hari=min(hari, 30))
    return MonitoringResponse(**ringkas, tren=tren)


@router.get("/audit", response_model=list[AuditItem], tags=["audit"])
async def jejak_audit(
    limit: int = 50,
    db: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> list[AuditItem]:
    """
    Jejak audit tindakan istimewa — khusus admin, HANYA BACA.

    Tidak ada endpoint ubah/hapus: log yang dapat disunting tidak bernilai
    sebagai bukti.
    """
    limit = max(1, min(limit, 200))
    return [
        AuditItem.model_validate(r, from_attributes=True)
        for r in audit_repo.terbaru(db, limit=limit)
    ]


@router.get("/users", response_model=list[UserItem], tags=["pengguna"])
async def daftar_pengguna(
    db: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> list[UserItem]:
    """Daftar seluruh pengguna — khusus admin."""
    rows = db.execute(select(User).order_by(User.id)).scalars().all()
    return [UserItem.model_validate(r, from_attributes=True) for r in rows]


@router.post("/users", response_model=UserItem, status_code=201, tags=["pengguna"])
async def buat_pengguna(
    payload: UserBuatRequest,
    db: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> UserItem:
    """Buat pengguna baru — khusus admin."""
    ada = db.execute(select(User).where(User.username == payload.username)).scalar_one_or_none()
    if ada:
        raise HTTPException(status_code=409, detail="Username sudah dipakai.")

    row = User(
        username=payload.username,
        nama=payload.nama,
        password_hash=hash_password(payload.password),
        peran=payload.peran,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    audit_repo.catat(
        db, aktor=admin.username, aksi="buat_pengguna", target=row.username, nilai_baru=row.peran
    )
    logger.warning("Pengguna '%s' (%s) dibuat oleh %s", row.username, row.peran, admin.username)
    return UserItem.model_validate(row, from_attributes=True)


@router.patch("/users/{user_id}", response_model=UserItem, tags=["pengguna"])
async def ubah_pengguna(
    user_id: int,
    payload: UserUbahRequest,
    db: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> UserItem:
    """
    Ubah pengguna — khusus admin.

    Dua penjagaan terhadap penguncian diri (lockout): admin tidak boleh
    menonaktifkan maupun menurunkan perannya sendiri. Tanpa ini, satu klik keliru
    dapat menghilangkan SELURUH akses admin dari sistem, dan tak ada seorang pun
    yang bisa memulihkannya lewat aplikasi.
    """
    row = db.get(User, user_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Pengguna tidak ditemukan.")

    if row.id == admin.id:
        if payload.aktif is False:
            raise HTTPException(status_code=400, detail="Tidak dapat menonaktifkan akun sendiri.")
        if payload.peran is not None and payload.peran != "admin":
            raise HTTPException(status_code=400, detail="Tidak dapat menurunkan peran sendiri.")

    # Rekam kondisi SEBELUM diubah agar audit memuat nilai lama -> baru.
    sebelum = f"peran={row.peran}, aktif={row.aktif}"

    if payload.nama is not None:
        row.nama = payload.nama
    if payload.peran is not None:
        row.peran = payload.peran
    if payload.aktif is not None:
        row.aktif = payload.aktif
    if payload.password is not None:
        row.password_hash = hash_password(payload.password)

    db.commit()
    db.refresh(row)

    audit_repo.catat(
        db,
        aktor=admin.username,
        aksi="ubah_pengguna",
        target=row.username,
        nilai_lama=sebelum,
        nilai_baru=(
            f"peran={row.peran}, aktif={row.aktif}"
            + (", password diubah" if payload.password is not None else "")
        ),
    )
    logger.warning("Pengguna '%s' diubah oleh %s", row.username, admin.username)
    return UserItem.model_validate(row, from_attributes=True)


@router.get("/kebijakan/ambang", response_model=KebijakanResponse, tags=["kebijakan"])
async def baca_ambang(
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> KebijakanResponse:
    """Ambang kebijakan yang berlaku. Semua peran boleh MEMBACA (transparansi)."""
    row = kebijakan_repo.ambil(db)
    return KebijakanResponse(
        ambang=row.ambang, diubah_oleh=row.diubah_oleh, diubah_pada=row.diubah_pada
    )


@router.put("/kebijakan/ambang", response_model=KebijakanResponse, tags=["kebijakan"])
async def ubah_ambang(
    payload: UbahAmbangRequest,
    db: Session = Depends(get_session),
    admin: User = Depends(require_admin),
) -> KebijakanResponse:
    """
    Ubah ambang kebijakan — khusus admin (mewakili komite risiko).

    Perubahan dicatat beserta pelakunya: auditor harus dapat menjawab "siapa
    yang melonggarkan ambang, dan kapan?".
    """
    lama = kebijakan_repo.ambil(db).ambang
    row = kebijakan_repo.ubah_ambang(db, payload.ambang, admin.username)
    audit_repo.catat(
        db,
        aktor=admin.username,
        aksi="ubah_kebijakan_ambang",
        target="ambang",
        nilai_lama=f"{lama:.2f}",
        nilai_baru=f"{row.ambang:.2f}",
    )
    logger.warning(
        "Kebijakan ambang diubah %.2f -> %.2f oleh %s", lama, row.ambang, admin.username
    )
    return KebijakanResponse(
        ambang=row.ambang, diubah_oleh=row.diubah_oleh, diubah_pada=row.diubah_pada
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

    # Ambang SELALU diambil dari kebijakan tersimpan, tidak pernah dari request.
    #
    # Sebelumnya ambang dikirim per-prediksi, sehingga ia menjadi preferensi
    # individu: dua nasabah berprofil identik bisa mendapat keputusan berbeda
    # tergantung siapa yang menangani — ketidakkonsistenan yang justru menjadi
    # alasan sistem ini dibangun. Kini ambang berlaku seragam bagi semua analis
    # dan hanya dapat diubah admin lewat PUT /kebijakan/ambang (teraudit).
    ambang = kebijakan_repo.ambil(db).ambang
    hasil = predict(payload.features(), art, threshold=ambang)

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


@router.post(
    "/history/{riwayat_id}/keputusan",
    response_model=KeputusanAnalisResponse,
    tags=["prediksi"],
)
async def putuskan(
    riwayat_id: int,
    payload: KeputusanAnalisRequest,
    db: Session = Depends(get_session),
    user: User = Depends(get_current_user),
) -> KeputusanAnalisResponse:
    """
    Catat keputusan AKHIR analis atas satu penilaian.

    Model hanya merekomendasikan; yang memutuskan tetap manusia. Endpoint ini
    memisahkan keduanya secara eksplisit sehingga sistem tetap berstatus alat
    bantu, bukan penentu.

    Aturan: bila keputusan analis BERBEDA dari rekomendasi model, `alasan` wajib
    diisi. Menyimpang itu sah — analis melihat hal yang tak terlihat model —
    tetapi harus dapat dipertanggungjawabkan. Sekaligus memberi bahan evaluasi:
    bila model sering dilawan, itu sinyal model perlu ditinjau.
    """
    row = db.get(PredictionHistory, riwayat_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Riwayat penilaian tidak ditemukan.")

    # Need-to-know: hanya pemiliknya yang boleh memutuskan. Admin pun tidak —
    # ia tidak menilai kredit (pemisahan tugas).
    if row.dibuat_oleh != user.username:
        raise HTTPException(
            status_code=403,
            detail="Hanya analis yang membuat penilaian ini yang dapat memutuskannya.",
        )

    menyimpang = payload.keputusan_analis != row.keputusan
    alasan = (payload.alasan or "").strip()

    if menyimpang and len(alasan) < 10:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Keputusan Anda ({payload.keputusan_analis}) berbeda dari rekomendasi "
                f"model ({row.keputusan}). Alasan wajib diisi, minimal 10 karakter, "
                "agar keputusan dapat dipertanggungjawabkan saat audit."
            ),
        )

    row.keputusan_analis = payload.keputusan_analis
    row.alasan = alasan or None
    row.diputus_pada = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)

    # Penyimpangan adalah tindakan yang perlu terlihat pengawas — dicatat.
    if menyimpang:
        audit_repo.catat(
            db,
            aktor=user.username,
            aksi="menyimpang_dari_model",
            target=f"penilaian#{row.id}",
            nilai_lama=row.keputusan,
            nilai_baru=row.keputusan_analis,
        )
        logger.warning(
            "Analis %s menyimpang dari model pada penilaian #%s: %s -> %s",
            user.username, row.id, row.keputusan, row.keputusan_analis,
        )

    return KeputusanAnalisResponse(
        id=row.id,
        keputusan_model=row.keputusan,
        keputusan_analis=row.keputusan_analis,
        menyimpang=menyimpang,
        alasan=row.alasan,
        diputus_pada=row.diputus_pada,
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
