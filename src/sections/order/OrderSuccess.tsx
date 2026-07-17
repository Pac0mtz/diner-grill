import { CheckCircle2 } from "lucide-react";
import { formatCents } from "../../lib/money";
import { SITE } from "../../data/site";

type OrderSuccessProps = {
  orderNumber: string;
  totalCents: number;
  customerName: string;
  onNewOrder: () => void;
};

export default function OrderSuccess({ orderNumber, totalCents, customerName, onNewOrder }: OrderSuccessProps) {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="rounded-lg border-2 border-ink bg-paper px-6 py-10 shadow-ticket md:px-10">
        <CheckCircle2 className="mx-auto h-12 w-12 text-chili" aria-hidden />
        <p className="mt-4 font-mono text-[12px] uppercase tracking-[0.24em] text-ink/60">
          Paid &amp; fired to the kitchen
        </p>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
          Your order number
        </p>
        <p className="stamp-in mt-1 font-display text-7xl uppercase tracking-[0.04em] text-chili md:text-8xl">
          {orderNumber}
        </p>
        <p className="mt-6 border-t-2 border-dashed border-ink/30 pt-6 text-lg font-medium leading-snug">
          Show this at the counter, {customerName.split(" ")[0]}.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          {formatCents(totalCents)} paid · The ticket is printing in the kitchen right now.
          Questions? Call{" "}
          <a href={SITE.phoneHref} className="font-semibold text-chili underline underline-offset-2">
            {SITE.phone}
          </a>
        </p>
      </div>
      <button
        onClick={onNewOrder}
        className="mt-6 rounded-md border-2 border-ink px-7 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.16em] text-ink transition-colors hover:bg-ink hover:text-cream"
      >
        Start a new order
      </button>
    </div>
  );
}
