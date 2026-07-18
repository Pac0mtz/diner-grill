// Epson mail-to-print via SMTP + staff order notification emails.
import nodemailer from "nodemailer";
import { getSetting } from "./db.js";
import { buildReceiptText, getReceiptTemplate } from "./receipt-template.js";

export const MAIL_SETTING_KEYS = [
  "print_method",
  "printer_email",
  "smtp_host",
  "smtp_port",
  "smtp_secure",
  "smtp_user",
  "smtp_pass",
  "smtp_from",
  "notify_emails",
  "notify_email_cc",
  "order_alert_sound",
];

function envOr(_key, envName, fallback = "") {
  return process.env[envName] || fallback;
}

function parseEmailList(raw) {
  return String(raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s));
}

/** Merge DB settings with env fallbacks. */
export async function getMailPrintConfig() {
  const db = {};
  for (const k of MAIL_SETTING_KEYS) {
    db[k] = (await getSetting(k)) || "";
  }

  const host = db.smtp_host || envOr("smtp_host", "SMTP_HOST");
  const portRaw = db.smtp_port || envOr("smtp_port", "SMTP_PORT", "587");
  const port = Number(portRaw) || 587;
  const secureFlag = (db.smtp_secure || envOr("smtp_secure", "SMTP_SECURE", "")).toLowerCase();
  const secure = secureFlag === "1" || secureFlag === "true" || port === 465;
  const user = db.smtp_user || envOr("smtp_user", "SMTP_USER");
  const pass = db.smtp_pass || envOr("smtp_pass", "SMTP_PASS");
  const from = db.smtp_from || envOr("smtp_from", "SMTP_FROM") || user;
  const printerEmail = db.printer_email || envOr("printer_email", "PRINTER_EMAIL");
  let method = (db.print_method || envOr("print_method", "PRINT_METHOD", "email")).toLowerCase();
  if (!["email", "agent", "both"].includes(method)) method = "email";

  const notify_emails =
    db.notify_emails || envOr("notify_emails", "NOTIFY_EMAILS") || envOr("notify_emails", "ORDER_NOTIFY_EMAILS");
  const notify_email_cc =
    db.notify_email_cc || envOr("notify_email_cc", "NOTIFY_EMAIL_CC") || envOr("notify_email_cc", "ORDER_NOTIFY_CC");

  const soundRaw = (db.order_alert_sound || envOr("order_alert_sound", "ORDER_ALERT_SOUND", "1")).toLowerCase();
  const order_alert_sound = soundRaw === "0" || soundRaw === "false" ? "0" : "1";

  return {
    print_method: method,
    printer_email: printerEmail.trim(),
    smtp_host: host.trim(),
    smtp_port: String(port),
    smtp_secure: secure ? "1" : "0",
    smtp_user: user.trim(),
    smtp_pass: pass,
    smtp_from: from.trim(),
    notify_emails: notify_emails.trim(),
    notify_email_cc: notify_email_cc.trim(),
    order_alert_sound,
    configured: Boolean(host && printerEmail && from && (user ? pass : true)),
    smtp_ready: Boolean(host && from && (user ? pass : true)),
  };
}

/** Public settings payload — password never returned in clear text. */
export async function getPublicMailSettings() {
  const cfg = await getMailPrintConfig();
  return {
    print_method: cfg.print_method,
    printer_email: cfg.printer_email,
    smtp_host: cfg.smtp_host,
    smtp_port: cfg.smtp_port,
    smtp_secure: cfg.smtp_secure,
    smtp_user: cfg.smtp_user,
    smtp_from: cfg.smtp_from,
    smtp_pass_set: Boolean(cfg.smtp_pass),
    mail_configured: cfg.configured,
    notify_emails: cfg.notify_emails,
    notify_email_cc: cfg.notify_email_cc,
    order_alert_sound: cfg.order_alert_sound,
  };
}

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
 * Email a receipt to the Epson mail-to-print address.
 * Optionally CC staff notification addresses on the printer email.
 */
export async function sendMailPrint(order, { overrideTo } = {}) {
  const cfg = await getMailPrintConfig();
  const to = (overrideTo || cfg.printer_email || "").trim();

  if (!cfg.smtp_host) {
    return { ok: false, skipped: true, message: "SMTP host is not configured." };
  }
  if (!to) {
    return { ok: false, skipped: true, message: "Printer email (Epson Connect) is not configured." };
  }
  if (!cfg.smtp_from) {
    return { ok: false, skipped: true, message: "SMTP From address is not configured." };
  }
  if (cfg.smtp_user && !cfg.smtp_pass) {
    return { ok: false, skipped: true, message: "SMTP password is not configured." };
  }

  const template = await getReceiptTemplate();
  const text = buildReceiptText(order, template);

  try {
    const transporter = await createTransport(cfg);
    const info = await transporter.sendMail({
      from: cfg.smtp_from,
      to,
      subject: `Order ${order.order_number} — Diner Grill`,
      text,
      headers: {
        "X-Diner-Grill-Order": String(order.order_number || ""),
      },
    });

    return {
      ok: true,
      message: `Emailed ticket ${order.order_number} to ${to}`,
      messageId: info.messageId,
    };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error("[mail-print] send failed:", message);
    return { ok: false, message: `SMTP error: ${message}` };
  }
}

