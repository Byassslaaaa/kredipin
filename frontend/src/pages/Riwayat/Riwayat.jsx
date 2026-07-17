import { useMemo, useState } from "react";
import { Alert, Button, Card, EmptyState, StatCard, Table } from "@/components/ui";
import { Select } from "@/components/ui/form";
import DecisionBadge from "@/components/common/DecisionBadge";
import useHistory from "@/hooks/useHistory";
import { useAuth } from "@/features/auth/AuthContext";
import { formatDateTime, formatNumber, formatPercent } from "@/utils/format";
import styles from "./Riwayat.module.css";

const LIMIT_OPTIONS = [10, 20, 50, 100];

export default function Riwayat() {
  const [limit, setLimit] = useState(20);
  const { data, loading, error, refetch } = useHistory({ limit });
  const { user } = useAuth();
  const admin = user?.peran === "admin";

  const ringkasan = useMemo(() => {
    const layak = data.filter((r) => r.keputusan === "Layak").length;
    const sumProb = data.reduce((a, r) => a + (r.probabilitas_layak || 0), 0);
    return {
      total: data.length,
      layak,
      tidakLayak: data.length - layak,
      avgProb: data.length ? sumProb / data.length : 0,
    };
  }, [data]);

  return (
    <div className={styles.page}>
      <Alert variant="info" icon="info">
        {admin
          ? "Sebagai admin, Anda melihat riwayat penilaian SELURUH analis (pengawasan). Kolom Analis menunjukkan pemiliknya."
          : "Riwayat menampilkan penilaian yang ANDA buat. Setiap penilaian tersimpan otomatis di server."}
      </Alert>

      <div className={styles.kpiGrid}>
        <StatCard label="Ditampilkan" value={formatNumber(ringkasan.total)} icon="database" tone="primary" loading={loading} />
        <StatCard label="Layak" value={formatNumber(ringkasan.layak)} icon="check-circle" tone="success" loading={loading} />
        <StatCard label="Tidak Layak" value={formatNumber(ringkasan.tidakLayak)} icon="x-circle" tone="danger" loading={loading} />
        <StatCard label="Rata-rata Probabilitas" value={formatPercent(ringkasan.avgProb)} icon="gauge" tone="primary" loading={loading} />
      </div>

      <Card
        title="Riwayat Prediksi"
        subtitle="Diurutkan dari yang terbaru"
        icon="history"
        padding="none"
        actions={
          <div className={styles.controls}>
            <Select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              options={LIMIT_OPTIONS.map((n) => ({ value: n, label: `${n} terbaru` }))}
              className={styles.limitSelect}
            />
            <Button variant="secondary" size="sm" iconLeft="refresh" onClick={() => refetch()} loading={loading}>
              Muat ulang
            </Button>
          </div>
        }
      >
        {error ? (
          <EmptyState
            icon="x-circle"
            tone="danger"
            title="Gagal memuat riwayat"
            description={error.message}
            action={
              <Button size="sm" iconLeft="refresh" onClick={() => refetch()}>
                Coba lagi
              </Button>
            }
          />
        ) : (
          <Table
            loading={loading}
            data={data}
            getRowKey={(r) => r.id}
            emptyIcon="history"
            emptyTitle="Belum ada riwayat"
            emptyDescription="Lakukan prediksi di Analisis Nasabah Baru atau Import Data Nasabah."
            columns={[
              // ID nyata (bukan nomor urut) dipertahankan: inilah rujukan audit —
              // dipakai endpoint keputusan analis (/history/{id}/keputusan) & audit log.
              // Diberi awalan "#" agar terbaca sebagai referensi, bukan hitungan baris.
              {
                key: "id",
                header: "ID",
                mono: true,
                align: "right",
                width: "72px",
                render: (r) => `#${r.id}`,
              },
              { key: "waktu", header: "Waktu", render: (r) => formatDateTime(r.waktu) },
              ...(admin
                ? [{
                    key: "dibuat_oleh",
                    header: "Analis",
                    render: (r) => r.dibuat_oleh || "—",
                  }]
                : []),
              {
                key: "keputusan",
                header: "Rekomendasi Model",
                render: (r) => <DecisionBadge keputusan={r.keputusan} size="sm" />,
              },
              {
                key: "keputusan_analis",
                header: "Keputusan Analis",
                render: (r) =>
                  r.keputusan_analis ? (
                    <DecisionBadge keputusan={r.keputusan_analis} size="sm" />
                  ) : (
                    <span className={styles.belum}>belum diputus</span>
                  ),
              },
              {
                key: "probabilitas_layak",
                header: "Probabilitas",
                align: "right",
                mono: true,
                render: (r) => formatPercent(r.probabilitas_layak),
              },
              {
                key: "confidence",
                header: "Confidence",
                align: "right",
                mono: true,
                render: (r) => formatPercent(r.confidence),
              },
              {
                key: "threshold",
                header: "Ambang",
                align: "right",
                mono: true,
                render: (r) => formatPercent(r.threshold),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}
