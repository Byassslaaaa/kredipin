"""
Logika inferensi KrediPin.

Mengembalikan keputusan, probabilitas_layak, confidence, dan 5 faktor pendukung
(kontribusi SHAP teragregasi dari fitur one-hot ke fitur asal) menggunakan
`pred_contribs` bawaan XGBoost — tanpa dependensi paket `shap`.
"""
import logging
from typing import List

import numpy as np
import pandas as pd
import xgboost as xgb

from app.config import settings
from app.core.exceptions import PredictionError
from app.ml.model_loader import ModelArtifacts

logger = logging.getLogger("krediPin")

DISCLAIMER = (
    "Hasil ini merupakan alat bantu pengambilan keputusan berbasis model statistik, "
    "BUKAN keputusan akhir. Keputusan kredit final tetap berada pada analis/komite "
    "kredit dengan mempertimbangkan faktor lain di luar model."
)

# Label ramah untuk ditampilkan ke pengguna.
LABEL_FITUR = {
    "usia": "Usia",
    "status_pekerjaan": "Status pekerjaan",
    "lama_bekerja_tahun": "Lama bekerja",
    "pendapatan_tahunan": "Pendapatan tahunan",
    "skor_kredit": "Skor kredit",
    "lama_riwayat_kredit_tahun": "Lama riwayat kredit",
    "aset_tabungan": "Aset tabungan",
    "hutang_saat_ini": "Hutang saat ini",
    "gagal_bayar_tercatat": "Riwayat gagal bayar",
    "tunggakan_2thn_terakhir": "Tunggakan 2 tahun terakhir",
    "catatan_negatif": "Catatan negatif",
    "tipe_produk": "Tipe produk",
    "tujuan_pinjaman": "Tujuan pinjaman",
    "jumlah_pinjaman": "Jumlah pinjaman",
    "suku_bunga": "Suku bunga",
    "rasio_hutang_terhadap_pendapatan": "Rasio hutang terhadap pendapatan",
    "rasio_pinjaman_terhadap_pendapatan": "Rasio pinjaman terhadap pendapatan",
    "rasio_pembayaran_terhadap_pendapatan": "Rasio pembayaran terhadap pendapatan",
    "tenor_bulan": "Tenor (bulan)",
    "jaminan": "Jaminan",
}


def _base_feature(transformed_name: str, kategorikal: List[str]) -> str:
    """Petakan nama kolom hasil OneHot (mis. 'jaminan_Ada Jaminan') ke fitur asal."""
    for cat in kategorikal:
        if transformed_name == cat or transformed_name.startswith(cat + "_"):
            return cat
    return transformed_name


def _format_nilai(fitur: str, nilai) -> str:
    """Format nilai input untuk ditampilkan pada faktor."""
    if isinstance(nilai, float):
        if fitur in {"pendapatan_tahunan", "aset_tabungan", "hutang_saat_ini", "jumlah_pinjaman"}:
            return f"Rp{nilai:,.0f}".replace(",", ".")
        return f"{nilai:g}"
    return str(nilai)


def predict(features: dict, art: ModelArtifacts, threshold: float | None = None) -> dict:
    """
    Jalankan inferensi untuk satu pengajuan.

    Parameters
    ----------
    features : dict   -> nilai fitur (uang dalam IDR), tanpa 'threshold'.
    art      : ModelArtifacts -> artefak yang sudah dimuat.
    threshold: float|None     -> override ambang; None = pakai config.

    Returns
    -------
    dict berisi keputusan, probabilitas_layak, confidence, threshold, faktor, disclaimer.
    """
    art.ensure_ready()
    thr = settings.THRESHOLD if threshold is None else float(threshold)

    try:
        X = pd.DataFrame([features])

        # 1) Probabilitas kelas "Layak" (1)
        proba_layak = float(art.pipeline.predict_proba(X)[:, 1][0])
        keputusan = "Layak" if proba_layak >= thr else "Tidak Layak"
        confidence = round(max(proba_layak, 1.0 - proba_layak), 4)

        # 2) Faktor pendukung via SHAP (pred_contribs)
        faktor = _hitung_faktor(X, features, art)

        return {
            "keputusan": keputusan,
            "probabilitas_layak": round(proba_layak, 4),
            "confidence": confidence,
            "threshold": round(thr, 4),
            "faktor": faktor,
            "disclaimer": DISCLAIMER,
        }
    except PredictionError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise PredictionError(f"Inferensi gagal: {exc}") from exc


def _hitung_faktor(X: pd.DataFrame, features: dict, art: ModelArtifacts) -> List[dict]:
    """Hitung 5 faktor paling berpengaruh (kontribusi SHAP teragregasi)."""
    pre = art.pipeline.named_steps["preprocessor"]
    clf = art.pipeline.named_steps["classifier"]
    kategorikal = art.feature_model["fitur_kategorikal"]

    Xt = pre.transform(X)
    if hasattr(Xt, "toarray"):
        Xt = Xt.toarray()
    names = [n.split("__", 1)[-1] for n in pre.get_feature_names_out()]

    dm = xgb.DMatrix(Xt, feature_names=names)
    # pred_contribs -> per baris: [kontribusi tiap fitur ..., bias]
    contribs = clf.get_booster().predict(dm, pred_contribs=True)[0]
    shap_vals = contribs[:-1]

    # Agregasi one-hot -> fitur asal
    agg: dict[str, float] = {}
    for n, v in zip(names, shap_vals):
        b = _base_feature(n, kategorikal)
        agg[b] = agg.get(b, 0.0) + float(v)

    top = sorted(agg.items(), key=lambda kv: abs(kv[1]), reverse=True)[: settings.MAX_FAKTOR]

    faktor = []
    for fitur, nilai_kontribusi in top:
        faktor.append({
            "fitur": LABEL_FITUR.get(fitur, fitur),
            "nilai_input": _format_nilai(fitur, features.get(fitur)),
            "kontribusi": round(nilai_kontribusi, 4),
            "arah": "mendukung LAYAK" if nilai_kontribusi > 0 else "mendukung TIDAK LAYAK",
        })
    return faktor