/**
 * Separate staff notification email (readable) when a new order is paid.
 * Uses notify_emails as To and notify_email_cc as CC.
 */
export async function sendOrderNotification(order) {
  const cfg = await getMailPrintConfig();
  const toList = parseEmailList(cfg.notify_emails);
  const ccList = parseEmailList(cfg.notify_email_cc).filter(
    (e) => !toList.some((t) => t.toLowerCase() === e.toLowerCase())
  );

  if (!toList.length && !ccList.length) {
    return { ok: false, skipped: true, message: "No notification emails configured." };
  }
  if (!cfg.smtp_ready) {
    return { ok: false, skipped: true, message: "SMTP is not configured for notifications." };
  }

  const template = await getReceiptTemplate();
  const ticket = buildReceiptText(order, template);
  const to = toList.length ? toList : ccList;
  const cc = toList.length ? ccList : [];

  const itemLines = (order.items || [])
    .map((it) => {
      const mods = (it.modifiers || []).map((m) => m.label).join(", ");
      const note = it.line_note ? ` (${it.line_note})` : "";
      return `  ${it.qty}× ${it.name}${mods ? ` — ${mods}` : ""}${note}`;
    })
    .join("\n");

  const contact = [
    order.customer_name,
    order.phone,
    order.customer_email,
  ]
    .filter(Boolean)
    .join(" · ");

  const html = `
    <div style="font-family:Georgia,serif;max-width:520px;color:#17130f">
      <h2 style="margin:0 0 8px;color:#d8402e">New paid order — accept in admin</h2>
      <p style="margin:0 0 16px;font-size:14px">
        <strong>${String(order.order_number).replace(/</g, "&lt;")}</strong> · ${String(contact).replace(/</g, "&lt;")}
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#555">
        Ticket is printing. Open Counter Admin → Orders and tap <strong>Accept order</strong> when you start it — the customer gets an email.
      </p>
      <pre style="background:#f4ede0;border:1px solid #ccc;padding:12px;font-size:13px;white-space:pre-wrap">${itemLines.replace(/</g, "&lt;")}</pre>
      <p style="margin:16px 0 0;font-size:16px"><strong>Total $${(order.total_cents / 100).toFixed(2)}</strong></p>
      ${order.notes ? `<p style="margin:12px 0 0;font-style:italic">Notes: ${String(order.notes).replace(/</g, "&lt;")}</p>` : ""}
      <hr style="border:none;border-top:1px dashed #999;margin:20px 0" />
      <pre style="font-size:11px;color:#555;white-space:pre-wrap">${ticket.replace(/</g, "&lt;")}</pre>
    </div>
  `;

  try {
    const transporter = await createTransport(cfg);
    const info = await transporter.sendMail({
      from: cfg.smtp_from,
      to: to.join(", "),
      cc: cc.length ? cc.join(", ") : undefined,
      subject: `🔔 New order ${order.order_number} — accept ${order.customer_name}`,
      text: `New paid order ${order.order_number}\n${contact}\n\nAccept in Counter Admin → Orders.\n\n${ticket}`,
      html,
      headers: {
        "X-Diner-Grill-Order": String(order.order_number || ""),
        "X-Diner-Grill-Notify": "1",
      },
    });
    return {
      ok: true,
      message: `Notified ${to.join(", ")}${cc.length ? ` (CC ${cc.join(", ")})` : ""}`,
      messageId: info.messageId,
    };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    console.error("[mail-print] notify failed:", message);
    return { ok: false, message: `Notify SMTP error: ${message}` };
  }
}

/** Verify SMTP credentials / reachability without printing a ticket. */
export async function verifySmtp() {
  const cfg = await getMailPrintConfig();
  if (!cfg.smtp_host) return { ok: false, message: "SMTP host is not configured." };
  if (cfg.smtp_user && !cfg.smtp_pass) {
    return { ok: false, message: "SMTP password is not configured." };
  }
  try {
    const transporter = await createTransport(cfg);
    await transporter.verify();
    return { ok: true, message: `SMTP OK — connected to ${cfg.smtp_host}:${cfg.smtp_port}` };
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    return { ok: false, message: `SMTP verify failed: ${message}` };
  }
}
