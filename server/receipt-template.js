// Shared kitchen-ticket layout — Epson TM defaults (Font A, ~42 cols on 80mm).
import { getSetting } from "./db.js";

export const EPSON_DEFAULTS = {
  receipt_width: "42",
  receipt_name: "DINER GRILL",
  receipt_address: "1635 W Irving Park Rd, Chicago, IL 60613",
  receipt_phone: "(773) 248-2030",
  receipt_footer_1: "Thank you!",
  receipt_footer_2: "Show this ticket at the counter",
  receipt_tax_label: "Tax (10.25%)",
};

export const RECEIPT_SETTING_KEYS = Object.keys(EPSON_DEFAULTS);

export const SAMPLE_ORDER = {
  order_number: "DG-1042",
  customer_name: "Frank Rivera",
  phone: "(773) 555-0142",
  customer_email: "frank@example.com",
  notes: "Extra napkins please",
  created_at: new Date().toISOString(),
  items: [
    {
      name: "The Slinger",
      qty: 1,
      price_cents: 1650,
      modifiers: [
        { label: "Over easy", price_cents: 0 },
      ],
    },
    {
      name: "Bacon & Egg",
      qty: 2,
      price_cents: 875,
      modifiers: [
        { label: "Scrambled", price_cents: 0 },
        { label: "French bread", price_cents: 165 },
      ],
      line_note: "No onions",
    },
    {
      name: "Coffee",
      qty: 1,
      price_cents: 295,
      modifiers: [],
    },
  ],
  subtotal_cents: 3695,
  tax_cents: 379,
  total_cents: 4074,
};

function cents(c) {
  return "$" + (Number(c) / 100).toFixed(2);
}

function padLine(left, right, width) {
  left = String(left);
  right = String(right);
  if (!right) return left.slice(0, width);
  const space = width - left.length - right.length;
  if (space < 1) return (left.slice(0, width - right.length - 1) + " " + right).slice(0, width);
  return left + " ".repeat(space) + right;
}

function rule(width, ch = "-") {
  return ch.repeat(width);
}

/** Normalize template fields (from DB, env, or draft UI). */
export function normalizeTemplate(raw = {}) {
  const width = Math.min(64, Math.max(24, Number(raw.receipt_width) || 42));
  return {
    receipt_width: String(width),
    receipt_name: String(raw.receipt_name || EPSON_DEFAULTS.receipt_name).slice(0, 60),
    receipt_address: String(raw.receipt_address || EPSON_DEFAULTS.receipt_address).slice(0, 80),
    receipt_phone: String(raw.receipt_phone || EPSON_DEFAULTS.receipt_phone).slice(0, 40),
    receipt_footer_1: String(raw.receipt_footer_1 ?? EPSON_DEFAULTS.receipt_footer_1).slice(0, 60),
    receipt_footer_2: String(raw.receipt_footer_2 ?? EPSON_DEFAULTS.receipt_footer_2).slice(0, 60),
    receipt_tax_label: String(raw.receipt_tax_label || EPSON_DEFAULTS.receipt_tax_label).slice(0, 40),
    width,
  };
}

export async function getReceiptTemplate() {
  const raw = {};
  for (const k of RECEIPT_SETTING_KEYS) {
    raw[k] = (await getSetting(k)) || "";
  }
  return normalizeTemplate({
    receipt_width: raw.receipt_width || process.env.RECEIPT_WIDTH || EPSON_DEFAULTS.receipt_width,
    receipt_name: raw.receipt_name || process.env.RECEIPT_NAME || EPSON_DEFAULTS.receipt_name,
    receipt_address: raw.receipt_address || process.env.RECEIPT_ADDRESS || EPSON_DEFAULTS.receipt_address,
    receipt_phone: raw.receipt_phone || process.env.RECEIPT_PHONE || EPSON_DEFAULTS.receipt_phone,
    receipt_footer_1: raw.receipt_footer_1 || process.env.RECEIPT_FOOTER_1 || EPSON_DEFAULTS.receipt_footer_1,
    receipt_footer_2: raw.receipt_footer_2 || process.env.RECEIPT_FOOTER_2 || EPSON_DEFAULTS.receipt_footer_2,
    receipt_tax_label: raw.receipt_tax_label || EPSON_DEFAULTS.receipt_tax_label,
  });
}

