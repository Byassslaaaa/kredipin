/**
 * dashboardService — memuat data analitik statis dari public/data/.
 *
 * Data ini hasil pra-proses build-time (lihat scripts/prepare-data.mjs); backend
 * TIDAK menyajikannya. Diakses lewat fetch sebagai aset statis Vite.
 */

const BASE = `${import.meta.env.BASE_URL}data/`;

async function getJson(file, { signal } = {}) {
  const res = await fetch(`${BASE}${file}`, { signal });
  if (!res.ok) {
    throw new Error(`Gagal memuat data analitik (${file}): ${res.status}`);
  }
  return res.json();
}

export const getSummary = (opts) => getJson("summary.json", opts);
export const getAnalitikKpi = (opts) => getJson("analitik_kpi.json", opts);
export const getAnalitikBisnis = (opts) => getJson("analitik_bisnis.json", opts);
export const getModelInfo = (opts) => getJson("model_info.json", opts);
export const getFeatureImportance = (opts) => getJson("feature_importance.json", opts);
export const getEksplorasi = (opts) => getJson("eksplorasi.json", opts);
