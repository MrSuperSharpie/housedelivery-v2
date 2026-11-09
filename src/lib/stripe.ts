import Stripe from 'stripe'

// Server-only Stripe client. STRIPE_SECRET_KEY is a server secret and must
// never be exposed to the browser (do not prefix it with NEXT_PUBLIC_).
//
// The instance is created lazily and memoised so route handlers share one
// client. We intentionally do not pin `apiVersion` here so the SDK uses the
// version its types were generated against.

let stripeSingleton: Stripe | null = null

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured.')
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secretKey)
  }
  return stripeSingleton
}
