import { useMemo } from "react";
import { Bar } from "react-chartjs-2";
import { ensureChartsRegistered } from "./registerCharts";
import { getChartColors, baseTooltip, FONT_FAMILY } from "./chartTheme";
import styles from "./Chart.module.css";

ensureChartsRegistered();

/**
 * BarChart — chart batang reusable (vertikal/horizontal, satu atau banyak seri).
 *
 * Props:
 * - labels: string[]
 * - datasets: Array<{ label, data: number[], color? }>
 * - horizontal?: boolean (indexAxis 'y')
 * - height?: number
 * - legend?: boolean
 * - stacked?: boolean
 * - valueFormatter?: (n) => string  (tooltip & sumbu)
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
  const palette = getChartColors();

  const data = useMemo(
    () => ({
      labels,
      datasets: datasets.map((ds, i) => ({
        label: ds.label,
        data: ds.data,
        backgroundColor: ds.color || palette.series[i % palette.series.length],
        borderRadius: 6,
        borderSkipped: false,
        maxBarThickness: 42,
      })),
    }),
    [labels, datasets, palette.series],
  );

  const fmt = valueFormatter || ((n) => n.toLocaleString("id-ID"));

  const options = useMemo(
    () => ({
      indexAxis: horizontal ? "y" : "x",
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: legend,
          position: "top",
          align: "end",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            color: palette.text,
            font: { family: FONT_FAMILY, size: 13 },
          },
        },
        tooltip: {
          ...baseTooltip(palette),
          callbacks: {
            label: (ctx) => {
              const v = horizontal ? ctx.parsed.x : ctx.parsed.y;
              return ` ${ctx.dataset.label ? ctx.dataset.label + ": " : ""}${fmt(v)}`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked,
          grid: { display: horizontal, color: palette.grid, drawBorder: false },
          ticks: {
            color: palette.axis,
            font: { family: FONT_FAMILY, size: 12 },
            callback: horizontal ? (v) => fmt(v) : undefined,
          },
        },
        y: {
          stacked,
          grid: { display: !horizontal, color: palette.grid, drawBorder: false },
          ticks: {
            color: palette.axis,
            font: { family: FONT_FAMILY, size: 12 },
            callback: !horizontal ? (v) => fmt(v) : undefined,
          },
        },
      },
    }),
    [horizontal, legend, stacked, palette, fmt],
  );

  return (
    <div className={styles.wrap} style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}
