import { formatIDR, formatNumber, formatPercent } from "@/utils/format";
import styles from "./RiskProfileComparison.module.css";

/**
 * RiskProfileComparison — tabel perbandingan profil rata-rata antara nasabah
 * "Layak" dan "Tidak Layak", menggabungkan KPI risiko & insight bisnis.
 */
export default function RiskProfileComparison({ kpi, bisnis }) {
  const findBy = (arr, key) => arr?.find((r) => r.keputusan === key) || {};
  const kLayak = findBy(kpi, "Layak");
  const kTolak = findBy(kpi, "Tidak Layak");
  const bLayak = findBy(bisnis, "Layak");
  const bTolak = findBy(bisnis, "Tidak Layak");

  const rows = [
    {
      label: "Rata-rata skor kredit",
      layak: formatNumber(kLayak.rata_skor_kredit, { maximumFractionDigits: 0 }),
      tolak: formatNumber(kTolak.rata_skor_kredit, { maximumFractionDigits: 0 }),
    },
    {
      label: "Gagal bayar tercatat",
      layak: formatPercent(kLayak.persen_gagal_bayar_tercatat, { fromFraction: false }),
      tolak: formatPercent(kTolak.persen_gagal_bayar_tercatat, { fromFraction: false }),
    },
    {
      label: "Rasio hutang / pendapatan",
      layak: formatNumber(kLayak.rata_rasio_hutang_terhadap_pendapatan, { maximumFractionDigits: 2 }),
      tolak: formatNumber(kTolak.rata_rasio_hutang_terhadap_pendapatan, { maximumFractionDigits: 2 }),
    },
    {
      label: "Tunggakan 2 thn terakhir",
      layak: formatNumber(kLayak.rata_tunggakan_2thn_terakhir, { maximumFractionDigits: 2 }),
      tolak: formatNumber(kTolak.rata_tunggakan_2thn_terakhir, { maximumFractionDigits: 2 }),
    },
    {
      label: "Rata-rata pendapatan / thn",
      layak: formatIDR(bLayak.rata_pendapatan_tahunan_idr, { compact: true }),
      tolak: formatIDR(bTolak.rata_pendapatan_tahunan_idr, { compact: true }),
    },
    {
      label: "Rata-rata suku bunga",
      layak: formatPercent(bLayak.rata_suku_bunga, { fromFraction: false }),
      tolak: formatPercent(bTolak.rata_suku_bunga, { fromFraction: false }),
    },
  ];

  return (
    <div className={styles.table} role="table" aria-label="Perbandingan profil risiko">
      <div className={`${styles.row} ${styles.head}`} role="row">
        <span role="columnheader">Metrik</span>
        <span className={styles.layak} role="columnheader">
          Layak
        </span>
        <span className={styles.tolak} role="columnheader">
          Tidak Layak
        </span>
      </div>
      {rows.map((r) => (
        <div key={r.label} className={styles.row} role="row">
          <span className={styles.label} role="cell">
            {r.label}
          </span>
          <span className={`${styles.value} ${styles.layak} num`} role="cell">
            {r.layak}
          </span>
          <span className={`${styles.value} ${styles.tolak} num`} role="cell">
            {r.tolak}
          </span>
        </div>
      ))}
    </div>
  );
}
