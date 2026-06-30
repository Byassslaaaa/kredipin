import { useCallback, useEffect, useRef, useState } from "react";
import { postPredict } from "@/services/predictService";

const INITIAL_PROGRESS = { done: 0, total: 0, ok: 0, failed: 0 };

/**
 * useBatchPredict — prediksi BANYAK pengajuan (fitur inti #2).
 *
 * Sesuai CLAUDE.md §4: batch = MENGULANG endpoint `POST /predict` yang sudah ada
 * dari sisi klien (BUKAN endpoint baru). Iterasi dijalankan dengan *pool*
 * konkurensi terbatas agar server tidak kebanjiran, lengkap dengan progress
 * dan kemampuan membatalkan.
 *
 * API:
 *   run(payloads, { threshold, concurrency = 4 })  -> Promise (selesai/cancel)
 *   cancel()
 *   reset()
 *
 * State:
 *   status: "idle" | "running" | "done" | "cancelled"
 *   progress: { done, total, ok, failed }
 *   results: Array<{ index, ok, input, result?, error? }>  (terurut sesuai input)
 *   summary: { layak, tidakLayak, gagal, avgProbabilitas } | null
 */
export default function useBatchPredict() {
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(INITIAL_PROGRESS);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState(null);

  const controllerRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setProgress(INITIAL_PROGRESS);
    setResults([]);
    setSummary(null);
  }, []);

  const computeSummary = useCallback((rows) => {
    let layak = 0;
    let tidakLayak = 0;
    let gagal = 0;
    let sumProb = 0;
    let okCount = 0;
    for (const r of rows) {
      if (!r) continue;
      if (r.ok) {
        okCount += 1;
        sumProb += r.result.probabilitas_layak;
        if (r.result.keputusan === "Layak") layak += 1;
        else tidakLayak += 1;
      } else {
        gagal += 1;
      }
    }
    return {
      layak,
      tidakLayak,
      gagal,
      avgProbabilitas: okCount ? sumProb / okCount : 0,
    };
  }, []);

  const run = useCallback(
    async (payloads, { threshold, concurrency = 4 } = {}) => {
      const total = payloads.length;
      const controller = new AbortController();
      controllerRef.current = controller;

      const buffer = new Array(total).fill(null);
      const counters = { done: 0, ok: 0, failed: 0 };

      setStatus("running");
      setProgress({ ...INITIAL_PROGRESS, total });
      setResults([]);
      setSummary(null);

      let cursor = 0;
      let lastFlush = 0;

      const flushResults = (force = false) => {
        // Throttle pembaruan tabel hasil agar tidak terlalu sering re-render.
        if (force || counters.done - lastFlush >= 10) {
          lastFlush = counters.done;
          if (mountedRef.current) setResults(buffer.slice());
        }
      };

      const worker = async () => {
        while (!controller.signal.aborted) {
          const index = cursor;
          cursor += 1;
          if (index >= total) return;

          const body =
            threshold != null ? { ...payloads[index], threshold } : payloads[index];

          try {
            const result = await postPredict(body, { signal: controller.signal });
            buffer[index] = { index, ok: true, input: payloads[index], result };
            counters.ok += 1;
          } catch (err) {
            if (err?.name === "CanceledError") return;
            buffer[index] = { index, ok: false, input: payloads[index], error: err };
            counters.failed += 1;
          }

          counters.done += 1;
          if (mountedRef.current) {
            setProgress({ done: counters.done, total, ok: counters.ok, failed: counters.failed });
          }
          flushResults();
        }
      };

      const poolSize = Math.max(1, Math.min(concurrency, total || 1));
      await Promise.all(Array.from({ length: poolSize }, () => worker()));

      flushResults(true);
      const finalSummary = computeSummary(buffer);
      if (mountedRef.current) {
        setSummary(finalSummary);
        setStatus(controller.signal.aborted ? "cancelled" : "done");
      }
      if (controllerRef.current === controller) controllerRef.current = null;

      return { results: buffer, summary: finalSummary, cancelled: controller.signal.aborted };
    },
    [computeSummary],
  );

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
  }, []);

  return { status, progress, results, summary, run, cancel, reset };
}
