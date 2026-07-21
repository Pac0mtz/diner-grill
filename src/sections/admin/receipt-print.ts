// Local (browser) receipt printing — opens a print dialog with a styled
// 80mm-thermal-format receipt so staff can print to any printer connected
// to their device (AirPrint, USB, shared printers, etc).
import type { AdminOrder } from "../../lib/api-types";
import { SITE } from "../../data/site";

const money = (c: number) => `$${(c / 100).toFixed(2)}`;

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function orderTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function buildReceiptHtml(order: AdminOrder): string {
  const itemsHtml = order.items
    .map((it) => {
      const mods = (it.modifiers || [])
        .map(
          (m) =>
            `<div class="mod">&middot; ${esc(m.label)}${
              m.price_cents > 0 ? ` (+${money(m.price_cents)})` : ""
            }</div>`
        )
        .join("");
      const note = it.line_note
        ? `<div class="mod note">&middot; Note: ${esc(it.line_note)}</div>`
        : "";
      return `
        <div class="line">
          <span class="qty">${it.qty}&times;</span>
          <span class="name">${esc(it.name)}</span>
          <span class="amt">${money(it.price_cents * it.qty)}</span>
        </div>${mods}${note}`;
    })
    .join("");

  const notesHtml = order.notes
    ? `<div class="rule"></div><div class="notes"><strong>NOTES:</strong> ${esc(order.notes)}</div>`
    : "";

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${esc(order.order_number)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  /* Standard paper size — regular printers choke on custom 80mm-tall pages
     and can spit out an extremely long page. The receipt is simply a narrow
     72mm column at the top of a normal sheet. */
  @page { margin: 10mm; }
  html, body { background: #fff; }
  body {
    width: 72mm;
    margin: 0 auto;
    font-family: "Courier New", ui-monospace, monospace;
    font-size: 12px;
    line-height: 1.45;
    color: #000;
    padding: 6px 2px 14px;
  }
  .center { text-align: center; }
  .logo {
    display: block;
    margin: 0 auto 6px;
    width: 88px; height: 88px;
    border-radius: 50%;
    filter: grayscale(1) contrast(1.15);
  }
  .shop-name {
    font-size: 19px; font-weight: 700; letter-spacing: 2px;
    text-transform: uppercase;
  }
  .tagline { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 2px; }
  .addr { font-size: 11px; margin-top: 5px; }
  .rule { border-top: 1px dashed #000; margin: 8px 0; }
  .rule-heavy { border-top: 2px solid #000; margin: 8px 0; }
  .order-num {
    font-size: 24px; font-weight: 700; text-align: center; letter-spacing: 1px;
    margin: 2px 0;
  }
  .when { text-align: center; font-size: 11px; }
  .meta { font-size: 12px; }
  .line { display: flex; gap: 6px; margin-top: 3px; }
  .line .qty { flex: 0 0 24px; font-weight: 700; }
  .line .name { flex: 1; word-break: break-word; }
  .line .amt { flex: 0 0 auto; font-weight: 700; }
  .mod { padding-left: 30px; font-size: 11px; }
  .mod.note { font-style: italic; }
  .totals .row { display: flex; justify-content: space-between; }
  .totals .grand { font-size: 16px; font-weight: 700; margin-top: 3px; }
  .notes { font-size: 12px; }
  .footer { text-align: center; margin-top: 10px; font-size: 11px; }
  .footer .thanks { font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-size: 12px; }
  .paid-badge {
    display: inline-block; border: 2px solid #000; padding: 2px 12px;
    font-weight: 700; letter-spacing: 3px; margin-top: 6px; text-transform: uppercase;
  }
</style>
</head>
<body>
  <div class="center">
    <img class="logo" src="/photos/logo-badge.jpg" alt="" onerror="this.style.display='none'" />
    <div class="shop-name">Diner Grill</div>
    <div class="tagline">Chicago &middot; Open 24 Hours</div>
    <div class="addr">${esc(SITE.address)}<br/>${esc(SITE.phone)}</div>
  </div>
  <div class="rule-heavy"></div>
  <div class="order-num">ORDER ${esc(order.order_number)}</div>
  <div class="when">${esc(orderTime(order.created_at))}</div>
  <div class="rule"></div>
  <div class="meta">Name: ${esc(order.customer_name)}${order.phone ? `<br/>Phone: ${esc(order.phone)}` : ""}</div>
  <div class="rule"></div>
  ${itemsHtml}
  ${notesHtml}
  <div class="rule"></div>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${money(order.subtotal_cents)}</span></div>
    <div class="row"><span>Tax</span><span>${money(order.tax_cents)}</span></div>
    <div class="row grand"><span>TOTAL</span><span>${money(order.total_cents)}</span></div>
  </div>
  <div class="rule-heavy"></div>
  <div class="footer">
    ${
      order.payment_method === "cash"
        ? `<div class="paid-badge">Cash &mdash; Pay at Pickup</div>`
        : order.stripe_payment_intent
          ? `<div class="paid-badge">Paid Online</div>`
          : ""
    }
    <div class="thanks" style="margin-top:8px">Thank You!</div>
    <div>Show this number at the counter.</div>
  </div>
</body>
</html>`;
}

// Guard against rapid double-taps opening multiple print dialogs.
let printInFlight = false;

function isIosWebKit(): boolean {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  return iOS;
}

/**
 * Full-screen receipt preview with explicit Print / Close buttons.
 * Works in environments where popups and auto-print are blocked
 * (iOS Safari, in-app webviews).
 */
function showReceiptOverlay(order: AdminOrder): void {
  if (document.getElementById("dg-receipt-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "dg-receipt-overlay";
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:99999;background:rgba(20,16,12,0.92);display:flex;flex-direction:column;";

  const bar = document.createElement("div");
  bar.style.cssText =
    "flex:0 0 auto;display:flex;gap:10px;justify-content:center;padding:12px;padding-top:calc(12px + env(safe-area-inset-top));";

  const mkBtn = (label: string, primary: boolean) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.style.cssText = `flex:1;max-width:220px;padding:14px 18px;border-radius:8px;font-family:monospace;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;cursor:pointer;border:2px solid ${
      primary ? "#d33f2e;background:#d33f2e;color:#fdf6e9" : "#fdf6e9;background:transparent;color:#fdf6e9"
    }`;
    return b;
  };

  const printBtn = mkBtn("🖨 Print", true);
  const closeBtn = mkBtn("Close", false);
  bar.append(printBtn, closeBtn);

  const frameWrap = document.createElement("div");
  frameWrap.style.cssText =
    "flex:1 1 auto;overflow:auto;display:flex;justify-content:center;padding:0 10px calc(16px + env(safe-area-inset-bottom));";
  const iframe = document.createElement("iframe");
  iframe.style.cssText =
    "width:100%;max-width:420px;height:100%;border:0;border-radius:10px;background:#fff;";
  frameWrap.appendChild(iframe);

  overlay.append(bar, frameWrap);
  document.body.appendChild(overlay);

  const doc = iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(buildReceiptHtml(order));
    doc.close();
  }

  const close = () => overlay.remove();
  closeBtn.addEventListener("click", close);
  printBtn.addEventListener("click", () => {
    const win = iframe.contentWindow;
    if (!win) return;
    win.focus();
    try {
      win.print();
    } catch {
      // Last resort — print the whole page (receipt iframe visible).
      window.print();
    }
  });
}

/**
 * Print an order receipt on the local device.
 * Desktop: hidden iframe + print(). iOS/WebKit: dedicated window (hidden
 * iframes are unreliable for printing in Safari/WKWebView).
 */
export function printReceiptLocally(order: AdminOrder): void {
  if (printInFlight) return;
  printInFlight = true;
  const release = () => {
    printInFlight = false;
  };
  // Absolute safety net so the button never gets stuck.
  setTimeout(release, 5000);

  if (isIosWebKit()) {
    // iOS / in-app webviews often block popups and hidden-iframe printing,
    // so show a full-screen preview with an explicit Print button instead.
    release();
    showReceiptOverlay(order);
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  if (!doc) {
    iframe.remove();
    return;
  }
  doc.open();
  doc.write(buildReceiptHtml(order));
  doc.close();

  const cleanup = () => {
    release();
    setTimeout(() => iframe.remove(), 500);
  };
  let printed = false;
  const doPrint = () => {
    if (printed) return;
    printed = true;
    const win = iframe.contentWindow;
    if (!win) return cleanup();
    win.onafterprint = cleanup;
    win.focus();
    win.print();
    // Fallback cleanup for browsers that never fire onafterprint.
    setTimeout(cleanup, 60_000);
  };

  const img = doc.querySelector("img");
  if (img && !(img as HTMLImageElement).complete) {
    img.addEventListener("load", doPrint, { once: true });
    img.addEventListener("error", doPrint, { once: true });
    // Safety net if neither event fires.
    setTimeout(doPrint, 2000);
  } else {
    // Give layout a tick.
    setTimeout(doPrint, 50);
  }
}
