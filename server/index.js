// Diner Grill ordering backend — Express + PostgreSQL + Stripe.
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import Stripe from "stripe";
import bcrypt from "bcryptjs";

import { loadEnv } from "./env.js";
import { query, initDb, TAX_RATE, ORDER_STATUSES, getSetting, setSetting, parseOrder, pool } from "./db.js";
import { seedIfEmpty } from "./seed.js";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const SESSION_TTL_HOURS = 12;

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

await initDb();

// Auto-seed an empty database so a fresh clone is usable immediately.
if (await seedIfEmpty()) {
  console.log("[server] Empty database — seeded menu from server/seed-data.js");
}

const app = express();
app.use(cors());

// ---------------------------------------------------------------------------
// Stripe webhook — MUST be registered before express.json() (needs raw body).
// ---------------------------------------------------------------------------
app.post("/api/stripe/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  if (!stripe || !STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: "Stripe webhook not configured on this server." });
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers["stripe-signature"],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.warn("[webhook] signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const result = await query(
      "UPDATE orders SET status = 'paid', print_status = 'queued' WHERE stripe_payment_intent = $1 AND status = 'pending_payment'",
      [pi.id]
    );
    console.log(`[webhook] payment_intent.succeeded ${pi.id} → orders updated: ${result.rowCount}`);
  }
  res.json({ received: true });
});

// JSON body parsing for everything else.
app.use(express.json());

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
// Public API
// ---------------------------------------------------------------------------

// GET /api/menu — sections with available items.
app.get("/api/menu", h(async (req, res) => {
  const sections = (await query("SELECT id, label, note, sort FROM sections ORDER BY sort, id")).rows;
  const items = (
    await query(
      "SELECT id, section_id, name, price_cents, description, tag FROM items WHERE available = 1 ORDER BY sort, id"
    )
  ).rows;
  res.json({
    sections: sections.map((s) => ({
      ...s,
      items: items.filter((i) => i.section_id === s.id).map(({ section_id, ...rest }) => rest),
    })),
  });
}));

