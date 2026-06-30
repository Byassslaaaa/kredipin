/**
 * prepare-data.mjs — pipeline data dashboard (build-time, reproducible).
 *
 * Mengubah artefak analitik (hasil Tahap 1, READ-ONLY) menjadi JSON ringan di
 * `public/data/` agar dikonsumsi frontend sebagai aset statis. Backend TIDAK
 * menyajikan data ini, jadi disiapkan di sisi build.
 *
 * Sumber (relatif terhadap root repo):
 *   - krediPin/dashboard_data/summary.json
 *   - krediPin/dashboard_data/analitik_kpi.csv
 *   - krediPin/dashboard_data/analitik_bisnis.csv
 *   - krediPin/hasil_evaluasi/feature_importance_gain.csv
 *   - KrediPin_backend/model/selected_model_info.json
 *
 * Jalankan: npm run prepare-data
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND = resolve(__dirname, "..");
const REPO = resolve(FRONTEND, "..");
const OUT = resolve(FRONTEND, "public", "data");

/** Parser CSV sederhana (tanpa koma di dalam nilai). Angka dikonversi ke number. */
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  return lines.slice(1).map((line) => {
    const cells = line.split(",");
    const row = {};
    headers.forEach((h, i) => {
      const raw = cells[i];
      const num = Number(raw);
      row[h] = raw !== "" && !Number.isNaN(num) ? num : raw;
    });
    return row;
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf-8"));
}

/** Baca JSON yang mungkin mengandung literal NaN/Infinity (hasil dump Python). */
function readJsonLoose(path) {
  const text = readFileSync(path, "utf-8")
    .replace(/\bNaN\b/g, "null")
    .replace(/-?\bInfinity\b/g, "null");
  return JSON.parse(text);
}

function readCsv(path) {
  return parseCsv(readFileSync(path, "utf-8"));
}

function writeOut(name, data) {
  writeFileSync(resolve(OUT, name), JSON.stringify(data, null, 2), "utf-8");
  console.log(`  ✓ public/data/${name}`);
}

function safe(label, fn) {
  try {
    fn();
  } catch (err) {
    console.warn(`  ⚠ Lewati ${label}: ${err.message}`);
  }
}

/**
 * Agregasi prediksi_lengkap.csv (50K) menjadi JSON ringan untuk halaman Eksplorasi:
 * distribusi kategori (dipisah keputusan), histogram skor kredit, dan sampel baris.
 * Mencegah pengiriman 8MB CSV mentah ke browser.
 */
function aggregateEksplorasi(rows) {
  const total = rows.length;
  let totalLayak = 0;
  let sumProb = 0;

  const CATS = ["status_pekerjaan", "tipe_produk", "tujuan_pinjaman", "jaminan", "tenor_bulan"];
  const cat = {};
  CATS.forEach((c) => (cat[c] = {}));

  // Histogram skor kredit: bin 50 dari 300..900.
  const BIN = 50;
  const MIN = 300;
  const MAX = 900;
  const nBins = Math.ceil((MAX - MIN) / BIN);
  const hist = Array.from({ length: nBins }, (_, i) => ({
    bin: `${MIN + i * BIN}–${MIN + (i + 1) * BIN - 1}`,
    layak: 0,
    tidakLayak: 0,
  }));

  for (const r of rows) {
    const layak = r.keputusan === "Layak";
    if (layak) totalLayak += 1;
    sumProb += Number(r.probabilitas_layak) || 0;

    for (const c of CATS) {
      const key = String(r[c]);
      if (!cat[c][key]) cat[c][key] = { value: r[c], total: 0, layak: 0, tidakLayak: 0 };
      cat[c][key].total += 1;
      cat[c][key][layak ? "layak" : "tidakLayak"] += 1;
    }

    const skor = Number(r.skor_kredit);
    let bi = Math.floor((skor - MIN) / BIN);
    if (bi < 0) bi = 0;
    if (bi >= nBins) bi = nBins - 1;
    hist[bi][layak ? "layak" : "tidakLayak"] += 1;
  }

  // Ubah map kategori menjadi array terurut (desc by total).
  const kategori = {};
  for (const c of CATS) {
    kategori[c] = Object.values(cat[c]).sort((a, b) => b.total - a.total);
  }

  // Sampel deterministik ~200 baris untuk tabel.
  const SAMPLE_COLS = [
    "usia", "status_pekerjaan", "skor_kredit", "tipe_produk", "tujuan_pinjaman",
    "jumlah_pinjaman", "suku_bunga", "tenor_bulan", "jaminan", "probabilitas_layak", "keputusan",
  ];
  const SAMPLE_N = 200;
  const step = Math.max(1, Math.floor(total / SAMPLE_N));
  const sample = [];
  for (let i = 0; i < total && sample.length < SAMPLE_N; i += step) {
    const r = rows[i];
    const row = {};
    for (const k of SAMPLE_COLS) row[k] = r[k];
    sample.push(row);
  }

  return {
    total,
    totalLayak,
    totalTidakLayak: total - totalLayak,
    avgProbabilitas: total ? sumProb / total : 0,
    kategori,
    skorKreditHistogram: hist,
    sample,
  };
}

function main() {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });
  console.log("Menyiapkan data dashboard ke public/data/ ...");

  safe("summary.json", () => {
    const summary = readJson(resolve(REPO, "krediPin/dashboard_data/summary.json"));
    writeOut("summary.json", summary);
  });

  safe("analitik_kpi.json", () => {
    const kpi = readCsv(resolve(REPO, "krediPin/dashboard_data/analitik_kpi.csv"));
    writeOut("analitik_kpi.json", kpi);
  });

  safe("analitik_bisnis.json", () => {
    const bisnis = readCsv(resolve(REPO, "krediPin/dashboard_data/analitik_bisnis.csv"));
    writeOut("analitik_bisnis.json", bisnis);
  });

  safe("model_info.json", () => {
    const info = readJsonLoose(resolve(REPO, "KrediPin_backend/model/selected_model_info.json"));
    writeOut("model_info.json", info);
  });

  safe("feature_importance.json", () => {
    // Permutation importance: teragregasi ke fitur asal & lebih robust untuk
    // interpretabilitas (dibanding gain yang bias ke fitur kardinalitas tinggi).
    const perm = readCsv(resolve(REPO, "krediPin/hasil_evaluasi/feature_importance_permutation.csv"))
      .map((r) => ({ fitur: r.fitur, importance: r.perm_importance }))
      .filter((r) => typeof r.importance === "number")
      .sort((a, b) => b.importance - a.importance);
    writeOut("feature_importance.json", perm);
  });

  safe("eksplorasi.json", () => {
    const rows = readCsv(resolve(REPO, "krediPin/dashboard_data/prediksi_lengkap.csv"));
    writeOut("eksplorasi.json", aggregateEksplorasi(rows));
  });

  console.log("Selesai.");
}

main();
