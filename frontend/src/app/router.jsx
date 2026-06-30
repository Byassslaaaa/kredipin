import { lazy } from "react";
import { createBrowserRouter } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ROUTES } from "@/constants/navigation";

// Code-splitting: tiap halaman dimuat sebagai chunk terpisah (lazy) agar bundle
// awal ramping. Fallback ditangani Suspense pada DashboardLayout.
const Beranda = lazy(() => import("@/pages/Beranda"));
const AnalisisNasabah = lazy(() => import("@/pages/AnalisisNasabah"));
const ImportData = lazy(() => import("@/pages/ImportData"));
const EksplorasiData = lazy(() => import("@/pages/EksplorasiData"));
const PerformaModel = lazy(() => import("@/pages/PerformaModel"));
const Riwayat = lazy(() => import("@/pages/Riwayat"));
const Dokumentasi = lazy(() => import("@/pages/Dokumentasi"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const UIShowcase = lazy(() => import("@/pages/_dev/UIShowcase"));
const ApiDemo = lazy(() => import("@/pages/_dev/ApiDemo"));

/**
 * Definisi routing aplikasi. Seluruh halaman berada di dalam DashboardLayout.
 */
export const router = createBrowserRouter([
  {
    path: ROUTES.beranda,
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Beranda /> },
      { path: ROUTES.analisis, element: <AnalisisNasabah /> },
      { path: ROUTES.importData, element: <ImportData /> },
      { path: ROUTES.eksplorasi, element: <EksplorasiData /> },
      { path: ROUTES.performa, element: <PerformaModel /> },
      { path: ROUTES.riwayat, element: <Riwayat /> },
      { path: ROUTES.dokumentasi, element: <Dokumentasi /> },
      { path: "dev/ui", element: <UIShowcase /> },
      { path: "dev/api", element: <ApiDemo /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
