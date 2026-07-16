import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useChartTheme, baseApexOptions } from "./chartTheme";
import styles from "./Chart.module.css";

/**
 * BarChart — chart batang reusable (vertikal/horizontal, satu atau banyak seri).
 * Ditenagai ApexCharts.
 *
 * Props (TIDAK berubah dari implementasi sebelumnya):
 * - labels: string[]
 * - datasets: Array<{ label, data: number[], color? }>
 * - horizontal?: boolean
 * - height?: number
 * - legend?: boolean
 * - stacked?: boolean
 * - valueFormatter?: (n) => string  (tooltip & sumbu nilai)
 */
export default function BarChart({
  labels,
  datasets,
  horizontal = false,
  height = 280,
  legend = false,
  stacked = false,
  valueFormatter,
}) {
  const { colors, dark } = useChartTheme();

  const fmt = useMemo(
    () => valueFormatter || ((n) => Number(n).toLocaleString("id-ID")),
    [valueFormatter],
  );

  const series = useMemo(
    () => datasets.map((ds) => ({ name: ds.label || "", data: ds.data })),
    [datasets],
  );

  const seriesColors = useMemo(
    () => datasets.map((ds, i) => ds.color || colors.series[i % colors.series.length]),
    [datasets, colors.series],
  );

  const options = useMemo(() => {
    const base = baseApexOptions(colors, dark);
    return {
      ...base,
      chart: { ...base.chart, type: "bar", stacked },
      colors: seriesColors,
      plotOptions: {
        bar: {
          horizontal,
          borderRadius: 6,
          // Sudut membulat hanya di ujung batang agar tetap terbaca saat stacked.
          borderRadiusApplication: "end",
          columnWidth: horizontal ? "70%" : "58%",
          barHeight: "72%",
        },
      },
      xaxis: {
        categories: labels,
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { colors: colors.axis, fontSize: "12px" },
          // Saat horizontal, sumbu-X adalah sumbu NILAI -> perlu diformat.
          formatter: horizontal ? (v) => fmt(v) : undefined,
          // Label kategori panjang (nama fitur) dipangkas agar tidak merusak layout.
          trim: !horizontal,
          hideOverlappingLabels: true,
        },
      },
      yaxis: {
        labels: {
          style: { colors: colors.axis, fontSize: "12px" },
          // Saat vertikal, sumbu-Y adalah sumbu NILAI -> perlu diformat.
          formatter: horizontal ? undefined : (v) => fmt(v),
          maxWidth: horizontal ? 220 : undefined,
        },
      },
      grid: {
        ...base.grid,
        // Garis bantu hanya pada sumbu nilai agar tidak ramai.
        xaxis: { lines: { show: horizontal } },
        yaxis: { lines: { show: !horizontal } },
      },
      legend: { ...base.legend, show: legend, position: "top", horizontalAlign: "right" },
      tooltip: {
        ...base.tooltip,
        shared: false,
        intersect: true,
        y: { formatter: (v) => fmt(v) },
      },
    };
  }, [colors, dark, seriesColors, horizontal, stacked, labels, legend, fmt]);

  return (
    <div className={styles.wrap}>
      <ReactApexChart
        // key memaksa remount saat tema berubah agar warna & grid ikut ter-refresh.
        key={dark ? "dark" : "light"}
        type="bar"
        series={series}
        options={options}
        height={height}
      />
    </div>
  );
}
