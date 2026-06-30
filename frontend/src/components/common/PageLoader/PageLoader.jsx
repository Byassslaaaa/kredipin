import Spinner from "@/components/ui/Spinner";
import styles from "./PageLoader.module.css";

/** PageLoader — fallback Suspense saat halaman (lazy chunk) sedang dimuat. */
export default function PageLoader() {
  return (
    <div className={styles.wrap}>
      <Spinner size={32} label="Memuat halaman…" />
    </div>
  );
}
