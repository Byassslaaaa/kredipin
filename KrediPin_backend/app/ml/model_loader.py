"""
Pemuatan artefak model — DILAKUKAN SEKALI saat startup (singleton).

Artefak berasal dari Tahap 1 dan TIDAK di-training ulang:
- model_krediPin.pkl       : Pipeline sklearn (preprocessor + XGBClassifier)
- fitur_model.json         : kontrak fitur, kategori valid, mapping output
- selected_model_info.json : metadata + hasil evaluasi
"""
import json
import logging
from typing import Optional

import joblib

from app.config import settings
from app.core.exceptions import ModelNotReadyError

logger = logging.getLogger("krediPin")


class ModelArtifacts:
    """Wadah artefak model yang dimuat sekali dan dipakai bersama."""

    def __init__(self) -> None:
        self.pipeline = None
        self.feature_model: Optional[dict] = None
        self.model_info: Optional[dict] = None
        self._loaded = False

    @property
    def loaded(self) -> bool:
        return self._loaded

    def load(self) -> None:
        """Muat seluruh artefak. Dipanggil di lifespan startup."""
        if self._loaded:
            return
        try:
            logger.info("Memuat model dari %s", settings.model_path)
            self.pipeline = joblib.load(settings.model_path)

            with open(settings.feature_model_path, "r", encoding="utf-8") as f:
                self.feature_model = json.load(f)
            with open(settings.model_info_path, "r", encoding="utf-8") as f:
                self.model_info = json.load(f)

            self._loaded = True
            logger.info("Model & metadata berhasil dimuat.")
        except FileNotFoundError as exc:
            raise ModelNotReadyError(f"Artefak model tidak ditemukan: {exc}") from exc
        except Exception as exc:  # noqa: BLE001
            raise ModelNotReadyError(f"Gagal memuat model: {exc}") from exc

    def ensure_ready(self) -> None:
        if not self._loaded or self.pipeline is None:
            raise ModelNotReadyError()


# Instance singleton tingkat-modul.
artifacts = ModelArtifacts()


def get_artifacts() -> ModelArtifacts:
    """Dependency: mengembalikan artefak yang sudah dimuat (atau error 503)."""
    artifacts.ensure_ready()
    return artifacts
