"use client";

import { useActionState, useCallback, useRef, useState, useTransition } from "react";
import { WarningCircle, CheckCircle, Sparkle } from "@phosphor-icons/react/dist/ssr";
import { SOCIAL_FORMATS, SOCIAL_NETWORKS } from "@/lib/social-posts";
import type { SocialPostFormState, SocialPostFormValues } from "@/lib/validation/social-post";
import { useFormSubmit } from "@/lib/use-form-submit";
import { suggestSocialCaption } from "@/lib/actions/social-library";
import { SocialPostPreview } from "@/components/social-post-preview";
import { SocialPostVisuals, imageToJpegBase64, type VisualItem } from "@/components/admin/social-post-visuals";

// Éditeur d'une publication, façon Meta Business Suite (refonte du
// 2026-10-21, choix « A » du client) : en tête client / réseaux / format,
// puis les visuels (dès la création), le texte avec un onglet par réseau et
// les hashtags ; à droite l'aperçu en direct et les détails (date,
// catégorie, attribution), avec le bouton d'enregistrement. Même écran pour
// créer et modifier. « Proposer avec l'IA » s'appuie aussi sur les visuels.

/** Réglages réseaux d'un client (livraison 2) repris dans le formulaire. */
export interface SocialClientLibrary {
  editorialLine: string | null;
  brandTone: string | null;
  hashtagSets: { id: string; name: string; content: string }[];
  templates: { id: string; name: string; content: string }[];
}

const CHIP =
  "rounded-full border border-line px-3 py-1 text-xs text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";
const INPUT =
  "rounded-xl border border-line bg-surface-elevated px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30";
const LABEL = "text-sm font-medium text-ink";
const CARD = "rounded-2xl border border-line p-4";

// Limite la plus stricte des réseaux gérés (Instagram, 2 200 caractères) —
// repère, pas blocage.
const CAPTION_SOFT_LIMIT = 2200;
const MAX_AI_IMAGES = 4;

// Ajoute des hashtags sans doublon (comparaison insensible à la casse).
function mergeHashtags(current: string, added: string) {
  const seen = new Set(current.split(/\s+/).filter(Boolean).map((tag) => tag.toLowerCase()));
  const extra = added.split(/\s+/).filter((tag) => tag && !seen.has(tag.toLowerCase()) && seen.add(tag.toLowerCase()));
  return [current.trim(), ...extra].filter(Boolean).join(" ");
}

