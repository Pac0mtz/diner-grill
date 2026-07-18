import { CheckCircle2, MapPin, Clock } from "lucide-react";
import type { CartLine } from "../../lib/order-cart";
import { formatModifierSummary } from "../../lib/order-cart";
import { formatCents } from "../../lib/money";
import { SITE } from "../../data/site";

type OrderSuccessProps = {
  orderNumber: string;
  totalCents: number;
  customerName: string;
  customerEmail?: string;
  lines: CartLine[];
  onNewOrder: () => void;
};

export default function OrderSuccess({
  orderNumber,
  totalCents,
  customerName,
  customerEmail,
  lines,
  onNewOrder,
}: OrderSuccessProps) {
  const first = customerName.split(" ")[0] || "friend";

  return (
    <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-lg border-2 border-ink bg-paper px-6 py-10 text-center shadow-ticket md:px-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-chili" aria-hidden />
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.24em] text-ink/60">
          Paid · ticket sent to the kitchen
        </p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Your order number
        </p>
        <p className="stamp-in mt-1 font-display text-7xl uppercase tracking-[0.04em] text-chili md:text-8xl">
          {orderNumber}
        </p>
        <p className="mt-6 border-t-2 border-dashed border-ink/30 pt-6 text-lg font-medium leading-snug">
          Show this at the counter, {first}.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          {formatCents(totalCents)} paid · We’ll email updates
          {customerEmail ? (
            <>
              {" "}
              to <span className="font-medium text-ink">{customerEmail}</span>
            </>
          ) : null}
          . Questions?{" "}
          <a href={SITE.phoneHref} className="font-semibold text-chili underline underline-offset-2">
            {SITE.phone}
          </a>
        </p>
        <button
          onClick={onNewOrder}
          className="mt-8 rounded-md border-2 border-ink px-7 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-cream"
        >
          Start a new order
        </button>
      </div>

      <div className="space-y-4">
        <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
          <h3 className="font-display text-2xl uppercase tracking-[0.06em]">Pickup</h3>
          <ul className="mt-4 space-y-3 text-sm text-ink/70">
            <li className="flex gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-chili" aria-hidden />
              <span>{SITE.address}</span>
            </li>
            <li className="flex gap-2.5">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-chili" aria-hidden />
              <span>Open 24 hours · Counter pickup only</span>
            </li>
          </ul>
        </div>

        {lines.length > 0 && (
          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <h3 className="font-display text-2xl uppercase tracking-[0.06em]">You ordered</h3>
            <ul className="mt-4 space-y-3">
              {lines.map((line) => {
                const summary = formatModifierSummary(line.item, line.modifiers);
                return (
                  <li key={line.key} className="text-sm">
                    <div className="flex justify-between gap-2 font-medium">
                      <span>
                        {line.qty}× {line.item.name}
                      </span>
                      <span className="font-mono text-ink/60">
                        {formatCents(line.unit_price_cents * line.qty)}
                      </span>
                    </div>
                    {summary && <p className="mt-0.5 text-[12px] text-ink/50">{summary}</p>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
