"use client";

import { useActionState, useState } from "react";
import { WarningCircle, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { useFormSubmit } from "@/lib/use-form-submit";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";
import { PLAN_VARIABLES } from "@/lib/social-plans";
import type { SocialPlanFormState } from "@/lib/validation/social-plans";

// Formulaires des plans de communication (2026-09-25).

type Action = (state: SocialPlanFormState, formData: FormData) => Promise<SocialPlanFormState>;

const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-xs text-ink-muted";
const SUBMIT =
  "rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink disabled:opacity-60";
const CHECKBOX = "h-4 w-4 accent-[var(--color-accent)]";

function Feedback({ state, pending, savedLabel }: { state: SocialPlanFormState; pending: boolean; savedLabel: string }) {
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

export function PlanForm({
  action,
  defaultName = "",
  defaultDescription = "",
  submitLabel,
  resetOnSuccess = true,
}: {
  action: Action;
  defaultName?: string;
  defaultDescription?: string;
  submitLabel: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess });
  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-2">
      <input
        name="name"
        required
        maxLength={120}
        defaultValue={defaultName}
        placeholder="Nom du plan (ex. Soirée club)"
        aria-label="Nom du plan"
        className={INPUT}
      />
      <input
        name="description"
        maxLength={1000}
        defaultValue={defaultDescription}
        placeholder="À quoi sert ce plan (facultatif)"
        aria-label="Description du plan"
        className={INPUT}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "..." : submitLabel}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Enregistré" />
      </div>
    </form>
  );
}

export interface PlanStepValues {
  label: string;
  offsetDays: number;
  time: string;
  createsDraft: boolean;
  createsReminder: boolean;
  createsTask: boolean;
  createsAction: boolean;
  remindDaysBefore: number;
  networks: string[];
  format: string;
  categoryId: string;
  titlePattern: string;
  captionTemplate: string;
  hashtags: string;
  taskTypeSlug: string;
  taskLeadDays: number | null;
  taskBrief: string;
  actionLeadDays: number | null;
  actionBrief: string;
}

const EMPTY_STEP: PlanStepValues = {
  label: "",
  offsetDays: -7,
  time: "18:00",
  createsDraft: true,
  createsReminder: true,
  createsTask: false,
  createsAction: false,
  remindDaysBefore: 2,
  networks: ["instagram"],
  format: "post",
  categoryId: "",
  titlePattern: "{etape} — {evenement}",
  captionTemplate: "",
  hashtags: "",
  taskTypeSlug: "",
  taskLeadDays: 2,
  taskBrief: "",
  actionLeadDays: 0,
  actionBrief: "",
};

