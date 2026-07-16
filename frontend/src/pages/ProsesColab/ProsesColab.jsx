import { useCallback, useState } from "react";
import { Alert, Badge, Card, EmptyState, Skeleton } from "@/components/ui";
import Icon from "@/components/ui/Icon";
import useResource from "@/hooks/useResource";
import { getPipeline } from "@/services/dashboardService";
import styles from "./ProsesColab.module.css";

/**
 * Penjelasan singkat tiap tahap notebook — melengkapi kode & output dengan
 * konteks "mengapa", tanpa mengubah satu angka pun dari Colab.
 * Kunci = nomor tahap pada notebook.
 */
const KETERANGAN = {
  0: "Menyiapkan lingkungan, mengimpor pustaka, dan mendeteksi lokasi dataset.",
  1: "Memuat data dan memverifikasi bentuk, tipe kolom, nilai kosong, serta duplikat.",
  2: "Menyamakan satuan uang ke Rupiah. XGBoost invarian terhadap skala, sehingga konversi tidak mengubah perilaku model.",
  3: "Menambahkan dua fitur sintetik terkalibrasi literatur. Korelasi diperiksa agar arah sinyalnya benar dan tetap lemah (realistis).",
  4: "Membangun Pipeline scikit-learn (impute, one-hot) dan memisahkan data latih/uji secara stratified.",
  5: "Melatih XGBClassifier pada data latih.",
  6: "Mengukur performa pada data uji yang tidak pernah dilihat model saat pelatihan.",
  7: "Mengukur fitur paling berpengaruh — dasar interpretasi sistem.",
  8: "Menjalankan model pada seluruh data untuk menghasilkan berkas analitik dashboard.",
  9: "Menyimpan artefak model agar dapat dilayani API tanpa melatih ulang.",
};

/** Tombol salin kode — memberi umpan balik singkat setelah disalin. */
function TombolSalin({ teks }) {
  const [tersalin, setTersalin] = useState(false);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 1600);
    } catch {
      // Clipboard diblokir (mis. konteks non-HTTPS) — abaikan diam-diam.
    }
  };

  return (
    <button type="button" className={styles.salin} onClick={salin}>
      {tersalin && <Icon name="check-circle" size={12} />}
      {tersalin ? "Tersalin" : "Salin"}
    </button>
  );
}

/** Blok kode Python dari satu sel notebook. */
function BlokKode({ kode, terpotong }) {
  return (
    <div className={styles.blok}>
      <div className={styles.blokHead}>
        <span className={styles.blokLabel}>Kode — Python</span>
        <TombolSalin teks={kode} />
      </div>
      <pre className={styles.kode}>
        <code>{kode}</code>
      </pre>
      {terpotong && <p className={styles.catatan}>Kode dipotong agar ringkas.</p>}
    </div>
  );
}

/** Blok output eksekusi dari sel yang sama. */
function BlokOutput({ output, terpotong, punyaGambar }) {
  return (
    <div className={`${styles.blok} ${styles.blokOutput}`}>
      <div className={styles.blokHead}>
        <span className={styles.blokLabel}>Output</span>
        {punyaGambar && (
          <Badge variant="neutral" size="sm" icon="bar-chart">
            Grafik
          </Badge>
        )}
      </div>
      <pre className={styles.output}>{output}</pre>
      {terpotong && (
        <p className={styles.catatan}>
          Output dipotong agar ringkas — lihat notebook untuk keluaran penuh.
        </p>
      )}
    </div>
  );
}

/** Satu tahap: nomor, judul, keterangan, lalu pasangan kode + output. */
function Tahap({ tahap }) {
  const keterangan = KETERANGAN[tahap.no];

  return (
    <li className={styles.item}>
      <div className={styles.marker} aria-hidden="true">
        <span className={`${styles.markerNo} num`}>{tahap.no}</span>
      </div>

      <Card padding="none" className={styles.card}>
        <div className={styles.head}>
          <div className={styles.headText}>
            <h3 className={styles.judul}>{tahap.judul}</h3>
            {keterangan && <p className={styles.keterangan}>{keterangan}</p>}
          </div>
        </div>

        {tahap.sel.map((sel, i) => (
          <div key={i} className={styles.sel}>
            <BlokKode kode={sel.kode} terpotong={sel.kodeTerpotong} />
            {(sel.output || sel.punyaGambar) && (
              <BlokOutput
                output={sel.output}
                terpotong={sel.outputTerpotong}
                punyaGambar={sel.punyaGambar}
              />
            )}
          </div>
        ))}
      </Card>
    </li>
  );
}

function LoadingView() {
  return (
    <div className={styles.page}>
      <Skeleton variant="rect" height="64px" />
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="rect" height="140px" />
        </Card>
      ))}
    </div>
  );
}

/**
 * ProsesColab — dokumentasi tahapan pemrosesan data pada notebook Google Colab,
 * lengkap dengan KODE dan OUTPUT EKSEKUSI ASLINYA.
 *
 * Data dibaca dari public/data/pipeline.json yang diekstrak langsung dari
 * SIAB_DASD.ipynb saat build (`npm run prepare-data`), sehingga halaman ini
 * selalu sinkron dengan notebook — tidak ada kode/angka yang disalin manual.
 */
export default function ProsesColab() {
  const fetcher = useCallback((opts) => getPipeline(opts), []);
  const { data, loading, error } = useResource(fetcher);

  if (loading) return <LoadingView />;

  if (error || !data?.tahap?.length) {
    return (
      <Card>
        <EmptyState
          icon="x-circle"
          tone="danger"
          title="Data proses tidak tersedia"
          description={`${error?.message || "Gagal memuat."} Jalankan "npm run prepare-data".`}
        />
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <Alert variant="info" icon="info">
        Kode dan output di bawah diekstrak langsung dari notebook{" "}
        <strong>{data.sumber}</strong>. Keduanya ditampilkan apa adanya sebagai dokumentasi —
        bukan ditulis ulang, sehingga selalu sinkron dengan Google Colab.
      </Alert>

      <ol className={styles.list}>
        {data.tahap.map((t) => (
          <Tahap key={t.no} tahap={t} />
        ))}
      </ol>
    </div>
  );
}
