import { Link } from "react-router";
import { Minus, Plus, ShoppingBag, Phone, Trash2 } from "lucide-react";
import type { CartLine } from "../../lib/order-cart";
import { formatModifierSummary } from "../../lib/order-cart";
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
  signedIn?: boolean;
  signedInEmail?: string;
};

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 font-body text-sm text-ink placeholder:text-ink/35 focus:border-chili focus:outline-none";

export default function OrderCart({
  cart,
  onSetQty,
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
  signedIn = false,
  signedInEmail,
}: OrderCartProps) {
  const lines = cart;
  const subtotal = lines.reduce((sum, l) => sum + l.unit_price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim());
  const canPlace =
    lines.length > 0 &&
    customer.name.trim().length > 0 &&
    customer.phone.trim().length > 0 &&
    emailOk &&
    !placing;

  return (
    <aside
      className={`h-fit rounded-lg border-2 border-ink bg-paper shadow-ticket ${compact ? "" : "lg:sticky lg:top-[11.5rem]"}`}
      aria-label="Your order"
    >
      <div className="border-b-2 border-dashed border-ink/30 px-5 py-4 sm:px-6">
        <h2 className="flex items-center gap-2 font-display text-2xl uppercase tracking-[0.08em]">
          <ShoppingBag className="h-5 w-5 text-chili" aria-hidden />
          Your ticket
          {lines.length > 0 && (
            <span className="ml-auto rounded-full bg-chili px-2.5 py-0.5 font-mono text-[11px] text-cream">
              {lines.reduce((n, l) => n + l.qty, 0)}
            </span>
          )}
        </h2>
      </div>

      <div className="px-5 py-5 sm:px-6">
        {lines.length === 0 ? (
          <p className="py-6 text-center font-mono text-[12px] uppercase leading-relaxed tracking-[0.16em] text-ink/45">
            Nothing on the ticket yet.
            <br />
            Add something from the menu.
          </p>
        ) : (
          <ul className="max-h-[40vh] space-y-3 overflow-y-auto pr-1 lg:max-h-none lg:overflow-visible">
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
                        <span className="text-sm font-medium leading-tight">{line.item.name}</span>
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

        <div className="mt-6 space-y-3 border-t-2 border-dashed border-ink/30 pt-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
            Pickup details
          </p>
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
        </div>

        <div className="mt-6 border-t-2 border-dashed border-ink/30 pt-5">
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
              💳 Card online
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
              💵 Cash at pickup
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
          onClick={onPlaceOrder}
          disabled={!canPlace}
          className="mt-5 w-full rounded-md bg-chili px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream shadow-ticket transition-all hover:-translate-y-0.5 hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {placing
            ? "Placing order…"
            : lines.length
              ? `${payMethod === "cash" ? "Place order" : "Checkout"} — ${formatCents(total)}`
              : "Checkout"}
        </button>
        <p className="mt-3 text-center font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ink/40">
          {payMethod === "cash" ? "Pay cash at pickup" : "Pay ahead"} · Pickup at the counter · Open 24 hours
        </p>
      </div>
    </aside>
  );
}

export function cartTotals(cart: CartLine[]) {
  const subtotal = cart.reduce((sum, l) => sum + l.unit_price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  return { subtotal, tax, total: subtotal + tax, count: cart.reduce((n, l) => n + l.qty, 0) };
}
