// Epson ePOS-Print receipt builder + printer transport.
// Dependency-free: uses global fetch (Node 18+).

const RESTAURANT = {
  name: "DINER GRILL",
  address: "1635 W Irving Park Rd, Chicago, IL 60613",
  phone: "(773) 248-2030",
};

// ~42 chars per line at Font A on an 80mm TM printer.
const WIDTH = 42;

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cents(c) {
  return "$" + (c / 100).toFixed(2);
}

function line(left, right = "") {
  left = String(left);
  right = String(right);
  if (!right) return left.slice(0, WIDTH);
  const space = WIDTH - left.length - right.length;
  if (space < 1) return (left.slice(0, WIDTH - right.length - 1) + " " + right).slice(0, WIDTH);
  return left + " ".repeat(space) + right;
}

function rule(ch = "-") {
  return ch.repeat(WIDTH);
}

/**
 * Build the inner <epos-print> XML document for an order.
 * order: { order_number, customer_name, phone, notes, items: [{name, qty, price_cents}],
 *          subtotal_cents, tax_cents, total_cents, created_at? }
 */
export function buildReceiptXml(order) {
  const lines = [];
  lines.push({ text: RESTAURANT.name, align: "center", dw: true, dh: true });
  lines.push({ text: RESTAURANT.address, align: "center" });
  lines.push({ text: RESTAURANT.phone, align: "center" });
  lines.push({ text: rule("=") });
  lines.push({ text: `ORDER ${order.order_number}`, align: "center", dw: true, dh: true });
  lines.push({
    text: new Date(order.created_at ? order.created_at + " UTC" : Date.now()).toLocaleString("en-US", {
      timeZone: "America/Chicago",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
    align: "center",
  });
  lines.push({ text: rule() });
  lines.push({ text: `Name: ${order.customer_name}` });
  if (order.phone) lines.push({ text: `Phone: ${order.phone}` });
  lines.push({ text: rule() });

  for (const it of order.items || []) {
    lines.push({ text: line(`${it.qty} x ${it.name}`, cents(it.price_cents * it.qty)) });
  }
  if (order.notes) {
    lines.push({ text: rule() });
    lines.push({ text: `NOTES: ${order.notes}` });
  }
  lines.push({ text: rule() });
  lines.push({ text: line("Subtotal", cents(order.subtotal_cents)) });
  lines.push({ text: line("Tax (10.25%)", cents(order.tax_cents)) });
  lines.push({ text: line("TOTAL", cents(order.total_cents)), em: true });
  lines.push({ text: rule("=") });
  lines.push({ text: "Thank you!", align: "center", dw: true, dh: true });
  lines.push({ text: "Show this ticket at the counter", align: "center" });

  const body = lines
    .map((l) => {
      const attrs = [];
      if (l.align) attrs.push(`align="${l.align}"`);
      if (l.dw) attrs.push(`dw="true"`);
      if (l.dh) attrs.push(`dh="true"`);
      if (l.em) attrs.push(`em="true"`);
      const attrStr = attrs.length ? " " + attrs.join(" ") : "";
      return `<text${attrStr}>${esc(l.text)}&#10;</text>`;
    })
    .join("");

  return (
    `<epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">` +
    body +
    `<feed unit="30"/><cut type="feed"/>` +
    `</epos-print>`
  );
}

/** Wrap ePOS XML in a SOAP envelope. */
export function buildSoapEnvelope(eposXml) {
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">` +
    `<s:Body>${eposXml}</s:Body></s:Envelope>`
  );
}

/**
 * POST a receipt to an Epson TM printer's ePOS-Print service.
 * Returns { ok, status, body } — never throws on network/HTTP failure.
 */
export async function printToPrinter(ip, deviceId, xml, { timeoutMs = 10000 } = {}) {
  const url = `http://${ip}/cgi-bin/epos/service.cgi?devid=${encodeURIComponent(deviceId)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: '""',
      },
      body: buildSoapEnvelope(xml),
      signal: controller.signal,
    });
    const body = await res.text();
    // Epson returns 200 with success="true"/"false" in the response XML.
    const ok = res.ok && !/success="false"/.test(body);
    return { ok, status: res.status, body: body.slice(0, 500) };
  } catch (err) {
    return { ok: false, status: 0, body: String(err && err.message ? err.message : err) };
  } finally {
    clearTimeout(timer);
  }
}
