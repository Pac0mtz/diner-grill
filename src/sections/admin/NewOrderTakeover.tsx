import { useCallback, useEffect, useRef, useState } from "react";
import { BellRing, Check, Mail, Phone, X } from "lucide-react";
import type { AdminOrder } from "../../lib/api-types";
import { formatCents } from "../../lib/money";
import { playOrderAlert } from "../../lib/order-alert";
import { adminFetch, ApiError, formatOrderTime } from "./api";

type NewOrderTakeoverProps = {
  onUnauthorized: () => void;
};

/**
 * Kitchen alert for unaccepted (paid) orders.
 * Large centered modal (not fullscreen) with a close control.
 */
export default function NewOrderTakeover({ onUnauthorized }: NewOrderTakeoverProps) {
  const [queue, setQueue] = useState<AdminOrder[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const [dismissed, setDismissed] = useState(false);
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
        if (arrived) setDismissed(false);
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
      const result = await adminFetch<{
        customer_email_result?: { ok?: boolean; skipped?: boolean; message?: string };
      }>(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: { status: "preparing" },
      });
      const mail = result.customer_email_result;
      if (mail && !mail.ok && !mail.skipped) {
        setError(mail.message || "Order accepted, but the customer email failed.");
        setQueue((prev) => prev.filter((o) => o.id !== order.id));
        seenPaidIds.current?.delete(order.id);
        await load();
        return;
      }
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

  useEffect(() => {
    if (queue.length === 0) setDismissed(false);
  }, [queue.length]);

  useEffect(() => {
    if (dismissed || queue.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDismissed(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismissed, queue.length]);

  if (!current) return null;

  const waiting = queue.length;

  if (dismissed) {
    return (
      <button
        type="button"
        onClick={() => setDismissed(false)}
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full border-2 border-ink bg-mustard px-5 py-3 font-mono text-sm font-bold uppercase tracking-[0.16em] text-ink shadow-ticket"
      >
        <BellRing className="h-5 w-5 animate-pulse" aria-hidden />
        New order{waiting > 1 ? `s · ${waiting}` : ""} · open
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-ink/70"
        aria-label="Close new order"
        onClick={() => setDismissed(true)}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="new-order-title"
        aria-describedby="new-order-desc"
        className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border-2 border-mustard bg-ink text-cream shadow-ticket"
      >
        <div className="flex items-center justify-between gap-3 border-b-4 border-ink bg-mustard px-4 py-3 text-ink sm:px-6 sm:py-4">
          <p className="flex min-w-0 items-center gap-2 font-mono text-sm font-bold uppercase tracking-[0.18em] sm:text-base">
            <BellRing className="h-6 w-6 shrink-0 animate-pulse sm:h-7 sm:w-7" aria-hidden />
            <span className="truncate">New order{waiting > 1 ? `s · ${waiting} waiting` : ""}</span>
          </p>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-ink/25 text-ink transition-colors hover:bg-ink/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" aria-hidden strokeWidth={2.5} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-mustard">
            Ticket · {formatOrderTime(current.created_at)}
          </p>
          <h2
            id="new-order-title"
            className="mt-2 font-display text-6xl uppercase leading-none tracking-[0.05em] text-cream sm:text-7xl lg:text-8xl"
          >
            {current.order_number}
          </h2>
          <p id="new-order-desc" className="mt-3 text-2xl font-semibold text-cream sm:text-3xl">
            {current.customer_name}
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={`tel:${current.phone.replace(/\D/g, "")}`}
              className="inline-flex min-h-12 w-fit items-center gap-3 rounded-md border-2 border-cream/30 bg-cream/10 px-4 py-2.5 font-mono text-sm font-semibold uppercase tracking-[0.12em] text-cream transition-colors hover:border-mustard hover:bg-mustard/20 hover:text-mustard sm:min-h-14 sm:px-5 sm:text-base"
            >
              <Phone className="h-5 w-5 shrink-0" aria-hidden />
              {current.phone}
            </a>
            {current.customer_email ? (
              <p className="inline-flex min-h-12 w-fit items-center gap-3 rounded-md border-2 border-cream/20 px-4 py-2.5 font-mono text-sm text-cream/80 sm:min-h-14 sm:text-base">
                <Mail className="h-5 w-5 shrink-0 text-mustard" aria-hidden />
                {current.customer_email}
              </p>
            ) : (
              <p className="inline-flex min-h-12 w-fit items-center rounded-md border-2 border-ember/50 px-4 py-2.5 font-mono text-sm uppercase tracking-[0.12em] text-mustard">
                No email on this order
              </p>
            )}
          </div>

          {current.payment_method === "cash" && (
            <p className="mt-4 inline-flex w-fit rounded-md border-2 border-ink bg-mustard px-4 py-2.5 font-mono text-sm font-bold uppercase tracking-[0.14em] text-ink">
              Cash — collect at pickup
            </p>
          )}

          <ul className="mt-6 flex-1 space-y-4 border-t-2 border-dashed border-cream/25 pt-5">
            {current.items.map((line, i) => (
              <li key={i}>
                <div className="flex justify-between gap-4">
                  <span className="min-w-0">
                    <span className="font-mono text-lg font-bold text-mustard sm:text-xl">
                      {line.qty}×
                    </span>{" "}
                    <span className="font-display text-2xl uppercase tracking-[0.04em] sm:text-3xl">
                      {line.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-base text-cream/55 sm:text-lg">
                    {formatCents(line.price_cents * line.qty)}
                  </span>
                </div>
                {line.modifiers && line.modifiers.length > 0 && (
                  <p className="mt-1.5 pl-9 text-sm text-cream/55 sm:text-base">
                    {line.modifiers.map((m) => m.label).join(" · ")}
                  </p>
                )}
                {line.line_note && (
                  <p className="mt-1.5 pl-9 text-sm italic text-mustard/90 sm:text-base">
                    “{line.line_note}”
                  </p>
                )}
              </li>
            ))}
          </ul>

          {current.notes && (
            <p className="mt-5 rounded-md border-2 border-mustard/50 bg-mustard/15 px-4 py-3 text-base italic text-cream sm:text-lg">
              Note: “{current.notes}”
            </p>
          )}

          <div className="mt-6 flex items-end justify-between border-t-2 border-cream/20 pt-4 font-mono">
            <span className="text-sm uppercase tracking-[0.16em] text-cream/45">Total</span>
            <span className="text-2xl font-semibold text-mustard sm:text-3xl">
              {formatCents(current.total_cents)}
            </span>
          </div>

          {error && (
            <p
              role="alert"
              className="mt-4 rounded-md border-2 border-ember bg-ember/20 px-4 py-3 text-sm font-medium text-cream sm:text-base"
            >
              {error}
            </p>
          )}
        </div>

        <div className="shrink-0 border-t-4 border-mustard/40 bg-ink px-4 py-4 sm:px-8 sm:py-5">
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => void accept(current)}
              disabled={busy}
              className="flex min-h-[4.25rem] w-full items-center justify-center gap-3 rounded-lg bg-chili px-6 py-4 font-mono text-xl font-bold uppercase tracking-[0.16em] text-cream shadow-ticket transition-colors hover:bg-ember active:scale-[0.99] disabled:opacity-50 sm:min-h-[5rem] sm:text-2xl"
            >
              <Check className="h-7 w-7 shrink-0 sm:h-8 sm:w-8" aria-hidden strokeWidth={3} />
              {busy ? "Accepting…" : current.customer_email ? "Accept & email guest" : "Accept order"}
            </button>
            <p className="text-center font-mono text-xs uppercase tracking-[0.14em] text-cream/45 sm:text-sm">
              {current.customer_email
                ? `Sends “kitchen started” to ${current.customer_email}`
                : "No guest email — accept still starts the ticket"}
            </p>
            {waiting > 1 && (
              <p className="text-center font-mono text-sm uppercase tracking-[0.16em] text-cream/50">
                {waiting - 1} more after this
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
