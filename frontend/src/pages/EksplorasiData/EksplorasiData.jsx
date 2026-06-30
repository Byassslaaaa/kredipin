import { useCallback, useMemo } from "react";
import { Alert, Card, EmptyState, Skeleton, StatCard, Table } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { getChartColors } from "@/components/charts/chartTheme";
import DecisionBadge from "@/components/common/DecisionBadge";
import CategoryDistribution from "@/features/eksplorasi/components/CategoryDistribution";
import useResource from "@/hooks/useResource";
import { getEksplorasi } from "@/services/dashboardService";
import { formatIDR, formatNumber, formatPercent } from "@/utils/format";
import styles from "./EksplorasiData.module.css";

export default function EksplorasiData() {
  const fetcher = useCallback((opts) => getEksplorasi(opts), []);
  const { data, loading, error } = useResource(fetcher);
  const colors = getChartColors();

  const tenorSorted = useMemo(
    () =>
      data?.kategori?.tenor_bulan
        ? [...data.kategori.tenor_bulan].sort((a, b) => a.value - b.value)
        : [],
    [data],
  );

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.kpiGrid}>
          {["Total Data", "Layak", "Tidak Layak", "Rata-rata Probabilitas"].map((l) => (
            <StatCard key={l} label={l} value="" loading icon="database" />
          ))}
        </div>
        <div className={styles.twoCol}>
          <Card><Skeleton variant="rect" height="260px" /></Card>
          <Card><Skeleton variant="rect" height="260px" /></Card>
        </div>
        <Card><Skeleton variant="rect" height="300px" /></Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <EmptyState
          icon="x-circle"
          tone="danger"
          title="Data eksplorasi tidak tersedia"
          description={`${error?.message || "Gagal memuat."} Jalankan "npm run prepare-data".`}
        />
      </Card>
    );
  }

  return (
    <div className={styles.page}>
      <Alert variant="info" icon="info">
        Eksplorasi atas <strong>{formatNumber(data.total)}</strong> baris data historis
        (telah dipra-agregasi dari <code>prediksi_lengkap.csv</code> menjadi ringkasan ringan).
      </Alert>

      <div className={styles.kpiGrid}>
        <StatCard
          label="Total Data"
          value={formatNumber(data.total)}
          icon="database"
          tone="primary"
          hint="baris data historis"
        />
        <StatCard
          label="Layak"
          value={formatNumber(data.totalLayak)}
          icon="check-circle"
          tone="success"
          hint={`${formatPercent(data.totalLayak / data.total)} dari total`}
        />
        <StatCard
          label="Tidak Layak"
          value={formatNumber(data.totalTidakLayak)}
          icon="x-circle"
          tone="danger"
          hint={`${formatPercent(data.totalTidakLayak / data.total)} dari total`}
        />
        <StatCard
          label="Rata-rata Probabilitas"
          value={formatPercent(data.avgProbabilitas)}
          icon="gauge"
          tone="primary"
          hint="rata-rata seluruh data"
        />
      </div>

      <div className={styles.twoCol}>
        <CategoryDistribution
          title="Distribusi Tipe Produk"
          subtitle="Jumlah pengajuan per produk, dipisah keputusan"
          icon="file-text"
          items={data.kategori.tipe_produk}
        />
        <CategoryDistribution
          title="Distribusi Status Pekerjaan"
          icon="users"
          items={data.kategori.status_pekerjaan}
        />
        <CategoryDistribution
          title="Distribusi Tujuan Pinjaman"
          icon="bar-chart"
          items={data.kategori.tujuan_pinjaman}
        />
        <CategoryDistribution
          title="Distribusi Jaminan"
          icon="shield-check"
          items={data.kategori.jaminan}
        />
      </div>

      <CategoryDistribution
        title="Distribusi Tenor"
        subtitle="Tenor pinjaman (bulan), dipisah keputusan"
        icon="history"
        items={tenorSorted}
        formatValue={(v) => `${v} bln`}
      />

      <Card
        title="Sebaran Skor Kredit"
        subtitle="Histogram skor kredit, ditumpuk berdasarkan keputusan"
        icon="trending-up"
      >
        <BarChart
          labels={data.skorKreditHistogram.map((h) => h.bin)}
          datasets={[
            { label: "Layak", data: data.skorKreditHistogram.map((h) => h.layak), color: colors.success },
            {
              label: "Tidak Layak",
              data: data.skorKreditHistogram.map((h) => h.tidakLayak),
              color: colors.danger,
            },
          ]}
          stacked
          legend
          height={320}
        />
      </Card>

      <Card
        title="Sampel Data"
        subtitle={`${data.sample.length} baris representatif dari ${formatNumber(data.total)} data`}
        icon="database"
        padding="none"
      >
        <div className={styles.tableScroll}>
          <Table
            stickyHeader
            data={data.sample}
            getRowKey={(_, i) => i}
            columns={[
              { key: "usia", header: "Usia", mono: true, align: "right" },
              { key: "status_pekerjaan", header: "Pekerjaan" },
              { key: "skor_kredit", header: "Skor", mono: true, align: "right" },
              { key: "tipe_produk", header: "Produk" },
              { key: "tujuan_pinjaman", header: "Tujuan" },
              {
                key: "jumlah_pinjaman",
                header: "Pinjaman",
                align: "right",
                mono: true,
                render: (r) => formatIDR(r.jumlah_pinjaman, { compact: true }),
              },
              { key: "tenor_bulan", header: "Tenor", mono: true, align: "right", render: (r) => `${r.tenor_bulan} bln` },
              { key: "jaminan", header: "Jaminan" },
              {
                key: "probabilitas_layak",
                header: "Prob.",
                align: "right",
                mono: true,
                render: (r) => formatPercent(r.probabilitas_layak),
              },
              {
                key: "keputusan",
                header: "Keputusan",
                align: "center",
                render: (r) => <DecisionBadge keputusan={r.keputusan} size="sm" />,
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}
