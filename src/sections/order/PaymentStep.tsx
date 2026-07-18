import { useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Lock, ArrowLeft } from "lucide-react";
import type { CartLine } from "../../lib/order-cart";
import { formatModifierSummary } from "../../lib/order-cart";
import { formatCents } from "../../lib/money";

type PaymentStepProps = {
  stripePromise: Promise<Stripe | null>;
  clientSecret: string;
  orderNumber: string;
  totalCents: number;
  lines: CartLine[];
  customerName: string;
  onPaid: () => void;
  onBack: () => void;
};

function PaymentForm({
  totalCents,
  onPaid,
  onBack,
}: {
  totalCents: number;
  onPaid: () => void;
  onBack: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });
    if (confirmError) {
      setError(confirmError.message ?? "Payment failed — please try again.");
      setSubmitting(false);
      return;
    }
    if (
      paymentIntent &&
      (paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing" ||
        paymentIntent.status === "requires_capture")
    ) {
      onPaid();
      return;
    }
    setError(`Unexpected payment status: ${paymentIntent?.status ?? "unknown"}. Please call the counter.`);
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p role="alert" className="mt-4 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-md bg-chili px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream shadow-ticket transition-all hover:-translate-y-0.5 hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
      >
        <Lock className="h-4 w-4" aria-hidden />
        {submitting ? "Processing…" : `Pay ${formatCents(totalCents)}`}
      </button>
      <button
        type="button"
        onClick={onBack}
        disabled={submitting}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border-2 border-ink/25 px-6 py-3 font-mono text-[12px] uppercase tracking-[0.16em] text-ink/70 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to the menu
      </button>
    </form>
  );
}

export default function PaymentStep({
  stripePromise,
  clientSecret,
  orderNumber,
  totalCents,
  lines,
  customerName,
  onPaid,
  onBack,
}: PaymentStepProps) {
  return (
    <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[1fr_340px]">
      <div className="rounded-lg border-2 border-ink bg-paper p-6 shadow-ticket md:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-chili">Order {orderNumber}</p>
        <h2 className="mt-2 font-display text-4xl uppercase tracking-[0.06em]">
          Pay for your ticket
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Held for {customerName.split(" ")[0] || "you"}. Once payment clears, it prints in the
          kitchen.
        </p>
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "stripe",
              variables: {
                colorPrimary: "#d8402e",
                colorBackground: "#f4ede0",
                colorText: "#17130f",
                colorDanger: "#b22a1c",
                fontFamily: "Archivo, sans-serif",
                borderRadius: "6px",
              },
            },
          }}
        >
          <PaymentForm totalCents={totalCents} onPaid={onPaid} onBack={onBack} />
        </Elements>
      </div>

      <aside className="h-fit rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket lg:sticky lg:top-24">
        <h3 className="font-display text-2xl uppercase tracking-[0.06em]">Summary</h3>
        <ul className="mt-4 space-y-3 border-b-2 border-dashed border-ink/25 pb-4">
          {lines.map((line) => {
            const summary = formatModifierSummary(line.item, line.modifiers);
            return (
              <li key={line.key} className="text-sm">
                <div className="flex justify-between gap-2 font-medium">
                  <span>
                    {line.qty}× {line.item.name}
                  </span>
                  <span className="shrink-0 font-mono text-ink/70">
                    {formatCents(line.unit_price_cents * line.qty)}
                  </span>
                </div>
                {summary && <p className="mt-0.5 text-[12px] text-ink/50">{summary}</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 flex justify-between font-mono text-base font-semibold">
          <span>Total</span>
          <span>{formatCents(totalCents)}</span>
        </p>
        <p className="mt-4 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-ink/40">
          Payments handled securely by Stripe
        </p>
      </aside>
    </div>
  );
}
