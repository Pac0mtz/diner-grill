// Diner Grill ordering backend — Express + PostgreSQL + Stripe.
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";

import { loadEnv } from "./env.js";
import { query, initDb, TAX_RATE, ORDER_STATUSES, getSetting, setSetting, parseOrder, pool } from "./db.js";
import { seedIfEmpty } from "./seed.js";
import { syncMenu, backfillImagesFromSeed } from "./sync-menu.js";
import { fetchGoogleReviews } from "./google-reviews.js";
import {
  getMailPrintConfig,
  getPublicMailSettings,
  verifySmtp,
  sendMailPrint,
  sendOrderNotification,
  MAIL_SETTING_KEYS,
} from "./mail-print.js";
import {
  sendCustomerOrderEmail,
  sendPasswordResetEmail,
  customerEmailKindForStatus,
  getPublicCustomerEmailSettings,
  CUSTOMER_EMAIL_SETTING_KEYS,
  isValidEmail,
} from "./customer-email.js";
import { attachModifiersToSections, priceLineWithModifiers } from "./order-modifiers.js";
import {
  buildReceiptText,
  getReceiptTemplate,
  normalizeTemplate,
  SAMPLE_ORDER,
  EPSON_DEFAULTS,
  RECEIPT_SETTING_KEYS,
} from "./receipt-template.js";
import {
  getStripe,
  getStripeConfig,
  getStripeWebhookSecret,
  getPublicStripeSettings,
  verifyStripe,
} from "./stripe-config.js";
import { injectSeoIntoHtml, buildSitemapXml } from "./seo-html.js";
import { getPageSeo } from "../shared/seo.mjs";

loadEnv();

/**
 * Kitchen ticket dispatch (Epson mail-to-print and/or LAN agent queue).
 * @param {object} order
 * @param {{ notifyStaff?: boolean, customerReceipt?: boolean }} [opts]
 */
async function dispatchPrint(order, opts = {}) {
  const notifyStaff = opts.notifyStaff !== false;
  const customerReceipt = opts.customerReceipt === true;
  if (!order) return { method: "none", email: null, notify: null, customer: null };
  const cfg = await getMailPrintConfig();
  const method = cfg.print_method;
  let email = null;

  if (method === "email" || method === "both") {
    email = await sendMailPrint(order);
    if (method === "email") {
      await query("UPDATE orders SET print_status = $1, print_claimed_at = NULL WHERE id = $2", [
        email.ok ? "printed" : "failed",
        order.id,
      ]);
    }
    console.log(
      `[print] email ${email.ok ? "ok" : "fail"} order ${order.order_number}: ${email.message}`
    );
  }

  let notify = null;
  if (notifyStaff) {
    try {
      notify = await sendOrderNotification(order);
      if (!notify.skipped) {
        console.log(
          `[notify] ${notify.ok ? "ok" : "fail"} order ${order.order_number}: ${notify.message}`
        );
      }
    } catch (err) {
      console.error("[notify] failed:", err.message);
      notify = { ok: false, message: err.message };
    }
  }

  let customer = null;
  if (customerReceipt) {
    try {
      customer = await sendCustomerOrderEmail(order, "receipt");
      if (!customer.skipped) {
        console.log(
          `[customer-email] receipt ${customer.ok ? "ok" : "fail"} ${order.order_number}: ${customer.message}`
        );
      }
    } catch (err) {
      console.error("[customer-email] receipt failed:", err.message);
      customer = { ok: false, message: err.message };
    }
  }

  return { method, email, notify, customer };
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const SESSION_TTL_HOURS = 12;
const CUSTOMER_SESSION_TTL_DAYS = 30;
const RESET_TTL_HOURS = 1;
const PUBLIC_SITE_URL = (process.env.PUBLIC_SITE_URL || "https://dinergrill.com").replace(/\/$/, "");

/** Simple in-memory rate limit: key → timestamps[] */
const authAttempts = new Map();
function rateLimited(key, limit = 20, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const prev = (authAttempts.get(key) || []).filter((t) => now - t < windowMs);
  prev.push(now);
  authAttempts.set(key, prev);
  return prev.length > limit;
}

await initDb();

// Auto-seed an empty database so a fresh clone is usable immediately; on an
// existing database, reconcile to the printed menu only when SYNC_MENU=1.
if (await seedIfEmpty()) {
  console.log("[server] Empty database — seeded menu from server/seed-data.js");
} else if (process.env.SYNC_MENU === "1") {
  const c = await syncMenu();
  console.log(
    `[server] SYNC_MENU=1 — sections +${c.sectionsInserted}/${c.sectionsUpdated} updated, ` +
      `items +${c.itemsInserted}/${c.itemsUpdated} updated/${c.itemsDeactivated} deactivated`
  );
}

// Always backfill item photos from the seed menu when items have no image or
// still reference legacy .jpg files (safe: never overwrites admin uploads).
try {
  const n = await backfillImagesFromSeed();
  if (n > 0) console.log(`[server] Backfilled ${n} item photo(s) from seed menu`);
} catch (err) {
  console.error("[server] image backfill failed:", err.message);
}

const app = express();
app.use(cors());

// ---------------------------------------------------------------------------
// Stripe webhook — MUST be registered before express.json() (needs raw body).
// ---------------------------------------------------------------------------
app.post("/api/stripe/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  const stripe = await getStripe();
  const webhookSecret = await getStripeWebhookSecret();
  if (!stripe || !webhookSecret) {
    return res.status(503).json({ error: "Stripe webhook not configured on this server." });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      webhookSecret
    );
  } catch (err) {
    console.warn("[webhook] signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const result = await query(
      "UPDATE orders SET status = 'paid', print_status = 'queued', print_claimed_at = NULL WHERE stripe_payment_intent = $1 AND status = 'pending_payment' RETURNING *",
      [pi.id]
    );
    console.log(`[webhook] payment_intent.succeeded ${pi.id} → orders updated: ${result.rowCount}`);
    if (result.rows[0]) {
      try {
        await dispatchPrint(parseOrder(result.rows[0]), {
          notifyStaff: true,
          customerReceipt: true,
        });
      } catch (err) {
        console.error("[webhook] dispatchPrint failed:", err.message);
      }
    }
  }
  res.json({ received: true });
});

// JSON body parsing for everything else. 6mb headroom so base64 photo
// uploads (~5.4MB for a 4MB image) fit through POST /api/admin/upload.
app.use(express.json({ limit: "6mb" }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function bad(res, status, message) {
  return res.status(status).json({ error: message });
}

/** Wrap async route handlers so rejections become 500s instead of hangs. */
function h(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

async function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return bad(res, 401, "Unauthorized — valid Bearer token required.");

  // Static token (print agent / automation), only when explicitly configured.
  if (ADMIN_TOKEN && token === ADMIN_TOKEN) return next();

  try {
    const { rows } = await query(
      "SELECT s.token, u.username FROM admin_sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.token = $1 AND s.expires_at > now()",
      [token]
    );
    if (!rows[0]) return bad(res, 401, "Unauthorized — session expired or invalid.");
    req.adminUser = rows[0].username;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional image path from a request body — string (≤300 chars) or null. */
function imageOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value).slice(0, 300);
}

// ---------------------------------------------------------------------------
// Admin login — username/password → session token.
// ---------------------------------------------------------------------------
app.post("/api/admin/login", h(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return bad(res, 400, "username and password are required.");
  const { rows } = await query("SELECT id, password_hash FROM admin_users WHERE username = $1", [
    String(username).trim(),
  ]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(String(password), user.password_hash));
  if (!ok) return bad(res, 401, "Invalid username or password.");

  const token = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO admin_sessions (token, user_id, expires_at) VALUES ($1, $2, now() + ($3 || ' hours')::interval)",
    [token, user.id, String(SESSION_TTL_HOURS)]
  );
  // Opportunistic cleanup of expired sessions.
  query("DELETE FROM admin_sessions WHERE expires_at <= now()").catch(() => {});
  res.json({ token, username: String(username).trim() });
}));

