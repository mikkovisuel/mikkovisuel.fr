import "server-only";

// PayPal REST v2 (Orders API), appelée directement en `fetch` — contrairement
// à Stripe, PayPal n'a pas de SDK Node officiel activement maintenu, la
// documentation actuelle recommande d'appeler l'API REST directement.
// Bascule sandbox/live via PAYPAL_MODE (sandbox par défaut, pour ne jamais
// taper l'API live par erreur en développement — voir aussi `.env.example`).
function getBaseUrl(): string {
  return process.env.PAYPAL_MODE === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

export function isPaypalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

// Jeton OAuth client_credentials mis en cache en mémoire (durée de vie
// courte, quelques heures côté PayPal) — évite un aller-retour
// d'authentification à chaque appel dans le même process serveur.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  const response = await fetch(`${getBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { access_token: string; expires_in: number };
  // Marge de 60s pour ne jamais utiliser un jeton expiré pile au moment de
  // l'appel suivant.
  cachedToken = { value: data.access_token, expiresAt: Date.now() + (data.expires_in - 60) * 1000 };
  return cachedToken.value;
}

interface PaypalOrderLink {
  rel: string;
  href: string;
}

// Crée une commande PayPal (intent CAPTURE) et renvoie l'URL d'approbation
// vers laquelle rediriger le client — même rôle que
// `stripe.checkout.sessions.create` pour Stripe.
export async function createPaypalOrder(params: {
  amountCents: number;
  currency: string;
  description: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<{ orderId: string; approveUrl: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: params.currency.toUpperCase(),
            value: (params.amountCents / 100).toFixed(2),
          },
          description: params.description,
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        user_action: "PAY_NOW",
        shipping_preference: "NO_SHIPPING",
      },
    }),
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { id: string; links: PaypalOrderLink[] };
  const approveUrl = data.links.find((link) => link.rel === "approve")?.href;
  if (!approveUrl) return null;
  return { orderId: data.id, approveUrl };
}

// Capture une commande approuvée par le payeur — appelée depuis
// `/api/paypal/capture` au retour du paiement. `status === "COMPLETED"` est
// la seule confirmation qui compte : PayPal a réellement débité le payeur.
export async function capturePaypalOrder(orderId: string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  const response = await fetch(`${getBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!response.ok) return false;

  const data = (await response.json()) as { status: string };
  return data.status === "COMPLETED";
}
