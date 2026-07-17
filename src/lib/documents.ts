export function formatAmount(amountCents: number | null, currency: string) {
  if (amountCents === null) return null;
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amountCents / 100);
}

export function isOverdue(doc: { dueDate: Date | null; paymentStatus: string }) {
  return doc.paymentStatus === "unpaid" && doc.dueDate !== null && doc.dueDate < new Date();
}

export const dueDateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
