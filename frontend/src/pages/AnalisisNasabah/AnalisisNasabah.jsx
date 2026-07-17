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
      // Ambang TIDAK dikirim: server memakai kebijakan yang berlaku. Inilah
      // yang menjamin dua nasabah identik dinilai dengan ambang yang sama,
      // siapa pun analisnya.
      const payload = form.getPayload();
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
        loading={loading}
        // Hasil kelayakan disajikan sebagai LANGKAH TERAKHIR wizard, bukan
        // panel terpisah — alurnya: isi data -> lihat keputusan.
        hasilSlot={<HasilPrediksi data={data} loading={loading} error={error} />}
      />
    </div>
  );
}
