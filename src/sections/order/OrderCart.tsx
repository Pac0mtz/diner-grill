import { Minus, Plus, ShoppingBag, Phone } from "lucide-react";
import type { CartEntry } from "./OrderMenu";
import { formatCents, TAX_RATE } from "../../lib/money";
import { SITE } from "../../data/site";

export type CustomerInfo = { name: string; phone: string; notes: string };

type OrderCartProps = {
  cart: Record<number, CartEntry>;
  onSetQty: (itemId: number, qty: number) => void;
  customer: CustomerInfo;
  onCustomerChange: (next: CustomerInfo) => void;
  placing: boolean;
  error: string | null;
  payUnavailable: string | null;
  onPlaceOrder: () => void;
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
}: OrderCartProps) {
  const lines = Object.values(cart);
  const subtotal = lines.reduce((sum, l) => sum + l.item.price_cents * l.qty, 0);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const canPlace =
    lines.length > 0 && customer.name.trim().length > 0 && customer.phone.trim().length > 0 && !placing;

  return (
    <aside
      className="h-fit rounded-lg border-2 border-ink bg-paper shadow-ticket lg:sticky lg:top-24"
      aria-label="Your order"
    >
      {/* ticket header */}
      <div className="border-b-2 border-dashed border-ink/30 px-6 py-4">
        <h2 className="flex items-center gap-2 font-display text-2xl uppercase tracking-[0.08em]">
          <ShoppingBag className="h-5 w-5 text-chili" aria-hidden />
          Your ticket
        </h2>
      </div>

      <div className="px-6 py-5">
        {lines.length === 0 ? (
          <p className="py-6 text-center font-mono text-[12px] uppercase leading-relaxed tracking-[0.16em] text-ink/45">
            Nothing on the ticket yet.
            <br />
            Add something from the menu.
          </p>
        ) : (
          <ul className="space-y-3">
            {lines.map(({ item, qty }) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="flex items-center rounded-md border-2 border-ink/70 bg-cream">
                  <button
                    onClick={() => onSetQty(item.id, qty - 1)}
                    className="grid h-7 w-7 place-items-center transition-colors hover:bg-mustard"
                    aria-label={`Remove one ${item.name}`}
                  >
                    <Minus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <span className="w-6 text-center font-mono text-sm font-medium">{qty}</span>
                  <button
                    onClick={() => onSetQty(item.id, qty + 1)}
                    className="grid h-7 w-7 place-items-center transition-colors hover:bg-mustard"
                    aria-label={`Add one more ${item.name}`}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
                <span className="flex-1 text-sm font-medium leading-tight">{item.name}</span>
                <span className="font-mono text-sm text-ink/70">
                  {formatCents(item.price_cents * qty)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* customer details */}
        <div className="mt-6 space-y-3 border-t-2 border-dashed border-ink/30 pt-5">
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
            <label htmlFor="order-notes" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Notes for the kitchen
            </label>
            <textarea
              id="order-notes"
              rows={2}
              value={customer.notes}
              onChange={(e) => onCustomerChange({ ...customer, notes: e.target.value })}
              placeholder="Eggs over easy, no onions…"
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* totals */}
        <dl className="mt-6 space-y-1.5 border-t-2 border-dashed border-ink/30 pt-5 font-mono text-sm">
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
          {placing ? "Placing order…" : lines.length ? `Place order — ${formatCents(total)}` : "Place order"}
        </button>
        <p className="mt-3 text-center font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ink/40">
          Pickup at the counter · Open 24 hours
        </p>
      </div>
    </aside>
  );
}