/**
 * Build plain-text receipt lines (Epson Email Print + preview).
 * @returns {string[]}
 */
export function buildReceiptLines(order, templateInput) {
  const t = normalizeTemplate(templateInput);
  const w = t.width;
  const lines = [];

  lines.push(t.receipt_name);
  if (t.receipt_address) lines.push(t.receipt_address);
  if (t.receipt_phone) lines.push(t.receipt_phone);
  lines.push(rule(w, "="));
  lines.push(`ORDER ${order.order_number}`);
  lines.push(
    new Date(order.created_at ? order.created_at : Date.now()).toLocaleString("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
  );
  lines.push(rule(w));
  lines.push(`Name: ${order.customer_name}`);
  if (order.phone) lines.push(`Phone: ${order.phone}`);
  lines.push(rule(w));

  for (const it of order.items || []) {
    lines.push(padLine(`${it.qty} x ${it.name}`, cents(it.price_cents * it.qty), w));
    for (const m of it.modifiers || []) {
      const tag = m.price_cents > 0 ? ` (+${cents(m.price_cents)})` : "";
      lines.push(`  · ${m.label}${tag}`);
    }
    if (it.line_note) lines.push(`  · Note: ${it.line_note}`);
  }
  if (order.notes) {
    lines.push(rule(w));
    lines.push(`NOTES: ${order.notes}`);
  }
  lines.push(rule(w));
  lines.push(padLine("Subtotal", cents(order.subtotal_cents), w));
  lines.push(padLine(t.receipt_tax_label, cents(order.tax_cents), w));
  lines.push(padLine("TOTAL", cents(order.total_cents), w));
  lines.push(rule(w, "="));
  if (t.receipt_footer_1) lines.push(t.receipt_footer_1);
  if (t.receipt_footer_2) lines.push(t.receipt_footer_2);
  return lines;
}

export function buildReceiptText(order, templateInput) {
  return buildReceiptLines(order, templateInput).join("\n");
}

/**
 * Structured lines for ePOS XML (align / double-width flags).
 */
export function buildReceiptPrintRows(order, templateInput) {
  const t = normalizeTemplate(templateInput);
  const w = t.width;
  const rows = [];

  rows.push({ text: t.receipt_name, align: "center", dw: true, dh: true });
  if (t.receipt_address) rows.push({ text: t.receipt_address, align: "center" });
  if (t.receipt_phone) rows.push({ text: t.receipt_phone, align: "center" });
  rows.push({ text: rule(w, "=") });
  rows.push({ text: `ORDER ${order.order_number}`, align: "center", dw: true, dh: true });
  rows.push({
    text: new Date(order.created_at ? order.created_at : Date.now()).toLocaleString("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    align: "center",
  });
  rows.push({ text: rule(w) });
  rows.push({ text: `Name: ${order.customer_name}` });
  if (order.phone) rows.push({ text: `Phone: ${order.phone}` });
  rows.push({ text: rule(w) });

  for (const it of order.items || []) {
    rows.push({ text: padLine(`${it.qty} x ${it.name}`, cents(it.price_cents * it.qty), w) });
    for (const m of it.modifiers || []) {
      const tag = m.price_cents > 0 ? ` (+${cents(m.price_cents)})` : "";
      rows.push({ text: `  · ${m.label}${tag}` });
    }
    if (it.line_note) rows.push({ text: `  · Note: ${it.line_note}` });
  }
  if (order.notes) {
    rows.push({ text: rule(w) });
    rows.push({ text: `NOTES: ${order.notes}` });
  }
  rows.push({ text: rule(w) });
  rows.push({ text: padLine("Subtotal", cents(order.subtotal_cents), w) });
  rows.push({ text: padLine(t.receipt_tax_label, cents(order.tax_cents), w) });
  rows.push({ text: padLine("TOTAL", cents(order.total_cents), w), em: true });
  rows.push({ text: rule(w, "=") });
  if (t.receipt_footer_1) rows.push({ text: t.receipt_footer_1, align: "center", dw: true, dh: true });
  if (t.receipt_footer_2) rows.push({ text: t.receipt_footer_2, align: "center" });
  return rows;
}
