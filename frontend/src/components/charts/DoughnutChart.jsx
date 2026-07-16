import { useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { useChartTheme, baseApexOptions } from "./chartTheme";
import styles from "./Chart.module.css";

/**
 * DoughnutChart — chart donat reusable untuk distribusi/komposisi.
 * Ditenagai ApexCharts.
 *
 * Props (TIDAK berubah dari implementasi sebelumnya):
 * - labels: string[]
 * - values: number[]
 * - colors?: string[] (override warna seri)
 * - height?: number
 * - legend?: boolean (default true)
 * - centerLabel?: { value, caption } -> teks di tengah donat
 */
export default function DoughnutChart({
  labels,
  values,
  colors: colorsProp,
  height = 240,
  legend = true,
  centerLabel,
}) {
  const { colors, dark } = useChartTheme();
  const seriesColors = colorsProp || colors.series;

  const options = useMemo(() => {
    const base = baseApexOptions(colors, dark);
    const total = values.reduce((a, b) => a + Number(b || 0), 0);

    return {
      ...base,
      chart: { ...base.chart, type: "donut" },
      labels,
      colors: seriesColors,
      stroke: { width: 2, colors: [colors.surface] },
      plotOptions: {
        pie: {
          expandOnClick: false,
          donut: {
            size: "68%",
            // Label bawaan dimatikan; angka tengah dirender sebagai overlay HTML
            // (centerLabel) agar mewarisi tipografi & token warna aplikasi.
            labels: { show: false },
          },
        },
      },
      legend: { ...base.legend, show: legend, position: "bottom" },
      tooltip: {
        ...base.tooltip,
        y: {
          formatter: (v) => {
            const pct = total ? ((v / total) * 100).toFixed(1) : "0.0";
            return `${Number(v).toLocaleString("id-ID")} (${pct}%)`;
          },
        },
      },
      responsive: [
        {
          breakpoint: 480,
          options: { legend: { position: "bottom" } },
        },
      ],
    };
  }, [colors, dark, labels, seriesColors, legend, values]);

  return (
    <div className={styles.wrap}>
      <ReactApexChart
        key={dark ? "dark" : "light"}
        type="donut"
        series={values}
        options={options}
        height={height}
      />
      {centerLabel && (
        <div className={`${styles.center} ${legend ? styles.centerWithLegend : ""}`}>
          <span className={styles.centerValue}>{centerLabel.value}</span>
          {centerLabel.caption && (
            <span className={styles.centerCaption}>{centerLabel.caption}</span>
          )}
        </div>
      )}
    </div>
  );
}