app.post("/api/admin/logout", adminAuth, h(async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  await query("DELETE FROM admin_sessions WHERE token = $1", [token]);
  res.json({ ok: true });
}));

// ---------------------------------------------------------------------------
// Customer auth (email + password sessions)
// ---------------------------------------------------------------------------

function customerPublic(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name || "",
    phone: row.phone || "",
    marketing_opt_in: Boolean(row.marketing_opt_in),
  };
}

async function customerAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return bad(res, 401, "Sign in required.");
  try {
    const { rows } = await query(
      `SELECT c.id, c.email, c.name, c.phone, c.marketing_opt_in
       FROM customer_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.token = $1 AND s.expires_at > now()`,
      [token]
    );
    if (!rows[0]) return bad(res, 401, "Session expired — please sign in again.");
    req.customer = rows[0];
    req.customerToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

/** Optional customer session — never 401s; sets req.customer when valid. */
async function optionalCustomerAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return next();
  try {
    const { rows } = await query(
      `SELECT c.id, c.email, c.name, c.phone, c.marketing_opt_in
       FROM customer_sessions s
       JOIN customers c ON c.id = s.customer_id
       WHERE s.token = $1 AND s.expires_at > now()`,
      [token]
    );
    if (rows[0]) {
      req.customer = rows[0];
      req.customerToken = token;
    }
  } catch {
    /* ignore */
  }
  next();
}

async function issueCustomerSession(customerId) {
  const token = crypto.randomBytes(32).toString("hex");
  await query(
    "INSERT INTO customer_sessions (token, customer_id, expires_at) VALUES ($1, $2, now() + ($3 || ' days')::interval)",
    [token, customerId, String(CUSTOMER_SESSION_TTL_DAYS)]
  );
  query("DELETE FROM customer_sessions WHERE expires_at <= now()").catch(() => {});
  return token;
}

app.post("/api/auth/register", h(async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (rateLimited(`reg:${ip}`)) return bad(res, 429, "Too many attempts — try again later.");

  const { email, password, name, phone, marketing_opt_in } = req.body || {};
  const emailNorm = String(email || "")
    .trim()
    .toLowerCase();
  if (!isValidEmail(emailNorm)) return bad(res, 400, "A valid email is required.");
  if (!password || String(password).length < 8) {
    return bad(res, 400, "Password must be at least 8 characters.");
  }
  const nameTrim = String(name || "").trim();
  if (!nameTrim) return bad(res, 400, "Name is required.");

  const hash = await bcrypt.hash(String(password), 10);
  try {
    const { rows } = await query(
      `INSERT INTO customers (email, password_hash, name, phone, marketing_opt_in)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, phone, marketing_opt_in`,
      [
        emailNorm,
        hash,
        nameTrim.slice(0, 120),
        phone ? String(phone).trim().slice(0, 40) : "",
        Boolean(marketing_opt_in),
      ]
    );
    const token = await issueCustomerSession(rows[0].id);
    res.status(201).json({ token, customer: customerPublic(rows[0]) });
  } catch (err) {
    if (err && err.code === "23505") {
      return bad(res, 409, "An account with that email already exists. Sign in instead.");
    }
    throw err;
  }
}));

app.post("/api/auth/login", h(async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (rateLimited(`login:${ip}`)) return bad(res, 429, "Too many attempts — try again later.");

  const { email, password } = req.body || {};
  const emailNorm = String(email || "")
    .trim()
    .toLowerCase();
  if (!isValidEmail(emailNorm) || !password) {
    return bad(res, 400, "Email and password are required.");
  }
  const { rows } = await query(
    "SELECT id, email, name, phone, marketing_opt_in, password_hash FROM customers WHERE email = $1",
    [emailNorm]
  );
  const user = rows[0];
  const ok = user && (await bcrypt.compare(String(password), user.password_hash));
  if (!ok) return bad(res, 401, "Invalid email or password.");
  const token = await issueCustomerSession(user.id);
  res.json({ token, customer: customerPublic(user) });
}));

app.post("/api/auth/logout", customerAuth, h(async (req, res) => {
  await query("DELETE FROM customer_sessions WHERE token = $1", [req.customerToken]);
  res.json({ ok: true });
}));

app.get("/api/auth/me", customerAuth, h(async (req, res) => {
  res.json({ customer: customerPublic(req.customer) });
}));

app.patch("/api/auth/me", customerAuth, h(async (req, res) => {
  const { name, phone, marketing_opt_in } = req.body || {};
  const { rows: cur } = await query(
    "SELECT id, email, name, phone, marketing_opt_in FROM customers WHERE id = $1",
    [req.customer.id]
  );
  if (!cur[0]) return bad(res, 404, "Account not found.");
  const nextName =
    name !== undefined ? String(name).trim().slice(0, 120) : cur[0].name;
  if (!nextName) return bad(res, 400, "Name is required.");
  const nextPhone =
    phone !== undefined ? String(phone).trim().slice(0, 40) : cur[0].phone;
  const nextOpt =
    marketing_opt_in !== undefined ? Boolean(marketing_opt_in) : cur[0].marketing_opt_in;
  const { rows } = await query(
    `UPDATE customers
     SET name = $1, phone = $2, marketing_opt_in = $3, updated_at = now()
     WHERE id = $4
     RETURNING id, email, name, phone, marketing_opt_in`,
    [nextName, nextPhone, nextOpt, req.customer.id]
  );
  res.json({ customer: customerPublic(rows[0]) });
}));

app.post("/api/auth/forgot-password", h(async (req, res) => {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  if (rateLimited(`forgot:${ip}`, 10)) {
    return bad(res, 429, "Too many attempts — try again later.");
  }
  const emailNorm = String((req.body || {}).email || "")
    .trim()
    .toLowerCase();
  // Always same response — don't leak whether the email exists.
  const generic = {
    ok: true,
    message: "If an account exists for that email, a reset link is on its way.",
  };
  if (!isValidEmail(emailNorm)) return res.json(generic);

  const { rows } = await query("SELECT id, name, email FROM customers WHERE email = $1", [
    emailNorm,
  ]);
  if (!rows[0]) return res.json(generic);

  const token = crypto.randomBytes(32).toString("hex");
  await query("DELETE FROM password_reset_tokens WHERE customer_id = $1", [rows[0].id]);
  await query(
    "INSERT INTO password_reset_tokens (token, customer_id, expires_at) VALUES ($1, $2, now() + ($3 || ' hours')::interval)",
    [token, rows[0].id, String(RESET_TTL_HOURS)]
  );
  const resetUrl = `${PUBLIC_SITE_URL}/account/reset?token=${token}`;
  const sent = await sendPasswordResetEmail({
    to: rows[0].email,
    name: rows[0].name,
    resetUrl,
  });
  if (!sent.ok && !sent.skipped) {
    console.error("[auth] password reset email failed:", sent.message);
  }
  res.json(generic);
}));

