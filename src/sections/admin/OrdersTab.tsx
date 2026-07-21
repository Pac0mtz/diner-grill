import { useCallback, useEffect, useRef, useState } from "react";
import { Printer, RefreshCw, Volume2, VolumeX, ExternalLink, Mail } from "lucide-react";
import { printReceiptLocally } from "./receipt-print";
import type { AdminOrder, OrderStatus } from "../../lib/api-types";
import { formatCents } from "../../lib/money";
import { playOrderAlert } from "../../lib/order-alert";
import { adminFetch, ApiError, formatOrderTime } from "./api";

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending_payment: "bg-ink/10 text-ink/50",
  paid: "bg-mustard text-ink",
  preparing: "bg-chili text-cream",
  ready: "bg-ink text-mustard",
  done: "bg-ink/10 text-ink/45",
  cancelled: "bg-ink/10 text-ink/40 line-through",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "New · accept",
  preparing: "Accepted",
  ready: "Ready",
  done: "Done",
  cancelled: "Cancelled",
};

const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: "preparing", label: "Accept order" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "done", label: "Complete" },
};

const ALL_STATUSES: OrderStatus[] = [
  "pending_payment",
  "paid",
  "preparing",
  "ready",
  "done",
  "cancelled",
];

const CAN_CANCEL: OrderStatus[] = ["pending_payment", "paid", "preparing", "ready"];

const FILTERS: { id: string; label: string; match: (o: AdminOrder) => boolean }[] = [
  { id: "active", label: "Active", match: (o) => ["paid", "preparing", "ready"].includes(o.status) },
  { id: "all", label: "All", match: () => true },
  { id: "paid", label: "Paid", match: (o) => o.status === "paid" },
  { id: "preparing", label: "Preparing", match: (o) => o.status === "preparing" },
  { id: "ready", label: "Ready", match: (o) => o.status === "ready" },
  { id: "done", label: "Done", match: (o) => o.status === "done" },
  { id: "cancelled", label: "Cancelled", match: (o) => o.status === "cancelled" },
  { id: "pending_payment", label: "Awaiting payment", match: (o) => o.status === "pending_payment" },
];

type OrdersTabProps = {
  onUnauthorized: () => void;
};

