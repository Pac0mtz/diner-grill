// Epson ePOS-Print receipt builder + printer transport.
// Dependency-free: uses global fetch (Node 18+).
import { buildReceiptPrintRows, getReceiptTemplate } from "./receipt-template.js";

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Build the inner <epos-print> XML document for an order.
 * Uses the editable receipt template (Epson 42-col defaults).
 */
export async function buildReceiptXml(order, template) {
  const t = template || (await getReceiptTemplate());
  const lines = buildReceiptPrintRows(order, t);

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
    const ok = res.ok && !/success="false"/.test(body);
    return { ok, status: res.status, body: body.slice(0, 500) };
  } catch (err) {
    return { ok: false, status: 0, body: String(err && err.message ? err.message : err) };
  } finally {
    clearTimeout(timer);
  }
}
