import { useEffect, useState } from "react";

/**
 * useResource — muat satu sumber async sekali saat mount (abortable).
 * Cocok untuk aset statis JSON (eksplorasi, performa model, dll).
 *
 * @param {(opts:{signal:AbortSignal})=>Promise<any>} fetcher  fungsi pengambil data (stabil).
 * @returns { data, loading, error }
 */
export default function useResource(fetcher) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    fetcher({ signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ data: null, loading: false, error });
      });

    return () => controller.abort();
  }, [fetcher]);

  return state;
}
