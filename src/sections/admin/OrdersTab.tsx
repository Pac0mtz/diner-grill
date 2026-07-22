import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Printer, RefreshCw, Volume2, VolumeX } from "lucide-react";
import { printReceiptLocally } from "./receipt-print";
import type { AdminOrder, OrderStatus } from "../../lib/api-types";
import { formatCents } from "../../lib/money";
import { playOrderAlert } from "../../lib/order-alert";
import { adminFetch, ApiError, formatOrderTime } from "./api";

type ColumnId = "paid" | "preparing" | "ready" | "done";

const COLUMNS: {
  id: ColumnId;
  label: string;
  hint: string;
  header: string;
  empty: string;
}[] = [
  {
    id: "paid",
    label: "New",
    hint: "Accept",
    header: "border-mustard bg-mustard text-ink",
    empty: "No new tickets",
  },
  {
    id: "preparing",
    label: "Preparing",
    hint: "On the griddle",
    header: "border-chili bg-chili text-cream",
    empty: "Nothing cooking",
  },
  {
    id: "ready",
    label: "Ready",
    hint: "Pickup",
    header: "border-ink bg-ink text-mustard",
    empty: "Nothing at the counter",
  },
  {
    id: "done",
    label: "Done",
    hint: "Completed",
    header: "border-ink/25 bg-ink/10 text-ink/60",
    empty: "No completed tickets",
  },
];

const NEXT: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  paid: { to: "preparing", label: "Accept" },
  preparing: { to: "ready", label: "Ready" },
  ready: { to: "done", label: "Complete" },
};

type OrdersTabProps = {
  onUnauthorized: () => void;
};

