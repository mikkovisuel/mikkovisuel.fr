"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { WarningCircle, CheckCircle, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";
import type { SocialPostFormState, SocialPostFormValues } from "@/lib/validation/social-post";
import { useFormSubmit } from "@/lib/use-form-submit";
import { suggestSocialCaption } from "@/lib/actions/social-library";

/** Réglages réseaux d'un client (livraison 2) repris dans le formulaire. */
export interface SocialClientLibrary {
  editorialLine: string | null;
  brandTone: string | null;
  hashtagSets: { id: string; name: string; content: string }[];
  templates: { id: string; name: string; content: string }[];
}

const CHIP =
  "rounded-full border border-line px-3 py-1 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

// Ajoute des hashtags sans doublon (comparaison insensible à la casse).
function mergeHashtags(current: string, added: string) {
  const seen = new Set(current.split(/\s+/).filter(Boolean).map((tag) => tag.toLowerCase()));
  const extra = added.split(/\s+/).filter((tag) => tag && !seen.has(tag.toLowerCase()) && seen.add(tag.toLowerCase()));
  return [current.trim(), ...extra].filter(Boolean).join(" ");
}

const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";

// Limite de légende la plus stricte parmi les réseaux gérés (Instagram,
// 2 200 caractères) — affichée comme repère, pas bloquante : LinkedIn et
// Facebook acceptent davantage, c'est à l'admin de juger selon la cible.
const CAPTION_SOFT_LIMIT = 2200;

