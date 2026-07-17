"""
Agregasi sinyal pemantauan operasional & model.

Bukan monitoring drift statistik penuh (yang butuh perbandingan distribusi fitur
terhadap data latih). Ini pemantauan PRAKTIS dari data yang benar-benar dimiliki
sistem: volume penilaian, komposisi keputusan, dan yang paling bernilai —
seberapa sering analis MENYIMPANG dari model.

Kenapa tingkat penyimpangan itu proxy drift yang jujur: bila analis makin sering
melawan rekomendasi model, itu tanda model mulai tidak sesuai kenyataan lapangan
— sinyal paling awal dan paling murah bahwa model perlu ditinjau, jauh sebelum
metrik formal tersedia (label gagal-bayar sebenarnya baru diketahui berbulan
kemudian).
"""
from datetime import datetime, timedelta, timezone

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.db.models import PredictionHistory


def ringkasan(db: Session, hari: int = 30) -> dict:
    sejak = datetime.now(timezone.utc) - timedelta(days=hari)
    P = PredictionHistory

    total = db.scalar(select(func.count(P.id)).where(P.created_at >= sejak)) or 0
    layak = db.scalar(
        select(func.count(P.id)).where(P.created_at >= sejak, P.keputusan == "Layak")
    ) or 0

    # Hanya penilaian yang SUDAH diputus analis yang relevan untuk penyimpangan.
    diputus = db.scalar(
        select(func.count(P.id)).where(P.created_at >= sejak, P.keputusan_analis.is_not(None))
    ) or 0
    menyimpang = db.scalar(
        select(func.count(P.id)).where(
            P.created_at >= sejak,
            P.keputusan_analis.is_not(None),
            P.keputusan_analis != P.keputusan,
        )
    ) or 0

    prob_avg = db.scalar(
        select(func.avg(P.probabilitas_layak)).where(P.created_at >= sejak)
    )

    return {
        "periode_hari": hari,
        "total_penilaian": total,
        "layak": layak,
        "tidak_layak": total - layak,
        "rata_probabilitas": round(float(prob_avg), 4) if prob_avg is not None else None,
        "sudah_diputus": diputus,
        "menyimpang": menyimpang,
        "tingkat_penyimpangan": round(menyimpang / diputus, 4) if diputus else None,
    }


def tren_harian(db: Session, hari: int = 14) -> list[dict]:
    """Volume & penyimpangan per hari — untuk grafik tren."""
    sejak = datetime.now(timezone.utc) - timedelta(days=hari)
    P = PredictionHistory
    tanggal = func.date(P.created_at)

    rows = db.execute(
        select(
            tanggal.label("tgl"),
            func.count(P.id),
            func.sum(case((P.keputusan == "Layak", 1), else_=0)),
            func.sum(
                case(
                    (P.keputusan_analis.is_not(None) & (P.keputusan_analis != P.keputusan), 1),
                    else_=0,
                )
            ),
        )
        .where(P.created_at >= sejak)
        .group_by(tanggal)
        .order_by(tanggal)
    ).all()

    return [
        {"tanggal": str(r[0]), "total": int(r[1] or 0), "layak": int(r[2] or 0), "menyimpang": int(r[3] or 0)}
        for r in rows
    ]