app.post("/api/auth/reset-password", h(async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !String(token).trim()) return bad(res, 400, "Reset token is required.");
  if (!password || String(password).length < 8) {
    return bad(res, 400, "Password must be at least 8 characters.");
  }
  const { rows } = await query(
    `SELECT t.token, t.customer_id FROM password_reset_tokens t
     WHERE t.token = $1 AND t.expires_at > now()`,
    [String(token).trim()]
  );
  if (!rows[0]) return bad(res, 400, "This reset link is invalid or has expired.");
  const hash = await bcrypt.hash(String(password), 10);
  await query("UPDATE customers SET password_hash = $1, updated_at = now() WHERE id = $2", [
    hash,
    rows[0].customer_id,
  ]);
  await query("DELETE FROM password_reset_tokens WHERE customer_id = $1", [rows[0].customer_id]);
  await query("DELETE FROM customer_sessions WHERE customer_id = $1", [rows[0].customer_id]);
  const session = await issueCustomerSession(rows[0].customer_id);
  const { rows: cust } = await query(
    "SELECT id, email, name, phone, marketing_opt_in FROM customers WHERE id = $1",
    [rows[0].customer_id]
  );
  res.json({ token: session, customer: customerPublic(cust[0]) });
}));

app.get("/api/me/orders", customerAuth, h(async (req, res) => {
  const { rows } = await query(
    `SELECT id, order_number, customer_name, status, total_cents, subtotal_cents, tax_cents,
            items_json, created_at
     FROM orders
     WHERE customer_id = $1
     ORDER BY created_at DESC, id DESC
     LIMIT 50`,
    [req.customer.id]
  );
  res.json({
    orders: rows.map((r) => ({
      id: r.id,
      order_number: r.order_number,
      customer_name: r.customer_name,
      status: r.status,
      total_cents: r.total_cents,
      subtotal_cents: r.subtotal_cents,
      tax_cents: r.tax_cents,
      created_at:
        r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at,
      items: JSON.parse(r.items_json),
    })),
  });
}));

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// GET /api/menu — sections with available items. Sections whose items were
// all deactivated by a menu sync (legacy categories) are hidden entirely.
app.get("/api/menu", h(async (req, res) => {
  const sections = (await query("SELECT id, label, note, sort FROM sections ORDER BY sort, id")).rows;
  const items = (
    await query(
      "SELECT id, section_id, name, price_cents, description, tag, image FROM items WHERE available = 1 ORDER BY sort, id"
    )
  ).rows;
  const shaped = sections
    .map((s) => ({
      ...s,
      items: items.filter((i) => i.section_id === s.id).map(({ section_id, ...rest }) => rest),
    }))
    .filter((s) => s.items.length > 0);
  res.json({ sections: attachModifiersToSections(shaped) });
}));

// GET /api/stripe/config — publishable key for the checkout page (safe to expose).
app.get("/api/stripe/config", h(async (req, res) => {
  const cfg = await getStripeConfig();
  res.json({
    publishable_key: cfg.publishable_key || null,
    configured: cfg.configured,
    test_mode: cfg.test_mode,
  });
}));

// POST /api/orders — validate, price (incl. modifiers), create order + Stripe PaymentIntent.
app.post("/api/orders", optionalCustomerAuth, h(async (req, res) => {
  const paymentMethod = req.body && req.body.payment_method === "cash" ? "cash" : "card";
  const stripe = await getStripe();
  if (paymentMethod === "card" && !stripe) {
    return bad(
      res,
      503,
      "Online card payment is not configured. Choose cash at pickup, or call (773) 248-2030 to order."
    );
  }

  const { customer_name, phone, customer_email, notes, items, marketing_opt_in } = req.body || {};
  if (!customer_name || !String(customer_name).trim()) {
    return bad(res, 400, "customer_name is required.");
  }
  if (!phone || !String(phone).trim()) {
    return bad(res, 400, "phone is required.");
  }
  const emailRaw = customer_email != null ? String(customer_email).trim() : "";
  if (!emailRaw || !isValidEmail(emailRaw)) {
    return bad(res, 400, "A valid email is required for your receipt and order updates.");
  }

  // Logged-in customers: attach order + optionally refresh marketing opt-in.
  const customerId = req.customer ? req.customer.id : null;
  if (req.customer && marketing_opt_in !== undefined) {
    await query(
      "UPDATE customers SET marketing_opt_in = $1, updated_at = now() WHERE id = $2",
      [Boolean(marketing_opt_in), req.customer.id]
    );
  } else if (!req.customer && marketing_opt_in) {
    await query(
      `INSERT INTO marketing_subscribers (email, name, source)
       VALUES ($1, $2, 'checkout')
       ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
      [emailRaw.toLowerCase(), String(customer_name).trim().slice(0, 120)]
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return bad(res, 400, "items must be a non-empty array of {item_id, qty}.");
  }

  const lines = [];
  for (const entry of items) {
    const itemId = Number(entry && entry.item_id);
    const qty = Math.floor(Number(entry && entry.qty));
    if (!Number.isInteger(itemId) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      return bad(res, 400, "Each item needs a valid item_id and qty between 1 and 50.");
    }
    const { rows } = await query(
      `SELECT i.id, i.name, i.price_cents, s.label AS section_label
       FROM items i
       JOIN sections s ON s.id = i.section_id
       WHERE i.id = $1 AND i.available = 1`,
      [itemId]
    );
    if (!rows[0]) {
      return bad(res, 400, `Item ${itemId} does not exist or is unavailable.`);
    }
    const priced = priceLineWithModifiers(rows[0], rows[0].section_label, entry.modifiers || []);
    if (!priced.ok) return bad(res, 400, priced.error);
    const lineNote =
      entry.line_note && String(entry.line_note).trim()
        ? String(entry.line_note).trim().slice(0, 120)
        : null;
    lines.push({
      item_id: rows[0].id,
      name: rows[0].name,
      qty,
      price_cents: priced.unit_price_cents,
      modifiers: priced.modifiers,
      line_note: lineNote,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  let order;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO orders (order_number, customer_name, phone, customer_email, notes, items_json, subtotal_cents, tax_cents, total_cents, status, print_status, customer_id, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ${paymentMethod === "cash" ? "'paid'" : "'pending_payment'"}, 'queued', $10, $11) RETURNING id`,
      [
        `PENDING-${crypto.randomUUID()}`,
        String(customer_name).trim(),
        String(phone).trim(),
        emailRaw.toLowerCase(),
        notes ? String(notes).slice(0, 500) : null,
        JSON.stringify(lines),
        subtotal,
        tax,
        total,
        customerId,
        paymentMethod,
      ]
    );
    const id = ins.rows[0].id;
    const orderNumber = `DG-${String(1000 + Number(id))}`;
    await client.query("UPDATE orders SET order_number = $1 WHERE id = $2", [orderNumber, id]);
    await client.query("COMMIT");
    order = { id, orderNumber };
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[orders] insert failed:", err);
    return bad(res, 500, "Could not create order.");
  } finally {
    client.release();
  }

  // Cash at pickup — no Stripe involved. The order is immediately live for the
  // kitchen (status 'paid' drives the admin "New" flow + print queue); staff
  // collect cash at the counter. Run the same post-payment dispatch as the
  // Stripe webhook so kitchen tickets / staff notifications / customer
  // receipts fire regardless of print mode.
  if (paymentMethod === "cash") {
    try {
      const { rows } = await query("SELECT * FROM orders WHERE id = $1", [order.id]);
      if (rows[0]) {
        await dispatchPrint(parseOrder(rows[0]), { notifyStaff: true, customerReceipt: true });
      }
    } catch (err) {
      console.error("[orders] cash dispatchPrint failed:", err.message);
    }
    return res.json({
      order_number: order.orderNumber,
      total_cents: total,
      payment_method: "cash",
    });
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: emailRaw.toLowerCase(),
      metadata: {
        order_number: order.orderNumber,
        order_id: String(order.id),
        customer_email: emailRaw.toLowerCase(),
      },
      description: `Diner Grill order ${order.orderNumber}`,
    });
    await query("UPDATE orders SET stripe_payment_intent = $1 WHERE id = $2", [pi.id, order.id]);
    return res.json({
      order_number: order.orderNumber,
      client_secret: pi.client_secret,
      total_cents: total,
    });
  } catch (err) {
    console.error("[orders] Stripe PaymentIntent failed:", err.message);
    await query("DELETE FROM orders WHERE id = $1", [order.id]);
    return bad(res, 502, `Stripe error: ${err.message}`);
  }
}));

