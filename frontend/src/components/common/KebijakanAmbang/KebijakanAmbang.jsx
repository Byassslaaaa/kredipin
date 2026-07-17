import { useCallback, useEffect, useState } from "react";
import { Button, Icon } from "@/components/ui";
import { useAuth } from "@/features/auth/AuthContext";
import { getKebijakanAmbang, putKebijakanAmbang } from "@/services/dashboardService";
import { formatDateTime, formatPercent } from "@/utils/format";
import styles from "./KebijakanAmbang.module.css";

const MIN = 0.2;
const MAKS = 0.9;

/**
 * KebijakanAmbang — menampilkan ambang keputusan yang BERLAKU.
 *
 * Analis: read-only. Ambang adalah selera risiko perusahaan, bukan preferensi
 * individu — bila tiap analis bebas menggesernya, dua nasabah berprofil identik
 * bisa mendapat keputusan berbeda tergantung siapa yang menangani.
 *
 * Admin: dapat mengubahnya (mewakili komite risiko), dan perubahan tercatat
 * beserta pelakunya sehingga auditor bisa menjawab "siapa yang melonggarkan
 * ambang, dan kapan?".
 */
export default function KebijakanAmbang({ dapatDiubah }) {
  const { user } = useAuth();
  const bolehUbah = dapatDiubah ?? user?.peran === "admin";

  const [kebijakan, setKebijakan] = useState(null);
  const [draf, setDraf] = useState(null);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState(null);

  const muat = useCallback(async () => {
    try {
      const d = await getKebijakanAmbang();
      setKebijakan(d);
      setDraf(d.ambang);
    } catch (e) {
      setGalat(e?.message || "Gagal memuat kebijakan.");
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const simpan = async () => {
    setProses(true);
    setGalat(null);
    try {
      const d = await putKebijakanAmbang(draf);
      setKebijakan(d);
    } catch (e) {
      setGalat(e?.message || "Gagal menyimpan kebijakan.");
      setDraf(kebijakan?.ambang ?? MIN);
    } finally {
      setProses(false);
    }
  };

  if (galat && !kebijakan) {
    return <p className={styles.info}>{galat}</p>;
  }
  if (!kebijakan) {
    return <p className={styles.info}>Memuat kebijakan…</p>;
  }

  const berubah = draf !== kebijakan.ambang;
  const isian = Math.round(((draf - MIN) / (MAKS - MIN)) * 100);

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>Ambang Kebijakan</span>
        <span className={`${styles.nilai} num`}>{formatPercent(kebijakan.ambang)}</span>
      </div>

      {bolehUbah ? (
        <>
          <input
            type="range"
            min={MIN}
            max={MAKS}
            step={0.01}
            value={draf}
            disabled={proses}
            onChange={(e) => setDraf(Number(e.target.value))}
            className={styles.slider}
            style={{ "--pct": `${isian}%` }}
            aria-label="Ambang kebijakan"
            aria-valuetext={formatPercent(draf)}
          />
          <div className={styles.aksi}>
            <span className={styles.draf}>
              {berubah ? (
                <>
                  Akan diubah ke <strong className="num">{formatPercent(draf)}</strong>
                </>
              ) : (
                "Probabilitas ≥ ambang dinilai Layak."
              )}
            </span>
            <Button size="sm" onClick={simpan} loading={proses} disabled={!berubah} type="button">
              Simpan Kebijakan
            </Button>
          </div>
          {galat && <p className={styles.galat}>{galat}</p>}
        </>
      ) : (
        <p className={styles.info}>
          <Icon name="shield-check" size={15} />
          <span>
            Penilaian memakai <strong>ambang kebijakan</strong> yang ditetapkan komite risiko.
            Berlaku sama untuk semua analis agar keputusan tetap konsisten.
          </span>
        </p>
      )}

      <p className={styles.jejak}>
        Terakhir diubah {kebijakan.diubah_oleh ? <strong>{kebijakan.diubah_oleh}</strong> : "sistem"}
        {" · "}
        {formatDateTime(kebijakan.diubah_pada)}
      </p>
    </div>
  );
}
