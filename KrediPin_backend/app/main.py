"""
Entry point aplikasi FastAPI KrediPin.

Tanggung jawab file ini sengaja dijaga tipis:
- siapkan logging
- lifespan: muat model SEKALI + init database saat startup
- pasang CORS untuk React (localhost:5173)
- daftarkan exception handler (404/422/500/503)
- sertakan router (endpoint ada di app/api/routes.py)

Jalankan:  uvicorn app.main:app --reload
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.rate_limit import RateLimitMiddleware

from app.api.routes import router
from app.config import settings
from app.core.exceptions import register_exception_handlers
from app.db.database import get_session_langsung, init_db, migrasi_ringan
from app.ml.model_loader import artifacts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("krediPin")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: muat model sekali + siapkan database. Shutdown: bersih-bersih."""
    logger.info("Memulai %s v%s ...", settings.APP_NAME, settings.APP_VERSION)
    init_db()
    # Selaraskan skema database lama dengan model terkini (lihat migrasi_ringan).
    migrasi_ringan()

    # Seed pengguna awal - tanpa ini sistem terkunci total setelah autentikasi
    # diaktifkan (tidak ada yang bisa login untuk membuat user pertama).
    from app.auth.seed import seed_users
    with get_session_langsung() as db:
        seed_users(db)

    if settings.SECRET_KEY.startswith("dev-only"):
        logger.warning(
            "SECRET_KEY masih memakai nilai default. WAJIB di-override lewat "
            "environment pada deployment nyata - bila bocor, token palsu dapat dibuat."
        )
    artifacts.load()  # model dimuat HANYA di sini (sekali)
    logger.info("Startup selesai. Ambang keputusan aktif: %.2f", settings.THRESHOLD)
    yield
    logger.info("Aplikasi dimatikan.")


app = FastAPI(
    title=settings.APP_NAME,
    description=settings.APP_DESCRIPTION,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Rate limit dipasang LEBIH DULU dari CORS. Middleware Starlette berjalan
# terbalik dari urutan pemasangan, sehingga CORS membungkus respons 429 -
# tanpa ini, browser hanya melihat error CORS, bukan pesan 429 yang jelas.
app.add_middleware(RateLimitMiddleware)

# CORS - izinkan frontend React (Vite) memanggil API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler terpusat (404/422/500/503).
register_exception_handlers(app)

# Endpoint.
app.include_router(router)
