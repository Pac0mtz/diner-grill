import { useState } from "react";
import { Link } from "react-router";
import { ChevronDown, Minus, Plus, ShoppingBag, Phone, Pencil, Trash2, X } from "lucide-react";
import type { CartLine } from "../../lib/order-cart";
import { formatModifierSummary, itemNeedsCustomize } from "../../lib/order-cart";
import { formatCents, TAX_RATE } from "../../lib/money";
import { SITE } from "../../data/site";

export type CustomerInfo = {
  name: string;
  phone: string;
  email: string;
  notes: string;
  marketing_opt_in: boolean;
};

export type PayMethod = "card" | "cash";

type OrderCartProps = {
  cart: CartLine[];
  onSetQty: (key: string, qty: number) => void;
  onEditLine?: (line: CartLine) => void;
  customer: CustomerInfo;
  onCustomerChange: (next: CustomerInfo) => void;
  placing: boolean;
  error: string | null;
  payUnavailable: string | null;
  onPlaceOrder: () => void;
  payMethod: PayMethod;
  onPayMethodChange: (m: PayMethod) => void;
  /** Whether online card payment is currently available (Stripe configured). */
  cardAvailable: boolean;
  /** Compact mode for mobile sheet */
  compact?: boolean;
  /** Collapse control for floating desktop panel */
  onCollapse?: () => void;
  signedIn?: boolean;
  signedInEmail?: string;
};

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 font-body text-sm text-ink placeholder:text-ink/35 focus:border-chili focus:outline-none";

