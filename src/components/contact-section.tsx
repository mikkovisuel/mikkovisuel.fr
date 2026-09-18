"use client";

import { useActionState } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { submitContactForm } from "@/lib/actions/contact";
import { useFormSubmit } from "@/lib/use-form-submit";

export function ContactSection() {
  const [state, formAction, pending] = useActionState(submitContactForm, undefined);
  const { onSubmit: formSubmit } = useFormSubmit(formAction, { pending, state });

  return (
    <section id="contact" className="scroll-mt-16 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Un projet en tête
          </h2>
          <p className="mt-4 max-w-[45ch] text-base text-ink-muted">
            Décrivez votre événement ou votre marque, je reviens vers vous
            avec un premier avis rapidement.
          </p>
        </div>

        <div className="lg:col-span-7">
          {state?.success ? (
            <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface-elevated p-6">
              <CheckCircle
                size={22}
                weight="fill"
                className="mt-0.5 shrink-0 text-accent"
              />
              <div>
                <p className="font-medium text-ink">Demande envoyée.</p>
                <p className="mt-1 text-sm text-ink-muted">
                  Merci, votre message a bien été transmis. Vous aurez une
                  réponse sous peu.
                </p>
              </div>
            </div>
          ) : (
            <form action={formAction} onSubmit={formSubmit} className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="name" className="text-sm font-medium text-ink">
                  Nom
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Votre nom"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="vous@exemple.com"
                />
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="subject" className="text-sm font-medium text-ink">
                  Type de demande
                </label>
                <select
                  id="subject"
                  name="subject"
                  defaultValue="devis"
                  className="rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="devis">Demande de devis</option>
                  <option value="question">Question</option>
                  <option value="autre">Autre</option>
                </select>
              </div>

              <div className="flex flex-col gap-2 sm:col-span-2">
                <label htmlFor="message" className="text-sm font-medium text-ink">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  className="resize-none rounded-xl border border-line bg-surface-elevated px-4 py-3 text-sm text-ink placeholder:text-ink-muted/70 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
                  placeholder="Décrivez votre projet, la date de l'événement, le style recherché..."
                />
              </div>

              {state?.error && (
                <div className="flex items-center gap-2 text-sm text-danger sm:col-span-2">
                  <WarningCircle size={18} weight="fill" />
                  {state.error}
                </div>
              )}

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex items-center rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:opacity-60"
                >
                  {pending ? "Envoi..." : "Envoyer la demande"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
