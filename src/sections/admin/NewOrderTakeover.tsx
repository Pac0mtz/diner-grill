import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Check, Phone } from "lucide-react";
import type { AdminOrder } from "../../lib/api-types";
import { formatCents } from "../../lib/money";
import { playOrderAlert } from "../../lib/order-alert";
import { adminFetch, ApiError, formatOrderTime } from "./api";

type NewOrderTakeoverProps = {
  onUnauthorized: () => void;
};

/**
 * Page-pane kitchen alert for unaccepted (paid) orders.
 * Covers the main content area (not the sidebar) until Accept is tapped.
 */
export default function NewOrderTakeover({ onUnauthorized }: NewOrderTakeoverProps) {
  const [queue, setQueue] = useState<AdminOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const seenPaidIds = useRef<Set<number> | null>(null);
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
        /* default on */
      }
    })();
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ orders: AdminOrder[] }>("/api/admin/orders");
      const paid = data.orders
        .filter((o) => o.status === "paid")
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

      if (seenPaidIds.current === null) {
        // Opening admin with tickets already waiting — chime once.
        if (paid.length > 0 && soundOnRef.current) void playOrderAlert();
      } else {
        const arrived = paid.some((o) => !seenPaidIds.current!.has(o.id));
        if (arrived && soundOnRef.current) void playOrderAlert();
      }
      seenPaidIds.current = new Set(paid.map((o) => o.id));
      setQueue(paid);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      // Keep last queue on transient errors so the overlay doesn't vanish mid-accept.
    }
  }, [onUnauthorized]);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 5_000);
    return () => clearInterval(timer);
  }, [load]);

  // Keep alarming while anything is waiting to be accepted.
  useEffect(() => {
    if (queue.length === 0 || !soundOn) return;
    const timer = setInterval(() => {
      if (soundOnRef.current) void playOrderAlert();
    }, 6_000);
    return () => clearInterval(timer);
  }, [queue.length, soundOn]);

  const current = queue[0] ?? null;

  async function accept(order: AdminOrder) {
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { status: "preparing" },
      });
      setQueue((prev) => prev.filter((o) => o.id !== order.id));
      seenPaidIds.current?.delete(order.id);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not accept order.");
    } finally {
      setBusy(false);
    }
  }

  if (!current) return null;

  const waiting = queue.length;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="new-order-title"
      aria-describedby="new-order-desc"
      className="absolute inset-0 z-40 flex flex-col bg-ink text-cream"
    >
      <div className="flex items-center justify-between gap-4 border-b-4 border-ink bg-mustard px-5 py-4 text-ink sm:px-8 sm:py-5">
        <p className="flex items-center gap-3 font-mono text-sm font-bold uppercase tracking-[0.18em] sm:text-base">
          <BellRing className="h-7 w-7 shrink-0 animate-pulse sm:h-8 sm:w-8" aria-hidden />
          New order{waiting > 1 ? `s · ${waiting} waiting` : ""}
        </p>
        <p className="hidden font-mono text-sm uppercase tracking-[0.14em] text-ink/70 sm:block">
          Tap Accept below
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-6 sm:px-10 sm:py-8">
        <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-mustard">
            Ticket · {formatOrderTime(current.created_at)}
          </p>
          <h2
            id="new-order-title"
            className="mt-2 font-display text-7xl uppercase leading-none tracking-[0.05em] text-cream sm:text-8xl lg:text-9xl"
          >
            {current.order_number}
          </h2>
          <p id="new-order-desc" className="mt-4 text-2xl font-semibold text-cream sm:text-3xl">
            {current.customer_name}
          </p>

          <a
            href={`tel:${current.phone.replace(/\D/g, "")}`}
            className="mt-4 inline-flex min-h-14 w-fit items-center gap-3 rounded-md border-2 border-cream/30 bg-cream/10 px-5 py-3 font-mono text-base font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:border-mustard hover:bg-mustard/20 hover:text-mustard sm:min-h-16 sm:px-6 sm:text-lg"
          >
            <Phone className="h-6 w-6 shrink-0" aria-hidden />
            {current.phone}
          </a>

          {current.payment_method === "cash" && (
            <p className="mt-4 inline-flex w-fit rounded-md border-2 border-ink bg-mustard px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-[0.14em] text-ink sm:text-base">
              Cash — collect at pickup
            </p>
          )}

          <ul className="mt-8 flex-1 space-y-4 border-t-2 border-dashed border-cream/25 pt-6">
            {current.items.map((line, i) => (
              <li key={i}>
                <div className="flex justify-between gap-4">
                  <span className="min-w-0">
                    <span className="font-mono text-xl font-bold text-mustard sm:text-2xl">
                      {line.qty}×
                    </span>{" "}
                    <span className="font-display text-3xl uppercase tracking-[0.04em] sm:text-4xl">
                      {line.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-lg text-cream/55 sm:text-xl">
                    {formatCents(line.price_cents * line.qty)}
                  </span>
                </div>
                {line.modifiers && line.modifiers.length > 0 && (
                  <p className="mt-1.5 pl-10 text-base text-cream/55 sm:text-lg">
                    {line.modifiers.map((m) => m.label).join(" · ")}
                  </p>
                )}
                {line.line_note && (
                  <p className="mt-1.5 pl-10 text-base italic text-mustard/90 sm:text-lg">
                    “{line.line_note}”
                  </p>
                )}
              </li>
            ))}
          </ul>

          {current.notes && (
            <p className="mt-5 rounded-md border-2 border-mustard/50 bg-mustard/15 px-5 py-4 text-lg italic text-cream sm:text-xl">
              Note: “{current.notes}”
            </p>
          )}

          <div className="mt-8 flex items-end justify-between border-t-2 border-cream/20 pt-5 font-mono">
            <span className="text-sm uppercase tracking-[0.16em] text-cream/45 sm:text-base">
              Total
            </span>
            <span className="text-3xl font-semibold text-mustard sm:text-4xl">
              {formatCents(current.total_cents)}
            </span>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border-2 border-ember bg-ember/20 px-5 py-4 text-base font-medium text-cream sm:text-lg"
            >
              {error}
            </p>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t-4 border-mustard/40 bg-ink px-5 py-5 sm:px-10 sm:py-6">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3">
          <button
            type="button"
            onClick={() => void accept(current)}
            disabled={busy}
            className="flex min-h-[5.5rem] w-full items-center justify-center gap-3 rounded-lg bg-chili px-8 py-6 font-mono text-2xl font-bold uppercase tracking-[0.16em] text-cream shadow-ticket transition-colors hover:bg-ember active:scale-[0.99] disabled:opacity-50 sm:min-h-[6.5rem] sm:py-8 sm:text-3xl"
          >
            <Check className="h-8 w-8 shrink-0 sm:h-10 sm:w-10" aria-hidden strokeWidth={3} />
            {busy ? "Accepting…" : "Accept order"}
          </button>
          {waiting > 1 && (
            <p className="text-center font-mono text-sm uppercase tracking-[0.16em] text-cream/50">
              {waiting - 1} more after this
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
