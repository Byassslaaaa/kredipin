import { useState } from "react";
import { useToast } from "@/components/ui";
import usePredict from "@/hooks/usePredict";
import useNasabahForm from "@/features/analisis-nasabah/useNasabahForm";
import NasabahForm from "@/features/analisis-nasabah/components/NasabahForm";
import HasilPrediksi from "@/features/analisis-nasabah/components/HasilPrediksi";
import styles from "./AnalisisNasabah.module.css";

export default function AnalisisNasabah() {
  const form = useNasabahForm();
  const { data, loading, error, predict } = usePredict();
  const toast = useToast();
  const [threshold, setThreshold] = useState(0.5);

  const handleSubmit = async () => {
    if (!form.validate()) {
      toast.error("Data belum lengkap", "Periksa kembali field yang ditandai merah.");
      return;
    }
    try {
      const payload = { ...form.getPayload(), threshold };
      const result = await predict(payload);
      if (result) {
        toast.success(
          `Keputusan: ${result.keputusan}`,
          `Probabilitas layak ${(result.probabilitas_layak * 100).toFixed(1)}%.`,
        );
      }
    } catch (err) {
      toast.error("Prediksi gagal", err?.message);
    }
  };

  return (
    <div className={styles.layout}>
      <div className={styles.formCol}>
        <NasabahForm
          values={form.values}
          errors={form.errors}
          setField={form.setField}
          onSubmit={handleSubmit}
          onFillExample={form.fillExample}
          onAutoRatios={form.autoCalcRatios}
          onReset={form.reset}
          threshold={threshold}
          onThresholdChange={setThreshold}
          loading={loading}
        />
      </div>
      <aside className={styles.resultCol}>
        <HasilPrediksi data={data} loading={loading} error={error} />
      </aside>
    </div>
  );
}
