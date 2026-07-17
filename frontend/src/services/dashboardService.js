/**
 * dashboardService — memuat data analitik statis dari public/data/.
 *
 * Data ini hasil pra-proses build-time (lihat scripts/prepare-data.mjs); backend
 * TIDAK menyajikannya. Diakses lewat fetch sebagai aset statis Vite.
 */

import apiClient from "./apiClient";

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
/** Tahapan + output eksekusi asli notebook Google Colab (SIAB_DASD.ipynb). */
export const getPipeline = (opts) => getJson("pipeline.json", opts);

/** Kebijakan ambang yang berlaku (semua peran boleh membaca). */
export const getKebijakanAmbang = () => apiClient.get("/kebijakan/ambang").then((r) => r.data);

/** Ubah ambang kebijakan — khusus admin (backend menolak 403 selain admin). */
export const putKebijakanAmbang = (ambang) =>
  apiClient.put("/kebijakan/ambang", { ambang }).then((r) => r.data);

/** Kelola pengguna — seluruhnya khusus admin (backend menolak 403 selain admin). */
export const getUsers = () => apiClient.get("/users").then((r) => r.data);
export const createUser = (data) => apiClient.post("/users", data).then((r) => r.data);
export const updateUser = (id, data) => apiClient.patch(`/users/${id}`, data).then((r) => r.data);

/** Jejak audit tindakan istimewa — khusus admin, hanya baca. */
export const getAudit = (limit = 50) =>
  apiClient.get(`/audit?limit=${limit}`).then((r) => r.data);
