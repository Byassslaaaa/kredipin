"""
Rate limiting sederhana per-IP (in-memory, tanpa dependensi eksternal).

KENAPA ADA
----------
Endpoint /predict terbuka tanpa autentikasi. Tanpa pembatasan, penyerang dapat
mengirim ribuan variasi input untuk memetakan batas keputusan model - praktik
yang dikenal sebagai *model extraction*. Model adalah aset utama sistem ini.

BATAS KEJUJURAN PENDEKATAN INI
------------------------------
Fitur inti "Import Data Nasabah" melakukan N x POST /predict dari browser
(4 request paralel). Artinya batch yang SAH dan model extraction memiliki POLA
AKSES YANG SAMA - keduanya hanya "banyak request dari satu IP". Rate limit
karena itu TIDAK dapat membedakan keduanya, dan sengaja dibuat longgar agar
tidak mematikan fitur inti.

Jadi ini pagar terhadap penyalahgunaan KASAR, bukan solusi tuntas. Perlindungan
sebenarnya adalah AUTENTIKASI + kuota per-pengguna, sehingga sistem tahu SIAPA
yang mengirim ribuan request, bukan sekadar "dari IP mana".

Implementasi memakai fixed window in-memory: cukup untuk satu instance seperti
deployment saat ini. Bila kelak di-scale ke banyak replika, state ini harus
dipindah ke penyimpanan bersama (mis. Redis).
"""
import time
from collections import defaultdict
from threading import Lock

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


class RateLimiter:
    """Penghitung fixed-window per kunci (IP)."""

    def __init__(self, maks: int, jendela_detik: int) -> None:
        self.maks = maks
        self.jendela = jendela_detik
        self._hit: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def izinkan(self, kunci: str) -> tuple[bool, int]:
        """
        @returns (boleh, sisa_kuota). Membuang jejak yang sudah lewat jendela.
        """
        sekarang = time.time()
        batas_bawah = sekarang - self.jendela

        with self._lock:
            jejak = [t for t in self._hit[kunci] if t > batas_bawah]
            if len(jejak) >= self.maks:
                self._hit[kunci] = jejak
                return False, 0
            jejak.append(sekarang)
            self._hit[kunci] = jejak

            # Cegah kebocoran memori: buang kunci yang sudah lama tidak aktif.
            if len(self._hit) > 5000:
                for k in [k for k, v in self._hit.items() if not v or max(v) < batas_bawah]:
                    del self._hit[k]

            return True, self.maks - len(jejak)


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Terapkan batas hanya pada endpoint yang mahal (inferensi model)."""

    JALUR_DIBATASI = ("/predict",)

    def __init__(self, app) -> None:
        super().__init__(app)
        self.limiter = RateLimiter(
            maks=settings.RATE_LIMIT_MAX,
            jendela_detik=settings.RATE_LIMIT_WINDOW,
        )

    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith(self.JALUR_DIBATASI):
            return await call_next(request)

        # Hormati X-Forwarded-For: aplikasi berjalan di belakang reverse proxy
        # (Nginx/Cloudflare Tunnel), sehingga request.client.host selalu berisi
        # IP proxy, bukan IP asli pemanggil.
        fwd = request.headers.get("x-forwarded-for", "")
        ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "?")

        boleh, sisa = self.limiter.izinkan(ip)
        if not boleh:
            return JSONResponse(
                status_code=429,
                content={
                    "error": "Terlalu banyak permintaan",
                    "detail": (
                        f"Batas {settings.RATE_LIMIT_MAX} permintaan per "
                        f"{settings.RATE_LIMIT_WINDOW} detik terlampaui. "
                        "Coba lagi sebentar lagi."
                    ),
                    "status_code": 429,
                },
                headers={"Retry-After": str(settings.RATE_LIMIT_WINDOW)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(settings.RATE_LIMIT_MAX)
        response.headers["X-RateLimit-Remaining"] = str(sisa)
        return response
