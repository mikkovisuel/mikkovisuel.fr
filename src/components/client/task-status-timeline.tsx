import { Check, Warning } from "@phosphor-icons/react/dist/ssr";
import { TASK_PROGRESS_STEPS, taskProgressStates } from "@/lib/tasks";
import { TASK_STATUS } from "@/lib/dropdown-lists";

export function TaskStatusTimeline({
  statusSlug,
  refusalReason,
}: {
  statusSlug: string;
  refusalReason?: string | null;
}) {
  const states = taskProgressStates(statusSlug);

  return (
    <div>
      <div className="flex items-start">
        {TASK_PROGRESS_STEPS.map((step, index) => {
          const state = states[index];
          const isLast = index === TASK_PROGRESS_STEPS.length - 1;

          return (
            <div key={step.key} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
              <div className="flex flex-col items-center gap-1.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-medium ${
                    state === "done"
                      ? "border-accent bg-accent text-accent-ink"
                      : state === "current"
                        ? "border-accent text-accent"
                        : state === "warning"
                          ? "border-danger text-danger"
                          : "border-line text-ink-muted"
                  }`}
                >
                  {state === "done" ? (
                    <Check size={13} weight="bold" />
                  ) : state === "warning" ? (
                    <Warning size={13} weight="bold" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={`whitespace-nowrap text-[11px] ${
                    state === "upcoming" ? "text-ink-muted" : state === "warning" ? "text-danger" : "text-ink"
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <span className={`mx-1 h-px flex-1 ${state === "done" ? "bg-accent" : "bg-line"}`} />
              )}
            </div>
          );
        })}
      </div>
      {statusSlug === TASK_STATUS.A_MODIFIER && refusalReason && (
        <p className="mt-2 text-xs text-danger">Motif : {refusalReason}</p>
      )}
    </div>
  );
}
