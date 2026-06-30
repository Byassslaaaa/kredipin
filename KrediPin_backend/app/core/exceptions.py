"""
Penanganan error terpusat: 404, 422, 500, dan kondisi model belum siap.

Semua handler mengembalikan JSON berbentuk konsisten:
    {"error": <pesan>, "detail": <rincian|null>, "status_code": <int>}
"""
import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("krediPin")


class ModelNotReadyError(Exception):
    """Diangkat bila artefak model gagal dimuat / belum siap melayani."""
    def __init__(self, message: str = "Model belum siap dimuat."):
        self.message = message
        super().__init__(message)


class PredictionError(Exception):
    """Diangkat bila proses inferensi gagal."""
    def __init__(self, message: str = "Gagal melakukan prediksi."):
        self.message = message
        super().__init__(message)


def _json(status_code: int, error: str, detail=None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": error, "detail": detail, "status_code": status_code},
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Daftarkan seluruh exception handler ke aplikasi FastAPI."""

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        # 422 — input tidak valid (rentang/enum/tipe). Rapikan pesannya.
        ringkas = []
        for e in exc.errors():
            lokasi = " -> ".join(str(x) for x in e.get("loc", []) if x != "body")
            ringkas.append({"field": lokasi or "body", "pesan": e.get("msg")})
        return _json(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Validasi input gagal. Periksa kembali nilai yang dikirim.",
            ringkas,
        )

    @app.exception_handler(ModelNotReadyError)
    async def model_not_ready_handler(request: Request, exc: ModelNotReadyError):
        logger.error("Model belum siap: %s", exc.message)
        return _json(status.HTTP_503_SERVICE_UNAVAILABLE, exc.message)

    @app.exception_handler(PredictionError)
    async def prediction_error_handler(request: Request, exc: PredictionError):
        logger.exception("Kesalahan prediksi: %s", exc.message)
        return _json(status.HTTP_500_INTERNAL_SERVER_ERROR, exc.message)

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(request: Request, exc: StarletteHTTPException):
        # Menangkap 404 dan HTTPException lain dengan format seragam.
        pesan = exc.detail if isinstance(exc.detail, str) else "Terjadi kesalahan."
        if exc.status_code == status.HTTP_404_NOT_FOUND:
            pesan = "Endpoint tidak ditemukan."
        return _json(exc.status_code, pesan)

    @app.exception_handler(Exception)
    async def unhandled_handler(request: Request, exc: Exception):
        # 500 — fallback untuk error tak terduga.
        logger.exception("Kesalahan tak tertangani: %s", exc)
        return _json(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Terjadi kesalahan internal pada server.",
        )
