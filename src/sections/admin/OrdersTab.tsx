import { useCallback, useEffect, useRef, useState } from "react";
import { Printer, RefreshCw } from "lucide-react";
import type { AdminOrder, OrderStatus } from "../../lib/api-types";
import { formatCents } from "../../lib/money";
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
  paid: "Paid",
  preparing: "Preparing",
  ready: "Ready",
  done: "Done",
  cancelled: "Cancelled",
};

const NEXT_STATUS: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: "preparing", label: "Fire it" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "done", label: "Complete" },
};

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
  const seenIds = useRef<Set<number> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ orders: AdminOrder[] }>("/api/admin/orders");
      // Highlight orders that became visible (new) since the previous poll.
      if (seenIds.current !== null) {
        const fresh = new Set<number>();
        for (const o of data.orders) {
          if (!seenIds.current.has(o.id) && o.status === "paid") fresh.add(o.id);
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
    const timer = setInterval(load, 10_000);
    return () => clearInterval(timer);
  }, [load]);

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

  const activeFilter = FILTERS.find((f) => f.id === filter) ?? FILTERS[0];
  const visible = orders.filter(activeFilter.match);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
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
        <button
          onClick={load}
          className="ml-auto flex items-center gap-1.5 rounded-md border-2 border-ink/25 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
          aria-label="Refresh orders"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Refresh
        </button>
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
                  {o.customer_name} <span className="font-normal text-ink/55">· {o.phone}</span>
                </p>

                <ul className="mt-3 space-y-1 border-t border-dashed border-ink/25 pt-3 text-sm">
                  {o.items.map((line, i) => (
                    <li key={i} className="flex justify-between gap-3">
                      <span>
                        <span className="font-mono font-semibold">{line.qty}×</span> {line.name}
                      </span>
                      <span className="font-mono text-ink/60">{formatCents(line.price_cents * line.qty)}</span>
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
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                  Print: {o.print_status}
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
                  {(o.status === "paid" || o.status === "pending_payment") && (
                    <button
                      onClick={() => updateStatus(o.id, "cancelled")}
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
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
