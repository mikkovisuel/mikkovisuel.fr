import { useEffect, useRef, useTransition, type FormEvent } from "react";

// Empêche un formulaire de perdre sa saisie après une erreur (2026-09-18).
//
// Constat : avec React 19, un `<form action={formAction}>` est réinitialisé
// après **chaque** action, erreur de validation comprise. Une erreur côté
// serveur (email invalide, mot de passe incorrect...) effaçait donc tout ce
// qui venait d'être tapé ; pire, un `<select>` revenait visuellement à sa
// valeur initiale pendant que l'état React gardait l'ancienne, si bien qu'un
// second envoi pouvait enregistrer une autre valeur que celle affichée.
//
// Mécanisme (lu dans react-dom, pas supposé) : si le gestionnaire `onSubmit`
// appelle `preventDefault()`, React n'exécute plus l'action lui-même — et
// c'est précisément là qu'il déclenche la réinitialisation. On envoie donc à
// la main, dans une transition (l'indicateur `pending` et `useFormStatus`
// continuent de fonctionner). Le prop `action` reste en place : avant que la
// page soit interactive, le navigateur envoie alors en POST vers l'action
// serveur comme avant, plutôt qu'en GET avec les champs (mot de passe
// compris) dans l'URL.
//
// `resetOnSuccess` : pour les formulaires d'ajout ou d'envoi qui comptaient
// sur cette réinitialisation pour se vider après un succès (ajout de temps,
// envoi d'email...). Les formulaires qui se vidaient déjà eux-mêmes n'en ont
// pas besoin.
export function useFormSubmit(
  dispatch: (formData: FormData) => void,
  options: { pending?: boolean; state?: unknown; resetOnSuccess?: boolean } = {},
) {
  const { pending = false, state, resetOnSuccess = false } = options;
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (resetOnSuccess && wasPending.current && !pending && !hasError(state)) {
      formRef.current?.reset();
    }
    wasPending.current = pending;
  }, [pending, state, resetOnSuccess]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Le bouton cliqué fait partie des données envoyées (name/value), comme
    // lors d'un envoi natif.
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  return { formRef, onSubmit };
}

function hasError(state: unknown): boolean {
  return (
    typeof state === "object" &&
    state !== null &&
    "error" in state &&
    Boolean((state as { error?: unknown }).error)
  );
}
