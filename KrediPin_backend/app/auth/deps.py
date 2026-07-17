"""
Dependency autentikasi & otorisasi FastAPI.

Alur: Authorization: Bearer <token> -> baca_token() -> ambil user dari DB ->
pastikan masih aktif. Pemeriksaan `aktif` dilakukan setiap request (bukan hanya
saat login) agar akun yang dinonaktifkan langsung kehilangan akses tanpa perlu
menunggu token kedaluwarsa.
"""
from typing import Optional

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.security import baca_token
from app.db.database import get_session
from app.db.models import User

_TIDAK_SAH = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Kredensial tidak valid atau sesi telah berakhir.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    db: Session = Depends(get_session),
) -> User:
    """Ambil user dari token Bearer. Melempar 401 bila tidak sah."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise _TIDAK_SAH

    payload = baca_token(authorization.split(" ", 1)[1].strip())
    if not payload or not payload.get("sub"):
        raise _TIDAK_SAH

    user = db.execute(select(User).where(User.username == payload["sub"])).scalar_one_or_none()
    if user is None or not user.aktif:
        raise _TIDAK_SAH
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Batasi endpoint hanya untuk peran admin."""
    if user.peran != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aksi ini hanya untuk admin.",
        )
    return user