export function SocialPostForm({
  action,
  clients,
  defaultValues,
  submitLabel,
  libraries = {},
  clientId: fixedClientId,
  clientName: fixedClientName,
  postId,
  media,
  categories = [],
  taskTypes,
  admins,
  defaultAssigneeId,
}: {
  action: (state: SocialPostFormState, formData: FormData) => Promise<SocialPostFormState>;
  /** Sélecteur de client, à la création uniquement. */
  clients?: { id: string; name: string }[];
  /** `scheduledAt` : valeur `datetime-local` déjà convertie en heure de Paris. */
  defaultValues?: SocialPostFormValues;
  submitLabel: string;
  libraries?: Record<string, SocialClientLibrary>;
  /** Client de la publication, en modification (pas de sélecteur). */
  clientId?: string;
  clientName?: string;
  /** Publication existante : ses visuels s'envoient tout de suite. */
  postId?: string;
  media?: { id: string; fileName: string; mimeType: string }[];
  categories?: { id: string; label: string }[];
  /** Types de tâche : affiche la case "Demander une création" (création seulement). */
  taskTypes?: { slug: string; label: string }[];
  admins?: { id: string; label: string }[];
  defaultAssigneeId?: string | null;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  // Évite que React 19 vide le formulaire après une erreur (voir use-form-submit).
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedClientId, setSelectedClientId] = useState(fixedClientId ?? defaultValues?.clientId ?? "");
  const library = libraries[selectedClientId];
  const clientName = fixedClientName ?? clients?.find((client) => client.id === selectedClientId)?.name ?? "Client";

  const [caption, setCaption] = useState(defaultValues?.caption ?? "");
  const [variants, setVariants] = useState<Record<string, string>>(defaultValues?.captionVariants ?? {});
  const [hashtags, setHashtags] = useState(defaultValues?.hashtags ?? "");
  const [tab, setTab] = useState<string>("commun");
  const [visuals, setVisuals] = useState<VisualItem[]>([]);
  const onVisualsChange = useCallback((items: VisualItem[]) => setVisuals(items), []);

  const [suggestion, setSuggestion] = useState<{ caption: string; hashtags: string } | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [suggesting, startSuggesting] = useTransition();
  const [requestTask, setRequestTask] = useState(false);

  const activeText = tab === "commun" ? caption : (variants[tab] ?? "");
  const setActiveText = (value: string) =>
    tab === "commun" ? setCaption(value) : setVariants((prev) => ({ ...prev, [tab]: value }));

  function insertTemplate(content: string) {
    setActiveText(activeText.trim() ? `${activeText.trim()}\n\n${content}` : content);
  }

  function requestSuggestion() {
    const form = formRef.current;
    if (!form) return;
    const data = new FormData(form);
    setSuggestionError(null);
    startSuggesting(async () => {
      let images: { mediaType: "image/jpeg"; data: string }[] = [];
      try {
        images = await Promise.all(
          visuals
            .filter((item) => item.isImage)
            .slice(0, MAX_AI_IMAGES)
            .map(async (item) => ({ mediaType: "image/jpeg" as const, data: await imageToJpegBase64(item.url) })),
        );
      } catch {
        images = [];
      }
      const result = await suggestSocialCaption({
        clientId: selectedClientId,
        title: String(data.get("title") ?? ""),
        format: String(data.get("format") ?? "post"),
        networks: data.getAll("networks").map(String),
        draft: caption,
        images,
      });
      if (result.error) setSuggestionError(result.error);
      setSuggestion(result.suggestion ?? null);
    });
  }

  const previewCaption = variants.instagram?.trim() ? variants.instagram : caption;
  const imageCount = visuals.filter((item) => item.isImage).length;

  return (
    <form ref={formRef} action={formAction} onSubmit={formSubmit} className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem] xl:items-start">
      {/* Colonne principale : contenu */}
      <div className="grid min-w-0 grid-cols-1 gap-5">
        <div className="flex flex-wrap items-center gap-2">
          {clients && (
            <select
              name="clientId"
              required
              defaultValue={defaultValues?.clientId ?? ""}
              onChange={(event) => setSelectedClientId(event.target.value)}
              aria-label="Client"
              className={`${INPUT} py-1.5`}
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
          )}
          {SOCIAL_NETWORKS.map((network) => (
            <label
              key={network.slug}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent has-[:checked]:text-accent-ink"
            >
              <input type="checkbox" name="networks" value={network.slug} defaultChecked={defaultValues?.networks.includes(network.slug)} className="sr-only" />
              {network.label}
            </label>
          ))}
          <select name="format" required defaultValue={defaultValues?.format || "post"} aria-label="Format" className={`${INPUT} py-1.5`}>
            {SOCIAL_FORMATS.map((format) => (
              <option key={format.slug} value={format.slug}>
                {format.label}
              </option>
            ))}
          </select>
        </div>

        <input
          name="title"
          required
          maxLength={160}
          defaultValue={defaultValues?.title ?? ""}
          placeholder="Titre (repère interne, visible aussi par le client) — ex. Soirée techno du 21/09"
          aria-label="Titre"
          className={`${INPUT} text-base`}
        />

        <section className="grid min-w-0 grid-cols-1 gap-2">
          <h3 className={LABEL}>Visuels</h3>
          <SocialPostVisuals inputName={postId ? undefined : "media"} postId={postId} existing={media} onChange={onVisualsChange} />
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <h3 className={`${LABEL} mr-2`}>Texte</h3>
            {[{ slug: "commun", label: "Commun" }, ...SOCIAL_NETWORKS].map((entry) => (
              <button
                key={entry.slug}
                type="button"
                onClick={() => setTab(entry.slug)}
                aria-pressed={tab === entry.slug}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  tab === entry.slug ? "bg-select font-medium text-ink" : "text-ink-muted hover:bg-ink/[0.06]"
                }`}
              >
                {entry.label}
                {entry.slug !== "commun" && variants[entry.slug]?.trim() ? " •" : ""}
              </button>
            ))}
          </div>
          {library?.editorialLine && (
            <details className="rounded-xl border border-line px-3 py-2 text-sm">
              <summary className="cursor-pointer text-ink-muted">Ligne éditoriale du client</summary>
              <p className="mt-2 whitespace-pre-wrap text-ink">{library.editorialLine}</p>
              {library.brandTone && <p className="mt-2 whitespace-pre-wrap text-ink-muted">Ton : {library.brandTone}</p>}
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
          <textarea name="caption" value={caption} onChange={(event) => setCaption(event.target.value)} hidden={tab !== "commun"} rows={8} placeholder="Légende telle qu'elle sera publiée" aria-label="Texte commun" className={`${INPUT} resize-y`} />
          {SOCIAL_NETWORKS.map((network) => (
            <textarea
              key={network.slug}
              name={`variant_${network.slug}`}
              value={variants[network.slug] ?? ""}
              onChange={(event) => setVariants((prev) => ({ ...prev, [network.slug]: event.target.value }))}
              hidden={tab !== network.slug}
              rows={8}
              maxLength={4000}
              placeholder={`Texte ${network.label} — laissez vide pour reprendre le texte commun`}
              aria-label={`Texte ${network.label}`}
              className={`${INPUT} resize-y`}
            />
          ))}
          <p className={`text-xs ${activeText.length > CAPTION_SOFT_LIMIT ? "text-danger" : "text-ink-muted"}`}>
            {activeText.length} / {CAPTION_SOFT_LIMIT} caractères (limite Instagram)
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
                  <Sparkle size={16} />
                  {suggesting ? "Rédaction en cours..." : imageCount > 0 ? "Proposer un texte d'après les visuels" : "Proposer avec l'IA"}
                </button>
                <span className="text-xs text-ink-muted">
                  {imageCount > 0
                    ? `Claude regarde ${Math.min(imageCount, MAX_AI_IMAGES)} visuel${imageCount > 1 ? "s" : ""}, le titre, votre texte et le ton du client.`
                    : "À partir du titre, du texte déjà saisi et du ton du client."}{" "}
                  Rien n&apos;est remplacé sans votre accord.
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
                    <button type="button" onClick={() => setActiveText(suggestion.caption)} className={CHIP}>
                      Utiliser ce texte
                    </button>
                    {suggestion.hashtags && (
                      <button type="button" onClick={() => setHashtags((current) => mergeHashtags(current, suggestion.hashtags))} className={CHIP}>
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
        </section>

        <section className="grid min-w-0 grid-cols-1 gap-2">
          <h3 className={LABEL}>Hashtags</h3>
          {library && library.hashtagSets.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-muted">Ajouter un groupe :</span>
              {library.hashtagSets.map((set) => (
                <button key={set.id} type="button" onClick={() => setHashtags((current) => mergeHashtags(current, set.content))} title={set.content} className={CHIP}>
                  {set.name}
                </button>
              ))}
            </div>
          )}
          <textarea name="hashtags" value={hashtags} onChange={(event) => setHashtags(event.target.value)} rows={2} placeholder="#techno #lyon #soiree" aria-label="Hashtags" className={`${INPUT} resize-y`} />
        </section>
      </div>

      {/* Colonne de droite : aperçu en direct et détails */}
      <aside className="grid min-w-0 grid-cols-1 gap-4 xl:sticky xl:top-4">
        <div className="flex justify-center">
          <SocialPostPreview
            clientName={clientName}
            caption={previewCaption}
            hashtags={hashtags}
            media={visuals.map((item) => ({ id: item.key, mimeType: item.isImage ? "image/jpeg" : "video/mp4", url: postId ? undefined : item.url }))}
          />
        </div>

        <div className={`${CARD} grid gap-3`}>
          <label className="grid gap-1 text-sm text-ink-muted">
            Publication prévue (heure de Paris)
            <input name="scheduledAt" type="datetime-local" defaultValue={defaultValues?.scheduledAt ?? ""} className={INPUT} />
          </label>
          {categories.length > 0 && (
            <label className="grid gap-1 text-sm text-ink-muted">
              Catégorie (interne)
              <select name="categoryId" defaultValue={defaultValues?.categoryId ?? ""} className={INPUT}>
                <option value="">Aucune</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {admins && admins.length > 0 && (
            <label className="grid gap-1 text-sm text-ink-muted">
              Attribuée à
              <select name="assignedAdminId" defaultValue={defaultAssigneeId ?? ""} className={INPUT}>
                <option value="">Non attribuée</option>
                {admins.map((admin) => (
                  <option key={admin.id} value={admin.id}>
                    {admin.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          {taskTypes && taskTypes.length > 0 && (
            <div className="grid gap-2 border-t border-line pt-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="requestTask"
                  checked={requestTask}
                  onChange={(event) => setRequestTask(event.target.checked)}
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                Demander une création (infographie, contenu…)
              </label>
              {requestTask && (
                <>
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
                  <p className="text-xs text-ink-muted">
                    Tâche interne (invisible du client), échéance 3 jours avant la publication ; ses fichiers finaux
                    s&apos;ajoutent ensuite aux visuels.
                  </p>
                </>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
            >
              {pending ? "Enregistrement..." : submitLabel}
            </button>
            {state?.saved && !pending && (
              <span className="flex items-center gap-1 text-sm text-ink-muted">
                <CheckCircle size={16} weight="fill" className="text-accent" />
                Enregistré
              </span>
            )}
          </div>
          {state?.error && (
            <p className="flex items-center gap-1 text-sm text-danger">
              <WarningCircle size={16} weight="fill" />
              {state.error}
            </p>
          )}
        </div>
      </aside>
    </form>
  );
}
