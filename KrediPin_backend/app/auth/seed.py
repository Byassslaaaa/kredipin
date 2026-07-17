"""
Seeding pengguna awal.

Dijalankan saat startup: bila tabel users masih kosong, buat satu admin dan satu
analis dari konfigurasi. Tanpa ini sistem terkunci total setelah autentikasi
diaktifkan — tidak ada seorang pun yang bisa login untuk membuat user pertama.

Seeding hanya terjadi saat tabel BENAR-BENAR kosong, sehingga menjalankan ulang
aplikasi tidak menimpa password yang sudah diganti pengguna.
"""
import logging

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.config import settings
from app.db.models import User

logger = logging.getLogger("krediPin")


def seed_users(db: Session) -> None:
    jumlah = db.execute(select(func.count()).select_from(User)).scalar_one()
    if jumlah:
        return

    db.add_all([
        User(
            username=settings.SEED_ADMIN_USER,
            nama="Administrator",
            password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
            peran="admin",
        ),
        User(
            username=settings.SEED_ANALIS_USER,
            nama="Analis Kredit",
            password_hash=hash_password(settings.SEED_ANALIS_PASSWORD),
            peran="analis",
        ),
    ])
    db.commit()
    logger.warning(
        "Pengguna awal dibuat (%s/%s). GANTI PASSWORD DEFAULT sebelum dipakai nyata.",
        settings.SEED_ADMIN_USER,
        settings.SEED_ANALIS_USER,
    )
