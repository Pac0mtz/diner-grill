import { useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Lock, ArrowLeft } from "lucide-react";
import { formatCents } from "../../lib/money";

type PaymentStepProps = {
  stripePromise: Promise<Stripe | null>;
  clientSecret: string;
  orderNumber: string;
  totalCents: number;
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
  onPaid,
  onBack,
}: PaymentStepProps) {
  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-lg border-2 border-ink bg-paper p-6 shadow-ticket md:p-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-chili">Order {orderNumber}</p>
        <h2 className="mt-2 font-display text-4xl uppercase tracking-[0.06em]">
          Pay for your ticket
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Your order is on hold. Once payment clears, it prints in the kitchen and
          the counter crew gets to work.
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
      <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
        Payments handled securely by Stripe
      </p>
    </div>
  );
}
