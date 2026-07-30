import { z } from "zod";

// Convertit une chaîne vide en `null` avant validation. Ces champs sont
// facultatifs mais strictement validés dès qu'une valeur est saisie — et le
// résultat est toujours `string | null` (jamais `undefined`), pour qu'un
// champ vidé par l'admin efface bien la valeur en base : Prisma ignore les
// clés `undefined` dans un `update` (donc l'ancienne valeur resterait),
// alors que `null` l'écrase explicitement.
const emptyToNull = (val: unknown) => (typeof val === "string" && val.trim() === "" ? null : val);

export const ClientSchema = z.object({
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  notes: z.string().trim().optional(),
  address: z.string().trim().optional(),
  siret: z.string().trim().optional(),
  vatNumber: z.string().trim().optional(),
  billingEmail: z.preprocess(
    emptyToNull,
    z.string().trim().toLowerCase().email({ message: "Email de facturation invalide." }).nullable(),
  ),
  driveUrl: z.preprocess(
    emptyToNull,
    z.string().trim().url({ message: "Lien Google Drive invalide." }).nullable(),
  ),
  // Référence un `DropdownItem` de la liste `client_category`. `null` = client
  // non catégorisé, un état parfaitement valide.
  categoryId: z.preprocess(emptyToNull, z.string().nullable()),
});

// Trois façons de créer un contact, choisies dans le formulaire :
// - `none`     : simple entrée au carnet d'adresses, aucun accès à l'espace client
// - `invite`   : accès ouvert, le contact reçoit un lien pour choisir son mot de passe
// - `password` : accès ouvert avec un mot de passe défini par l'admin
const CONTACT_ACCESS_MODES = ["none", "invite", "password"] as const;
export type ContactAccessMode = (typeof CONTACT_ACCESS_MODES)[number];

const contactBaseFields = {
  name: z.string().trim().min(1, { message: "Le nom est requis." }),
  // Facultatif : un contact peut n'avoir qu'un téléphone. Il redevient
  // obligatoire dès qu'un accès est ouvert (c'est l'identifiant de connexion)
  // — contrainte portée par les `superRefine` ci-dessous.
  email: z.preprocess(
    emptyToNull,
    z.string().trim().toLowerCase().email({ message: "Adresse email invalide." }).nullable(),
  ),
  phone: z.string().trim().optional(),
  role: z.string().trim().optional(),
};

export const ContactCreateSchema = z
  .object({
    ...contactBaseFields,
    access: z.enum(CONTACT_ACCESS_MODES),
    // `nullish` et non `optional` : le champ mot de passe n'est rendu que
    // pour le mode "password", donc `formData.get("password")` renvoie `null`
    // dans les deux autres modes — et `optional()` n'accepte que `undefined`,
    // ce qui faisait échouer toute création de contact sans mot de passe avec
    // un "expected string, received null" incompréhensible pour l'admin.
    password: z.string().nullish(),
  })
  .superRefine((data, ctx) => {
    if (data.access !== "none" && !data.email) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Une adresse email est nécessaire pour ouvrir un espace client.",
      });
    }
    if (data.access === "password" && (data.password ?? "").length < 8) {
      ctx.addIssue({
        code: "custom",
        path: ["password"],
        message: "8 caractères minimum.",
      });
    }
  });

// L'édition ne touche jamais à l'accès ni au mot de passe : ce sont des
// actions séparées et explicites (interrupteur, bouton d'invitation), pour
// qu'une correction de numéro de téléphone ne puisse pas fermer un accès par
// effet de bord.
export const ContactEditSchema = z.object(contactBaseFields);

export type ClientFormState = { error?: string } | undefined;
export type ContactFormState = { error?: string } | undefined;
export type ContactEditFormState = { error?: string; success?: boolean } | undefined;
