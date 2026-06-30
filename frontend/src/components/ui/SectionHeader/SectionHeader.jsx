import styles from "./SectionHeader.module.css";

/**
 * SectionHeader — judul + deskripsi + aksi untuk sebuah bagian/halaman konten.
 * (Judul utama halaman ada di Topbar; ini untuk bagian di dalam konten.)
 */
export default function SectionHeader({ title, description, actions, as = "h2", className = "" }) {
  const Heading = as;
  return (
    <div className={`${styles.header} ${className}`}>
      <div className={styles.text}>
        <Heading className={styles.title}>{title}</Heading>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
