import { useState } from "react";
import { useToast } from "@/components/ui";
import usePredict from "@/hooks/usePredict";
import { NATIVE_THRESHOLD } from "@/utils/prediction";
import { useAuth } from "@/features/auth/AuthContext";
import useNasabahForm from "@/features/analisis-nasabah/useNasabahForm";
import NasabahForm from "@/features/analisis-nasabah/components/NasabahForm";
import HasilPrediksi from "@/features/analisis-nasabah/components/HasilPrediksi";
import styles from "./AnalisisNasabah.module.css";

export default function AnalisisNasabah() {
  const form = useNasabahForm();
  const { data, loading, error, predict } = usePredict();
  const { user } = useAuth();
  // Ambang = kebijakan risiko; hanya admin yang boleh menggesernya (backend 403).
  const bolehAturAmbang = user?.peran === "admin";
  const toast = useToast();
  const [threshold, setThreshold] = useState(0.5);
  // Ambang mati = keputusan murni XGBoost (patokan native 50%).
  const [ambangAktif, setAmbangAktif] = useState(false);

  /**
   * @returns {boolean} true bila prediksi berhasil — dipakai wizard untuk
   * memutuskan boleh/tidaknya maju ke langkah Hasil.
   */
  const handleSubmit = async () => {
    if (!form.validate()) {
      toast.error("Data belum lengkap", "Periksa kembali field yang ditandai merah.");
      return false;
    }
    try {
      // Analis TIDAK mengirim threshold sama sekali -> backend memakai ambang
      // kebijakan. Mengirimnya akan ditolak 403.
      const payload = { ...form.getPayload() };
      if (bolehAturAmbang && ambangAktif) payload.threshold = threshold;
      const result = await predict(payload);
      if (result) {
        toast.success(
          `Keputusan: ${result.keputusan}`,
          `Probabilitas layak ${(result.probabilitas_layak * 100).toFixed(1)}%.`,
        );
        return true;
      }
      return false;
    } catch (err) {
      toast.error("Prediksi gagal", err?.message);
      return false;
    }
  };

  return (
    <div className={styles.layout}>
      <NasabahForm
        values={form.values}
        errors={form.errors}
        setField={form.setField}
        onSubmit={handleSubmit}
        onFillExample={form.fillExample}
        onAutoRatios={form.autoCalcRatios}
        onReset={form.reset}
        validateGroup={form.validateGroup}
        groupFilled={form.groupFilled}
        threshold={threshold}
        onThresholdChange={setThreshold}
        ambangAktif={ambangAktif}
        onAmbangToggle={setAmbangAktif}
        loading={loading}
        // Hasil kelayakan disajikan sebagai LANGKAH TERAKHIR wizard, bukan
        // panel terpisah — alurnya: isi data -> lihat keputusan.
        hasilSlot={<HasilPrediksi data={data} loading={loading} error={error} />}
      />
    </div>
  );
}