// ---------------------------------------------------------------------------
// Print agent API (token-protected)
// ---------------------------------------------------------------------------

// GET /api/print/next — atomically claim the oldest unprinted active order so
// concurrent pollers never print the same ticket twice. A claimed order stays
// 'queued' until /result reports; re-claims of stale claims happen after 2 min.
app.get("/api/print/next", adminAuth, h(async (req, res) => {
  const { rows } = await query(
    `WITH next AS (
       SELECT id FROM orders
       WHERE status IN ('paid','preparing','ready') AND print_status = 'queued'
         AND (print_claimed_at IS NULL OR print_claimed_at < now() - interval '2 minutes')
       ORDER BY created_at ASC, id ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     UPDATE orders o SET print_claimed_at = now()
     FROM next WHERE o.id = next.id
     RETURNING o.*`
  );
  res.json({ order: parseOrder(rows[0]) });
}));

// POST /api/print/:id/result — report print outcome.
app.post("/api/print/:id/result", adminAuth, h(async (req, res) => {
  const ok = !!(req.body && req.body.ok);
  const result = await query("UPDATE orders SET print_status = $1 WHERE id = $2", [
    ok ? "printed" : "failed",
    Number(req.params.id),
  ]);
  if (result.rowCount === 0) return bad(res, 404, "Order not found.");
  res.json({ ok: true, print_status: ok ? "printed" : "failed" });
}));

// ---------------------------------------------------------------------------
// Admin API (token-protected)
// ---------------------------------------------------------------------------

// GET /api/admin/menu — ALL sections with ALL items, including unavailable ones.
app.get("/api/admin/menu", adminAuth, h(async (req, res) => {
  const sections = (await query("SELECT id, label, note, sort FROM sections ORDER BY sort, id")).rows;
  const items = (
    await query(
      "SELECT id, section_id, name, price_cents, description, tag, available, sort, image FROM items ORDER BY sort, id"
    )
  ).rows;
  res.json({
    sections: sections.map((s) => ({ ...s, items: items.filter((i) => i.section_id === s.id) })),
  });
}));

// --- Photo uploads ---
const UPLOAD_DIR = path.join(__dirname, "data", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const UPLOAD_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB

/** Delete an admin-uploaded file. Never touches seed assets under /photos/. */
function unlinkUploadIfOwned(imageUrl) {
  if (!imageUrl || typeof imageUrl !== "string") return;
  if (!imageUrl.startsWith("/uploads/")) return;
  const name = path.basename(imageUrl);
  if (!name || name.includes("..") || name !== imageUrl.slice("/uploads/".length)) return;
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, name));
    console.log(`[upload] removed ${name}`);
  } catch {
    /* already gone — fine */
  }
}

