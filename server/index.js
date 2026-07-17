// Diner Grill ordering backend — Express + better-sqlite3 + Stripe.
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import Stripe from "stripe";

import { loadEnv } from "./env.js";
import { db, TAX_RATE, ORDER_STATUSES, getSetting, setSetting, parseOrder } from "./db.js";
import { seedIfEmpty } from "./seed.js";

loadEnv();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "change-me";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

// Auto-seed an empty database so a fresh clone is usable immediately.
if (seedIfEmpty()) {
  console.log("[server] Empty database — seeded menu from server/seed-data.js");
}

const app = express();
app.use(cors());

// ---------------------------------------------------------------------------
// Stripe webhook — MUST be registered before express.json() (needs raw body).
// ---------------------------------------------------------------------------
app.post("/api/stripe/webhook", express.raw({ type: "*/*" }), (req, res) => {
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
    const result = db
      .prepare(
        "UPDATE orders SET status = 'paid', print_status = 'queued' WHERE stripe_payment_intent = ? AND status = 'pending_payment'"
      )
      .run(pi.id);
    console.log(`[webhook] payment_intent.succeeded ${pi.id} → orders updated: ${result.changes}`);
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

function adminAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || token !== ADMIN_TOKEN) {
    return bad(res, 401, "Unauthorized — valid Bearer token required.");
  }
  next();
}