export function PlanStepForm({
  action,
  categories,
  taskTypes,
  defaultValues,
  submitLabel = "Ajouter l'étape",
  resetOnSuccess = true,
}: {
  action: Action;
  categories: { id: string; label: string }[];
  taskTypes: { slug: string; label: string }[];
  defaultValues?: Partial<PlanStepValues>;
  submitLabel?: string;
  resetOnSuccess?: boolean;
}) {
  const values = { ...EMPTY_STEP, ...defaultValues };
  const [state, formAction, pending] = useActionState(action, undefined);
  const { formRef, onSubmit } = useFormSubmit(formAction, { pending, state, resetOnSuccess });
  const [createsDraft, setCreatesDraft] = useState(values.createsDraft);
  const [createsTask, setCreatesTask] = useState(values.createsTask);
  const [createsAction, setCreatesAction] = useState(values.createsAction);

  return (
    <form ref={formRef} action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <label className={`grid gap-1 ${LABEL}`}>
          Étape
          <input
            name="label"
            required
            maxLength={120}
            defaultValue={values.label}
            placeholder="Ex. Annonce"
            className={INPUT}
          />
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Décalage (jours)
          <input
            name="offsetDays"
            type="number"
            required
            min={-365}
            max={365}
            defaultValue={values.offsetDays}
            className={`${INPUT} w-28`}
          />
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Heure (Paris)
          <input name="time" type="time" required defaultValue={values.time} className={INPUT} />
        </label>
      </div>
      <p className="text-xs text-ink-muted">
        Négatif avant l&apos;évènement (−30 = J-30), positif après (1 = J+1), 0 le jour même.
      </p>

      <div className="grid gap-2 rounded-xl border border-line p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="createsDraft"
            checked={createsDraft}
            onChange={(event) => setCreatesDraft(event.target.checked)}
            className={CHECKBOX}
          />
          Un brouillon de publication
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input type="checkbox" name="createsReminder" defaultChecked={values.createsReminder} className={CHECKBOX} />
          Un rappel par email
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            name="createsTask"
            checked={createsTask}
            onChange={(event) => setCreatesTask(event.target.checked)}
            className={CHECKBOX}
          />
          Une tâche de travail (interne)
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
        <label className={`grid gap-1 ${LABEL}`}>
          Rappel (jours avant l&apos;étape)
          <input
            name="remindDaysBefore"
            type="number"
            min={0}
            max={60}
            defaultValue={values.remindDaysBefore}
            className={`${INPUT} w-28`}
          />
        </label>
      </div>

      <label className={`grid gap-1 ${LABEL}`}>
        Titre produit
        <input
          name="titlePattern"
          required
          maxLength={160}
          defaultValue={values.titlePattern}
          className={INPUT}
        />
      </label>
      <p className="text-xs text-ink-muted">Variables : {PLAN_VARIABLES.join(" ")}</p>

      {createsDraft && (
        <fieldset className="grid gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">Brouillon</legend>
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
            placeholder="Texte de départ (facultatif), avec les mêmes variables"
            className={`${INPUT} resize-y`}
          />
          <input name="hashtags" defaultValue={values.hashtags} placeholder="#hashtags (facultatif)" className={INPUT} />
        </fieldset>
      )}

      {createsAction && (
        <fieldset className="grid gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">
            Action à cocher
          </legend>
          <label className={`grid gap-1 ${LABEL}`}>
            Posée (jours avant l&apos;étape)
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
            placeholder="Description de l'action (facultatif), mêmes variables"
            className={`${INPUT} resize-y`}
          />
        </fieldset>
      )}

      {createsTask && (
        <fieldset className="grid gap-3 rounded-xl border border-line p-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-muted">Tâche de travail</legend>
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
              Échéance (jours avant l&apos;étape)
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
            placeholder="Brief type (facultatif)"
            className={`${INPUT} resize-y`}
          />
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "Enregistrement..." : submitLabel}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Étape enregistrée" />
      </div>
    </form>
  );
}

/** Choix du plan, du client et de l'évènement : mène à l'aperçu. */
export function PlanApplyStartForm({
  plans,
  clients,
  defaultClientId = "",
  defaultEventName = "",
  defaultEventDate = "",
  sourceTaskId,
}: {
  plans: { id: string; name: string; steps: number }[];
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  defaultEventName?: string;
  defaultEventDate?: string;
  sourceTaskId?: string;
}) {
  return (
    <form action="/admin/reseaux/plans/appliquer" method="GET" className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <label className={`grid gap-1 ${LABEL}`}>
          Plan
          <select name="planId" defaultValue="" required className={INPUT}>
            <option value="" disabled>
              Choisir un plan
            </option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} ({plan.steps} étape{plan.steps > 1 ? "s" : ""})
              </option>
            ))}
          </select>
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Client
          <select name="clientId" defaultValue={defaultClientId} required className={INPUT}>
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
          Évènement
          <input
            name="nom"
            required
            maxLength={160}
            defaultValue={defaultEventName}
            placeholder="Ex. Techno Night"
            className={INPUT}
          />
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Date
          <input name="date" type="date" required defaultValue={defaultEventDate} className={INPUT} />
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Lieu (facultatif)
          <input name="lieu" maxLength={160} className={INPUT} />
        </label>
      </div>
      {sourceTaskId && <input type="hidden" name="tacheId" value={sourceTaskId} />}
      <div>
        <button type="submit" className={SUBMIT}>
          Voir l&apos;aperçu
        </button>
      </div>
    </form>
  );
}

/** Nom et lieu d'un évènement déjà planifié (2026-09-25). */
export function PlanRunForm({
  action,
  defaultName,
  defaultPlace,
}: {
  action: Action;
  defaultName: string;
  defaultPlace: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const { onSubmit } = useFormSubmit(formAction, { pending, state });
  return (
    <form action={formAction} onSubmit={onSubmit} className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <label className={`grid gap-1 ${LABEL}`}>
          Nom de l&apos;évènement
          <input name="eventName" required maxLength={160} defaultValue={defaultName} className={INPUT} />
        </label>
        <label className={`grid gap-1 ${LABEL}`}>
          Lieu (facultatif)
          <input name="eventPlace" maxLength={160} defaultValue={defaultPlace} className={INPUT} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={SUBMIT}>
          {pending ? "..." : "Enregistrer"}
        </button>
        <Feedback state={state} pending={pending} savedLabel="Enregistré" />
      </div>
    </form>
  );
}
