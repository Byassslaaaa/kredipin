import { Alert, Badge, Card, Icon, Table } from "@/components/ui";
import { FEATURE_FIELDS } from "@/constants/featureSchema";
import { APP } from "@/constants/app";
import styles from "./Dokumentasi.module.css";

const STEPS_ANALISIS = [
  "Buka menu Analisis Nasabah Baru.",
  "Lengkapi 20 field data pengajuan (nilai uang dalam Rupiah). Gunakan “Isi Contoh” untuk demo.",
  "Opsional: sesuaikan Ambang Keputusan, atau klik “Hitung otomatis” untuk mengisi rasio.",
  "Klik “Prediksi Kelayakan”. Panel hasil menampilkan keputusan, probabilitas, 5 faktor, dan disclaimer.",
];

const STEPS_IMPORT = [
  "Buka menu Import Data Nasabah, unduh Template CSV bila perlu.",
  "Unggah file CSV (header sesuai 20 kolom fitur).",
  "Periksa hasil validasi: baris valid akan diprediksi, baris tidak valid dilewati.",
  "Klik “Mulai Prediksi”. Hasil batch: ringkasan, distribusi, pratinjau, dan unduhan CSV.",
];

const ENDPOINTS = [
  { method: "GET", path: "/", fungsi: "Info aplikasi & daftar endpoint" },
  { method: "GET", path: "/health", fungsi: "Status model & database" },
  { method: "POST", path: "/predict", fungsi: "Prediksi kelayakan + simpan riwayat" },
  { method: "GET", path: "/history?limit=N", fungsi: "Riwayat prediksi terbaru" },
];

function aturanText(f) {
  if (f.type === "select" || f.type === "radio") return f.options.join(", ");
  const range = `${f.min} – ${f.max.toLocaleString("id-ID")}`;
  return f.money ? `${range} (IDR)` : f.unit ? `${range} ${f.unit}` : range;
}

export default function Dokumentasi() {
  return (
    <div className={styles.page}>
      <Card icon="info" title={`Tentang ${APP.name}`} subtitle={APP.tagline}>
        <p className={styles.lead}>
          {APP.name} adalah sistem pendukung keputusan yang memprediksi kelayakan pengajuan pinjaman
          (<strong>Layak / Tidak Layak</strong>) beserta probabilitas dan faktor pendukungnya. Tujuannya
          mempercepat dan menstandarkan penilaian kredit agar konsisten, objektif, dan transparan.
          Output bersifat <strong>alat bantu</strong> bagi analis/komite kredit — bukan keputusan akhir.
        </p>
      </Card>

      <div className={styles.twoCol}>
        <Card icon="user-plus" title="Cara Pakai — Analisis Nasabah Baru" subtitle="Prediksi satu nasabah">
          <ol className={styles.steps}>
            {STEPS_ANALISIS.map((s, i) => (
              <li key={i}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card icon="upload" title="Cara Pakai — Import Data Nasabah" subtitle="Prediksi banyak nasabah (CSV)">
          <ol className={styles.steps}>
            {STEPS_IMPORT.map((s, i) => (
              <li key={i}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card icon="gauge" title="Metodologi Model" subtitle="Ringkasan pendekatan machine learning">
        <ul className={styles.bullets}>
          <li><strong>Dataset:</strong> 50.000 baris data pinjaman (sektor pembiayaan), nilai uang dikonversi ke IDR (kurs 18.000).</li>
          <li><strong>Algoritma:</strong> XGBoost (XGBClassifier) dengan pipeline scikit-learn (imputasi + one-hot encoding).</li>
          <li><strong>Evaluasi:</strong> split 80/20 stratified; Accuracy 92,7%, F1 93,5%, ROC-AUC 98,4% pada data uji.</li>
          <li><strong>Interpretabilitas:</strong> 5 faktor per prediksi via kontribusi SHAP (pred_contribs) yang diagregasi ke fitur asal.</li>
          <li><strong>Fitur sintetik:</strong> tenor_bulan &amp; jaminan ditambahkan sebagai modifier sekunder (importance rendah, dilaporkan apa adanya).</li>
        </ul>
        <Alert variant="warning" icon="alert-triangle" className={styles.spaced}>
          Caveat: <code>gagal_bayar_tercatat</code> sangat diskriminatif pada dataset ini, sehingga
          metrik tampak sangat tinggi. Pada data nyata, hubungan biasanya tidak sebersih ini.
        </Alert>
      </Card>

      <Card icon="file-text" title="Referensi Fitur Model" subtitle="20 fitur input (sesuai kontrak API)" padding="none">
        <div className={styles.tableScroll}>
          <Table
            stickyHeader
            data={FEATURE_FIELDS}
            getRowKey={(f) => f.name}
            columns={[
              { key: "name", header: "Nama Field", render: (f) => <code className={styles.code}>{f.name}</code> },
              { key: "label", header: "Label" },
              { key: "type", header: "Tipe", render: (f) => <Badge size="sm" variant="neutral">{f.type}</Badge> },
              { key: "aturan", header: "Aturan / Pilihan", render: aturanText },
            ]}
          />
        </div>
      </Card>

      <Card icon="database" title="Kontrak API" subtitle="Endpoint backend FastAPI" padding="none">
        <Table
          data={ENDPOINTS}
          getRowKey={(e) => e.path}
          columns={[
            {
              key: "method",
              header: "Method",
              width: "90px",
              render: (e) => (
                <Badge size="sm" variant={e.method === "POST" ? "success" : "primary"}>{e.method}</Badge>
              ),
            },
            { key: "path", header: "Path", render: (e) => <code className={styles.code}>{e.path}</code> },
            { key: "fungsi", header: "Fungsi" },
          ]}
        />
      </Card>

      <Card icon="shield-check" title="Catatan Teknis">
        <ul className={styles.bullets}>
          <li>Seluruh nilai uang dalam <strong>Rupiah (IDR)</strong>; tidak ada konversi ganda di sisi klien.</li>
          <li><strong>Ambang keputusan</strong> default 0,5 dan dapat di-override per prediksi (probabilitas ≥ ambang → Layak).</li>
          <li>Prediksi batch (Import) menjalankan endpoint <code>POST /predict</code> berulang dari sisi klien — bukan endpoint terpisah.</li>
          <li>Setiap prediksi tersimpan ke riwayat (SQLite) dan dapat ditinjau di menu Riwayat.</li>
        </ul>
      </Card>

      <Alert variant="info" icon="info" title="Disclaimer">
        Hasil prediksi merupakan alat bantu pengambilan keputusan berbasis model statistik, BUKAN
        keputusan akhir. Keputusan kredit final tetap berada pada analis/komite kredit dengan
        mempertimbangkan faktor lain di luar model.
      </Alert>
    </div>
  );
}
