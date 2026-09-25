"use client";

import { useActionState, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { useFormSubmit } from "@/lib/use-form-submit";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS, WEEKDAY_LABELS } from "@/lib/social-posts";
import { ROUTINE_CADENCES, MONTH_WEEKS } from "@/lib/social-routines";
import type { SocialRoutineFormState } from "@/lib/validation/social-routines";

// Formulaires de la programmation récurrente (2026-09-25). Tous passent par
// useFormSubmit : une erreur ne vide jamais la saisie.

type Action = (state: SocialRoutineFormState, formData: FormData) => Promise<SocialRoutineFormState>;

const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-xs text-ink-muted";
const SUBMIT =
  "rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60";
const CHECKBOX = "h-4 w-4 accent-[var(--color-accent)]";

function Feedback({
  state,
  pending,
  savedLabel,
}: {
  state: SocialRoutineFormState;
  pending: boolean;
  savedLabel: string;
}) {
  if (state?.error) {
    return (
      <span className="flex items-center gap-1 text-sm text-danger">
        <WarningCircle size={16} weight="fill" />
        {state.error}
      </span>
    );
  }
  if (state?.saved && !pending) {
    return (
      <span className="flex items-center gap-1 text-sm text-ink-muted">
        <CheckCircle size={16} weight="fill" className="text-accent" />
        {savedLabel}
      </span>
    );
  }
  return null;
}

export interface RoutineFormValues {
  title: string;
  cadence: string;
  weekdays: number[];
  monthDay: number | null;
  monthWeek: number | null;
  monthWeekday: number | null;
  time: string;
  activeFrom: string;
  activeUntil: string;
  createsReminder: boolean;
  createsDraft: boolean;
  createsTask: boolean;
  createsAction: boolean;
  leadDays: number;
  networks: string[];
  format: string;
  categoryId: string;
  captionTemplate: string;
  hashtags: string;
  taskTypeSlug: string;
  taskLeadDays: number | null;
  taskBrief: string;
  actionLeadDays: number | null;
  actionBrief: string;
}

const EMPTY: RoutineFormValues = {
  title: "",
  cadence: "weekly",
  weekdays: [4],
  monthDay: 1,
  monthWeek: 1,
  monthWeekday: 1,
  time: "18:00",
  activeFrom: "",
  activeUntil: "",
  createsReminder: true,
  createsDraft: false,
  createsTask: false,
  createsAction: false,
  leadDays: 3,
  networks: ["instagram"],
  format: "post",
  categoryId: "",
  captionTemplate: "",
  hashtags: "",
  taskTypeSlug: "",
  taskLeadDays: 2,
  taskBrief: "",
  actionLeadDays: 0,
  actionBrief: "",
};

