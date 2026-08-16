// Indicateur visuel payé/en attente (demande du 2026-08-16) — jusqu'ici le
// statut de paiement n'était qu'une mention texte discrète ("· payée" /
// "· en attente de paiement") au milieu d'autres infos, facile à manquer en
// scannant une longue liste. Même pattern que `StatusBadge` (pastille +
// libellé), couleurs volontairement fixes (vert/rouge) plutôt que la
// palette `DropdownItem` : ce n'est pas une liste éditable par l'admin.
export function PaymentStatusBadge({ status }: { status: "paid" | "unpaid" }) {
  const paid = status === "paid";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        paid
          ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
          : "border-danger/30 bg-danger/15 text-danger"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${paid ? "bg-emerald-500" : "bg-danger"}`} />
      {paid ? "Payée" : "En attente"}
    </span>
  );
}
