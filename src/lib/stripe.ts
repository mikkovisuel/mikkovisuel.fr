import "server-only";
import Stripe from "stripe";

let cached: Stripe | null | undefined;

// Returns null when STRIPE_SECRET_KEY isn't set, so the payment flow can be
// gracefully hidden until the account exists (see plan §Stripe & Emails).
export function getStripeClient(): Stripe | null {
  if (cached !== undefined) return cached;

  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
