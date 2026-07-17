import { useState } from "react";
import { Card } from "@/components/ui";
import Icon from "@/components/ui/Icon";
import styles from "./GaleriEvaluasi.module.css";

const BASE = `${import.meta.env.BASE_URL}evaluasi/`;

/**
 * Visualisasi evaluasi model dari notebook Tahap 1 (artefak statis).
 * Dikelompokkan agar terbaca sebagai narasi: performa -> interpretasi -> data.
 * Gambar dimuat lazy dan dapat diklik untuk membukanya ukuran penuh.
 */
const GRUP = [
  {
    label: "Performa Klasifikasi",
    ikon: "gauge",
    gambar: [
      ["11_ringkasan_metrik.png", "Ringkasan metrik", "Accuracy, precision, recall, F1, ROC-AUC pada data uji."],
      ["confusion_matrix.png", "Confusion matrix", "Sebaran prediksi benar/salah per kelas."],
      ["07_roc_curve.png", "Kurva ROC", "Kemampuan model membedakan Layak vs Tidak Layak (AUC 0,984)."],
      ["08_precision_recall_curve.png", "Kurva Precision-Recall", "Trade-off precision dan recall pada berbagai ambang."],
    ],
  },
  {
    label: "Interpretabilitas (SHAP)",
    ikon: "trending-up",
    gambar: [
      ["14_shap_bar_importance.png", "Kepentingan fitur (SHAP)", "Fitur paling berpengaruh terhadap keputusan."],
      ["13_shap_summary_beeswarm.png", "SHAP beeswarm", "Arah & besar pengaruh tiap fitur per pengajuan."],
      ["15_shap_dependence_top4.png", "SHAP dependence (top 4)", "Bagaimana nilai fitur mengubah kontribusinya."],
      ["16_shap_waterfall_layak.png", "Waterfall - kasus Layak", "Rincian kontribusi pada satu keputusan Layak."],
      ["16_shap_waterfall_tidak_layak.png", "Waterfall - kasus Tidak Layak", "Rincian kontribusi pada satu keputusan Tidak Layak."],
      ["17_shap_decision_plot.png", "SHAP decision plot", "Jalur keputusan beberapa pengajuan sekaligus."],
      ["18_shap_validasi_fitur_sintetik.png", "Validasi fitur sintetik", "Peran tenor & jaminan yang lemah - dilaporkan apa adanya."],
    ],
  },
  {
    label: "Eksplorasi Data",
    ikon: "bar-chart",
    gambar: [
      ["01_distribusi_target.png", "Distribusi target", "Proporsi Layak vs Tidak Layak."],
      ["02_missing_value.png", "Nilai kosong", "Kolom dengan missing value."],
      ["03_distribusi_fitur_numerik.png", "Distribusi fitur numerik", "Sebaran tiap fitur numerik."],
      ["04_boxplot_fitur_utama.png", "Boxplot fitur utama", "Rentang & outlier fitur penting."],
      ["05_heatmap_korelasi.png", "Heatmap korelasi", "Keterkaitan antar fitur."],
      ["06_kategorikal_vs_target.png", "Kategorikal vs target", "Kelayakan per kategori."],
      ["09_distribusi_probabilitas.png", "Distribusi probabilitas", "Sebaran probabilitas prediksi model."],
      ["10_validasi_fitur_sintetik.png", "Kalibrasi fitur sintetik", "Bukti sinyal tenor/jaminan lemah & terarah."],
      ["12_kpi_dashboard.png", "KPI dashboard", "Ringkasan indikator kunci."],
    ],
  },
];

function Thumb({ file, judul, ket }) {
  const [gagal, setGagal] = useState(false);
  if (gagal) return null;
  return (
    <a href={`${BASE}${file}`} target="_blank" rel="noreferrer" className={styles.item}>
      <img
        src={`${BASE}${file}`}
        alt={judul}
        loading="lazy"
        className={styles.img}
        onError={() => setGagal(true)}
      />
      <div className={styles.cap}>
        <span className={styles.judul}>{judul}</span>
        <span className={styles.ket}>{ket}</span>
      </div>
    </a>
  );
}

export default function GaleriEvaluasi() {
  return (
    <>
      {GRUP.map((g) => (
        <Card key={g.label} title={g.label} subtitle="Klik gambar untuk memperbesar" icon={g.ikon}>
          <div className={styles.grid}>
            {g.gambar.map(([file, judul, ket]) => (
              <Thumb key={file} file={file} judul={judul} ket={ket} />
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
