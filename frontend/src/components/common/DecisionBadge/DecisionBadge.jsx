import Badge from "@/components/ui/Badge";

/**
 * DecisionBadge — lencana keputusan kelayakan yang konsisten di seluruh aplikasi.
 * "Layak" -> hijau (success), selain itu -> merah (danger).
 */
export default function DecisionBadge({ keputusan, size = "md" }) {
  const layak = keputusan === "Layak";
  return (
    <Badge
      variant={layak ? "success" : "danger"}
      icon={layak ? "check-circle" : "x-circle"}
      size={size}
    >
      {keputusan}
    </Badge>
  );
}
