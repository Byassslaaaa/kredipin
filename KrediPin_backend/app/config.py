"""
Konfigurasi terpusat aplikasi KrediPin.

Seluruh pengaturan dapat di-override lewat environment variable (atau file .env).
THRESHOLD prediksi default 0.5 dan dapat diubah di sini tanpa menyentuh kode lain.
"""
import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated, List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Direktori root backend (folder yang memuat app/, model/, database/)
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Pengaturan aplikasi yang dibaca dari environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        # Hindari bentrok dengan namespace "model_" milik pydantic
        protected_namespaces=("settings_",),
    )

    # --- Identitas aplikasi ---
    APP_NAME: str = "KrediPin API"
    APP_DESCRIPTION: str = (
        "REST API Sistem Pendukung Keputusan Kelayakan Pinjaman Digital (XGBoost). "
        "Alat bantu keputusan kredit — bukan keputusan akhir."
    )
    APP_VERSION: str = "1.0.0"

    # --- Ambang keputusan (CONFIGURABLE) ---
    # Probabilitas_layak >= THRESHOLD  -> "Layak", selain itu "Tidak Layak".
    THRESHOLD: float = Field(default=0.5, ge=0.0, le=1.0)

    # --- Lokasi artefak model (hasil Tahap 1, TIDAK di-training ulang) ---
    MODEL_DIR: Path = BASE_DIR / "model"
    MODEL_FILE: str = "model_krediPin.pkl"
    FEATURE_MODEL_FILE: str = "fitur_model.json"
    MODEL_INFO_FILE: str = "selected_model_info.json"

    # --- Database (SQLite) ---
    DATABASE_DIR: Path = BASE_DIR / "database"
    DATABASE_FILE: str = "krediPin_history.db"

    # --- CORS untuk frontend React ---
    # Default = origin dev Vite. Untuk deployment, set env CORS_ORIGINS dengan
    # daftar origin produksi. Menerima dua format:
    #   - dipisah koma : CORS_ORIGINS=https://app.contoh.com,https://www.contoh.com
    #   - JSON list    : CORS_ORIGINS=["https://app.contoh.com"]
    # NoDecode: matikan auto-JSON-decode env agar validator di bawah yang menangani
    # parsing (mendukung dua format: dipisah koma ATAU JSON list).
    # Default mencakup port fallback Vite (5173-5175) untuk localhost & 127.0.0.1,
    # sehingga dev server di port mana pun tidak terblokir CORS saat pengembangan.
    CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, v):
        """Terima CORS_ORIGINS sebagai daftar dipisah koma maupun JSON list."""
        if isinstance(v, str):
            s = v.strip()
            if not s:
                return []
            if s.startswith("["):
                return json.loads(s)
            return [origin.strip() for origin in s.split(",") if origin.strip()]
        return v

    # --- Lain-lain ---
    KURS_USD_IDR: int = 18000  # informasi; input uang ke API sudah dalam IDR
    MAX_FAKTOR: int = 5        # jumlah faktor pendukung yang dikembalikan

    @property
    def model_path(self) -> Path:
        return self.MODEL_DIR / self.MODEL_FILE

    @property
    def feature_model_path(self) -> Path:
        return self.MODEL_DIR / self.FEATURE_MODEL_FILE

    @property
    def model_info_path(self) -> Path:
        return self.MODEL_DIR / self.MODEL_INFO_FILE

    @property
    def database_path(self) -> Path:
        return self.DATABASE_DIR / self.DATABASE_FILE

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.database_path}"


@lru_cache
def get_settings() -> Settings:
    """Mengembalikan instance Settings yang di-cache (singleton)."""
    settings = get_settings_uncached()
    settings.DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    return settings


def get_settings_uncached() -> Settings:
    return Settings()


settings = get_settings()
