// Stripe keys from Admin Settings (DB) with .env fallback.
import Stripe from "stripe";
import { getSetting } from "./db.js";

export const STRIPE_SETTING_KEYS = [
  "stripe_secret_key",
  "stripe_webhook_secret",
  "stripe_publishable_key",
];

let cached = { secret: "", client: null };

function maskKey(key) {
  const s = String(key || "");
  if (s.length < 12) return s ? "••••" : "";
  return `${s.slice(0, 7)}…${s.slice(-4)}`;
}

export async function getStripeConfig() {
  const dbSecret = (await getSetting("stripe_secret_key")) || "";
  const dbWebhook = (await getSetting("stripe_webhook_secret")) || "";
  const dbPk = (await getSetting("stripe_publishable_key")) || "";

  const secret =
    dbSecret || process.env.STRIPE_SECRET_KEY || "";
  const webhook =
    dbWebhook || process.env.STRIPE_WEBHOOK_SECRET || "";
  const publishable =
    dbPk || process.env.VITE_STRIPE_PK || process.env.STRIPE_PUBLISHABLE_KEY || "";

  const test_mode = secret.startsWith("sk_test") || publishable.startsWith("pk_test");
  const configured = Boolean(secret && publishable);

  return {
    secret_key: secret,
    webhook_secret: webhook,
    publishable_key: publishable,
    secret_key_set: Boolean(secret),
    webhook_secret_set: Boolean(webhook),
    publishable_key_set: Boolean(publishable),
    secret_key_hint: maskKey(secret),
    webhook_secret_hint: maskKey(webhook),
    publishable_key_hint: maskKey(publishable),
    test_mode,
    configured,
    source: {
      secret: dbSecret ? "settings" : process.env.STRIPE_SECRET_KEY ? "env" : "none",
      webhook: dbWebhook ? "settings" : process.env.STRIPE_WEBHOOK_SECRET ? "env" : "none",
      publishable: dbPk ? "settings" : process.env.VITE_STRIPE_PK || process.env.STRIPE_PUBLISHABLE_KEY ? "env" : "none",
    },
  };
}

/** Public payload for admin settings — never returns raw secrets. */
export async function getPublicStripeSettings() {
  const cfg = await getStripeConfig();
  return {
    stripe_configured: cfg.configured,
    stripe_test_mode: cfg.test_mode,
    stripe_secret_key_set: cfg.secret_key_set,
    stripe_webhook_secret_set: cfg.webhook_secret_set,
    stripe_publishable_key: cfg.publishable_key, // pk_ is public by design
    stripe_secret_key_hint: cfg.secret_key_hint,
    stripe_webhook_secret_hint: cfg.webhook_secret_hint,
    stripe_source_secret: cfg.source.secret,
    stripe_source_webhook: cfg.source.webhook,
    stripe_source_publishable: cfg.source.publishable,
  };
}

/** Cached Stripe SDK client; rebuilds when secret key changes. */
export async function getStripe() {
  const cfg = await getStripeConfig();
  if (!cfg.secret_key) {
    cached = { secret: "", client: null };
    return null;
  }
  if (cached.client && cached.secret === cfg.secret_key) return cached.client;
  cached = { secret: cfg.secret_key, client: new Stripe(cfg.secret_key) };
  return cached.client;
}

export async function getStripeWebhookSecret() {
  const cfg = await getStripeConfig();
  return cfg.webhook_secret;
}

/** Verify secret key with Stripe (list balance or retrieve account). */
export async function verifyStripe() {
  const cfg = await getStripeConfig();
  if (!cfg.secret_key) {
    return { ok: false, message: "Stripe secret key is not set." };
  }
  if (!cfg.publishable_key) {
    return {
      ok: false,
      message: "Publishable key (pk_…) is missing — the checkout page needs it.",
    };
  }
  try {
    const client = await getStripe();
    // balance.retrieve is a lightweight auth check for the secret key.
    await client.balance.retrieve();
    const mode = cfg.test_mode ? "test" : "live";
    const pkHint = cfg.publishable_key.startsWith("pk_live")
      ? "live pk"
      : cfg.publishable_key.startsWith("pk_test")
        ? "test pk"
        : "pk set";
    return {
      ok: true,
      message: `Stripe OK (${mode} secret · ${pkHint}). Online checkout can create payments.`,
      test_mode: cfg.test_mode,
    };
  } catch (err) {
    return { ok: false, message: `Stripe verify failed: ${err.message || err}` };
  }
}