export default function OrdersTab({ onUnauthorized }: OrdersTabProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filter, setFilter] = useState("active");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const [soundOn, setSoundOn] = useState(true);
  const seenIds = useRef<Set<number> | null>(null);
  const soundOnRef = useRef(true);

  useEffect(() => {
    soundOnRef.current = soundOn;
  }, [soundOn]);

  useEffect(() => {
    (async () => {
      try {
        const s = await adminFetch<{ order_alert_sound?: string }>("/api/admin/settings");
        const on = s.order_alert_sound !== "0";
        setSoundOn(on);
        soundOnRef.current = on;
      } catch {
        /* keep default on */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ orders: AdminOrder[] }>("/api/admin/orders");
      // Highlight + chime for orders that became visible (new) since the previous poll.
      if (seenIds.current !== null) {
        const fresh = new Set<number>();
        for (const o of data.orders) {
          if (!seenIds.current.has(o.id) && o.status === "paid") fresh.add(o.id);
        }
        if (fresh.size > 0 && soundOnRef.current) {
          void playOrderAlert();
        }
        setFreshIds(fresh);
      }
      seenIds.current = new Set(data.orders.map((o) => o.id));
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load orders.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8_000);
    return () => clearInterval(timer);
  }, [load]);

  // Keep replaying the alarm every few seconds while any new (paid) order
  // is waiting to be accepted. Stops as soon as all are accepted/cancelled
  // or sound is muted.
  const hasUnaccepted = orders.some((o) => o.status === "paid");
  useEffect(() => {
    if (!hasUnaccepted || !soundOn) return;
    const timer = setInterval(() => {
      if (soundOnRef.current) void playOrderAlert();
    }, 5_000);
    return () => clearInterval(timer);
  }, [hasUnaccepted, soundOn]);

  async function updateStatus(id: number, status: OrderStatus) {
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/orders/${id}`, { method: "PATCH", body: { status } });
      setFreshIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function reprint(id: number) {
    setBusyId(id);
    try {
      await adminFetch(`/api/admin/orders/${id}/reprint`, { method: "POST" });
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Reprint failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function resendEmail(id: number, kind: "receipt" | "accepted" | "ready" | "cancelled") {
    setBusyId(id);
    try {
      const result = await adminFetch<{ ok?: boolean; skipped?: boolean; message?: string }>(
        `/api/admin/orders/${id}/resend-email`,
        { method: "POST", body: { kind } }
      );
      if (!result.ok) {
        setError(result.message || "Could not send email.");
      } else {
        setError(null);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Could not send email.");
    } finally {
      setBusyId(null);
    }
  }

  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const visible = orders.filter(activeFilter.match);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex flex-wrap gap-2">
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
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              if (next) void playOrderAlert();
            }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors sm:flex-none sm:py-1.5 ${
              soundOn
                ? "border-chili/40 bg-chili/10 text-chili"
                : "border-ink/25 text-ink/45 hover:border-ink hover:text-ink"
            }`}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute order alert sound" : "Enable order alert sound"}
            title={soundOn ? "Sound on — click to mute" : "Sound off — click to enable"}
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" aria-hidden /> : <VolumeX className="h-3.5 w-3.5" aria-hidden />}
            {soundOn ? "Sound" : "Muted"}
          </button>
          <button
            onClick={load}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border-2 border-ink/25 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink sm:flex-none sm:py-1.5"
            aria-label="Refresh orders"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember">
          {error}
        </p>
      )}
      {loading ? (
        <p className="py-16 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
          Loading orders…
        </p>
      ) : visible.length === 0 ? (
        <p className="rounded-lg border-2 border-dashed border-ink/25 py-16 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
          No {activeFilter.label.toLowerCase()} orders
        </p>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((o) => {
            const next = NEXT_STATUS[o.status];
            const isFresh = freshIds.has(o.id);
            return (
              <article
                key={o.id}
                className={`stamp-in rounded-lg border-2 bg-paper p-5 shadow-ticket transition-shadow ${
                  isFresh ? "border-mustard ring-4 ring-mustard/50" : "border-ink"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl uppercase tracking-[0.05em]">
                      {o.order_number}
                      {isFresh && (
                        <span className="ml-2 inline-block -translate-y-1 rounded-sm bg-chili px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-[0.16em] text-cream">
                          New
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/50">
                      {formatOrderTime(o.created_at)}
                    </p>
                  </div>
                  <span
                    className={`whitespace-nowrap rounded-sm px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] ${STATUS_STYLES[o.status]}`}
                  >
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>

                <p className="mt-3 text-sm font-semibold">
                  {o.customer_name}{" "}
                  <span className="font-normal text-ink/55">· {o.phone}</span>
                </p>
                {o.customer_email && (
                  <p className="mt-0.5 truncate font-mono text-[11px] text-ink/45">
                    {o.customer_email}
                  </p>
                )}

                <ul className="mt-3 space-y-1.5 border-t border-dashed border-ink/25 pt-3 text-sm">
                  {o.items.map((line, i) => (
                    <li key={i}>
                      <div className="flex justify-between gap-3">
                        <span>
                          <span className="font-mono font-semibold">{line.qty}×</span> {line.name}
                        </span>
                        <span className="font-mono text-ink/60">{formatCents(line.price_cents * line.qty)}</span>
                      </div>
                      {line.modifiers && line.modifiers.length > 0 && (
                        <p className="mt-0.5 pl-5 text-[12px] text-ink/50">
                          {line.modifiers.map((m) => m.label).join(" · ")}
                        </p>
                      )}
                      {line.line_note && (
                        <p className="mt-0.5 pl-5 text-[12px] italic text-ink/45">“{line.line_note}”</p>
                      )}
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="mt-2 rounded-sm bg-mustard/15 px-2.5 py-1.5 text-[13px] italic text-ink/75">
                    “{o.notes}”
                  </p>
                )}
                <p className="mt-3 flex justify-between border-t border-dashed border-ink/25 pt-3 font-mono text-sm font-semibold">
                  <span>Total</span>
                  <span>{formatCents(o.total_cents)}</span>
                </p>
                {o.payment_method === "cash" && (
                  <p className="mt-1.5 inline-block rounded-sm border-2 border-ink bg-mustard px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink">
                    💵 Cash — collect at pickup
                  </p>
                )}
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                  Print: {o.print_status}
                  {o.stripe_dashboard_url && (
                    <>
                      {" · "}
                      <a
                        href={o.stripe_dashboard_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-chili underline-offset-2 hover:underline"
                        title={o.stripe_payment_intent ?? "Open in Stripe"}
                      >
                        Stripe
                        <ExternalLink className="h-2.5 w-2.5" aria-hidden />
                      </a>
                    </>
                  )}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {next && (
                    <button
                      onClick={() => updateStatus(o.id, next.to)}
                      disabled={busyId === o.id}
                      className="flex-1 rounded-md bg-chili px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember disabled:opacity-40"
                    >
                      {next.label}
                    </button>
                  )}
                  {o.status === "cancelled" && (
                    <button
                      onClick={() => updateStatus(o.id, "paid")}
                      disabled={busyId === o.id}
                      className="flex-1 rounded-md bg-ink px-3 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili disabled:opacity-40"
                    >
                      Reopen
                    </button>
                  )}
                  {o.status === "done" && (
                    <button
                      onClick={() => updateStatus(o.id, "ready")}
                      disabled={busyId === o.id}
                      className="rounded-md border-2 border-ink/30 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                    >
                      Reopen to ready
                    </button>
                  )}
                  {CAN_CANCEL.includes(o.status) && (
                    <button
                      onClick={() => {
                        if (!window.confirm(`Cancel order ${o.order_number}?`)) return;
                        updateStatus(o.id, "cancelled");
                      }}
                      disabled={busyId === o.id}
                      className="rounded-md border-2 border-ink/30 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
                    >
                      Cancel
                    </button>
                  )}
                  {o.status !== "pending_payment" && o.status !== "cancelled" && (
                    <button
                      onClick={() => reprint(o.id)}
                      disabled={busyId === o.id}
                      className="flex items-center gap-1.5 rounded-md border-2 border-ink px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
                    >
                      <Printer className="h-3.5 w-3.5" aria-hidden />
                      Reprint
                    </button>
                  )}
                  {o.status !== "pending_payment" && (
                    <button
                      type="button"
                      onClick={() => printReceiptLocally(o)}
                      className="flex items-center gap-1.5 rounded-md border-2 border-ink/30 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
                      title="Print receipt on this device's printer"
                    >
                      <Printer className="h-3.5 w-3.5" aria-hidden />
                      Print local
                    </button>
                  )}
                  {o.customer_email && o.status !== "pending_payment" && (
                    <button
                      type="button"
                      onClick={() => {
                        const kind =
                          o.status === "cancelled"
                            ? "cancelled"
                            : o.status === "ready" || o.status === "done"
                              ? "ready"
                              : o.status === "preparing"
                                ? "accepted"
                                : "receipt";
                        void resendEmail(o.id, kind);
                      }}
                      disabled={busyId === o.id}
                      className="flex items-center gap-1.5 rounded-md border-2 border-ink/30 px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                      title={`Resend email to ${o.customer_email}`}
                    >
                      <Mail className="h-3.5 w-3.5" aria-hidden />
                      Email
                    </button>
                  )}
                </div>
                <label className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">
                  <span className="shrink-0">Set status</span>
                  <select
                    value={o.status}
                    disabled={busyId === o.id}
                    onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                    className="min-w-0 flex-1 rounded-md border border-ink/20 bg-cream px-2 py-1.5 text-[11px] tracking-[0.08em] text-ink focus:border-chili focus:outline-none disabled:opacity-40"
                    aria-label={`Set status for ${o.order_number}`}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
