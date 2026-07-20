"use client";

import { useRef, useState } from "react";

// Le corps d'un email vient d'un tiers externe (l'expéditeur), pas de code
// de confiance — un `dangerouslySetInnerHTML` direct serait une faille XSS
// ouverte sur la session admin. Rendu dans une iframe `sandbox` sans
// `allow-scripts` ni `allow-same-origin` : le HTML/CSS s'affiche, mais
// aucun script embarqué ne peut s'exécuter ni accéder au reste de la page.
// Même principe que Gmail/Outlook web pour l'aperçu d'un email.
export function EmailMessageBody({ html, text }: { html: string | null; text: string | null }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(200);

  if (!html) {
    return (
      <pre className="whitespace-pre-wrap break-words font-sans text-sm text-ink">
        {text ?? "(message vide)"}
      </pre>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      sandbox=""
      srcDoc={html}
      title="Contenu de l'email"
      style={{ height }}
      className="w-full rounded-xl border border-line bg-white"
      onLoad={() => {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.documentElement) {
          setHeight(Math.min(doc.documentElement.scrollHeight + 16, 1200));
        }
      }}
    />
  );
}
