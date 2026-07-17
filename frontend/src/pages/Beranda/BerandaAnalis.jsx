import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Card, EmptyState, StatCard } from "@/components/ui";
import DecisionBadge from "@/components/common/DecisionBadge";
import useHistory from "@/hooks/useHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { ROUTES } from "@/constants/navigation";
import { formatDateTime, formatNumber, formatPercent } from "@/utils/format";
import styles from "./BerandaAnalis.module.css";

/**
 * BerandaAnalis — beranda untuk petugas kredit.
 *
 * Sengaja TIDAK menampilkan metrik model (accuracy/ROC-AUC) maupun statistik
 * dataset. Bagi analis, angka itu bukan alat kerja: ia tidak bisa
 * menindaklanjutinya, dan menempatkannya di depan justru menggeser fokus dari
 * pekerjaan sesungguhnya — menilai pengajuan. Yang ditampilkan hanya hal yang
 * dapat ia tindak lanjuti: pekerjaannya sendiri dan pintu masuk ke tugasnya.
 *
 * Riwayat yang dibaca sudah difilter server per pemilik (need-to-know), sehingga
 * angka di sini adalah hasil kerja analis yang sedang login — bukan gabungan.
 */
export default function BerandaAnalis() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: riwayat, loading } = useHistory(100);

  const ringkas = useMemo(() => {
    const baris = riwayat || [];
    const layak = baris.filter((r) => r.keputusan === "Layak").length;
    const rata = baris.length
      ? baris.reduce((a, r) => a + (r.probabilitas_layak || 0), 0) / baris.length
      : 0;
    return { total: baris.length, layak, tolak: baris.length - layak, rata };
  }, [riwayat]);

  const terbaru = (riwayat || []).slice(0, 5);

  return (
    <div className={styles.page}>
      <section className={styles.sapa}>
        <div>
          <p className={styles.kicker}>Ruang kerja analis kredit</p>
          <h2 className={styles.judul}>Halo, {user?.nama?.split(" ")[0] || "Analis"}</h2>
          <p className={styles.sub}>
            Mulai penilaian baru, atau proses banyak pengajuan sekaligus lewat berkas CSV.
          </p>
        </div>
        <div className={styles.aksi}>
          <Button size="lg" iconLeft="user-plus" onClick={() => navigate(ROUTES.analisis)}>
            Nilai Nasabah Baru
          </Button>
          <Button variant="secondary" size="lg" iconLeft="upload" onClick={() => navigate(ROUTES.importData)}>
            Import CSV
          </Button>
        </div>
      </section>

      <p className={styles.sectionLabel}>Pekerjaan Anda</p>
      <div className={styles.kpi}>
        <StatCard
          label="Penilaian Anda"
          value={loading ? "" : formatNumber(ringkas.total)}
          icon="history"
          tone="primary"
          hint="total yang Anda proses"
          loading={loading}
        />
        <StatCard
          label="Direkomendasikan Layak"
          value={loading ? "" : formatNumber(ringkas.layak)}
          icon="check-circle"
          tone="success"
          hint="oleh model"
          loading={loading}
        />
        <StatCard
          label="Direkomendasikan Tolak"
          value={loading ? "" : formatNumber(ringkas.tolak)}
          icon="x-circle"
          tone="danger"
          hint="oleh model"
          loading={loading}
        />
        <StatCard
          label="Rata-rata Probabilitas"
          value={loading ? "" : formatPercent(ringkas.rata)}
          icon="gauge"
          tone="primary"
          hint="dari penilaian Anda"
          loading={loading}
        />
      </div>

      <Card
        title="Penilaian Terakhir Anda"
        subtitle="Lima penilaian terbaru yang Anda buat"
        icon="history"
        actions={
          <Button variant="ghost" size="sm" iconRight="chevron-right" onClick={() => navigate(ROUTES.riwayat)}>
            Lihat semua
          </Button>
        }
      >
        {terbaru.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="Belum ada penilaian"
            description="Penilaian yang Anda buat akan muncul di sini."
          />
        ) : (
          <ul className={styles.daftar}>
            {terbaru.map((r) => (
              <li key={r.id} className={styles.baris}>
                <DecisionBadge keputusan={r.keputusan} size="sm" />
                <span className={`${styles.prob} num`}>{formatPercent(r.probabilitas_layak)}</span>
                <span className={styles.waktu}>{formatDateTime(r.waktu)}</span>
                <span className={`${styles.id} num`}>#{r.id}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Alert variant="info" icon="info">
        Rekomendasi model adalah <strong>alat bantu</strong>, bukan keputusan akhir. Keputusan
        kredit tetap berada pada Anda dan komite kredit, dengan mempertimbangkan faktor di luar
        model.
      </Alert>
    </div>
  );
}