// POST /api/orders — validate, price, create order + Stripe PaymentIntent.
app.post("/api/orders", h(async (req, res) => {
  if (!stripe) {
    return bad(
      res,
      503,
      "Online payment is not configured (STRIPE_SECRET_KEY missing). Please call (773) 248-2030 to order."
    );
  }

  const { customer_name, phone, notes, items } = req.body || {};
  if (!customer_name || !String(customer_name).trim()) {
    return bad(res, 400, "customer_name is required.");
  }
  if (!phone || !String(phone).trim()) {
    return bad(res, 400, "phone is required.");
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
      "SELECT id, name, price_cents FROM items WHERE id = $1 AND available = 1",
      [itemId]
    );
    if (!rows[0]) {
      return bad(res, 400, `Item ${itemId} does not exist or is unavailable.`);
    }
    lines.push({ item_id: rows[0].id, name: rows[0].name, qty, price_cents: rows[0].price_cents });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  let order;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ins = await client.query(
      `INSERT INTO orders (order_number, customer_name, phone, notes, items_json, subtotal_cents, tax_cents, total_cents, status, print_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment', 'queued') RETURNING id`,
      [
        `PENDING-${crypto.randomUUID()}`,
        String(customer_name).trim(),
        String(phone).trim(),
        notes ? String(notes).slice(0, 500) : null,
        JSON.stringify(lines),
        subtotal,
        tax,
        total,
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

  try {
    const pi = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { order_number: order.orderNumber, order_id: String(order.id) },
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
      "SELECT id, section_id, name, price_cents, description, tag, available, sort FROM items ORDER BY sort, id"
    )
  ).rows;
  res.json({
    sections: sections.map((s) => ({ ...s, items: items.filter((i) => i.section_id === s.id) })),
  });
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
  const result = await query("DELETE FROM sections WHERE id = $1", [Number(req.params.id)]);
  if (result.rowCount === 0) return bad(res, 404, "Section not found.");
  res.json({ ok: true });
}));

// --- Items ---
app.post("/api/admin/items", adminAuth, h(async (req, res) => {
  const { section_id, name, price_cents, description, tag, available, sort } = req.body || {};
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
    "INSERT INTO items (section_id, name, price_cents, description, tag, available, sort) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
    [
      sectionId,
      String(name).trim(),
      cents,
      description ? String(description) : null,
      tag ? String(tag) : null,
      available === false || available === 0 ? 0 : 1,
      Number(sort) || 0,
    ]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/admin/items/:id", adminAuth, h(async (req, res) => {
  const id = Number(req.params.id);
  const existing = (await query("SELECT * FROM items WHERE id = $1", [id])).rows[0];
  if (!existing) return bad(res, 404, "Item not found.");
  const { section_id, name, price_cents, description, tag, available, sort } = req.body || {};
  if (section_id !== undefined) {
    const sid = Number(section_id);
    if (!(await query("SELECT id FROM sections WHERE id = $1", [sid])).rows[0]) {
      return bad(res, 400, `Section ${sid} does not exist.`);
    }
  }
  if (price_cents !== undefined && (!Number.isInteger(Number(price_cents)) || Number(price_cents) < 0)) {
    return bad(res, 400, "price_cents must be a non-negative integer.");
  }
  const { rows } = await query(
    `UPDATE items SET section_id = $1, name = $2, price_cents = $3, description = $4, tag = $5, available = $6, sort = $7
     WHERE id = $8 RETURNING *`,
    [
      section_id !== undefined ? Number(section_id) : existing.section_id,
      name !== undefined ? String(name).trim() : existing.name,
      price_cents !== undefined ? Number(price_cents) : existing.price_cents,
      description !== undefined ? (description ? String(description) : null) : existing.description,
      tag !== undefined ? (tag ? String(tag) : null) : existing.tag,
      available !== undefined ? (available === false || available === 0 ? 0 : 1) : existing.available,
      sort !== undefined ? Number(sort) || 0 : existing.sort,
      id,
    ]
  );
  res.json(rows[0]);
}));

app.delete("/api/admin/items/:id", adminAuth, h(async (req, res) => {
  const result = await query("DELETE FROM items WHERE id = $1", [Number(req.params.id)]);
  if (result.rowCount === 0) return bad(res, 404, "Item not found.");
  res.json({ ok: true });
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
  res.json({ orders: rows.map(parseOrder) });
}));

app.patch("/api/admin/orders/:id", adminAuth, h(async (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) {
    return bad(res, 400, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
  }
  const result = await query("UPDATE orders SET status = $1 WHERE id = $2", [
    status,
    Number(req.params.id),
  ]);
  if (result.rowCount === 0) return bad(res, 404, "Order not found.");
  const { rows } = await query("SELECT * FROM orders WHERE id = $1", [Number(req.params.id)]);
  res.json(parseOrder(rows[0]));
}));

app.post("/api/admin/orders/:id/reprint", adminAuth, h(async (req, res) => {
  const result = await query("UPDATE orders SET print_status = 'queued', print_claimed_at = NULL WHERE id = $1", [
    Number(req.params.id),
  ]);
  if (result.rowCount === 0) return bad(res, 404, "Order not found.");
  res.json({ ok: true, print_status: "queued" });
}));

// POST /api/admin/test-print — queues a SAMPLE receipt print job.
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
  res.status(201).json({
    ok: true,
    message: `Queued test ticket ${order.order_number} — the print agent will pick it up.`,
    order,
  });
}));

// --- Settings ---
const SETTINGS_KEYS = ["printer_ip", "printer_device_id"];

app.get("/api/admin/settings", adminAuth, h(async (req, res) => {
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = (await getSetting(k)) || "";
  res.json(out);
}));

app.put("/api/admin/settings", adminAuth, h(async (req, res) => {
  const body = req.body || {};
  for (const k of SETTINGS_KEYS) {
    if (k in body) await setSetting(k, body[k] ? String(body[k]).trim() : "");
  }
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = (await getSetting(k)) || "";
  res.json(out);
}));

// ---------------------------------------------------------------------------
// Static frontend (production build) + SPA fallback
// ---------------------------------------------------------------------------
const DIST_DIR = path.join(__dirname, "..", "dist");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(DIST_DIR, "index.html"));
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

app.listen(PORT, () => {
  console.log(`[server] Diner Grill API listening on http://localhost:${PORT}`);
  if (!stripe) console.log("[server] STRIPE_SECRET_KEY not set — POST /api/orders will return 503.");
});
