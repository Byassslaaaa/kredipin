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

    # --- Rasio: DIABAIKAN bila dikirim (dihitung server) ---
    #
    # Dipertahankan sebagai field opsional demi kompatibilitas: klien lama dan
    # berkas CSV yang masih memuat kolom rasio tetap diterima (tidak 422).
    # Nilainya SELALU ditimpa oleh hitung_rasio() di features(), sehingga tidak
    # dapat dipakai memanipulasi keputusan. Akan dihapus pada versi berikutnya.
    rasio_hutang_terhadap_pendapatan: Optional[float] = Field(
        default=None, deprecated=True, description="Diabaikan — dihitung server."
    )
    rasio_pinjaman_terhadap_pendapatan: Optional[float] = Field(
        default=None, deprecated=True, description="Diabaikan — dihitung server."
    )
    rasio_pembayaran_terhadap_pendapatan: Optional[float] = Field(
        default=None, deprecated=True, description="Diabaikan — dihitung server."
    )

    # --- Fitur sintetik (Tahap 1) ---
    tenor_bulan: TenorBulan
    jaminan: Jaminan

    # --- Override ambang keputusan (opsional) ---
    #
    # Rentang SENGAJA dibatasi 0.2-0.9, bukan 0.0-1.0. Ambang 0.0 membuat SEMUA
    # pengajuan dinyatakan Layak (probabilitas >= 0 selalu benar) sehingga model
    # ter-bypass total; 1.0 menolak semuanya. Keduanya tidak punya makna bisnis
    # dan merupakan celah pemaksaan keputusan dari sisi klien.
    threshold: Optional[float] = Field(
        default=None, ge=0.2, le=0.9,
        description=(
            "Override ambang keputusan (0.2-0.9). Kosong = pakai default config (0.5). "
            "Nilai ekstrem ditolak agar model tidak dapat di-bypass."
        ),
    )

    def features(self) -> dict:
        """
        Fitur untuk inferensi: field yang dikirim klien + rasio yang DIHITUNG
        server. Rasio sengaja tidak diterima sebagai input (lihat _rasio).
        """
        data = self.model_dump(exclude={"threshold"})
        data.update(hitung_rasio(data))
        return data


def hitung_rasio(f: dict) -> dict:
    """
    Turunkan ketiga rasio dari field dasar.

    Formula diverifikasi terhadap 5.000 baris `data.csv` (cocok 5.000/5.000),
    sehingga nilainya identik dengan yang dilihat model saat pelatihan:
      - rasio_hutang    = hutang_saat_ini / pendapatan_tahunan
      - rasio_pinjaman  = jumlah_pinjaman / pendapatan_tahunan
      - rasio_pembayaran= (jumlah_pinjaman / 3) / pendapatan_tahunan
        (dataset mengasumsikan pelunasan 3 tahun tetap, tanpa komponen bunga)

    KENAPA dihitung di server, bukan diterima dari klien: ketiganya adalah nilai
    TURUNAN. Saat diterima sebagai input bebas, klien dapat mengirim rasio yang
    bertentangan dengan field dasarnya dan membalik keputusan — padahal
    rasio_hutang adalah fitur terpenting ke-3 pada model.
    """
    pendapatan = float(f.get("pendapatan_tahunan") or 0)
    hutang = float(f.get("hutang_saat_ini") or 0)
    pinjaman = float(f.get("jumlah_pinjaman") or 0)

    if pendapatan <= 0:
        # Pendapatan 0 -> rasio tak terdefinisi. Pakai batas atas rentang agar
        # tetap terbaca sebagai kondisi berisiko tinggi, bukan 0 (yang justru
        # akan tampak sangat sehat bagi model).
        return {
            "rasio_hutang_terhadap_pendapatan": 10.0 if hutang > 0 else 0.0,
            "rasio_pinjaman_terhadap_pendapatan": 50.0 if pinjaman > 0 else 0.0,
            "rasio_pembayaran_terhadap_pendapatan": 10.0 if pinjaman > 0 else 0.0,
        }

    def batas(nilai: float, maks: float) -> float:
        return round(min(max(nilai, 0.0), maks), 4)

    return {
        "rasio_hutang_terhadap_pendapatan": batas(hutang / pendapatan, 10),
        "rasio_pinjaman_terhadap_pendapatan": batas(pinjaman / pendapatan, 50),
        "rasio_pembayaran_terhadap_pendapatan": batas((pinjaman / 3) / pendapatan, 10),
    }


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
