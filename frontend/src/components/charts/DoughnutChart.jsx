import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { ensureChartsRegistered } from "./registerCharts";
import { getChartColors, baseTooltip, FONT_FAMILY } from "./chartTheme";
import styles from "./Chart.module.css";

ensureChartsRegistered();

/**
 * DoughnutChart — chart donat reusable untuk distribusi/komposisi.
 *
 * Props:
 * - labels: string[]
 * - values: number[]
 * - colors?: string[] (override warna seri)
 * - height?: number (px)
 * - legend?: boolean (default true)
 * - centerLabel?: { value, caption } -> teks di tengah donat
 */
export default function DoughnutChart({
  labels,
  values,
  colors,
  height = 240,
  legend = true,
  centerLabel,
}) {
  const palette = getChartColors();
  const seriesColors = colors || palette.series;

  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: seriesColors,
          borderColor: palette.surface,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    }),
    [labels, values, seriesColors, palette.surface],
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: {
          display: legend,
          position: "bottom",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
            color: palette.text,
            font: { family: FONT_FAMILY, size: 13 },
          },
        },
        tooltip: {
          ...baseTooltip(palette),
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return ` ${ctx.label}: ${ctx.parsed.toLocaleString("id-ID")} (${pct}%)`;
            },
          },
        },
      },
    }),
    [legend, palette],
  );

  return (
    <div className={styles.wrap} style={{ height }}>
      <Doughnut data={data} options={options} />
      {centerLabel && (
        <div className={styles.center}>
          <span className={styles.centerValue}>{centerLabel.value}</span>
          {centerLabel.caption && (
            <span className={styles.centerCaption}>{centerLabel.caption}</span>
          )}
        </div>
      )}
    </div>
  );
}