function KanbanCard({
  order,
  busy,
  isFresh,
  onAdvance,
  onPrint,
}: {
  order: AdminOrder;
  busy: boolean;
  isFresh: boolean;
  onAdvance: () => void;
  onPrint: () => void;
}) {
  const next = NEXT[order.status];

  return (
    <article
      className={`rounded-lg border-2 bg-paper p-3.5 shadow-ticket ${
        isFresh ? "border-mustard ring-2 ring-mustard/40" : "border-ink/20"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-display text-2xl uppercase tracking-[0.04em] leading-none">
            {order.order_number}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">
            {formatOrderTime(order.created_at)}
          </p>
        </div>
        {order.payment_method === "cash" && (
          <span className="shrink-0 rounded-sm bg-mustard px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ink">
            Cash
          </span>
        )}
      </div>

      <p className="mt-2 truncate text-sm font-semibold">{order.customer_name}</p>
      <p className="truncate font-mono text-[11px] text-ink/50">{order.phone}</p>

      <ul className="mt-2.5 space-y-1 border-t border-dashed border-ink/20 pt-2.5 text-sm">
        {order.items.map((line, i) => (
          <li key={i}>
            <span className="font-mono font-semibold text-chili">{line.qty}×</span> {line.name}
            {line.modifiers && line.modifiers.length > 0 && (
              <span className="mt-0.5 block pl-5 text-[11px] text-ink/50">
                {line.modifiers.map((m) => m.label).join(" · ")}
              </span>
            )}
            {line.line_note && (
              <span className="mt-0.5 block pl-5 text-[11px] italic text-ink/45">
                “{line.line_note}”
              </span>
            )}
          </li>
        ))}
      </ul>

      {order.notes && (
        <p className="mt-2 rounded-sm bg-mustard/20 px-2 py-1.5 text-[12px] italic text-ink/75">
          “{order.notes}”
        </p>
      )}

      <p className="mt-2 font-mono text-sm font-semibold text-chili">
        {formatCents(order.total_cents)}
      </p>

      <div className="mt-3 flex flex-col gap-2">
        {next && (
          <button
            type="button"
            onClick={onAdvance}
            disabled={busy}
            className="w-full rounded-md bg-chili px-3 py-3 font-mono text-[12px] font-bold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember disabled:opacity-40"
          >
            {next.label}
          </button>
        )}
        {order.status !== "pending_payment" && order.status !== "cancelled" && (
          <button
            type="button"
            onClick={onPrint}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-ink/20 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/55 transition-colors hover:border-ink hover:text-ink"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Print
          </button>
        )}
      </div>
    </article>
  );
}

export default function OrdersTab({ onUnauthorized }: OrdersTabProps) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
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
      if (seenIds.current !== null) {
        const fresh = new Set<number>();
        for (const o of data.orders) {
          if (!seenIds.current.has(o.id) && o.status === "paid") fresh.add(o.id);
        }
        if (fresh.size > 0 && soundOnRef.current) void playOrderAlert();
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
    void load();
    const timer = setInterval(() => void load(), 8_000);
    return () => clearInterval(timer);
  }, [load]);

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

  const byColumn = useMemo(() => {
    const map: Record<ColumnId, AdminOrder[]> = {
      paid: [],
      preparing: [],
      ready: [],
      done: [],
    };
    for (const o of orders) {
      if (o.status === "paid") map.paid.push(o);
      else if (o.status === "preparing") map.preparing.push(o);
      else if (o.status === "ready") map.ready.push(o);
      else if (o.status === "done") map.done.push(o);
    }
    // Done column: keep the board light — last 12 only
    map.done = map.done.slice(0, 12);
    return map;
  }, [orders]);

  return (
    <div className="flex h-full min-h-[28rem] flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40">
            Kitchen board
          </p>
          <p className="mt-0.5 text-sm text-ink/55">New → preparing → ready → done</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !soundOn;
              setSoundOn(next);
              if (next) void playOrderAlert();
            }}
            className={`flex items-center gap-1.5 rounded-md border-2 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
              soundOn
                ? "border-chili/40 bg-chili/10 text-chili"
                : "border-ink/25 text-ink/45 hover:border-ink hover:text-ink"
            }`}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Mute order alert sound" : "Enable order alert sound"}
          >
            {soundOn ? <Volume2 className="h-3.5 w-3.5" aria-hidden /> : <VolumeX className="h-3.5 w-3.5" aria-hidden />}
            {soundOn ? "Sound" : "Muted"}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink/25 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
            aria-label="Refresh orders"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p className="py-16 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
          Loading board…
        </p>
      ) : (
        <div className="-mx-1 flex min-h-0 flex-1 gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
          {COLUMNS.map((col) => {
            const cards = byColumn[col.id];
            return (
              <section
                key={col.id}
                className="flex w-[min(100%,18.5rem)] shrink-0 flex-col rounded-lg border-2 border-ink/12 bg-cream/40 sm:w-72 lg:min-w-0 lg:flex-1"
                aria-label={`${col.label} column`}
              >
                <header
                  className={`flex items-center justify-between gap-2 rounded-t-[0.4rem] border-b-2 px-3 py-2.5 ${col.header}`}
                >
                  <div>
                    <p className="font-mono text-[12px] font-bold uppercase tracking-[0.14em]">
                      {col.label}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] opacity-70">
                      {col.hint}
                    </p>
                  </div>
                  <span className="grid h-8 min-w-8 place-items-center rounded-md bg-cream/25 px-2 font-mono text-sm font-bold">
                    {cards.length}
                  </span>
                </header>

                <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2.5 [scrollbar-width:thin]">
                  {cards.length === 0 ? (
                    <p className="px-2 py-8 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink/35">
                      {col.empty}
                    </p>
                  ) : (
                    cards.map((o) => (
                      <KanbanCard
                        key={o.id}
                        order={o}
                        busy={busyId === o.id}
                        isFresh={freshIds.has(o.id)}
                        onAdvance={() => {
                          const n = NEXT[o.status];
                          if (n) void updateStatus(o.id, n.to);
                        }}
                        onPrint={() => printReceiptLocally(o)}
                      />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
