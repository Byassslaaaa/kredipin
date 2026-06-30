/**
 * Registrasi elemen Chart.js yang dipakai aplikasi — cukup diimpor SEKALI.
 * Memakai registrasi selektif (bukan chart.js/auto) agar bundle lebih ramping.
 */
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";

let registered = false;

export function ensureChartsRegistered() {
  if (registered) return;
  Chart.register(
    ArcElement,
    BarElement,
    LineElement,
    PointElement,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
    Legend,
  );
  registered = true;
}