function centsFromDollars(value) {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// GET /api/menu — sections with available items.
app.get("/api/menu", (req, res) => {
  const sections = db
    .prepare("SELECT id, label, note, sort FROM sections ORDER BY sort, id")
    .all();
  const itemsStmt = db.prepare(
    "SELECT id, name, price_cents, description, tag FROM items WHERE section_id = ? AND available = 1 ORDER BY sort, id"
  );
  res.json({
    sections: sections.map((s) => ({ ...s, items: itemsStmt.all(s.id) })),
  });
});

// POST /api/orders — validate, price, create order + Stripe PaymentIntent.
app.post("/api/orders", async (req, res) => {
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

  const itemStmt = db.prepare(
    "SELECT id, name, price_cents FROM items WHERE id = ? AND available = 1"
  );
  const lines = [];
  for (const entry of items) {
    const itemId = Number(entry && entry.item_id);
    const qty = Math.floor(Number(entry && entry.qty));
    if (!Number.isInteger(itemId) || !Number.isInteger(qty) || qty < 1 || qty > 50) {
      return bad(res, 400, "Each item needs a valid item_id and qty between 1 and 50.");
    }
    const row = itemStmt.get(itemId);
    if (!row) {
      return bad(res, 400, `Item ${itemId} does not exist or is unavailable.`);
    }
    lines.push({ item_id: row.id, name: row.name, qty, price_cents: row.price_cents });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;

  const createOrder = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (order_number, customer_name, phone, notes, items_json, subtotal_cents, tax_cents, total_cents, status, print_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'queued')`
      )
      .run(
        "PENDING",
        String(customer_name).trim(),
        String(phone).trim(),
        notes ? String(notes).slice(0, 500) : null,
        JSON.stringify(lines),
        subtotal,
        tax,
        total
      );
    const id = info.lastInsertRowid;
    const orderNumber = `DG-${String(1000 + Number(id))}`;
    db.prepare("UPDATE orders SET order_number = ? WHERE id = ?").run(orderNumber, id);
    return { id, orderNumber };
  });

  let order;
  try {
    order = createOrder();
  } catch (err) {
    console.error("[orders] insert failed:", err);
    return bad(res, 500, "Could not create order.");
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount: total,
      currency: "usd",
      automatic_payment_methods: { enabled: true },
      metadata: { order_number: order.orderNumber, order_id: String(order.id) },
      description: `Diner Grill order ${order.orderNumber}`,
    });
    db.prepare("UPDATE orders SET stripe_payment_intent = ? WHERE id = ?").run(pi.id, order.id);
    return res.json({
      order_number: order.orderNumber,
      client_secret: pi.client_secret,
      total_cents: total,
    });
  } catch (err) {
    console.error("[orders] Stripe PaymentIntent failed:", err.message);
    db.prepare("DELETE FROM orders WHERE id = ?").run(order.id);
    return bad(res, 502, `Stripe error: ${err.message}`);
  }
});

// ---------------------------------------------------------------------------
// Print agent API (token-protected)
// ---------------------------------------------------------------------------

// GET /api/print/next — oldest unprinted active order.
app.get("/api/print/next", adminAuth, (req, res) => {
  const row = db
    .prepare(
      `SELECT * FROM orders
       WHERE status IN ('paid','preparing','ready') AND print_status = 'queued'
       ORDER BY created_at ASC, id ASC LIMIT 1`
    )
    .get();
  res.json({ order: parseOrder(row) });
});

// POST /api/print/:id/result — report print outcome.
app.post("/api/print/:id/result", adminAuth, (req, res) => {
  const ok = !!(req.body && req.body.ok);
  const result = db
    .prepare("UPDATE orders SET print_status = ? WHERE id = ?")
    .run(ok ? "printed" : "failed", Number(req.params.id));
  if (result.changes === 0) return bad(res, 404, "Order not found.");
  res.json({ ok: true, print_status: ok ? "printed" : "failed" });
});

// ---------------------------------------------------------------------------
// Admin API (token-protected)
// ---------------------------------------------------------------------------

// GET /api/admin/menu — ALL sections with ALL items, including unavailable
// ones (the public /api/menu hides unavailable items; the admin needs both).
app.get("/api/admin/menu", adminAuth, (req, res) => {
  const sections = db.prepare("SELECT id, label, note, sort FROM sections ORDER BY sort, id").all();
  const itemsStmt = db.prepare(
    "SELECT id, section_id, name, price_cents, description, tag, available, sort FROM items WHERE section_id = ? ORDER BY sort, id"
  );
  res.json({ sections: sections.map((s) => ({ ...s, items: itemsStmt.all(s.id) })) });
});

// --- Sections ---
app.post("/api/admin/sections", adminAuth, (req, res) => {
  const { label, note, sort } = req.body || {};
  if (!label || !String(label).trim()) return bad(res, 400, "label is required.");
  const info = db
    .prepare("INSERT INTO sections (label, note, sort) VALUES (?, ?, ?)")
    .run(String(label).trim(), note ? String(note) : null, Number(sort) || 0);
  res.status(201).json(db.prepare("SELECT * FROM sections WHERE id = ?").get(info.lastInsertRowid));
});

app.put("/api/admin/sections/:id", adminAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM sections WHERE id = ?").get(id);
  if (!existing) return bad(res, 404, "Section not found.");
  const { label, note, sort } = req.body || {};
  db.prepare("UPDATE sections SET label = ?, note = ?, sort = ? WHERE id = ?").run(
    label !== undefined ? String(label).trim() : existing.label,
    note !== undefined ? (note ? String(note) : null) : existing.note,
    sort !== undefined ? Number(sort) || 0 : existing.sort,
    id
  );
  res.json(db.prepare("SELECT * FROM sections WHERE id = ?").get(id));
});

app.delete("/api/admin/sections/:id", adminAuth, (req, res) => {
  const result = db.prepare("DELETE FROM sections WHERE id = ?").run(Number(req.params.id));
  if (result.changes === 0) return bad(res, 404, "Section not found.");
  res.json({ ok: true });
});

// --- Items ---
app.post("/api/admin/items", adminAuth, (req, res) => {
  const { section_id, name, price_cents, description, tag, available, sort } = req.body || {};
  const sectionId = Number(section_id);
  if (!Number.isInteger(sectionId)) return bad(res, 400, "section_id is required.");
  if (!db.prepare("SELECT id FROM sections WHERE id = ?").get(sectionId)) {
    return bad(res, 400, `Section ${sectionId} does not exist.`);
  }
  if (!name || !String(name).trim()) return bad(res, 400, "name is required.");
  const cents = Number(price_cents);
  if (!Number.isInteger(cents) || cents < 0) {
    return bad(res, 400, "price_cents must be a non-negative integer.");
  }
  const info = db
    .prepare(
      "INSERT INTO items (section_id, name, price_cents, description, tag, available, sort) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      sectionId,
      String(name).trim(),
      cents,
      description ? String(description) : null,
      tag ? String(tag) : null,
      available === false || available === 0 ? 0 : 1,
      Number(sort) || 0
    );
  res.status(201).json(db.prepare("SELECT * FROM items WHERE id = ?").get(info.lastInsertRowid));
});

app.put("/api/admin/items/:id", adminAuth, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare("SELECT * FROM items WHERE id = ?").get(id);
  if (!existing) return bad(res, 404, "Item not found.");
  const { section_id, name, price_cents, description, tag, available, sort } = req.body || {};
  if (section_id !== undefined) {
    const sid = Number(section_id);
    if (!db.prepare("SELECT id FROM sections WHERE id = ?").get(sid)) {
      return bad(res, 400, `Section ${sid} does not exist.`);
    }
  }
  if (price_cents !== undefined && (!Number.isInteger(Number(price_cents)) || Number(price_cents) < 0)) {
    return bad(res, 400, "price_cents must be a non-negative integer.");
  }
  db.prepare(
    `UPDATE items SET section_id = ?, name = ?, price_cents = ?, description = ?, tag = ?, available = ?, sort = ?
     WHERE id = ?`
  ).run(
    section_id !== undefined ? Number(section_id) : existing.section_id,
    name !== undefined ? String(name).trim() : existing.name,
    price_cents !== undefined ? Number(price_cents) : existing.price_cents,
    description !== undefined ? (description ? String(description) : null) : existing.description,
    tag !== undefined ? (tag ? String(tag) : null) : existing.tag,
    available !== undefined ? (available === false || available === 0 ? 0 : 1) : existing.available,
    sort !== undefined ? Number(sort) || 0 : existing.sort,
    id
  );
  res.json(db.prepare("SELECT * FROM items WHERE id = ?").get(id));
});

app.delete("/api/admin/items/:id", adminAuth, (req, res) => {
  const result = db.prepare("DELETE FROM items WHERE id = ?").run(Number(req.params.id));
  if (result.changes === 0) return bad(res, 404, "Item not found.");
  res.json({ ok: true });
});

// --- Orders ---
app.get("/api/admin/orders", adminAuth, (req, res) => {
  const status = req.query.status ? String(req.query.status) : null;
  if (status && !ORDER_STATUSES.includes(status)) {
    return bad(res, 400, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
  }
  const rows = status
    ? db
        .prepare("SELECT * FROM orders WHERE status = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT 200")
        .all(status)
    : db
        .prepare("SELECT * FROM orders ORDER BY datetime(created_at) DESC, id DESC LIMIT 200")
        .all();
  res.json({ orders: rows.map(parseOrder) });
});

app.patch("/api/admin/orders/:id", adminAuth, (req, res) => {
  const { status } = req.body || {};
  if (!ORDER_STATUSES.includes(status)) {
    return bad(res, 400, `status must be one of: ${ORDER_STATUSES.join(", ")}`);
  }
  const result = db.prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, Number(req.params.id));
  if (result.changes === 0) return bad(res, 404, "Order not found.");
  res.json(parseOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(Number(req.params.id))));
});

app.post("/api/admin/orders/:id/reprint", adminAuth, (req, res) => {
  const result = db
    .prepare("UPDATE orders SET print_status = 'queued' WHERE id = ?")
    .run(Number(req.params.id));
  if (result.changes === 0) return bad(res, 404, "Order not found.");
  res.json({ ok: true, print_status: "queued" });
});

// POST /api/admin/test-print — queues a SAMPLE receipt print job. The job is
// stored as a clearly-marked TEST order with print_status 'queued', so the
// print agent (or any poller of /api/print/next) picks it up like a real one.
app.post("/api/admin/test-print", adminAuth, (req, res) => {
  const subtotal = 2300;
  const tax = Math.round(subtotal * TAX_RATE);
  const create = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO orders (order_number, customer_name, phone, notes, items_json, subtotal_cents, tax_cents, total_cents, status, print_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', 'queued')`
      )
      .run(
        "PENDING",
        "Test Print",
        "(773) 248-2030",
        "Sample receipt — no food required.",
        JSON.stringify([
          { item_id: null, name: "The Slinger", qty: 1, price_cents: 1650 },
          { item_id: null, name: "Coffee (Bottomless)", qty: 2, price_cents: 325 },
        ]),
        subtotal,
        tax,
        subtotal + tax
      );
    const id = info.lastInsertRowid;
    const orderNumber = `TEST-${String(1000 + Number(id))}`;
    db.prepare("UPDATE orders SET order_number = ? WHERE id = ?").run(orderNumber, id);
    return id;
  });
  const id = create();
  const order = parseOrder(db.prepare("SELECT * FROM orders WHERE id = ?").get(id));
  res.status(201).json({
    ok: true,
    message: `Queued test ticket ${order.order_number} — the print agent will pick it up.`,
    order,
  });
});

// --- Settings ---
const SETTINGS_KEYS = ["printer_ip", "printer_device_id"];

app.get("/api/admin/settings", adminAuth, (req, res) => {
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = getSetting(k) || "";
  res.json(out);
});

app.put("/api/admin/settings", adminAuth, (req, res) => {
  const body = req.body || {};
  for (const k of SETTINGS_KEYS) {
    if (k in body) setSetting(k, body[k] ? String(body[k]).trim() : "");
  }
  const out = {};
  for (const k of SETTINGS_KEYS) out[k] = getSetting(k) || "";
  res.json(out);
});

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

app.listen(PORT, () => {
  console.log(`[server] Diner Grill API listening on http://localhost:${PORT}`);
  if (!stripe) console.log("[server] STRIPE_SECRET_KEY not set — POST /api/orders will return 503.");
  if (ADMIN_TOKEN === "change-me") console.log("[server] WARNING: ADMIN_TOKEN is the default 'change-me'.");
});
