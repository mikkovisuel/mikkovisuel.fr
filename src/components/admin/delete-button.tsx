"use client";

export function DeleteButton({
  action,
  confirmMessage,
  label = "Supprimer",
  className = "text-sm text-ink-muted transition-colors hover:text-danger",
}: {
  action: () => Promise<void>;
  confirmMessage: string;
  label?: string;
  className?: string;
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
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
