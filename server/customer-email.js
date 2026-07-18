// Customer-facing order emails: payment receipt + status updates.
import nodemailer from "nodemailer";
import { getSetting } from "./db.js";
import { getMailPrintConfig, MAIL_SETTING_KEYS } from "./mail-print.js";
import { getReceiptTemplate } from "./receipt-template.js";

export const CUSTOMER_EMAIL_SETTING_KEYS = [
  "customer_emails_enabled",
  "customer_email_receipt",
  "customer_email_accepted",
  "customer_email_ready",
  "customer_email_completed",
  "customer_email_cancelled",
];

const SITE = {
  name: "Diner Grill",
  url: "https://dinergrill.com",
  phone: "(773) 248-2030",
  phoneHref: "tel:+17732482030",
  address: "1635 W Irving Park Rd, Chicago, IL 60613",
  orderUrl: "https://dinergrill.com/order",
  visitUrl: "https://dinergrill.com/visit",
};

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function flagOn(raw, fallback = true) {
  if (raw == null || raw === "") return fallback;
  const v = String(raw).toLowerCase();
  return !(v === "0" || v === "false" || v === "off" || v === "no");
}

async function settingOrEnv(key, envName) {
  return (await getSetting(key)) || process.env[envName] || "";
}

export async function getCustomerEmailConfig() {
  const enabled = flagOn(
    await settingOrEnv("customer_emails_enabled", "CUSTOMER_EMAILS_ENABLED"),
    true
  );
  return {
    enabled,
    receipt: flagOn(await settingOrEnv("customer_email_receipt", "CUSTOMER_EMAIL_RECEIPT"), true),
    accepted: flagOn(
      await settingOrEnv("customer_email_accepted", "CUSTOMER_EMAIL_ACCEPTED"),
      true
    ),
    ready: flagOn(await settingOrEnv("customer_email_ready", "CUSTOMER_EMAIL_READY"), true),
    completed: flagOn(
      await settingOrEnv("customer_email_completed", "CUSTOMER_EMAIL_COMPLETED"),
      false
    ),
    cancelled: flagOn(
      await settingOrEnv("customer_email_cancelled", "CUSTOMER_EMAIL_CANCELLED"),
      true
    ),
  };
}

export async function getPublicCustomerEmailSettings() {
  const cfg = await getCustomerEmailConfig();
  return {
    customer_emails_enabled: cfg.enabled ? "1" : "0",
    customer_email_receipt: cfg.receipt ? "1" : "0",
    customer_email_accepted: cfg.accepted ? "1" : "0",
    customer_email_ready: cfg.ready ? "1" : "0",
    customer_email_completed: cfg.completed ? "1" : "0",
    customer_email_cancelled: cfg.cancelled ? "1" : "0",
  };
}

