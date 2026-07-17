"""
Primitif keamanan: hashing password & token sesi.

PILIHAN TEKNIS
--------------
Password memakai PBKDF2-HMAC-SHA256 dari pustaka standar Python, bukan
passlib[bcrypt]. Alasannya: bcrypt adalah ekstensi native, sementara VM
deployment sudah terbukti rapuh terhadap dependensi native (kasus numpy vs CPU
tanpa x86-64-v2). PBKDF2 tersedia di stdlib, tanpa kompilasi, dan merupakan
algoritma yang direkomendasikan NIST bila iterasinya memadai.

Token memakai JWT (PyJWT) — pustaka murni Python, ringan, tanpa ekstensi native.
"""
import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from app.config import settings

# 210.000 iterasi = rekomendasi OWASP untuk PBKDF2-HMAC-SHA256.
ITERASI = 210_000
PANJANG_SALT = 16
ALGO_TOKEN = "HS256"


def hash_password(password: str) -> str:
    """Hasilkan hash berformat `pbkdf2_sha256$<iterasi>$<salt_hex>$<hash_hex>`."""
    salt = os.urandom(PANJANG_SALT)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, ITERASI)
    return f"pbkdf2_sha256${ITERASI}${salt.hex()}${dk.hex()}"


def verify_password(password: str, tersimpan: str) -> bool:
    """
    Verifikasi password terhadap hash tersimpan.

    Memakai compare_digest (bukan ==) agar tahan timing attack: perbandingan
    biasa berhenti di byte pertama yang berbeda, sehingga lama eksekusinya
    membocorkan seberapa benar tebakan penyerang.
    """
    try:
        algo, iterasi, salt_hex, hash_hex = tersimpan.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac(
            "sha256", password.encode(), bytes.fromhex(salt_hex), int(iterasi)
        )
        return hmac.compare_digest(dk.hex(), hash_hex)
    except (ValueError, AttributeError):
        # Hash rusak/format lama -> anggap gagal, jangan sampai melempar 500.
        return False


def buat_token(subject: str, peran: str) -> str:
    """Terbitkan JWT berisi identitas & peran, dengan masa berlaku terbatas."""
    kedaluwarsa = datetime.now(timezone.utc) + timedelta(
        minutes=settings.TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": subject,
        "peran": peran,
        "exp": kedaluwarsa,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGO_TOKEN)


def baca_token(token: str) -> Optional[dict]:
    """Kembalikan payload bila token sah & belum kedaluwarsa; None bila tidak."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGO_TOKEN])
    except jwt.PyJWTError:
        return None
