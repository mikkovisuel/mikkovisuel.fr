// Pas de garde `server-only` ici (contrairement à prospect-search.ts) : ce
// module ne contient que des fonctions pures (normalisation de chaînes,
// opérations sur des `Set`), aucun secret ni accès base/réseau — même
// raisonnement que html-escape.ts.
//
// Normalisation des identifiants d'un prospect avant comparaison — partagée
// entre l'import CSV/Sheets et la recherche IA (searchProspectsWithAI dans
// src/lib/actions/prospects.ts). Demande du 2026-09-08 ("ne pas créer de
// doublons dans la liste déjà entrée") : l'ancienne comparaison (email/
// instagram en minuscules, tels quels) ratait un doublon dès que le format
// différait d'une source à l'autre — "@handle" contre une URL de profil
// complète, "+33 6 ..." contre "06 ...", ou simplement un champ rempli une
// fois et pas l'autre alors que le site web ou la ville concordaient.

export function normalizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

// Accepte un identifiant ("@handle", "handle") ou une URL de profil
// complète ("https://www.instagram.com/handle/") et renvoie le même handle
// normalisé dans les deux cas, pour comparer `instagram` et `instagramUrl`
// avec la même clé.
export function normalizeInstagram(value: string | null | undefined): string | null {
  if (!value) return null;
  let handle = value.trim();
  const urlMatch = handle.match(/instagram\.com\/([^/?#]+)/i);
  if (urlMatch) handle = urlMatch[1];
  handle = handle.replace(/^@/, "").replace(/\/+$/, "").toLowerCase();
  return handle || null;
}

// Nom d'hôte seul (sans protocole ni "www."), pour que
// "https://www.exemple.fr/" et "exemple.fr" soient reconnus identiques.
export function normalizeWebsite(value: string | null | undefined): string | null {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  try {
    const host = new URL(raw.includes("://") ? raw : `https://${raw}`).hostname;
    return host.replace(/^www\./, "").toLowerCase() || null;
  } catch {
    return null;
  }
}

// Marché français uniquement (clientèle du site) : ramène "+33 6 12 34 56
// 78" et "06 12 34 56 78" à la même suite de chiffres.
export function normalizePhone(value: string | null | undefined): string | null {
  if (!value) return null;
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("33") && digits.length === 11) digits = `0${digits.slice(2)}`;
  return digits.length >= 9 ? digits : null;
}

// Repli quand aucun identifiant (email/Instagram/site/téléphone) ne
// coïncide : même nom ou même société, dans la même ville. Volontairement
// combiné avec la ville (jamais le nom/la société seuls) pour ne pas
// confondre deux entités homonymes de villes différentes.
export function normalizeNameCity(
  name: string | null | undefined,
  city: string | null | undefined,
): string | null {
  const cityKey = city?.trim().toLowerCase();
  const nameKey = name?.trim().toLowerCase().replace(/\s+/g, " ");
  return cityKey && nameKey ? `${nameKey}|${cityKey}` : null;
}

export interface DedupKeys {
  email: string | null;
  instagram: string | null;
  website: string | null;
  phone: string | null;
  nameCity: string[];
}

export function buildDedupKeys(prospect: {
  email?: string | null;
  instagram?: string | null;
  instagramUrl?: string | null;
  website?: string | null;
  phone?: string | null;
  name?: string | null;
  company?: string | null;
  city?: string | null;
}): DedupKeys {
  return {
    email: normalizeEmail(prospect.email),
    instagram: normalizeInstagram(prospect.instagram) ?? normalizeInstagram(prospect.instagramUrl),
    website: normalizeWebsite(prospect.website),
    phone: normalizePhone(prospect.phone),
    nameCity: [
      normalizeNameCity(prospect.name, prospect.city),
      normalizeNameCity(prospect.company, prospect.city),
    ].filter((key): key is string => key !== null),
  };
}

// Un seul de ces indicateurs concordant (avec un prospect déjà en base, ou
// avec un autre candidat du même lot) suffit à traiter l'entrée comme un
// doublon.
export function isDuplicate(keys: DedupKeys, index: DedupIndex): boolean {
  return (
    (keys.email !== null && index.emails.has(keys.email)) ||
    (keys.instagram !== null && index.instagrams.has(keys.instagram)) ||
    (keys.website !== null && index.websites.has(keys.website)) ||
    (keys.phone !== null && index.phones.has(keys.phone)) ||
    keys.nameCity.some((key) => index.nameCities.has(key))
  );
}

export function addToIndex(keys: DedupKeys, index: DedupIndex): void {
  if (keys.email !== null) index.emails.add(keys.email);
  if (keys.instagram !== null) index.instagrams.add(keys.instagram);
  if (keys.website !== null) index.websites.add(keys.website);
  if (keys.phone !== null) index.phones.add(keys.phone);
  keys.nameCity.forEach((key) => index.nameCities.add(key));
}

export interface DedupIndex {
  emails: Set<string>;
  instagrams: Set<string>;
  websites: Set<string>;
  phones: Set<string>;
  nameCities: Set<string>;
}

export function emptyDedupIndex(): DedupIndex {
  return { emails: new Set(), instagrams: new Set(), websites: new Set(), phones: new Set(), nameCities: new Set() };
}

// Construit l'index à partir des prospects déjà en base (un seul
// `db.prospect.findMany` par recherche/import, jamais requête par candidat)
// — l'appelant choisit lui-même les champs à sélectionner.
export function buildExistingDedupIndex(
  existing: {
    email: string | null;
    instagram: string | null;
    instagramUrl: string | null;
    website: string | null;
    phone: string | null;
    name: string;
    company: string | null;
    city: string | null;
  }[],
): DedupIndex {
  const index = emptyDedupIndex();
  for (const prospect of existing) {
    addToIndex(buildDedupKeys(prospect), index);
  }
  return index;
}