export default function OrderCart({
  cart,
  onSetQty,
  onEditLine,
  customer,
  onCustomerChange,
  placing,
  error,
  payUnavailable,
  onPlaceOrder,
  payMethod,
  onPayMethodChange,
  cardAvailable,
  compact = false,
  onCollapse,
  signedIn = false,
  signedInEmail,
}: OrderCartProps) {
  const lines = cart;
  const subtotal = lines.reduce((sum, l) => sum + l.unit_price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim());
  const detailsReady =
    customer.name.trim().length > 0 && customer.phone.trim().length > 0 && emailOk;
  const canPlace = lines.length > 0 && detailsReady && !placing;
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const showCheckout = checkoutOpen || Boolean(error) || Boolean(payUnavailable);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);

  return (
    <aside
      className={`flex h-fit flex-col rounded-lg border-2 border-ink bg-paper shadow-ticket ${
        compact ? "" : ""
      }`}
      aria-label="Your order"
    >
      <div className="shrink-0 border-b-2 border-dashed border-ink/30 px-5 py-4 sm:px-6">
        <div className="flex items-start gap-2">
          <h2 className="flex min-w-0 flex-1 items-center gap-2 font-display text-2xl uppercase tracking-[0.08em]">
            <ShoppingBag className="h-5 w-5 shrink-0 text-chili" aria-hidden />
            <span className="truncate">Your ticket</span>
            {itemCount > 0 && (
              <span className="rounded-full bg-chili px-2.5 py-0.5 font-mono text-[11px] text-cream">
                {itemCount}
              </span>
            )}
          </h2>
          {onCollapse && (
            <button
              type="button"
              onClick={onCollapse}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border-2 border-ink/20 text-ink/60 transition-colors hover:border-ink hover:text-ink"
              aria-label="Collapse ticket"
            >
              {compact ? <X className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>
        <p className="mt-2 font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-ink/45">
          Pickup · Ready in about 45 min · {SITE.address}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {lines.length === 0 ? (
          <p className="py-6 text-center font-mono text-[12px] uppercase leading-relaxed tracking-[0.16em] text-ink/45">
            Nothing on the ticket yet.
            <br />
            Add something from the menu.
          </p>
        ) : (
          <ul className="max-h-[32vh] space-y-3 overflow-y-auto pr-1">
            {lines.map((line) => {
              const summary = formatModifierSummary(line.item, line.modifiers);
              return (
                <li key={line.key} className="rounded-md border border-ink/10 bg-cream/50 p-2.5">
                  <div className="flex items-start gap-2">
                    <div className="flex items-center rounded-md border-2 border-ink/70 bg-cream">
                      <button
                        onClick={() => onSetQty(line.key, line.qty - 1)}
                        className="grid h-7 w-7 place-items-center transition-colors hover:bg-mustard"
                        aria-label={`Remove one ${line.item.name}`}
                      >
                        <Minus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                      <span className="w-6 text-center font-mono text-sm font-medium">{line.qty}</span>
                      <button
                        onClick={() => onSetQty(line.key, line.qty + 1)}
                        className="grid h-7 w-7 place-items-center transition-colors hover:bg-mustard"
                        aria-label={`Add one more ${line.item.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        {itemNeedsCustomize(line.item) && onEditLine ? (
                          <button
                            type="button"
                            onClick={() => onEditLine(line)}
                            className="text-left text-sm font-medium leading-tight underline-offset-2 hover:underline"
                          >
                            {line.item.name}
                          </button>
                        ) : (
                          <span className="text-sm font-medium leading-tight">{line.item.name}</span>
                        )}
                        <span className="shrink-0 font-mono text-sm text-ink/70">
                          {formatCents(line.unit_price_cents * line.qty)}
                        </span>
                      </div>
                      {summary && (
                        <p className="mt-0.5 text-[12px] leading-snug text-ink/55">{summary}</p>
                      )}
                      {line.line_note && (
                        <p className="mt-0.5 text-[12px] italic text-ink/45">“{line.line_note}”</p>
                      )}
                      {itemNeedsCustomize(line.item) && onEditLine && (
                        <button
                          type="button"
                          onClick={() => onEditLine(line)}
                          className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-chili hover:underline"
                        >
                          <Pencil className="h-3 w-3" aria-hidden />
                          Edit options
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSetQty(line.key, 0)}
                      className="mt-0.5 rounded p-1 text-ink/35 transition-colors hover:bg-ember/10 hover:text-ember"
                      aria-label={`Remove ${line.item.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <dl className="mt-5 space-y-1.5 border-t-2 border-dashed border-ink/30 pt-5 font-mono text-sm">
          <div className="flex justify-between text-ink/70">
            <dt>Subtotal</dt>
            <dd>{formatCents(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-ink/70">
            <dt>Tax (10.25%)</dt>
            <dd>{formatCents(tax)}</dd>
          </div>
          <div className="flex justify-between border-t border-ink/20 pt-2 text-base font-semibold text-ink">
            <dt>Total</dt>
            <dd>{formatCents(total)}</dd>
          </div>
        </dl>

        {!showCheckout ? (
          <button
            type="button"
            disabled={lines.length === 0}
            onClick={() => setCheckoutOpen(true)}
            className="mt-5 w-full rounded-md bg-chili px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream shadow-ticket transition-all hover:-translate-y-0.5 hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {lines.length ? `Checkout — ${formatCents(total)}` : "Add items to checkout"}
          </button>
        ) : (
        <div className="mt-6 space-y-3 border-t-2 border-dashed border-ink/30 pt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Pickup details
            </p>
            <button
              type="button"
              onClick={() => setCheckoutOpen(false)}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40 hover:text-ink"
            >
              Hide
            </button>
          </div>
          {signedIn ? (
            <p className="rounded-md border border-ink/10 bg-cream/70 px-3 py-2 text-sm text-ink/65">
              Signed in as <span className="font-semibold text-ink">{signedInEmail}</span>
              {" · "}
              <Link to="/account" className="font-semibold text-chili underline-offset-2 hover:underline">
                Account
              </Link>
            </p>
          ) : (
            <p className="rounded-md border border-ink/10 bg-cream/70 px-3 py-2 text-sm text-ink/65">
              <Link
                to="/account/login?next=/order"
                className="font-semibold text-chili underline-offset-2 hover:underline"
              >
                Sign in
              </Link>{" "}
              for faster checkout &amp; order history — or continue as guest.
            </p>
          )}
          <div>
            <label htmlFor="order-name" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Name for the order *
            </label>
            <input
              id="order-name"
              type="text"
              autoComplete="name"
              value={customer.name}
              onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
              placeholder="e.g. Frank"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="order-phone" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Phone *
            </label>
            <input
              id="order-phone"
              type="tel"
              autoComplete="tel"
              value={customer.phone}
              onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
              placeholder="(773) 555-0123"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="order-email" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Email * <span className="normal-case tracking-normal text-ink/40">(receipt &amp; updates)</span>
            </label>
            <input
              id="order-email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={customer.email}
              onChange={(e) => onCustomerChange({ ...customer, email: e.target.value })}
              placeholder="you@email.com"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="order-notes" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Order notes (optional)
            </label>
            <textarea
              id="order-notes"
              rows={2}
              value={customer.notes}
              onChange={(e) => onCustomerChange({ ...customer, notes: e.target.value })}
              placeholder="Allergies, timing, etc."
              className={`${inputClass} resize-none`}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border-2 border-ink/15 px-3 py-3">
            <input
              type="checkbox"
              checked={customer.marketing_opt_in}
              onChange={(e) =>
                onCustomerChange({ ...customer, marketing_opt_in: e.target.checked })
              }
              className="mt-0.5 h-4 w-4 accent-chili"
            />
            <span className="text-sm leading-snug text-ink/70">
              Email me offers and specials from Diner Grill
            </span>
          </label>

          <div className="border-t-2 border-dashed border-ink/30 pt-5">
            <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Payment
            </p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
              <button
                type="button"
                role="radio"
                aria-checked={payMethod === "card"}
                disabled={!cardAvailable}
                onClick={() => onPayMethodChange("card")}
                className={`rounded-md border-2 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  payMethod === "card"
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/25 text-ink/60 hover:border-ink hover:text-ink"
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                Card online
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={payMethod === "cash"}
                onClick={() => onPayMethodChange("cash")}
                className={`rounded-md border-2 px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] transition-colors ${
                  payMethod === "cash"
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/25 text-ink/60 hover:border-ink hover:text-ink"
                }`}
              >
                Cash at pickup
              </button>
            </div>
            {!cardAvailable && (
              <p className="mt-2 text-[12px] leading-snug text-ink/50">
                Card payment online is temporarily unavailable — pay cash when you pick up.
              </p>
            )}
            {payMethod === "cash" && (
              <p className="mt-2 text-[12px] leading-snug text-ink/50">
                Bring cash to the counter — your order goes straight to the kitchen.
              </p>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-4 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember">
              {error}
            </p>
          )}
          {payUnavailable && (
            <div role="alert" className="mt-4 rounded-md border-2 border-mustard bg-mustard/15 px-3 py-3 text-sm">
              <p className="font-medium">{payUnavailable}</p>
              <a
                href={SITE.phoneHref}
                className="mt-2 inline-flex items-center gap-2 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-chili underline underline-offset-2"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                Call {SITE.phone}
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={onPlaceOrder}
            disabled={!canPlace}
            className="mt-5 w-full rounded-md bg-chili px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream shadow-ticket transition-all hover:-translate-y-0.5 hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {placing
              ? "Placing order…"
              : `${payMethod === "cash" ? "Place order" : "Pay & place order"} — ${formatCents(total)}`}
          </button>
          <p className="mt-3 text-center font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ink/40">
            {payMethod === "cash" ? "Pay cash at pickup" : "Pay ahead"} · Counter pickup · Open 24 hours
          </p>
        </div>
        )}
      </div>
    </aside>
  );
}

export function cartTotals(cart: CartLine[]) {
  const subtotal = cart.reduce((sum, l) => sum + l.unit_price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax, count: cart.reduce((n, l) => n + l.qty, 0) };
}