export function SocialPostForm({
  action,
  clients,
  defaultValues,
  submitLabel,
  libraries = {},
  clientId: fixedClientId,
  categories = [],
  taskTypes,
}: {
  action: (state: SocialPostFormState, formData: FormData) => Promise<SocialPostFormState>;
  /** Sélecteur de client, à la création uniquement. */
  clients?: { id: string; name: string }[];
  /** `scheduledAt` : valeur `datetime-local` déjà convertie en heure de Paris. */
  defaultValues?: SocialPostFormValues;
  submitLabel: string;
  /** Réglages réseaux par client (bibliothèque, ligne éditoriale). */
  libraries?: Record<string, SocialClientLibrary>;
  /** Client de la publication, en modification (pas de sélecteur). */
  clientId?: string;
  /** Liste "Catégories de publication" (/admin/listes). */
  categories?: { id: string; label: string }[];
  /** Types de tâche : affiche la case "Demander une création" (création seulement). */
  taskTypes?: { slug: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Évite que React 19 vide le formulaire après une erreur — voir
  // src/lib/use-form-submit.ts (défaut constaté en testant ce formulaire).
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const [captionLength, setCaptionLength] = useState(defaultValues?.caption.length ?? 0);
  const [selectedClientId, setSelectedClientId] = useState(fixedClientId ?? defaultValues?.clientId ?? "");
  const library = libraries[selectedClientId];
  const formRef = useRef<HTMLFormElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);
  const hashtagsRef = useRef<HTMLTextAreaElement>(null);
  const [suggestion, setSuggestion] = useState<{ caption: string; hashtags: string } | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();
  const [requestTask, setRequestTask] = useState(false);

  function setCaption(value: string) {
    if (!captionRef.current) return;
    captionRef.current.value = value;
    setCaptionLength(value.length);
  }

  function insertTemplate(content: string) {
    const current = captionRef.current?.value.trim() ?? "";
    setCaption(current ? `${current}\n\n${content}` : content);
    captionRef.current?.focus();
  }

  function insertHashtags(content: string) {
    if (hashtagsRef.current) hashtagsRef.current.value = mergeHashtags(hashtagsRef.current.value, content);
  }

  function requestSuggestion() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setSuggestionError(null);
    startSuggesting(async () => {
      const result = await suggestSocialCaption({
        clientId: selectedClientId,
        title: String(data.get("title") ?? ""),
        format: String(data.get("format") ?? "post"),
        networks: data.getAll("networks").map(String),
        draft: String(data.get("caption") ?? ""),
      });
      if (result.error) setSuggestionError(result.error);
      setSuggestion(result.suggestion ?? null);
    });
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={formSubmit} className="grid gap-5">
      {clients && (
        <div className="flex flex-col gap-2">
          <label htmlFor="clientId" className={LABEL}>
            Client
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            defaultValue={defaultValues?.clientId ?? ""}
            onChange={(event) => setSelectedClientId(event.target.value)}
            className={INPUT}
          >
            <option value="" disabled>
              Choisir un client
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label htmlFor="title" className={LABEL}>
          Titre
        </label>
        <input
          id="title"
          name="title"
          required
          maxLength={160}
          defaultValue={defaultValues?.title ?? ""}
          placeholder="Ex. Soirée techno du 21/09"
          className={INPUT}
        />
        <p className="text-xs text-ink-muted">Repère interne, visible aussi par le client.</p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="categoryId" className={LABEL}>
            Catégorie
          </label>
          <select id="categoryId" name="categoryId" defaultValue={defaultValues?.categoryId ?? ""} className={INPUT}>
            <option value="">Aucune</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-muted">Repère interne (liste modifiable dans Listes), jamais montré au client.</p>
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className={`${LABEL} mb-2`}>Réseaux</legend>
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
                defaultChecked={defaultValues?.networks.includes(network.slug)}
                className="sr-only"
              />
              {network.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="format" className={LABEL}>
            Format
          </label>
          <select
            id="format"
            name="format"
            required
            defaultValue={defaultValues?.format || "post"}
            className={INPUT}
          >
            {SOCIAL_FORMATS.map((format) => (
              <option key={format.slug} value={format.slug}>
                {format.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="scheduledAt" className={LABEL}>
            Publication prévue
          </label>
          <input
            id="scheduledAt"
            name="scheduledAt"
            type="datetime-local"
            defaultValue={defaultValues?.scheduledAt ?? ""}
            className={INPUT}
          />
          <p className="text-xs text-ink-muted">Heure de Paris. Laissez vide si pas encore planifiée.</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="caption" className={LABEL}>
          Texte de la publication
        </label>
        {library?.editorialLine && (
          <details className="rounded-xl border border-line px-3 py-2 text-sm">
            <summary className="cursor-pointer text-ink-muted">Ligne éditoriale du client</summary>
            <p className="mt-2 whitespace-pre-wrap text-ink">{library.editorialLine}</p>
            {library.brandTone && (
              <p className="mt-2 whitespace-pre-wrap text-ink-muted">Ton : {library.brandTone}</p>
            )}
          </details>
        )}
        {library && library.templates.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-muted">Insérer un modèle :</span>
            {library.templates.map((template) => (
              <button key={template.id} type="button" onClick={() => insertTemplate(template.content)} className={CHIP}>
                {template.name}
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={captionRef}
          id="caption"
          name="caption"
          rows={7}
          defaultValue={defaultValues?.caption ?? ""}
          onChange={(event) => setCaptionLength(event.target.value.length)}
          placeholder="Légende telle qu'elle sera publiée"
          className={`${INPUT} resize-y`}
        />
        <p className={`text-xs ${captionLength > CAPTION_SOFT_LIMIT ? "text-danger" : "text-ink-muted"}`}>
          {captionLength} / {CAPTION_SOFT_LIMIT} caractères (limite Instagram)
        </p>
        {selectedClientId && (
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={requestSuggestion}
                disabled={suggesting}
                className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-sm text-ink transition-colors hover:border-accent disabled:opacity-60"
              >
                <Sparkle size={16} weight="regular" />
                {suggesting ? "Rédaction en cours..." : "Proposer avec l'IA"}
              </button>
              <span className="text-xs text-ink-muted">
                À partir du titre, du texte déjà saisi et du ton du client. Rien n&apos;est remplacé sans votre accord.
              </span>
            </div>
            {suggestionError && (
              <p className="flex items-center gap-1 text-sm text-danger">
                <WarningCircle size={16} weight="fill" />
                {suggestionError}
              </p>
            )}
            {suggestion && (
              <div className="grid gap-3 rounded-xl border border-accent/40 bg-surface-elevated p-4">
                <p className="whitespace-pre-wrap text-sm text-ink">{suggestion.caption}</p>
                {suggestion.hashtags && <p className="text-sm text-ink-muted">{suggestion.hashtags}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setCaption(suggestion.caption)} className={CHIP}>
                    Utiliser ce texte
                  </button>
                  {suggestion.hashtags && (
                    <button type="button" onClick={() => insertHashtags(suggestion.hashtags)} className={CHIP}>
                      Ajouter ces hashtags
                    </button>
                  )}
                  <button type="button" onClick={() => setSuggestion(null)} className={CHIP}>
                    Ignorer
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Variantes par réseau (2026-09-18) : ouvert d'office s'il y en a déjà. */}
      <details
        open={Object.keys(defaultValues?.captionVariants ?? {}).length > 0}
        className="rounded-xl border border-line px-4 py-3"
      >
        <summary className="cursor-pointer text-sm font-medium text-ink">
          Adapter le texte par réseau (facultatif)
        </summary>
        <p className="mt-2 text-xs text-ink-muted">
          Laissez vide pour reprendre le texte commun. Ex. un ton plus posé pour LinkedIn, plus court pour TikTok.
        </p>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {SOCIAL_NETWORKS.map((network) => (
            <label key={network.slug} className="grid gap-1 text-xs text-ink-muted">
              Texte {network.label}
              <textarea
                name={`variant_${network.slug}`}
                rows={4}
                maxLength={4000}
                defaultValue={defaultValues?.captionVariants?.[network.slug] ?? ""}
                placeholder="Texte commun"
                className={`${INPUT} resize-y`}
              />
            </label>
          ))}
        </div>
      </details>

      <div className="flex flex-col gap-2">
        <label htmlFor="hashtags" className={LABEL}>
          Hashtags
        </label>
        {library && library.hashtagSets.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-ink-muted">Ajouter un groupe :</span>
            {library.hashtagSets.map((set) => (
              <button key={set.id} type="button" onClick={() => insertHashtags(set.content)} title={set.content} className={CHIP}>
                {set.name}
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={hashtagsRef}
          id="hashtags"
          name="hashtags"
          rows={2}
          defaultValue={defaultValues?.hashtags ?? ""}
          placeholder="#techno #lyon #soiree"
          className={`${INPUT} resize-y`}
        />
      </div>

      {taskTypes && taskTypes.length > 0 && (
        <div className="grid gap-3 rounded-xl border border-line p-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              name="requestTask"
              checked={requestTask}
              onChange={(event) => setRequestTask(event.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Demander une création (infographie, contenu...)
          </label>
          {requestTask && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="taskType" defaultValue="" required className={INPUT} aria-label="Type de création">
                  <option value="" disabled>
                    Type de création
                  </option>
                  {taskTypes.map((type) => (
                    <option key={type.slug} value={type.slug}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <label className="grid gap-1 text-xs text-ink-muted">
                  Date de l&apos;évènement (facultatif)
                  <input name="taskEventDate" type="date" className={INPUT} />
                </label>
              </div>
              <p className="text-xs text-ink-muted">
                Crée une tâche interne dans Tâches (invisible du client), échéance 3 jours avant la publication.
                Une fois la tâche terminée, ses fichiers finaux s&apos;ajoutent tout seuls aux visuels.
              </p>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Enregistrement..." : submitLabel}
        </button>
        {state?.error && (
          <span className="flex items-center gap-1 text-sm text-danger">
            <WarningCircle size={16} weight="fill" />
            {state.error}
          </span>
        )}
        {state?.saved && !pending && (
          <span className="flex items-center gap-1 text-sm text-ink-muted">
            <CheckCircle size={16} weight="fill" className="text-accent" />
            Enregistré
          </span>
        )}
      </div>
    </form>
  );
}
