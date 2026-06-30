import { useCallback, useEffect, useRef, useState } from "react";
import { postPredict } from "@/services/predictService";

/**
 * usePredict — prediksi kelayakan untuk SATU pengajuan (fitur inti #1).
 *
 * @returns {
 *   data,            // PredictResponse | null
 *   loading,         // boolean
 *   error,           // ApiError | null
 *   predict(payload),// jalankan prediksi; mengembalikan hasil atau melempar
 *   reset()          // bersihkan state
 * }
 */
export default function usePredict() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const predict = useCallback(async (payload) => {
    // Batalkan permintaan sebelumnya yang masih berjalan.
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await postPredict(payload, { signal: controller.signal });
      setData(result);
      return result;
    } catch (err) {
      if (err?.name !== "CanceledError") {
        setError(err);
        throw err;
      }
      return null;
    } finally {
      if (controllerRef.current === controller) {
        setLoading(false);
        controllerRef.current = null;
      }
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  // Bersih-bersih saat unmount.
  useEffect(() => () => controllerRef.current?.abort(), []);

  return { data, loading, error, predict, reset };
}
