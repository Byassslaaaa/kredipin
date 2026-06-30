"""
Skema Pydantic untuk validasi input dan bentuk response.

Catatan penting tentang satuan uang:
- Model dilatih pada nilai uang dalam IDR (kolom uang dikalikan kurs di Tahap 1).
- Karena itu seluruh field uang pada PredictRequest DITERIMA DALAM IDR (Rupiah).
  Frontend menampilkan/menerima Rupiah; tidak ada konversi ganda di backend.
"""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field, ConfigDict


# Enum kategori dikunci sesuai kontrak fitur_model.json (handle_unknown="ignore"
# tetap aman, tetapi kita tolak nilai di luar daftar pada level API -> HTTP 422).
StatusPekerjaan = Literal["Bekerja", "Mahasiswa", "Wiraswasta"]
TipeProduk = Literal["Kartu Kredit", "Kredit Berjalan", "Pinjaman Pribadi"]
TujuanPinjaman = Literal[
    "Bisnis", "Konsolidasi Hutang", "Medis", "Pendidikan", "Pribadi", "Renovasi Rumah"
]
Jaminan = Literal["Ada Jaminan", "Tanpa Jaminan"]
TenorBulan = Literal[6, 12, 24, 36, 48, 60]


class PredictRequest(BaseModel):
    """Input pengajuan pinjaman. Seluruh nilai uang dalam IDR."""

    model_config = ConfigDict(
        extra="forbid",  # tolak field tak dikenal -> 422
        json_schema_extra={
            "example": {
                "usia": 35,
                "status_pekerjaan": "Bekerja",
                "lama_bekerja_tahun": 8.0,
                "pendapatan_tahunan": 900000000,
                "skor_kredit": 640,
                "lama_riwayat_kredit_tahun": 6.0,
                "aset_tabungan": 18000000,
                "hutang_saat_ini": 270000000,
                "gagal_bayar_tercatat": 0,
                "tunggakan_2thn_terakhir": 1,
                "catatan_negatif": 0,
                "tipe_produk": "Pinjaman Pribadi",
                "tujuan_pinjaman": "Pribadi",
                "jumlah_pinjaman": 720000000,
                "suku_bunga": 15.0,
                "rasio_hutang_terhadap_pendapatan": 0.35,
                "rasio_pinjaman_terhadap_pendapatan": 0.8,
                "rasio_pembayaran_terhadap_pendapatan": 0.27,
                "tenor_bulan": 36,
                "jaminan": "Tanpa Jaminan",
                "threshold": 0.5,
            }
        },
    )

    # --- Demografi & pekerjaan ---
    usia: int = Field(..., ge=17, le=80, description="Usia pemohon (tahun)")
    status_pekerjaan: StatusPekerjaan
    lama_bekerja_tahun: float = Field(..., ge=0, le=60)

    # --- Keuangan (IDR) & kredit ---
    pendapatan_tahunan: float = Field(..., ge=0, le=20_000_000_000, description="IDR/tahun")
    skor_kredit: int = Field(..., ge=300, le=900)
    lama_riwayat_kredit_tahun: float = Field(..., ge=0, le=60)
    aset_tabungan: float = Field(..., ge=0, le=50_000_000_000, description="IDR")
    hutang_saat_ini: float = Field(..., ge=0, le=20_000_000_000, description="IDR")

    # --- Riwayat negatif ---
    gagal_bayar_tercatat: int = Field(..., ge=0, le=10)
    tunggakan_2thn_terakhir: int = Field(..., ge=0, le=30)
    catatan_negatif: int = Field(..., ge=0, le=20)

    # --- Produk & pinjaman ---
    tipe_produk: TipeProduk
    tujuan_pinjaman: TujuanPinjaman
    jumlah_pinjaman: float = Field(..., ge=0, le=10_000_000_000, description="IDR")
    suku_bunga: float = Field(..., ge=0, le=100, description="Persen per tahun")

    # --- Rasio (tak bersatuan) ---
    rasio_hutang_terhadap_pendapatan: float = Field(..., ge=0, le=10)
    rasio_pinjaman_terhadap_pendapatan: float = Field(..., ge=0, le=50)
    rasio_pembayaran_terhadap_pendapatan: float = Field(..., ge=0, le=10)

    # --- Fitur sintetik (Tahap 1) ---
    tenor_bulan: TenorBulan
    jaminan: Jaminan

    # --- Override ambang keputusan (opsional) ---
    threshold: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="Override ambang keputusan; bila kosong pakai default config (0.5).",
    )

    def features(self) -> dict:
        """Ambil hanya field fitur model (tanpa threshold) untuk inferensi."""
        return self.model_dump(exclude={"threshold"})


class Faktor(BaseModel):
    """Satu faktor pendukung keputusan (kontribusi SHAP teragregasi)."""
    fitur: str = Field(..., description="Nama fitur (label ramah)")
    nilai_input: Optional[str] = Field(None, description="Nilai input pemohon untuk fitur ini")
    kontribusi: float = Field(..., description="Kontribusi terhadap log-odds 'Layak'")
    arah: Literal["mendukung LAYAK", "mendukung TIDAK LAYAK"]


class PredictResponse(BaseModel):
    keputusan: Literal["Layak", "Tidak Layak"]
    probabilitas_layak: float = Field(..., ge=0, le=1)
    confidence: float = Field(..., ge=0, le=1, description="Keyakinan model pada keputusan terpilih")
    threshold: float = Field(..., ge=0, le=1)
    faktor: List[Faktor]
    disclaimer: str
    id_riwayat: Optional[int] = None
    waktu: datetime


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    model_dimuat: bool
    database_ok: bool
    versi: str
    threshold_aktif: float


class RootResponse(BaseModel):
    aplikasi: str
    versi: str
    deskripsi: str
    dokumentasi: str
    endpoint: dict


class HistoryItem(BaseModel):
    id: int
    waktu: datetime
    keputusan: str
    probabilitas_layak: float
    confidence: float
    threshold: float


class ErrorResponse(BaseModel):
    error: str
    detail: Optional[object] = None
    status_code: int