// POST /api/admin/upload — {filename, dataBase64} → {url}. Converts to WebP for faster loads.
app.post("/api/admin/upload", adminAuth, h(async (req, res) => {
  const { filename, dataBase64 } = req.body || {};
  if (!filename || typeof filename !== "string") return bad(res, 400, "filename is required.");
  if (!dataBase64 || typeof dataBase64 !== "string") return bad(res, 400, "dataBase64 is not valid base64.");
  const ext = path.extname(filename).toLowerCase().replace(".", "");
  if (!UPLOAD_EXTS.has(ext)) {
    return bad(res, 400, "Only jpg, jpeg, png or webp images are allowed.");
  }
  let buf;
  try {
    buf = Buffer.from(dataBase64, "base64");
  } catch {
    return bad(res, 400, "dataBase64 is not valid base64.");
  }
  if (!buf || buf.length === 0) return bad(res, 400, "The uploaded file is empty.");
  if (buf.length > MAX_UPLOAD_BYTES) {
    return bad(res, 400, "Image is too large — 4MB max.");
  }

  let out;
  try {
    const sharp = (await import("sharp")).default;
    out = await sharp(buf)
      .rotate()
      .resize({ width: 1280, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5, smartSubsample: true })
      .toBuffer();
  } catch {
    return bad(res, 400, "Could not process that image — try another file.");
  }

  const safeName = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.webp`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), out);
  console.log(`[upload] saved ${safeName} (${out.length} bytes, from ${buf.length})`);
  res.status(201).json({ url: `/uploads/${safeName}` });
}));

// --- Sections ---
app.post("/api/admin/sections", adminAuth, h(async (req, res) => {
  const { label, note, sort } = req.body || {};
  if (!label || !String(label).trim()) return bad(res, 400, "label is required.");
  const { rows } = await query(
    "INSERT INTO sections (label, note, sort) VALUES ($1, $2, $3) RETURNING *",
    [String(label).trim(), note ? String(note) : null, Number(sort) || 0]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/admin/sections/:id", adminAuth, h(async (req, res) => {
  const id = Number(req.params.id);
  const existing = (await query("SELECT * FROM sections WHERE id = $1", [id])).rows[0];
  if (!existing) return bad(res, 404, "Section not found.");
  const { label, note, sort } = req.body || {};
  const { rows } = await query(
    "UPDATE sections SET label = $1, note = $2, sort = $3 WHERE id = $4 RETURNING *",
    [
      label !== undefined ? String(label).trim() : existing.label,
      note !== undefined ? (note ? String(note) : null) : existing.note,
      sort !== undefined ? Number(sort) || 0 : existing.sort,
      id,
    ]
  );
  res.json(rows[0]);
}));

app.delete("/api/admin/sections/:id", adminAuth, h(async (req, res) => {
  const id = Number(req.params.id);
  const imgs = (await query("SELECT image FROM items WHERE section_id = $1", [id])).rows;
  const result = await query("DELETE FROM sections WHERE id = $1", [id]);
  if (result.rowCount === 0) return bad(res, 404, "Section not found.");
  for (const row of imgs) unlinkUploadIfOwned(row.image);
  res.json({ ok: true });
}));

// --- Items ---
app.post("/api/admin/items", adminAuth, h(async (req, res) => {
  const { section_id, name, price_cents, description, tag, available, sort, image } = req.body || {};
  const sectionId = Number(section_id);
  if (!Number.isInteger(sectionId)) return bad(res, 400, "section_id is required.");
  if (!(await query("SELECT id FROM sections WHERE id = $1", [sectionId])).rows[0]) {
    return bad(res, 400, `Section ${sectionId} does not exist.`);
  }
  if (!name || !String(name).trim()) return bad(res, 400, "name is required.");
  const cents = Number(price_cents);
  if (!Number.isInteger(cents) || cents < 0) {
    return bad(res, 400, "price_cents must be a non-negative integer.");
  }
  const { rows } = await query(
    "INSERT INTO items (section_id, name, price_cents, description, tag, available, sort, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
    [
      sectionId,
      String(name).trim(),
      cents,
      description ? String(description) : null,
      tag ? String(tag) : null,
      available === false || available === 0 ? 0 : 1,
      Number(sort) || 0,
      imageOrNull(image),
    ]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/admin/items/:id", adminAuth, h(async (req, res) => {
  const id = Number(req.params.id);
  const existing = (await query("SELECT * FROM items WHERE id = $1", [id])).rows[0];
  if (!existing) return bad(res, 404, "Item not found.");
  const { section_id, name, price_cents, description, tag, available, sort, image } = req.body || {};
  if (section_id !== undefined) {
    const sid = Number(section_id);
    if (!(await query("SELECT id FROM sections WHERE id = $1", [sid])).rows[0]) {
      return bad(res, 400, `Section ${sid} does not exist.`);
    }
  }
  if (price_cents !== undefined && (!Number.isInteger(Number(price_cents)) || Number(price_cents) < 0)) {
    return bad(res, 400, "price_cents must be a non-negative integer.");
  }
  const nextImage = image !== undefined ? imageOrNull(image) : existing.image;
  const { rows } = await query(
    `UPDATE items SET section_id = $1, name = $2, price_cents = $3, description = $4, tag = $5, available = $6, sort = $7, image = $8
     WHERE id = $9 RETURNING *`,
    [
      section_id !== undefined ? Number(section_id) : existing.section_id,
      name !== undefined ? String(name).trim() : existing.name,
      price_cents !== undefined ? Number(price_cents) : existing.price_cents,
      description !== undefined ? (description ? String(description) : null) : existing.description,
      tag !== undefined ? (tag ? String(tag) : null) : existing.tag,
      available !== undefined ? (available === false || available === 0 ? 0 : 1) : existing.available,
      sort !== undefined ? Number(sort) || 0 : existing.sort,
      nextImage,
      id,
    ]
  );
  // Drop the previous upload when the photo is cleared or replaced.
  if (image !== undefined && existing.image && existing.image !== nextImage) {
    unlinkUploadIfOwned(existing.image);
  }
  res.json(rows[0]);
}));

app.delete("/api/admin/items/:id", adminAuth, h(async (req, res) => {
  const id = Number(req.params.id);
  const existing = (await query("SELECT image FROM items WHERE id = $1", [id])).rows[0];
  if (!existing) return bad(res, 404, "Item not found.");
  await query("DELETE FROM items WHERE id = $1", [id]);
  unlinkUploadIfOwned(existing.image);
  res.json({ ok: true });
}));

// --- Dashboard stats ---
app.get("/api/admin/dashboard", adminAuth, h(async (req, res) => {
  const paidStatuses = `('paid','preparing','ready','done')`;

  const { rows: todayRows } = await query(
    `SELECT
       COUNT(*)::int AS order_count,
       COALESCE(SUM(total_cents), 0)::int AS revenue_cents,
       COALESCE(AVG(total_cents), 0)::int AS avg_ticket_cents
     FROM orders
     WHERE status IN ${paidStatuses}
       AND (created_at AT TIME ZONE 'America/Chicago')::date
           = (now() AT TIME ZONE 'America/Chicago')::date`
  );

  const { rows: yesterdayRows } = await query(
    `SELECT
       COUNT(*)::int AS order_count,
       COALESCE(SUM(total_cents), 0)::int AS revenue_cents
     FROM orders
     WHERE status IN ${paidStatuses}
       AND (created_at AT TIME ZONE 'America/Chicago')::date
           = (now() AT TIME ZONE 'America/Chicago')::date - 1`
  );

  const { rows: weekRows } = await query(
    `SELECT
       COUNT(*)::int AS order_count,
       COALESCE(SUM(total_cents), 0)::int AS revenue_cents
     FROM orders
     WHERE status IN ${paidStatuses}
       AND created_at >= now() - interval '7 days'`
  );

  const { rows: prevWeekRows } = await query(
    `SELECT
       COUNT(*)::int AS order_count,
       COALESCE(SUM(total_cents), 0)::int AS revenue_cents
     FROM orders
     WHERE status IN ${paidStatuses}
       AND created_at >= now() - interval '14 days'
       AND created_at < now() - interval '7 days'`
  );

  const { rows: statusRows } = await query(
    `SELECT status, COUNT(*)::int AS count
     FROM orders
     GROUP BY status`
  );

  const { rows: printRows } = await query(
    `SELECT print_status, COUNT(*)::int AS count
     FROM orders
     WHERE status IN ('paid','preparing','ready')
     GROUP BY print_status`
  );

  const { rows: seriesRows } = await query(
    `WITH days AS (
       SELECT generate_series(
         (now() AT TIME ZONE 'America/Chicago')::date - 6,
         (now() AT TIME ZONE 'America/Chicago')::date,
         '1 day'::interval
       )::date AS day
     )
     SELECT
       d.day,
       COALESCE(COUNT(o.id), 0)::int AS order_count,
       COALESCE(SUM(o.total_cents), 0)::int AS revenue_cents
     FROM days d
     LEFT JOIN orders o
       ON (o.created_at AT TIME ZONE 'America/Chicago')::date = d.day
      AND o.status IN ${paidStatuses}
     GROUP BY d.day
     ORDER BY d.day ASC`
  );

  const { rows: recentRows } = await query(
    `SELECT id, order_number, customer_name, phone, status, total_cents, print_status, created_at, items_json
     FROM orders
     WHERE status IN ('paid','preparing','ready','done','pending_payment')
     ORDER BY created_at DESC, id DESC
     LIMIT 8`
  );

  const { rows: menuRows } = await query(
    `SELECT
       (SELECT COUNT(*)::int FROM sections) AS sections,
       (SELECT COUNT(*)::int FROM items WHERE available = 1) AS items_live,
       (SELECT COUNT(*)::int FROM items WHERE available = 0) AS items_hidden`
  );

  let topItems = [];
  try {
    const topResult = await query(
      `SELECT
         item->>'name' AS name,
         SUM((item->>'qty')::int)::int AS qty,
         SUM((item->>'qty')::int * (item->>'price_cents')::int)::int AS revenue_cents
       FROM orders o,
            jsonb_array_elements(o.items_json::jsonb) AS item
       WHERE o.status IN ${paidStatuses}
         AND o.created_at >= now() - interval '7 days'
       GROUP BY 1
       ORDER BY qty DESC
       LIMIT 5`
    );
    topItems = topResult.rows;
  } catch {
    topItems = [];
  }

  const status_counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0]));
  for (const r of statusRows) status_counts[r.status] = r.count;

  const print_counts = { queued: 0, printed: 0, failed: 0 };
  for (const r of printRows) {
    if (r.print_status in print_counts) print_counts[r.print_status] = r.count;
  }

  const daily = seriesRows.map((r) => {
    const key =
      r.day instanceof Date
        ? r.day.toISOString().slice(0, 10)
        : String(r.day).slice(0, 10);
    // Noon UTC avoids DST edge cases when labeling the calendar date.
    const labelDate = new Date(`${key}T12:00:00Z`);
    return {
      date: key,
      label: labelDate.toLocaleDateString("en-US", {
        timeZone: "America/Chicago",
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      order_count: r.order_count,
      revenue_cents: r.revenue_cents,
    };
  });

  const stripeCfg = await getStripeConfig();
  const mailCfg = await getMailPrintConfig();

  const today = todayRows[0] || { order_count: 0, revenue_cents: 0, avg_ticket_cents: 0 };
  const yesterday = yesterdayRows[0] || { order_count: 0, revenue_cents: 0 };
  const week = weekRows[0] || { order_count: 0, revenue_cents: 0 };
  const prevWeek = prevWeekRows[0] || { order_count: 0, revenue_cents: 0 };

  function pctChange(current, previous) {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }

  res.json({
    generated_at: new Date().toISOString(),
    today: {
      order_count: today.order_count,
      revenue_cents: today.revenue_cents,
      avg_ticket_cents: today.avg_ticket_cents,
      revenue_change_pct: pctChange(today.revenue_cents, yesterday.revenue_cents),
      order_change_pct: pctChange(today.order_count, yesterday.order_count),
    },
    week: {
      order_count: week.order_count,
      revenue_cents: week.revenue_cents,
      revenue_change_pct: pctChange(week.revenue_cents, prevWeek.revenue_cents),
      order_change_pct: pctChange(week.order_count, prevWeek.order_count),
    },
    kitchen: {
      active: (status_counts.paid || 0) + (status_counts.preparing || 0) + (status_counts.ready || 0),
      paid: status_counts.paid || 0,
      preparing: status_counts.preparing || 0,
      ready: status_counts.ready || 0,
      pending_payment: status_counts.pending_payment || 0,
    },
    status_counts,
    print_counts,
    daily,
    top_items: topItems.map((r) => ({
      name: r.name,
      qty: r.qty,
      revenue_cents: r.revenue_cents,
    })),
    recent_orders: recentRows.map((row) => {
      const o = parseOrder(row);
      return {
        id: o.id,
        order_number: o.order_number,
        customer_name: o.customer_name,
        phone: o.phone,
        status: o.status,
        total_cents: o.total_cents,
        print_status: o.print_status,
        created_at: o.created_at,
        item_count: Array.isArray(o.items) ? o.items.reduce((n, it) => n + (it.qty || 0), 0) : 0,
      };
    }),
    menu: menuRows[0] || { sections: 0, items_live: 0, items_hidden: 0 },
    health: {
      stripe_configured: stripeCfg.configured,
      stripe_test_mode: stripeCfg.test_mode,
      smtp_ready: mailCfg.smtp_ready,
      mail_print_configured: mailCfg.configured,
      print_method: mailCfg.print_method,
      notify_configured: Boolean(mailCfg.notify_emails || mailCfg.notify_email_cc),
    },
  });
}));

// --- Orders ---
app.get("/api/admin/orders", adminAuth, h(async (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !ORDER_STATUSES.includes(status)) {
    return bad(res, 400, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
  }
  const { rows } = status
    ? await query(
        "SELECT * FROM orders WHERE status = $1 ORDER BY created_at DESC, id DESC LIMIT 200",
        [status]
      )
    : await query("SELECT * FROM orders ORDER BY created_at DESC, id DESC LIMIT 200");
  const stripeCfg = await getStripeConfig();
  const testMode = stripeCfg.test_mode;
  const dashBase = testMode
    ? "https://dashboard.stripe.com/test/payments"
    : "https://dashboard.stripe.com/payments";
  res.json({
    orders: rows.map((row) => {
      const o = parseOrder(row);
      return {
        ...o,
        stripe_dashboard_url: o.stripe_payment_intent
          ? `${dashBase}/${o.stripe_payment_intent}`
          : null,
      };
    }),
  });
}));

// GET /api/admin/transactions — Stripe / payment history from orders (+ live PI details).
app.get("/api/admin/transactions", adminAuth, h(async (req, res) => {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const filter = String(req.query.filter || "paid"); // paid | all | pending
  let sql =
    "SELECT * FROM orders WHERE stripe_payment_intent IS NOT NULL ORDER BY created_at DESC, id DESC LIMIT $1";
  const params = [limit];
  if (filter === "paid") {
    sql =
      "SELECT * FROM orders WHERE stripe_payment_intent IS NOT NULL AND status IN ('paid','preparing','ready','done') ORDER BY created_at DESC, id DESC LIMIT $1";
  } else if (filter === "pending") {
    sql =
      "SELECT * FROM orders WHERE stripe_payment_intent IS NOT NULL AND status = 'pending_payment' ORDER BY created_at DESC, id DESC LIMIT $1";
  }

  const { rows } = await query(sql, params);
  const stripe = await getStripe();
  const stripeCfg = await getStripeConfig();
  const testMode = stripeCfg.test_mode;
  const dashboardBase = testMode
    ? "https://dashboard.stripe.com/test/payments"
    : "https://dashboard.stripe.com/payments";

  const enrich = String(req.query.enrich || "1") !== "0";
  const transactions = [];

  for (const row of rows) {
    const order = parseOrder(row);
    let stripeDetails = null;
    if (enrich && stripe && order.stripe_payment_intent) {
      try {
        const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent, {
          expand: ["latest_charge", "latest_charge.payment_method_details"],
        });
        const charge =
          pi.latest_charge && typeof pi.latest_charge === "object" ? pi.latest_charge : null;
        const card = charge?.payment_method_details?.card || null;
        stripeDetails = {
          status: pi.status,
          amount: pi.amount,
          currency: pi.currency,
          created: pi.created,
          charge_id: charge?.id || (typeof pi.latest_charge === "string" ? pi.latest_charge : null),
          receipt_url: charge?.receipt_url || null,
          card_brand: card?.brand || null,
          card_last4: card?.last4 || null,
          paid: !!charge?.paid,
          refunded: !!charge?.refunded,
        };
      } catch (err) {
        stripeDetails = { error: err.message || "Could not load from Stripe" };
      }
    }

    transactions.push({
      id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      phone: order.phone,
      status: order.status,
      subtotal_cents: order.subtotal_cents,
      tax_cents: order.tax_cents,
      total_cents: order.total_cents,
      stripe_payment_intent: order.stripe_payment_intent,
      created_at: order.created_at,
      item_count: Array.isArray(order.items)
        ? order.items.reduce((n, it) => n + (it.qty || 0), 0)
        : 0,
      stripe: stripeDetails,
      stripe_dashboard_url: order.stripe_payment_intent
        ? `${dashboardBase}/${order.stripe_payment_intent}`
        : null,
    });
  }

  // Summary from DB (paid family only) — Chicago day boundary via AT TIME ZONE.
  const { rows: sumRows } = await query(
    `SELECT
       COUNT(*)::int AS count,
       COALESCE(SUM(total_cents), 0)::int AS total_cents
     FROM orders
     WHERE stripe_payment_intent IS NOT NULL
       AND status IN ('paid','preparing','ready','done')
       AND (created_at AT TIME ZONE 'America/Chicago')::date
           = (now() AT TIME ZONE 'America/Chicago')::date`
  );
  const { rows: weekRows } = await query(
    `SELECT
       COUNT(*)::int AS count,
       COALESCE(SUM(total_cents), 0)::int AS total_cents
     FROM orders
     WHERE stripe_payment_intent IS NOT NULL
       AND status IN ('paid','preparing','ready','done')
       AND created_at >= now() - interval '7 days'`
  );

  res.json({
    transactions,
    stripe_configured: !!stripe,
    test_mode: testMode,
    summary: {
      today_count: sumRows[0]?.count ?? 0,
      today_cents: sumRows[0]?.total_cents ?? 0,
      week_count: weekRows[0]?.count ?? 0,
      week_cents: weekRows[0]?.total_cents ?? 0,
    },
  });
}));

// POST /api/admin/test-stripe — verify Stripe secret key.
app.post("/api/admin/test-stripe", adminAuth, h(async (req, res) => {
  res.json(await verifyStripe());
}));

app.patch("/api/admin/orders/:id", adminAuth, h(async (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) {
    return bad(res, 400, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
  }
  const id = Number(req.params.id);
  const existing = (await query("SELECT * FROM orders WHERE id = $1", [id])).rows[0];
  if (!existing) return bad(res, 404, "Order not found.");
  const prevStatus = existing.status;
  if (prevStatus === status) {
    return res.json(parseOrder(existing));
  }

  const result = await query("UPDATE orders SET status = $1 WHERE id = $2 RETURNING *", [
    status,
    id,
  ]);
  const order = parseOrder(result.rows[0]);

  // Customer lifecycle emails on accept / ready / complete / cancel.
  const kind = customerEmailKindForStatus(prevStatus, status);
  let customer_email_result = null;
  if (kind) {
    try {
      customer_email_result = await sendCustomerOrderEmail(order, kind);
      if (!customer_email_result.skipped) {
        console.log(
          `[customer-email] ${kind} ${customer_email_result.ok ? "ok" : "fail"} ${order.order_number}: ${customer_email_result.message}`
        );
      }
    } catch (err) {
      console.error(`[customer-email] ${kind} failed:`, err.message);
      customer_email_result = { ok: false, message: err.message };
    }
  }

  res.json({ ...order, customer_email_result });
}));

app.post("/api/admin/orders/:id/reprint", adminAuth, h(async (req, res) => {
  const result = await query(
    "UPDATE orders SET print_status = 'queued', print_claimed_at = NULL WHERE id = $1 RETURNING *",
    [Number(req.params.id)]
  );
  if (result.rowCount === 0) return bad(res, 404, "Order not found.");
  const order = parseOrder(result.rows[0]);
  // Reprint kitchen ticket only — do not re-spam staff or customer.
  const dispatched = await dispatchPrint(order, {
    notifyStaff: false,
    customerReceipt: false,
  });
  const { rows } = await query("SELECT * FROM orders WHERE id = $1", [order.id]);
  const updated = parseOrder(rows[0]);
  res.json({
    ok: true,
    print_status: updated.print_status,
    method: dispatched.method,
    email: dispatched.email,
  });
}));

// POST /api/admin/orders/:id/resend-email — resend a customer email (receipt / status).
app.post("/api/admin/orders/:id/resend-email", adminAuth, h(async (req, res) => {
  const kind = String((req.body && req.body.kind) || "receipt");
  const allowed = ["receipt", "accepted", "ready", "completed", "cancelled"];
  if (!allowed.includes(kind)) {
    return bad(res, 400, `kind must be one of: ${allowed.join(", ")}`);
  }
  const { rows } = await query("SELECT * FROM orders WHERE id = $1", [Number(req.params.id)]);
  if (!rows[0]) return bad(res, 404, "Order not found.");
  const order = parseOrder(rows[0]);
  const result = await sendCustomerOrderEmail(order, kind, { force: true });
  res.json(result);
}));

// POST /api/admin/test-print — queues (and emails, if configured) a SAMPLE ticket.
app.post("/api/admin/test-print", adminAuth, h(async (req, res) => {
  const subtotal = 2300;
  const tax = Math.round(subtotal * TAX_RATE);
  const client = await pool.connect();
  let id;
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO orders (order_number, customer_name, phone, notes, items_json, subtotal_cents, tax_cents, total_cents, status, print_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'paid', 'queued') RETURNING id`,
      [
        `PENDING-${crypto.randomUUID()}`,
        "Test Print",
        "(773) 248-2030",
        "Sample receipt — no food required.",
        JSON.stringify([
          { item_id: null, name: "The Slinger", qty: 1, price_cents: 1650 },
          { item_id: null, name: "Coffee (Bottomless)", qty: 2, price_cents: 325 },
        ]),
        subtotal,
        tax,
        subtotal + tax,
      ]
    );
    id = ins.rows[0].id;
    await client.query("UPDATE orders SET order_number = $1 WHERE id = $2", [
      `TEST-${String(1000 + Number(id))}`,
      id,
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
  const { rows } = await query("SELECT * FROM orders WHERE id = $1", [id]);
  const order = parseOrder(rows[0]);
  const dispatched = await dispatchPrint(order);
  const refreshed = parseOrder((await query("SELECT * FROM orders WHERE id = $1", [id])).rows[0]);

  let message = `Queued test ticket ${order.order_number}.`;
  if (dispatched.method === "email" || dispatched.method === "both") {
    message = dispatched.email?.ok
      ? dispatched.email.message
      : dispatched.email?.message || "Email print failed.";
  } else {
    message = `Queued test ticket ${order.order_number} — the print agent will pick it up.`;
  }

  // Always 200 so the admin UI can show `message` (adminFetch treats non-2xx as hard errors).
  res.status(201).json({
    ok: dispatched.method !== "email" || !!dispatched.email?.ok,
    message,
    print_status: refreshed.print_status,
    method: dispatched.method,
    email: dispatched.email,
    order: refreshed,
  });
}));

// POST /api/admin/test-smtp — verify SMTP credentials without printing.
app.post("/api/admin/test-smtp", adminAuth, h(async (req, res) => {
  const result = await verifySmtp();
  res.json(result);
}));

// POST /api/admin/receipt-preview — live preview from draft fields (or saved template).
app.post("/api/admin/receipt-preview", adminAuth, h(async (req, res) => {
  const saved = await getReceiptTemplate();
  const draft = { ...saved, ...(req.body || {}) };
  const template = normalizeTemplate(draft);
  const text = buildReceiptText(SAMPLE_ORDER, template);
  res.json({
    text,
    width: template.width,
    defaults: EPSON_DEFAULTS,
    sample_order_number: SAMPLE_ORDER.order_number,
  });
}));

// POST /api/admin/test-notify — send a sample staff notification email.
app.post("/api/admin/test-notify", adminAuth, h(async (req, res) => {
  const result = await sendOrderNotification({
    ...SAMPLE_ORDER,
    order_number: `TEST-${SAMPLE_ORDER.order_number}`,
    customer_email: "guest@example.com",
  });
  res.json(result);
}));

// POST /api/admin/test-customer-email — send a sample customer receipt to a given address.
app.post("/api/admin/test-customer-email", adminAuth, h(async (req, res) => {
  const to = String((req.body && req.body.to) || "").trim();
  const kind = String((req.body && req.body.kind) || "receipt");
  if (!isValidEmail(to)) {
    return bad(res, 400, "Provide a valid “to” email address.");
  }
  const result = await sendCustomerOrderEmail(
    {
      ...SAMPLE_ORDER,
      order_number: `TEST-${SAMPLE_ORDER.order_number}`,
      customer_email: to,
      customer_name: "Test Guest",
    },
    kind,
    { force: true, to }
  );
  res.json(result);
}));

// --- Settings ---
async function publicSettings() {
  const receipt = await getReceiptTemplate();
  return {
    printer_ip: (await getSetting("printer_ip")) || "",
    printer_device_id: (await getSetting("printer_device_id")) || "",
    ...(await getPublicMailSettings()),
    ...(await getPublicCustomerEmailSettings()),
    ...(await getPublicStripeSettings()),
    receipt_width: receipt.receipt_width,
    receipt_name: receipt.receipt_name,
    receipt_address: receipt.receipt_address,
    receipt_phone: receipt.receipt_phone,
    receipt_footer_1: receipt.receipt_footer_1,
    receipt_footer_2: receipt.receipt_footer_2,
    receipt_tax_label: receipt.receipt_tax_label,
  };
}

app.get("/api/admin/settings", adminAuth, h(async (req, res) => {
  res.json(await publicSettings());
}));

app.put("/api/admin/settings", adminAuth, h(async (req, res) => {
  const body = req.body || {};

  for (const k of ["printer_ip", "printer_device_id"]) {
    if (k in body) await setSetting(k, body[k] ? String(body[k]).trim() : "");
  }

  for (const k of MAIL_SETTING_KEYS) {
    if (k === "smtp_pass") {
      if (typeof body.smtp_pass === "string" && body.smtp_pass.trim()) {
        await setSetting("smtp_pass", body.smtp_pass.trim());
      }
      continue;
    }
    if (k in body) {
      let val = body[k] == null ? "" : String(body[k]).trim();
      if (k === "print_method") {
        val = val.toLowerCase();
        if (!["email", "agent", "both"].includes(val)) val = "email";
      }
      if (k === "smtp_secure" || k === "order_alert_sound") {
        val = val === "1" || val === "true" ? "1" : "0";
      }
      await setSetting(k, val);
    }
  }

  for (const k of CUSTOMER_EMAIL_SETTING_KEYS) {
    if (k in body) {
      const val = body[k] === "1" || body[k] === true || body[k] === 1 ? "1" : "0";
      await setSetting(k, val);
    }
  }

  // Stripe — blank secret/webhook means keep existing; publishable can be cleared/set freely.
  if (typeof body.stripe_secret_key === "string" && body.stripe_secret_key.trim()) {
    const sk = body.stripe_secret_key.trim();
    if (!sk.startsWith("sk_")) {
      return bad(res, 400, "Stripe secret key must start with sk_test_ or sk_live_.");
    }
    await setSetting("stripe_secret_key", sk);
  }
  if (typeof body.stripe_webhook_secret === "string" && body.stripe_webhook_secret.trim()) {
    const wh = body.stripe_webhook_secret.trim();
    if (!wh.startsWith("whsec_")) {
      return bad(res, 400, "Stripe webhook secret must start with whsec_.");
    }
    await setSetting("stripe_webhook_secret", wh);
  }
  if ("stripe_publishable_key" in body) {
    const pk = body.stripe_publishable_key == null ? "" : String(body.stripe_publishable_key).trim();
    if (pk && !pk.startsWith("pk_")) {
      return bad(res, 400, "Stripe publishable key must start with pk_test_ or pk_live_.");
    }
    await setSetting("stripe_publishable_key", pk);
  }
  // Allow clearing secrets explicitly.
  if (body.clear_stripe_secret_key) await setSetting("stripe_secret_key", "");
  if (body.clear_stripe_webhook_secret) await setSetting("stripe_webhook_secret", "");

  if (body.reset_receipt_defaults) {
    for (const k of RECEIPT_SETTING_KEYS) {
      await setSetting(k, EPSON_DEFAULTS[k]);
    }
  } else {
    for (const k of RECEIPT_SETTING_KEYS) {
      if (!(k in body)) continue;
      if (k === "receipt_width") {
        const w = Math.min(64, Math.max(24, Number(body.receipt_width) || 42));
        await setSetting(k, String(w));
      } else {
        await setSetting(k, body[k] == null ? "" : String(body[k]).trim());
      }
    }
  }

  res.json(await publicSettings());
}));

// GET /api/reviews — live Google reviews when GOOGLE_PLACES_API_KEY is set;
// otherwise 204 so the client falls back to curated static Google reviews.
app.get("/api/reviews", h(async (req, res) => {
  const live = await fetchGoogleReviews();
  if (!live) return res.status(204).end();
  res.json(live);
}));

// ---------------------------------------------------------------------------
// Uploaded photos (served before the SPA fallback; missing files → clean 404)
// ---------------------------------------------------------------------------
app.use("/uploads", express.static(UPLOAD_DIR));
app.use("/uploads", (req, res) => bad(res, 404, "Not found."));

// ---------------------------------------------------------------------------
// SEO: robots + sitemap (always, even without a production build)
// ---------------------------------------------------------------------------
app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: https://dinergrill.com/sitemap.xml
`);
});

app.get("/sitemap.xml", (_req, res) => {
  res.type("application/xml").send(buildSitemapXml());
});

// ---------------------------------------------------------------------------
// Static frontend (production build) + SPA fallback with SEO injection
// ---------------------------------------------------------------------------
const DIST_DIR = path.join(__dirname, "..", "dist");
const DIST_INDEX = path.join(DIST_DIR, "index.html");
if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      // Prefer Express routes for robots/sitemap above.
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    })
  );
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    if (path.extname(req.path)) return next(); // missing asset → fall through to 404 handlers
    fs.readFile(DIST_INDEX, "utf8", (err, html) => {
      if (err) return next(err);
      const body = injectSeoIntoHtml(html, req.path || "/");
      const page = getPageSeo(req.path || "/");
      res.status(page ? 200 : 404).type("html").send(body);
    });
  });
}

// JSON 404 for unknown API routes.
app.use("/api", (req, res) => bad(res, 404, "Not found."));

// JSON error handler.
app.use((err, req, res, next) => {
  console.error("[server] error:", err);
  if (res.headersSent) return next(err);
  bad(res, 500, "Internal server error.");
});

app.listen(PORT, async () => {
  console.log(`[server] Diner Grill API listening on http://localhost:${PORT}`);
  const cfg = await getStripeConfig();
  if (!cfg.configured) {
    console.log("[server] Stripe not fully configured — set keys in Admin → Settings or .env");
  } else {
    console.log(`[server] Stripe ready (${cfg.test_mode ? "test" : "live"} mode)`);
  }
});
