import { Alert, Badge, Card, Icon, Table } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { FEATURE_FIELDS } from "@/constants/featureSchema";
import { APP } from "@/constants/app";
import styles from "./Dokumentasi.module.css";

const STEPS_ANALISIS = [
  "Buka menu Analisis Nasabah Baru.",
  "Lengkapi 20 field data pengajuan (nilai uang dalam Rupiah). Gunakan “Isi Contoh” untuk demo.",
  "Rasio keuangan dihitung otomatis dari data yang Anda isi (tidak perlu diketik).",
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
  { method: "POST", path: "/auth/login", fungsi: "Masuk, menerbitkan token akses (berlaku 8 jam)" },
  { method: "GET", path: "/auth/me", fungsi: "Identitas pemilik token (pemulihan sesi)" },
  { method: "POST", path: "/predict", fungsi: "Prediksi kelayakan + simpan riwayat (khusus analis)" },
  { method: "GET", path: "/history?limit=N", fungsi: "Riwayat: analis melihat miliknya, admin melihat seluruhnya" },
  { method: "POST", path: "/history/{id}/keputusan", fungsi: "Catat keputusan akhir analis (alasan wajib bila menyimpang)" },
  { method: "GET", path: "/kebijakan/ambang", fungsi: "Ambang keputusan yang berlaku" },
  { method: "PUT", path: "/kebijakan/ambang", fungsi: "Ubah ambang keputusan (khusus admin, teraudit)" },
  { method: "GET", path: "/monitoring", fungsi: "Volume prediksi & tingkat penyimpangan (khusus admin)" },
  { method: "GET", path: "/audit", fungsi: "Jejak audit hanya-tambah (khusus admin)" },
  { method: "GET", path: "/users", fungsi: "Daftar pengguna (khusus admin)" },
  { method: "POST", path: "/users", fungsi: "Buat pengguna baru (khusus admin)" },
  { method: "PATCH", path: "/users/{id}", fungsi: "Ubah peran/status pengguna (khusus admin)" },
];

function aturanText(f) {
  // Rasio adalah fitur TURUNAN: tidak diisi/dikirim klien, dihitung server dari
  // field dasar. Ditandai agar tabel ini tidak terbaca seolah 20-duanya diinput.
  if (f.derived) return "Dihitung otomatis oleh server";
  if (f.type === "select" || f.type === "radio") return f.options.join(", ");
  const range = `${f.min} – ${f.max.toLocaleString("id-ID")}`;
  return f.money ? `${range} (IDR)` : f.unit ? `${range} ${f.unit}` : range;
}

export default function Dokumentasi() {
  const { user } = useAuth();
  // Detail teknis model (metodologi, kontrak API, catatan teknis) adalah ranah
  // admin/tim risiko - selaras dengan Eksplorasi/Performa yang juga admin-only.
  // Analis tetap melihat cara pakai + referensi field yang ia isi.
  const admin = user?.peran === "admin";
  return (
    <div className={styles.page}>
      <Card icon="info" title={`Tentang ${APP.name}`} subtitle={APP.tagline}>
        <p className={styles.lead}>
          {APP.name} adalah sistem pendukung keputusan yang memprediksi kelayakan pengajuan pinjaman
          (<strong>Layak / Tidak Layak</strong>) beserta probabilitas dan faktor pendukungnya. Tujuannya
          mempercepat dan menstandarkan penilaian kredit agar konsisten, objektif, dan transparan.
          Output bersifat <strong>alat bantu</strong> bagi analis/komite kredit - bukan keputusan akhir.
        </p>
      </Card>

      <div className={styles.twoCol}>
        <Card icon="user-plus" title="Cara Pakai - Analisis Nasabah Baru" subtitle="Prediksi satu nasabah">
          <ol className={styles.steps}>
            {STEPS_ANALISIS.map((s, i) => (
              <li key={i}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </Card>

        <Card icon="upload" title="Cara Pakai - Import Data Nasabah" subtitle="Prediksi banyak nasabah (CSV)">
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

      {admin && (
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
      )}

      <Card
        icon="file-text"
        title="Referensi Fitur Model"
        subtitle="20 fitur model: 17 diisi analis, 3 rasio dihitung otomatis oleh server"
        padding="none"
      >
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

      {admin && (
      <>
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
          <li><strong>Ambang keputusan</strong> (probabilitas ≥ ambang → Layak) adalah <strong>kebijakan tersimpan</strong> yang berlaku seragam bagi seluruh analis, bukan preferensi per prediksi. Hanya admin yang dapat mengubahnya lewat <code>PUT /kebijakan/ambang</code>, dan perubahannya tercatat di jejak audit.</li>
          <li><strong>Rasio keuangan dihitung server</strong> dari hutang, pinjaman, dan pendapatan. Nilai rasio yang dikirim klien diabaikan, sehingga angka yang dilihat analis selalu sama dengan yang dipakai model.</li>
          <li>Prediksi batch (Import) menjalankan endpoint <code>POST /predict</code> berulang dari sisi klien - bukan endpoint terpisah.</li>
          <li>Setiap prediksi tersimpan ke riwayat (SQLite) beserta pemiliknya, dan keputusan akhir analis dicatat terpisah dari rekomendasi model.</li>
        </ul>
      </Card>
      </>
      )}

      <Alert variant="info" icon="info" title="Disclaimer">
        Hasil prediksi merupakan alat bantu pengambilan keputusan berbasis model statistik, BUKAN
        keputusan akhir. Keputusan kredit final tetap berada pada analis/komite kredit dengan
        mempertimbangkan faktor lain di luar model.
      </Alert>
    </div>
  );
}
