"use client";

import { useState } from "react";
import { Check, Copy, DownloadSimple } from "@phosphor-icons/react/dist/ssr";

// "Kit de publication" (2026-09-18) : tout ce qu'il faut pour publier à la
// main depuis le téléphone — texte + hashtags copiés en un geste, par
// réseau (variante incluse), et visuels téléchargeables.

const BUTTON =
  "inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm text-ink transition-colors hover:border-accent hover:bg-accent hover:text-accent-ink";

export function SocialPublishKit({
  postId,
  texts,
  media,
}: {
  postId: string;
  /** Un texte prêt à coller par réseau ciblé (variante ou texte commun + hashtags). */
  texts: { network: string; label: string; text: string }[];
  media: { id: string; fileName: string }[];
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const [failed, setFailed] = useState<{ network: string; text: string } | null>(null);

  // Méthode de secours quand l'API presse-papiers est refusée (permission,
  // navigateur intégré) : sélection d'un champ temporaire + copie.
  function legacyCopy(text: string) {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }

  async function copy(network: string, text: string) {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    if (ok) {
      setFailed(null);
      setCopied(network);
      setTimeout(() => setCopied((current) => (current === network ? null : current)), 2000);
    } else {
      // Dernier recours : le texte s'affiche pour une copie à la main.
      setCopied(null);
      setFailed({ network, text });
    }
  }

  return (
    <div className="grid gap-4">
      {texts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {texts.map((item) => (
            <button key={item.network} type="button" onClick={() => copy(item.network, item.text)} className={BUTTON}>
              {copied === item.network ? <Check size={14} weight="bold" /> : <Copy size={14} weight="regular" />}
              {copied === item.network ? "Copié" : `Copier le texte ${item.label}`}
            </button>
          ))}
        </div>
      )}
      {failed && (
        <div className="grid gap-1">
          <p className="text-xs text-danger">Copie automatique impossible sur cet appareil : sélectionnez le texte ci-dessous.</p>
          <textarea readOnly rows={5} value={failed.text} className="rounded-xl border border-line bg-surface-elevated p-2 text-sm text-ink" onFocus={(event) => event.currentTarget.select()} />
        </div>
      )}
      {media.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {media.length > 1 && (
            <a href={`/api/exports/reseaux/${postId}/visuels`} className={BUTTON}>
              <DownloadSimple size={14} weight="regular" />
              Tous les visuels (.zip)
            </a>
          )}
          {media.map((item, index) => (
            <a
              key={item.id}
              href={`/api/fichiers/reseaux/${item.id}`}
              download={item.fileName}
              className="text-sm text-ink-muted underline underline-offset-2 hover:text-ink"
            >
              Visuel {index + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
