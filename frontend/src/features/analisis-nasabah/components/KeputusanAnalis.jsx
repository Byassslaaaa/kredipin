import { useState } from "react";
import { motion } from "framer-motion";
import { Alert, Button, Icon } from "@/components/ui";
import { putuskan } from "@/services/predictService";
import styles from "./KeputusanAnalis.module.css";

/**
 * KeputusanAnalis - mencatat keputusan AKHIR analis atas satu penilaian.
 *
 * Model hanya MEREKOMENDASIKAN; yang memutuskan tetap manusia. Panel ini membuat
 * pemisahan itu terlihat: analis harus menyatakan keputusannya secara sadar,
 * bukan menerima keluaran model begitu saja.
 *
 * Bila keputusannya BERBEDA dari model, alasan wajib diisi. Menyimpang itu sah -
 * analis melihat hal yang tak terlihat model (mis. dokumen tak terverifikasi) -
 * tetapi harus dapat dipertanggungjawabkan saat audit.
 */
export default function KeputusanAnalis({ riwayatId, keputusanModel }) {
  const [pilihan, setPilihan] = useState(null);
  const [alasan, setAlasan] = useState("");
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState(null);
  const [selesai, setSelesai] = useState(null);

  const menyimpang = pilihan !== null && pilihan !== keputusanModel;
  const alasanKurang = menyimpang && alasan.trim().length < 10;

  const kirim = async () => {
    setProses(true);
    setGalat(null);
    try {
      setSelesai(await putuskan(riwayatId, pilihan, alasan.trim()));
    } catch (e) {
      setGalat(e?.message || "Gagal menyimpan keputusan.");
    } finally {
      setProses(false);
    }
  };

  if (selesai) {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Alert
          variant={selesai.menyimpang ? "warning" : "success"}
          icon={selesai.menyimpang ? "alert-triangle" : "check-circle"}
          title={`Keputusan tercatat: ${selesai.keputusan_analis}`}
        >
          {selesai.menyimpang ? (
            <>
              Keputusan Anda <strong>berbeda</strong> dari rekomendasi model (
              {selesai.keputusan_model}). Penyimpangan beserta alasannya telah dicatat pada jejak
              audit.
            </>
          ) : (
            <>Keputusan Anda sejalan dengan rekomendasi model.</>
          )}
        </Alert>
      </motion.div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <h4 className={styles.judul}>Keputusan Akhir Anda</h4>
        <p className={styles.sub}>
          Model merekomendasikan <strong>{keputusanModel}</strong>. Keputusan final tetap berada
          pada Anda.
        </p>
      </div>

      <div className={styles.pilihan}>
        {["Layak", "Tidak Layak"].map((opsi) => {
          const aktif = pilihan === opsi;
          const sesuaiModel = opsi === keputusanModel;
          return (
            <button
              key={opsi}
              type="button"
              className={`${styles.opsi} ${aktif ? styles.opsiAktif : ""} ${
                opsi === "Layak" ? styles.opsiLayak : styles.opsiTolak
              }`}
              onClick={() => setPilihan(opsi)}
              aria-pressed={aktif}
            >
              <Icon name={opsi === "Layak" ? "check-circle" : "x-circle"} size={18} />
              <span className={styles.opsiLabel}>{opsi}</span>
              {sesuaiModel && <span className={styles.tag}>saran model</span>}
            </button>
          );
        })}
      </div>

      {menyimpang && (
        <motion.div
          className={styles.alasanWrap}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <label className={styles.label} htmlFor="alasan">
            Alasan menyimpang dari model <span className={styles.wajib}>wajib</span>
          </label>
          <textarea
            id="alasan"
            className={styles.textarea}
            rows={3}
            value={alasan}
            placeholder="mis. Dokumen penghasilan tidak dapat diverifikasi saat wawancara lapangan."
            onChange={(e) => setAlasan(e.target.value)}
          />
          <p className={styles.bantuan}>
            Minimal 10 karakter. Alasan ini tercatat pada jejak audit dan menjadi bahan evaluasi
            model - bila model sering dilawan, itu sinyal model perlu ditinjau.
          </p>
        </motion.div>
      )}

      {galat && (
        <Alert variant="danger" icon="x-circle">
          {galat}
        </Alert>
      )}

      <div className={styles.aksi}>
        <Button
          onClick={kirim}
          loading={proses}
          disabled={pilihan === null || alasanKurang}
          type="button"
        >
          Simpan Keputusan
        </Button>
      </div>
    </div>
  );
}
