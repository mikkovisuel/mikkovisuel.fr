"use client";

export function DeleteButton({
  action,
  confirmMessage,
  label = "Supprimer",
  className = "text-sm text-ink-muted transition-colors hover:text-danger",
  icon,
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  className?: string;
  /** Rendu à la place de `label` (ex. bouton icône seule des lignes de
   * document, 2026-07-31) — `label` reste alors utilisé comme
   * `aria-label`/`title` pour ne pas perdre le nom accessible. */
  icon?: React.ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className={className}
        aria-label={icon ? label : undefined}
        title={icon ? label : undefined}
      >
        {icon ?? label}
      </button>
    </form>
  );
}
