// Bouton de soumission rattaché à un formulaire **distant** via l'attribut
// HTML natif `form` : permet de garder "Enregistrer" en haut à droite de la
// fiche client alors que le formulaire occupe toute la largeur en dessous
// (demande du 2026-07-30).
//
// Pas d'état "Enregistrement..." ici, volontairement : `useFormStatus` ne
// renvoie l'état que d'un formulaire **ancêtre**, or ce bouton est justement
// hors du sien — il resterait bloqué à `false` et donnerait un indicateur
// menteur. Le retour visuel vient du rafraîchissement du Server Component
// après l'action.
export function FormSubmitButton({ formId, label }: { formId: string; label: string }) {
  return (
    <button
      type="submit"
      form={formId}
      className="inline-flex items-center rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98]"
    >
      {label}
    </button>
  );
}
