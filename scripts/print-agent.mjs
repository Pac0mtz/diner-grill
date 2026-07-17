#!/usr/bin/env node
// Diner Grill print agent — runs on a computer on the restaurant LAN.
// Polls the API for paid orders that need a kitchen receipt, prints them to an
// Epson TM printer via ePOS-Print, then reports the result back.
//
// Env:
//   API_URL            default http://localhost:8787
//   ADMIN_TOKEN        must match the server's ADMIN_TOKEN (required)
//   PRINTER_IP         e.g. 192.168.1.50 (required to actually print)
//   PRINTER_DEVICE_ID  default local_printer
//   POLL_MS            default 5000
//
// Usage: node scripts/print-agent.mjs
import { buildReceiptXml, printToPrinter } from "../server/epos.js";

const API_URL = (process.env.API_URL || "http://localhost:8787").replace(/\/$/, "");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "";
const PRINTER_IP = process.env.PRINTER_IP || "";
const PRINTER_DEVICE_ID = process.env.PRINTER_DEVICE_ID || "local_printer";
const POLL_MS = Number(process.env.POLL_MS || 5000);

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

async function tick() {
  const res = await api("/api/print/next");
  if (!res.ok) {
    log(`poll failed: HTTP ${res.status}`);
    return;
  }
  const { order } = await res.json();
  if (!order) return; // nothing queued — stay quiet

  log(`printing ${order.order_number} (order #${order.id}, total $${(order.total_cents / 100).toFixed(2)})`);
  const xml = buildReceiptXml(order);
  const result = await printToPrinter(PRINTER_IP, PRINTER_DEVICE_ID, xml);
  log(
    result.ok
      ? `printed ${order.order_number} (printer status ${result.status})`
      : `print FAILED for ${order.order_number}: status ${result.status} ${result.body}`
  );

  const report = await api(`/api/print/${order.id}/result`, {
    method: "POST",
    body: JSON.stringify({ ok: result.ok }),
  });
  if (!report.ok) log(`result report failed for order #${order.id}: HTTP ${report.status}`);
}

async function main() {
  if (!ADMIN_TOKEN) {
    log("ERROR: ADMIN_TOKEN is required.");
    process.exit(1);
  }
  if (!PRINTER_IP) {
    log("ERROR: PRINTER_IP is required (e.g. PRINTER_IP=192.168.1.50).");
    process.exit(1);
  }
  log(`print agent started — polling ${API_URL} every ${POLL_MS}ms, printer ${PRINTER_IP} (${PRINTER_DEVICE_ID})`);
  // Run immediately, then on interval. Serialize ticks to avoid overlap.
  let running = false;
  const loop = async () => {
    if (running) return;
    running = true;
    try {
      await tick();
    } catch (err) {
      log(`poll error: ${err && err.message ? err.message : err}`);
    } finally {
      running = false;
    }
  };
  await loop();
  setInterval(loop, POLL_MS);
}

main();
