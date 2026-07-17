import type { Metadata } from "next";
import { FeedbackForm } from "@/components/client/feedback-form";

export const metadata: Metadata = {
  title: "Suggestion — Espace client Mikko Visuel",
};

export default function ClientFeedbackPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
        Demande d&apos;amélioration interface
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Un retour sur votre expérience de l&apos;espace client ? Un message
        suffit, il sera transmis directement à Mikko.
      </p>

      <div className="mt-8">
        <FeedbackForm />
      </div>
    </div>
  );
}
