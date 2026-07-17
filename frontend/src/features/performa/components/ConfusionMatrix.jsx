import { useState } from "react";
import { formatNumber, formatPercent } from "@/utils/format";
import styles from "./ConfusionMatrix.module.css";

/**
 * ConfusionMatrix - matriks kebingungan 2x2 bergaya heatmap.
 *
 * Konvensi (sesuai sklearn): baris = aktual, kolom = prediksi,
 * indeks 0 = "Tidak Layak", indeks 1 = "Layak".
 *
 * Props: matrix = [[TN, FP], [FN, TP]]
 *
 * Catatan desain: sengaja dirender sebagai grid HTML semantik, BUKAN heatmap
 * ApexCharts. Ukurannya hanya 2x2 namun tiap sel perlu memuat label (TN/FP/FN/TP),
 * nilai, dua jenis persentase, dan makna bisnisnya - hal yang tidak muat pada sel
 * heatmap kanvas, sekaligus lebih mudah diakses pembaca layar.
 */

const SEL = {
  tn: {
    kode: "TN",
    nama: "Benar Negatif",
    arti: "Diprediksi Tidak Layak dan memang Tidak Layak - penolakan yang tepat.",
    benar: true,
  },
  fp: {
    kode: "FP",
    nama: "Salah Positif",
    arti: "Diprediksi Layak padahal Tidak Layak - pinjaman diloloskan ke nasabah berisiko. Kesalahan PALING MAHAL karena berpotensi gagal bayar.",
    benar: false,
  },
  fn: {
    kode: "FN",
    nama: "Salah Negatif",
    arti: "Diprediksi Tidak Layak padahal Layak - nasabah baik ditolak, sehingga kehilangan peluang pendapatan.",
    benar: false,
  },
  tp: {
    kode: "TP",
    nama: "Benar Positif",
    arti: "Diprediksi Layak dan memang Layak - persetujuan yang tepat.",
    benar: true,
  },
};

export default function ConfusionMatrix({ matrix }) {
  const [aktif, setAktif] = useState(null);
  const [[tn, fp], [fn, tp]] = matrix;

  const total = tn + fp + fn + tp;
  const maks = Math.max(tn, fp, fn, tp);

  // Total per baris (aktual) -> dasar persentase recall tiap kelas.
  const barisTidakLayak = tn + fp;
  const barisLayak = fn + tp;

  const data = {
    tn: { nilai: tn, baris: barisTidakLayak },
    fp: { nilai: fp, baris: barisTidakLayak },
    fn: { nilai: fn, baris: barisLayak },
    tp: { nilai: tp, baris: barisLayak },
  };

  const Sel = ({ id }) => {
    const meta = SEL[id];
    const { nilai, baris } = data[id];
    // Intensitas warna proporsional terhadap nilai terbesar -> pola matriks
    // langsung terbaca sekilas (diagonal pekat = model bagus).
    const intensitas = maks ? nilai / maks : 0;
    const opacity = 0.1 + intensitas * 0.85;

    return (
      <button
        type="button"
        className={`${styles.cell} ${meta.benar ? styles.benar : styles.salah} ${
          aktif === id ? styles.cellAktif : ""
        }`}
        style={{ "--intensitas": opacity }}
        onMouseEnter={() => setAktif(id)}
        onMouseLeave={() => setAktif(null)}
        onFocus={() => setAktif(id)}
        onBlur={() => setAktif(null)}
        aria-label={`${meta.nama} (${meta.kode}): ${formatNumber(nilai)} data, ${formatPercent(
          nilai / total,
        )} dari total`}
      >
        <span className={styles.kode}>{meta.kode}</span>
        <span className={`${styles.nilai} num`}>{formatNumber(nilai)}</span>
        <span className={`${styles.persen} num`}>
          {formatPercent(baris ? nilai / baris : 0)} <span className={styles.persenKet}>dari baris</span>
        </span>
      </button>
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        <div className={styles.corner} />
        <div className={styles.axisTop}>
          <span className={styles.axisTitle}>Prediksi Model</span>
          <div className={styles.axisLabels}>
            <span>Tidak Layak</span>
            <span>Layak</span>
          </div>
        </div>

        <div className={styles.axisLeft}>
          <span className={styles.axisTitle}>Aktual</span>
          <div className={styles.axisLabels}>
            <span>Tidak Layak</span>
            <span>Layak</span>
          </div>
        </div>

        <div className={styles.cells}>
          <Sel id="tn" />
          <Sel id="fp" />
          <Sel id="fn" />
          <Sel id="tp" />
        </div>
      </div>

      {/* Panel makna - berubah mengikuti sel yang disorot. */}
      <div className={`${styles.panel} ${aktif ? styles.panelAktif : ""}`}>
        {aktif ? (
          <>
            <span className={styles.panelJudul}>
              {SEL[aktif].nama} ({SEL[aktif].kode}) - {formatNumber(data[aktif].nilai)} data
            </span>
            <span className={styles.panelArti}>{SEL[aktif].arti}</span>
          </>
        ) : (
          <span className={styles.panelArti}>
            Arahkan kursor ke salah satu sel untuk melihat maknanya bagi keputusan kredit.
          </span>
        )}
      </div>

      <div className={styles.ringkas}>
        <div className={styles.ringkasItem}>
          <span className={styles.ringkasLabel}>Prediksi benar</span>
          <span className={`${styles.ringkasNilai} ${styles.ringkasBenar} num`}>
            {formatNumber(tp + tn)} <span className={styles.ringkasPct}>({formatPercent((tp + tn) / total)})</span>
          </span>
        </div>
        <div className={styles.ringkasItem}>
          <span className={styles.ringkasLabel}>Prediksi keliru</span>
          <span className={`${styles.ringkasNilai} ${styles.ringkasSalah} num`}>
            {formatNumber(fp + fn)} <span className={styles.ringkasPct}>({formatPercent((fp + fn) / total)})</span>
          </span>
        </div>
        <div className={styles.ringkasItem}>
          <span className={styles.ringkasLabel}>Total data uji</span>
          <span className={`${styles.ringkasNilai} num`}>{formatNumber(total)}</span>
        </div>
      </div>
    </div>
  );
}