function dollars(cents) {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function itemRowsHtml(order) {
  return (order.items || [])
    .map((it) => {
      const mods = (it.modifiers || []).map((m) => m.label).join(", ");
      const note = it.line_note ? `<br/><em style="color:#666">${esc(it.line_note)}</em>` : "";
      const modLine = mods
        ? `<div style="color:#666;font-size:13px;margin-top:2px">${esc(mods)}</div>`
        : "";
      return `<tr>
        <td style="padding:10px 0;border-bottom:1px solid #e8dfd0;vertical-align:top">
          <strong>${esc(it.qty)}× ${esc(it.name)}</strong>${modLine}${note}
        </td>
        <td style="padding:10px 0;border-bottom:1px solid #e8dfd0;text-align:right;white-space:nowrap;vertical-align:top">
          ${dollars(it.price_cents * it.qty)}
        </td>
      </tr>`;
    })
    .join("");
}

function itemRowsText(order) {
  return (order.items || [])
    .map((it) => {
      const mods = (it.modifiers || []).map((m) => m.label).join(", ");
      const note = it.line_note ? ` (${it.line_note})` : "";
      return `  ${it.qty}× ${it.name}${mods ? ` — ${mods}` : ""}${note}  ${dollars(it.price_cents * it.qty)}`;
    })
    .join("\n");
}

function wrapEmail({ preheader, headline, accent, bodyHtml, order }) {
  const tplName = SITE.name;
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/><title>${esc(headline)}</title></head>
<body style="margin:0;padding:0;background:#f4efe6;color:#17130f;font-family:Georgia,'Times New Roman',serif">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4efe6;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fffdf8;border:2px solid #17130f;border-radius:8px">
        <tr><td style="background:#17130f;color:#fffdf8;padding:18px 22px">
          <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#f0c419;font-family:monospace">DINER GRILL · CHICAGO</div>
          <div style="font-size:28px;letter-spacing:0.06em;text-transform:uppercase;margin-top:4px;font-weight:700">${esc(tplName)}</div>
        </td></tr>
        <tr><td style="padding:28px 22px 8px">
          <div style="display:inline-block;background:${accent};color:#fffdf8;font-family:monospace;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;padding:6px 10px;border-radius:4px">${esc(headline)}</div>
          <h1 style="margin:16px 0 8px;font-size:26px;line-height:1.2">Order ${esc(order.order_number)}</h1>
          <p style="margin:0 0 20px;color:#555;font-size:15px;line-height:1.5">Hi ${esc(order.customer_name.split(" ")[0] || "there")},</p>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:8px 22px 24px">
          <table role="presentation" width="100%" style="border-top:2px dashed #d4c4a8;margin-top:8px;padding-top:16px">
            <tr><td style="font-size:13px;color:#555;line-height:1.5">
              <strong style="color:#17130f">Pickup</strong><br/>
              ${esc(SITE.address)}<br/>
              Open 24 hours · Counter pickup<br/>
              <a href="${SITE.phoneHref}" style="color:#d8402e">${esc(SITE.phone)}</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:12px;color:#888;line-height:1.4">
            You’re receiving this because you ordered online at
            <a href="${SITE.url}" style="color:#d8402e">${SITE.url.replace("https://", "")}</a>.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function totalsBlock(order) {
  return `
    <table role="presentation" width="100%" style="margin:8px 0 0;font-size:14px">
      <tr><td style="padding:4px 0;color:#666">Subtotal</td><td style="padding:4px 0;text-align:right">${dollars(order.subtotal_cents)}</td></tr>
      <tr><td style="padding:4px 0;color:#666">Tax</td><td style="padding:4px 0;text-align:right">${dollars(order.tax_cents)}</td></tr>
      <tr><td style="padding:10px 0 0;border-top:2px solid #17130f;font-size:18px"><strong>Total paid</strong></td>
          <td style="padding:10px 0 0;border-top:2px solid #17130f;text-align:right;font-size:18px;color:#d8402e"><strong>${dollars(order.total_cents)}</strong></td></tr>
    </table>`;
}

function orderTable(order) {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px">
      ${itemRowsHtml(order)}
    </table>
    ${totalsBlock(order)}
    ${
      order.notes
        ? `<p style="margin:16px 0 0;padding:10px 12px;background:#f7edd4;border-radius:6px;font-size:14px"><strong>Notes:</strong> ${esc(order.notes)}</p>`
        : ""
    }`;
}

const TEMPLATES = {
  receipt: {
    subject: (o) => `Receipt · Order ${o.order_number} · Diner Grill`,
    flag: "receipt",
    accent: "#d8402e",
    headline: "Payment confirmed",
    preheader: (o) => `Your Diner Grill order ${o.order_number} is paid — show this at the counter.`,
    bodyHtml: (o) => `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.55">
        Thanks — your card went through and your ticket is at the kitchen. Show order
        <strong style="color:#d8402e">${esc(o.order_number)}</strong> at the counter when you arrive.
      </p>
      ${orderTable(o)}
      <p style="margin:22px 0 0;font-size:14px;color:#555;line-height:1.5">
        We’ll email you again when the kitchen accepts your order and when it’s ready for pickup.
      </p>`,
    text: (o) =>
      `Payment confirmed — Diner Grill\nOrder ${o.order_number}\n\nHi ${o.customer_name},\n\nYour order is paid. Show ${o.order_number} at the counter.\n\n${itemRowsText(o)}\n\nSubtotal ${dollars(o.subtotal_cents)}\nTax ${dollars(o.tax_cents)}\nTotal paid ${dollars(o.total_cents)}\n${o.notes ? `\nNotes: ${o.notes}\n` : ""}\nPickup: ${SITE.address}\nOpen 24 hours · ${SITE.phone}\n`,
  },
  accepted: {
    subject: (o) => `Kitchen accepted · Order ${o.order_number}`,
    flag: "accepted",
    accent: "#17130f",
    headline: "Kitchen accepted",
    preheader: (o) => `Order ${o.order_number} is on the griddle at Diner Grill.`,
    bodyHtml: (o) => `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.55">
        Good news — the kitchen accepted your order and it’s cooking now.
        We’ll ping you when <strong>${esc(o.order_number)}</strong> is ready at the counter.
      </p>
      ${orderTable(o)}`,
    text: (o) =>
      `Kitchen accepted — Order ${o.order_number}\n\nYour order is being prepared at Diner Grill.\nWe'll email you when it's ready for pickup.\n\n${itemRowsText(o)}\nTotal ${dollars(o.total_cents)}\n`,
  },
  ready: {
    subject: (o) => `Ready for pickup · Order ${o.order_number}`,
    flag: "ready",
    accent: "#d8402e",
    headline: "Ready for pickup",
    preheader: (o) => `Order ${o.order_number} is ready at the counter — come on in.`,
    bodyHtml: (o) => `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.55">
        <strong style="color:#d8402e">${esc(o.order_number)}</strong> is ready at the counter.
        Come on in and ask for it by name or order number.
      </p>
      <p style="margin:0 0 18px;padding:14px 16px;background:#17130f;color:#fffdf8;border-radius:6px;font-size:15px;line-height:1.5">
        ${esc(SITE.address)}<br/>
        <a href="${SITE.phoneHref}" style="color:#f0c419">${esc(SITE.phone)}</a>
      </p>
      ${orderTable(o)}`,
    text: (o) =>
      `Ready for pickup — Order ${o.order_number}\n\nYour order is ready at the counter.\n${SITE.address}\n${SITE.phone}\n\n${itemRowsText(o)}\n`,
  },
  completed: {
    subject: (o) => `Thanks for visiting · Order ${o.order_number}`,
    flag: "completed",
    accent: "#17130f",
    headline: "Order complete",
    preheader: () => `Thanks for dining at Diner Grill — see you next time.`,
    bodyHtml: (o) => `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.55">
        Hope everything hit the spot. Thanks for supporting Chicago’s 24-hour counter —
        home of the Slinger since 1937.
      </p>
      <p style="margin:0 0 8px;font-size:14px">
        <a href="${SITE.orderUrl}" style="color:#d8402e">Order again</a>
        · <a href="${SITE.visitUrl}" style="color:#d8402e">Visit info</a>
      </p>
      <p style="margin:16px 0 0;font-size:13px;color:#666">Receipt for ${esc(o.order_number)} · ${dollars(o.total_cents)}</p>`,
    text: (o) =>
      `Thanks for visiting Diner Grill!\nOrder ${o.order_number} · ${dollars(o.total_cents)}\nOrder again: ${SITE.orderUrl}\n`,
  },
  cancelled: {
    subject: (o) => `Order cancelled · ${o.order_number}`,
    flag: "cancelled",
    accent: "#8a3b2b",
    headline: "Order cancelled",
    preheader: (o) => `Order ${o.order_number} was cancelled. Call us if you have questions.`,
    bodyHtml: (o) => `
      <p style="margin:0 0 18px;font-size:16px;line-height:1.55">
        Order <strong>${esc(o.order_number)}</strong> has been cancelled.
        If you were charged and expected food, call us at
        <a href="${SITE.phoneHref}" style="color:#d8402e">${esc(SITE.phone)}</a>
        and we’ll sort it out.
      </p>
      ${orderTable(o)}`,
    text: (o) =>
      `Order cancelled — ${o.order_number}\n\nThis order was cancelled. Questions? Call ${SITE.phone}.\nTotal was ${dollars(o.total_cents)}\n`,
  },
};

async function createTransport(cfg) {
  const port = Number(cfg.smtp_port) || 587;
  const secure = cfg.smtp_secure === "1";
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port,
    secure,
    auth: cfg.smtp_user ? { user: cfg.smtp_user, pass: cfg.smtp_pass } : undefined,
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

/**
 * Send a customer lifecycle email.
 * @param {object} order
 * @param {'receipt'|'accepted'|'ready'|'completed'|'cancelled'} kind
 * @param {{ force?: boolean, to?: string }} [opts]
 */
export async function sendCustomerOrderEmail(order, kind, opts = {}) {
  const tpl = TEMPLATES[kind];
  if (!tpl) return { ok: false, message: `Unknown email kind: ${kind}` };

  const to = String(opts.to || order.customer_email || "").trim();
  if (!isValidEmail(to)) {
    return { ok: false, skipped: true, message: "No customer email on this order." };
  }

  const flags = await getCustomerEmailConfig();
  if (!opts.force) {
    if (!flags.enabled) {
      return { ok: false, skipped: true, message: "Customer emails are disabled." };
    }
    if (!flags[tpl.flag]) {
      return { ok: false, skipped: true, message: `Customer “${kind}” emails are disabled.` };
    }
  }

  const mailCfg = await getMailPrintConfig();
  if (!mailCfg.smtp_ready) {
    return { ok: false, skipped: true, message: "SMTP is not configured." };
  }

  // Touch receipt template so admin customizations stay in sync for kitchen copy elsewhere.
  await getReceiptTemplate().catch(() => null);

  const html = wrapEmail({
    preheader: tpl.preheader(order),
    headline: tpl.headline,
    accent: tpl.accent,
    bodyHtml: tpl.bodyHtml(order),
    order,
  });
  const text = tpl.text(order);
  const subject = tpl.subject(order);

  try {
    const transporter = await createTransport(mailCfg);
    const info = await transporter.sendMail({
      from: `"${SITE.name}" <${mailCfg.smtp_from}>`,
      to,
      replyTo: mailCfg.smtp_from,
      subject,
      text,
      html,
      headers: {
        "X-Diner-Grill-Order": String(order.order_number || ""),
        "X-Diner-Grill-Customer-Email": kind,
      },
    });
    return {
      ok: true,
      message: `Sent ${kind} email to ${to}`,
      messageId: info.messageId,
      kind,
      to,
    };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error(`[customer-email] ${kind} failed:`, message);
    return { ok: false, message: `Customer email error: ${message}` };
  }
}

/** Map status transition → customer email kind (null = none). */
export function customerEmailKindForStatus(prevStatus, nextStatus) {
  if (nextStatus === "preparing" && prevStatus === "paid") return "accepted";
  if (nextStatus === "ready" && ["paid", "preparing"].includes(prevStatus)) return "ready";
  if (nextStatus === "done" && prevStatus !== "done") return "completed";
  if (nextStatus === "cancelled" && prevStatus !== "cancelled") return "cancelled";
  return null;
}

/**
 * Transactional account email (password reset). Uses same SMTP as order emails.
 * @param {{ to: string, resetUrl: string, name?: string }} opts
 */
export async function sendPasswordResetEmail({ to, resetUrl, name }) {
  if (!isValidEmail(to)) {
    return { ok: false, skipped: true, message: "Invalid email." };
  }
  const mailCfg = await getMailPrintConfig();
  if (!mailCfg.smtp_ready) {
    return { ok: false, skipped: true, message: "SMTP is not configured." };
  }
  const greeting = name ? `Hi ${esc(name)},` : "Hi,";
  const subject = "Reset your Diner Grill password";
  const text = `${greeting}\n\nReset your password:\n${resetUrl}\n\nThis link expires in 1 hour. If you did not ask for this, ignore this email.\n`;
  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:24px;background:#f4efe6;color:#17130f;font-family:Georgia,serif">
  <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fffdf8;border:2px solid #17130f;border-radius:8px">
    <tr><td style="background:#17130f;color:#fffdf8;padding:18px 22px">
      <div style="font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#f0c419;font-family:monospace">DINER GRILL · ACCOUNT</div>
      <div style="font-size:26px;letter-spacing:0.06em;text-transform:uppercase;margin-top:4px;font-weight:700">Password reset</div>
    </td></tr>
    <tr><td style="padding:28px 22px">
      <p style="margin:0 0 16px;font-size:16px;line-height:1.55">${greeting}</p>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.55">Tap below to choose a new password. This link expires in one hour.</p>
      <p style="margin:0 0 20px">
        <a href="${esc(resetUrl)}" style="display:inline-block;background:#d8402e;color:#fffdf8;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">Reset password</a>
      </p>
      <p style="margin:0;font-size:13px;color:#666;line-height:1.5">If you did not request this, ignore this email.</p>
    </td></tr>
  </table>
</body></html>`;

  try {
    const transporter = await createTransport(mailCfg);
    const info = await transporter.sendMail({
      from: `"${SITE.name}" <${mailCfg.smtp_from}>`,
      to: String(to).trim().toLowerCase(),
      replyTo: mailCfg.smtp_from,
      subject,
      text,
      html,
      headers: { "X-Diner-Grill-Account": "password-reset" },
    });
    return { ok: true, messageId: info.messageId, to };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error("[customer-email] password-reset failed:", message);
    return { ok: false, message };
  }
}

// Re-export for settings aggregation convenience
export { MAIL_SETTING_KEYS };