export function RoutineForm({
  action,
  categories,
  taskTypes,
  hasClient,
  defaultValues,
  submitLabel = "Ajouter la routine",
  savedLabel = "Routine ajoutée",
  resetOnSuccess = true,
}: {
  action: Action;
  categories: { id: string; label: string }[];
  taskTypes: { slug: string; label: string }[];
  /** Une routine sans client alimente le pense-bête au lieu des tâches. */
  hasClient: boolean;
  defaultValues?: Partial<RoutineFormValues>;
  submitLabel?: string;
  savedLabel?: string;
  resetOnSuccess?: boolean;
}) {
  const values = { ...EMPTY, ...defaultValues };
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess });
  const [cadence, setCadence] = useState(values.cadence);
  const [createsDraft, setCreatesDraft] = useState(values.createsDraft);
  const [createsTask, setCreatesTask] = useState(values.createsTask);
  const [createsAction, setCreatesAction] = useState(values.createsAction);

  const needsWeekdays = cadence === "weekly" || cadence === "biweekly";

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-4">
      <input
        name="title"
        required
        maxLength={160}
        defaultValue={values.title}
        placeholder="Ex. Flyer de la soirée du samedi"
        aria-label="Titre de la routine"
        className={INPUT}
      />

      {/* --- Quand ------------------------------------------------------ */}
      <fieldset className="grid gap-3 rounded-xl border border-line p-3">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">Quand</legend>
        <div className="flex flex-wrap gap-3">
          <label className={`grid gap-1 ${LABEL}`}>
            Cadence
            <select
              name="cadence"
              value={cadence}
              onChange={(event) => setCadence(event.target.value)}
              className={INPUT}
            >
              {ROUTINE_CADENCES.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className={`grid gap-1 ${LABEL}`}>
            Heure (Paris)
            <input name="time" type="time" required defaultValue={values.time} className={INPUT} />
          </label>
          {cadence === "monthly_day" && (
            <label className={`grid gap-1 ${LABEL}`}>
              Jour du mois
              <input
                name="monthDay"
                type="number"
                min={1}
                max={31}
                defaultValue={values.monthDay ?? 1}
                className={`${INPUT} w-24`}
              />
            </label>
          )}
          {cadence === "monthly_weekday" && (
            <>
              <label className={`grid gap-1 ${LABEL}`}>
                Semaine
                <select name="monthWeek" defaultValue={String(values.monthWeek ?? 1)} className={INPUT}>
                  {MONTH_WEEKS.map((week) => (
                    <option key={week.value} value={week.value}>
                      {week.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={`grid gap-1 ${LABEL}`}>
                Jour
                <select name="monthWeekday" defaultValue={String(values.monthWeekday ?? 1)} className={INPUT}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <option key={label} value={index + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>

        {needsWeekdays && (
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => (
              <label
                key={label}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink"
              >
                <input
                  type="checkbox"
                  name="weekdays"
                  value={index + 1}
                  defaultChecked={values.weekdays.includes(index + 1)}
                  className="sr-only"
                />
                {label.slice(0, 3)}
              </label>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <label className={`grid gap-1 ${LABEL}`}>
            À partir du (facultatif)
            <input name="activeFrom" type="date" defaultValue={values.activeFrom} className={INPUT} />
          </label>
          <label className={`grid gap-1 ${LABEL}`}>
            Jusqu&apos;au (facultatif)
            <input name="activeUntil" type="date" defaultValue={values.activeUntil} className={INPUT} />
          </label>
          <label className={`grid gap-1 ${LABEL}`}>
            Avance (jours)
            <input
              name="leadDays"
              type="number"
              min={0}
              max={60}
              required
              defaultValue={values.leadDays}
              className={`${INPUT} w-24`}
            />
          </label>
        </div>
        <p className="text-xs text-ink-muted">
          L&apos;avance est le délai avant l&apos;occurrence : rappel envoyé et brouillon ou tâche créés à ce
          moment-là.
        </p>
      </fieldset>

      {/* --- Ce que ça produit ------------------------------------------ */}
      <fieldset className="grid gap-3 rounded-xl border border-line p-3">
        <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
          Ce que ça produit
        </legend>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="createsReminder" defaultChecked={values.createsReminder} className={CHECKBOX} />
          Un rappel par email
        </label>
        {hasClient && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              name="createsDraft"
              checked={createsDraft}
              onChange={(event) => setCreatesDraft(event.target.checked)}
              className={CHECKBOX}
            />
            Un brouillon de publication, déjà daté
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="createsTask"
            checked={createsTask}
            onChange={(event) => setCreatesTask(event.target.checked)}
            className={CHECKBOX}
          />
          {hasClient ? "Une tâche de travail (interne)" : "Une ligne dans le pense-bête"}
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="createsAction"
            checked={createsAction}
            onChange={(event) => setCreatesAction(event.target.checked)}
            className={CHECKBOX}
          />
          Une action à cocher (liste « À faire »)
        </label>
      </fieldset>

      {createsAction && (
        <fieldset className="grid gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Action à cocher
          </legend>
          <label className={`grid gap-1 ${LABEL}`}>
            Posée (jours avant l&apos;occurrence)
            <input
              name="actionLeadDays"
              type="number"
              min={0}
              max={120}
              defaultValue={values.actionLeadDays ?? 0}
              className={`${INPUT} w-28`}
            />
          </label>
          <textarea
            name="actionBrief"
            rows={2}
            defaultValue={values.actionBrief}
            placeholder="Description de l'action (facultatif)"
            className={`${INPUT} resize-y`}
          />
        </fieldset>
      )}

      {/* --- Contenu du brouillon --------------------------------------- */}
      {hasClient && createsDraft && (
        <fieldset className="grid gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Contenu du brouillon
          </legend>
          <div className="flex flex-wrap gap-2">
            {SOCIAL_NETWORKS.map((network) => (
              <label
                key={network.slug}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink"
              >
                <input
                  type="checkbox"
                  name="networks"
                  value={network.slug}
                  defaultChecked={values.networks.includes(network.slug)}
                  className="sr-only"
                />
                {network.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <label className={`grid gap-1 ${LABEL}`}>
              Format
              <select name="format" defaultValue={values.format} className={INPUT}>
                {SOCIAL_FORMATS.map((format) => (
                  <option key={format.slug} value={format.slug}>
                    {format.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`grid gap-1 ${LABEL}`}>
              Catégorie
              <select name="categoryId" defaultValue={values.categoryId} className={INPUT}>
                <option value="">Aucune</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <textarea
            name="captionTemplate"
            rows={3}
            defaultValue={values.captionTemplate}
            placeholder="Texte de départ (facultatif). Variables : {client}, {date}"
            className={`${INPUT} resize-y`}
          />
          <input
            name="hashtags"
            defaultValue={values.hashtags}
            placeholder="#hashtags par défaut (facultatif)"
            className={INPUT}
          />
        </fieldset>
      )}

      {/* --- Tâche de travail ------------------------------------------- */}
      {hasClient && createsTask && (
        <fieldset className="grid gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Tâche de travail
          </legend>
          <div className="flex flex-wrap gap-3">
            <label className={`grid gap-1 ${LABEL}`}>
              Type de création
              <select name="taskTypeSlug" defaultValue={values.taskTypeSlug} className={INPUT}>
                <option value="">Choisir</option>
                {taskTypes.map((type) => (
                  <option key={type.slug} value={type.slug}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={`grid gap-1 ${LABEL}`}>
              Échéance (jours avant)
              <input
                name="taskLeadDays"
                type="number"
                min={0}
                max={120}
                defaultValue={values.taskLeadDays ?? 2}
                className={`${INPUT} w-28`}
              />
            </label>
          </div>
          <textarea
            name="taskBrief"
            rows={2}
            defaultValue={values.taskBrief}
            placeholder="Brief type de la tâche (facultatif)"
            className={`${INPUT} resize-y`}
          />
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Enregistrement..." : submitLabel}
        </button>
        <Feedback state={state} pending={pending} savedLabel={savedLabel} />
      </div>
    </form>
  );
}

export function RoutineSetForm({
  action,
  placeholder,
  submitLabel,
  defaultValue = "",
}: {
  action: Action;
  placeholder: string;
  submitLabel: string;
  defaultValue?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess: !defaultValue });
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input
        name="name"
        required
        maxLength={120}
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${INPUT} min-w-0 flex-1`}
      />
      <button type="submit" disabled={pending} className={SUBMIT}>
        {pending ? "..." : submitLabel}
      </button>
      <Feedback state={state} pending={pending} savedLabel="Enregistré" />
    </form>
  );
}

export function ApplyRoutineTemplateForm({
  action,
  templates,
  clients,
}: {
  action: Action;
  templates: { id: string; name: string; count: number }[];
  clients: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess: true });
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <label className={`grid gap-1 ${LABEL}`}>
          Modèle
          <select name="templateSetId" defaultValue="" required className={INPUT}>
            <option value="" disabled>
              Choisir un modèle
            </option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} ({template.count} routine{template.count > 1 ? "s" : ""})
              </option>
            ))}
          </select>
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Client
          <select name="clientId" defaultValue="" required className={INPUT}>
            <option value="" disabled>
              Choisir un client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Nom (facultatif)
          <input name="name" maxLength={120} placeholder="Nom du calendrier créé" className={INPUT} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Application..." : "Appliquer au client"}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Modèle appliqué" />
      </div>
    </form>
  );
}
