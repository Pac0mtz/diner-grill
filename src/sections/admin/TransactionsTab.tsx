import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, CreditCard } from "lucide-react";
import { formatCents } from "../../lib/money";
import { adminFetch, ApiError, formatOrderTime } from "./api";

type StripeDetails = {
  status?: string;
  amount?: number;
  currency?: string;
  charge_id?: string | null;
  receipt_url?: string | null;
  card_brand?: string | null;
  card_last4?: string | null;
  paid?: boolean;
  refunded?: boolean;
  error?: string;
};

type Transaction = {
  id: number;
  order_number: string;
  customer_name: string;
  phone: string;
  status: string;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  stripe_payment_intent: string | null;
  created_at: string;
  item_count: number;
  stripe: StripeDetails | null;
  stripe_dashboard_url: string | null;
};

type Summary = {
  today_count: number;
  today_cents: number;
  week_count: number;
  week_cents: number;
};

type Filter = "paid" | "pending" | "all";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "paid", label: "Paid" },
  { id: "pending", label: "Awaiting payment" },
  { id: "all", label: "All with Stripe" },
];

type TransactionsTabProps = {
  onUnauthorized: () => void;
};

function stripeStatusLabel(tx: Transaction): string {
  if (tx.stripe?.error) return "Stripe error";
  if (tx.stripe?.refunded) return "Refunded";
  if (tx.stripe?.status) return tx.stripe.status.replace(/_/g, " ");
  if (tx.status === "pending_payment") return "pending";
  if (["paid", "preparing", "ready", "done"].includes(tx.status)) return "succeeded";
  return tx.status;
}

function statusClass(label: string): string {
  const s = label.toLowerCase();
  if (s.includes("succeed") || s === "paid") return "bg-mustard/30 text-ink";
  if (s.includes("pending") || s.includes("process") || s.includes("require"))
    return "bg-ink/10 text-ink/60";
  if (s.includes("fail") || s.includes("cancel") || s.includes("error") || s.includes("refund"))
    return "bg-ember/15 text-ember";
  return "bg-ink/10 text-ink/55";
}

