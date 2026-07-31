import { Fragment } from "react";

// Détection des adresses tapées dans un champ texte libre (description de
// tâche, commentaire) pour les rendre cliquables sans passer par un éditeur
// riche : ces champs restent du texte brut en base, rien n'est stocké en
// HTML.
//
// Sécurité : on ne reconstruit jamais de HTML (pas de
// `dangerouslySetInnerHTML`) — le texte est découpé et rendu en tableau de
// nœuds React, donc React échappe tout le reste. Et le motif ne reconnaît
// que `http://`, `https://` et `www.`, si bien qu'une saisie du type
// `javascript:alert(1)` ne peut pas produire de lien : c'est une garantie
// du motif lui-même, pas un filtre ajouté après coup.
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<>]+)/gi;

// La ponctuation finale colle presque toujours à la phrase, pas à l'URL
// ("voir https://exemple.fr."). On la retire du lien — sauf une parenthèse
// fermante qui équilibre une parenthèse ouvrante de l'URL elle-même, cas
// réel des liens Wikipédia.
function splitTrailingPunctuation(url: string): [string, string] {
  let end = url.length;
  while (end > 0) {
    const char = url[end - 1];
    if (".,;:!?'\"".includes(char)) {
      end -= 1;
      continue;
    }
    if (char === ")" || char === "]" || char === "}") {
      const open = char === ")" ? "(" : char === "]" ? "[" : "{";
      const candidate = url.slice(0, end);
      const balanced =
        candidate.split(open).length - 1 >= candidate.split(char).length - 1;
      if (balanced) break;
      end -= 1;
      continue;
    }
    break;
  }
  return [url.slice(0, end), url.slice(end)];
}

export function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN);

  return (
    <>
      {parts.map((part, index) => {
        // `split` avec un groupe capturant alterne texte / URL : les index
        // impairs sont les correspondances.
        if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>;

        const [url, trailing] = splitTrailingPunctuation(part);
        const href = url.startsWith("www.") ? `https://${url}` : url;

        return (
          <Fragment key={index}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              // `text-ink` et non `text-accent` : l'accent est un citron
              // très clair, pensé comme fond (avec `text-accent-ink`), pas
              // comme couleur de texte — il serait illisible sur la surface
              // claire. Même parti pris que les autres liens en ligne du
              // projet. `break-all` évite qu'une longue URL ne déborde de
              // sa carte sur mobile.
              className="break-all font-medium text-ink underline underline-offset-2 transition-colors hover:text-accent"
            >
              {url}
            </a>
            {trailing}
          </Fragment>
        );
      })}
    </>
  );
}
