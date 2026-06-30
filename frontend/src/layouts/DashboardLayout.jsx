import { Suspense, useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import PageLoader from "@/components/common/PageLoader";
import useTheme from "@/hooks/useTheme";
import { getPageMeta } from "@/constants/pageMeta";
import styles from "./DashboardLayout.module.css";

/**
 * DashboardLayout — kerangka utama aplikasi (gaya dashboard SaaS).
 *
 * Komposisi: Sidebar (kiri) + Topbar (atas) + area konten (<Outlet />).
 * Mengelola state drawer sidebar untuk mobile dan tema light/dark.
 */
export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const meta = getPageMeta(location.pathname);

  // Tutup drawer otomatis saat pindah halaman (mobile).
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles.shell}>
      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} />

      {/* Overlay gelap saat drawer terbuka di mobile */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className={styles.main}>
        <Topbar
          title={meta.title}
          subtitle={meta.subtitle}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <main className={styles.content}>
          <div className={styles.contentInner}>
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