export default function TransactionsTab({ onUnauthorized }: TransactionsTabProps) {
  const [filter, setFilter] = useState<Filter>("paid");
  const [rows, setRows] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{
        transactions: Transaction[];
        summary: Summary;
        stripe_configured: boolean;
        test_mode: boolean;
      }>(`/api/admin/transactions?filter=${filter}&enrich=1`);
      setRows(data.transactions);
      setSummary(data.summary);
      setStripeConfigured(data.stripe_configured);
      setTestMode(data.test_mode);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load transactions.");
    } finally {
      setLoading(false);
    }
  }, [filter, onUnauthorized]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="hidden lg:block">
          <h2 className="font-display text-4xl uppercase tracking-[0.06em]">Transactions</h2>
          <p className="mt-1 text-sm text-ink/60">
            Stripe payment history for online orders
            {testMode && (
              <span className="ml-2 rounded-sm bg-mustard/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink">
                Test mode
              </span>
            )}
          </p>
        </div>
        {testMode && (
          <span className="rounded-sm bg-mustard/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink lg:hidden">
            Test mode
          </span>
        )}
        <button
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="ml-auto flex items-center gap-1.5 rounded-md border-2 border-ink/25 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
      </div>

      {!stripeConfigured && (
        <p role="status" className="mb-4 rounded-md border-2 border-mustard bg-mustard/15 px-3 py-2.5 text-sm">
          <code className="font-mono text-[12px]">STRIPE_SECRET_KEY</code> is not set — showing
          local order records only. Card details and Stripe dashboard links need the key.
        </p>
      )}

      {summary && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border-2 border-ink bg-paper p-5 shadow-ticket">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Today revenue
            </p>
            <p className="mt-1 font-display text-4xl text-chili">
              {formatCents(summary.today_cents)}
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink/55">
              {summary.today_count} paid {summary.today_count === 1 ? "order" : "orders"}
            </p>
          </div>
          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Avg ticket today
            </p>
            <p className="mt-1 font-display text-4xl">
              {formatCents(
                summary.today_count > 0
                  ? Math.round(summary.today_cents / summary.today_count)
                  : 0
              )}
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink/55">Per paid order</p>
          </div>
          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              7-day revenue
            </p>
            <p className="mt-1 font-display text-4xl">{formatCents(summary.week_cents)}</p>
            <p className="mt-1 font-mono text-[12px] text-ink/55">
              {summary.week_count} paid {summary.week_count === 1 ? "order" : "orders"}
            </p>
          </div>
          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Avg ticket · 7d
            </p>
            <p className="mt-1 font-display text-4xl">
              {formatCents(
                summary.week_count > 0
                  ? Math.round(summary.week_cents / summary.week_count)
                  : 0
              )}
            </p>
            <p className="mt-1 font-mono text-[12px] text-ink/55">Per paid order</p>
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border-2 px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
              filter === f.id
                ? "border-ink bg-ink text-cream"
                : "border-ink/25 text-ink/60 hover:border-ink hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember">
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
          Loading transactions…
        </p>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-ink/25 py-16 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-ink/30" aria-hidden />
          <p className="mt-3 font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
            No Stripe transactions yet
          </p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-ink/55">
            Paid online orders will show up here with payment intent IDs and links to Stripe.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {rows.map((tx) => {
              const st = stripeStatusLabel(tx);
              return (
                <li
                  key={tx.id}
                  className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-2xl uppercase tracking-[0.04em]">
                        {tx.order_number}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                        {formatOrderTime(tx.created_at)} · {tx.item_count} items
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-base font-semibold text-chili">
                      {formatCents(tx.total_cents)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${statusClass(st)}`}
                    >
                      {st}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                      {tx.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium">{tx.customer_name}</p>
                  <p className="text-[12px] text-ink/50">{tx.phone}</p>
                  {tx.stripe?.card_brand && tx.stripe?.card_last4 && (
                    <p className="mt-1 font-mono text-[12px] text-ink/55">
                      {tx.stripe.card_brand} ···· {tx.stripe.card_last4}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 border-t border-ink/10 pt-3">
                    {tx.stripe_dashboard_url && (
                      <a
                        href={tx.stripe_dashboard_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-chili underline-offset-2 hover:underline"
                      >
                        Stripe
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                    {tx.stripe?.receipt_url && (
                      <a
                        href={tx.stripe.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55 underline-offset-2 hover:underline"
                      >
                        Receipt
                        <ExternalLink className="h-3 w-3" aria-hidden />
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-lg border-2 border-ink bg-paper shadow-ticket md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b-2 border-ink/20 bg-cream/80 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55">
                <tr>
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Stripe</th>
                  <th className="px-4 py-3 font-medium">Card</th>
                  <th className="px-4 py-3 font-medium">Links</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((tx) => {
                  const st = stripeStatusLabel(tx);
                  return (
                    <tr key={tx.id} className="border-b border-ink/10 last:border-0 hover:bg-cream/40">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-[12px] text-ink/60">
                        {formatOrderTime(tx.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-display text-xl uppercase tracking-[0.04em]">
                          {tx.order_number}
                        </span>
                        <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                          {tx.item_count} items · {tx.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium">{tx.customer_name}</span>
                        <span className="mt-0.5 block text-[12px] text-ink/50">{tx.phone}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold text-chili">
                        {formatCents(tx.total_cents)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${statusClass(st)}`}
                        >
                          {st}
                        </span>
                        {tx.stripe_payment_intent && (
                          <span
                            className="mt-1 block max-w-[140px] truncate font-mono text-[10px] text-ink/40"
                            title={tx.stripe_payment_intent}
                          >
                            {tx.stripe_payment_intent}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-ink/60">
                        {tx.stripe?.card_brand && tx.stripe?.card_last4
                          ? `${tx.stripe.card_brand} ···· ${tx.stripe.card_last4}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {tx.stripe_dashboard_url && (
                            <a
                              href={tx.stripe_dashboard_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-chili underline-offset-2 hover:underline"
                            >
                              Stripe
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                          {tx.stripe?.receipt_url && (
                            <a
                              href={tx.stripe.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/55 underline-offset-2 hover:underline"
                            >
                              Receipt
                              <ExternalLink className="h-3 w-3" aria-hidden />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
