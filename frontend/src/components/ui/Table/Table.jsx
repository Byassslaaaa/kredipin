import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import styles from "./Table.module.css";

/**
 * Table — tabel data berbasis konfigurasi kolom (data-driven, reusable).
 *
 * Props:
 * - columns: Array<{
 *     key: string,
 *     header: string,
 *     render?: (row, index) => node,   // kustomisasi sel
 *     align?: "left" | "center" | "right",
 *     width?: string,
 *     mono?: boolean                    // gunakan font mono (angka)
 *   }>
 * - data: Array<object>
 * - getRowKey: (row, index) => key   (default index)
 * - loading: tampilkan spinner
 * - emptyTitle / emptyDescription: untuk EmptyState
 * - onRowClick: (row) => void
 * - stickyHeader: header menempel saat scroll
 */
export default function Table({
  columns = [],
  data = [],
  getRowKey,
  loading = false,
  emptyTitle = "Belum ada data",
  emptyDescription,
  emptyIcon = "database",
  onRowClick,
  stickyHeader = false,
  className = "",
}) {
  if (loading) {
    return (
      <div className={styles.stateWrap}>
        <Spinner size={28} label="Memuat data…" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className={`${styles.scroll} ${className}`}>
      <table className={styles.table}>
        <thead className={stickyHeader ? styles.sticky : ""}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={styles[`align_${col.align || "left"}`]}
                style={{ width: col.width }}
                scope="col"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={getRowKey ? getRowKey(row, index) : index}
              className={onRowClick ? styles.clickable : ""}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`${styles[`align_${col.align || "left"}`]} ${
                    col.mono ? "num" : ""
                  }`}
                >
                  {col.render ? col.render(row, index) : row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
