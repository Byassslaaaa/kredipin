import { Card } from "@/components/ui";
import { BarChart } from "@/components/charts";
import { getChartColors } from "@/components/charts/chartTheme";

/**
 * CategoryDistribution — kartu distribusi sebuah fitur kategorikal,
 * dipisah menurut keputusan (Layak vs Tidak Layak) sebagai bar bertumpuk horizontal.
 *
 * Props:
 * - title, subtitle, icon
 * - items: Array<{ value, total, layak, tidakLayak }>
 * - formatValue?: (value) => string  (format label kategori)
 */
export default function CategoryDistribution({ title, subtitle, icon, items, formatValue }) {
  const colors = getChartColors();
  const labels = items.map((it) => (formatValue ? formatValue(it.value) : String(it.value)));
  const height = Math.max(180, items.length * 46 + 48);

  return (
    <Card title={title} subtitle={subtitle} icon={icon}>
      <BarChart
        labels={labels}
        datasets={[
          { label: "Layak", data: items.map((it) => it.layak), color: colors.success },
          { label: "Tidak Layak", data: items.map((it) => it.tidakLayak), color: colors.danger },
        ]}
        horizontal
        stacked
        legend
        height={height}
      />
    </Card>
  );
}
