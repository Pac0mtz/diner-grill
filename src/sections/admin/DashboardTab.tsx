import { useCallback, useEffect, useState } from "react";
import {
  RefreshCw,
  DollarSign,
  ShoppingBag,
  Flame,
  TrendingUp,
  TrendingDown,
  Minus,
  Printer,
  CreditCard,
  Mail,
  UtensilsCrossed,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatCents } from "../../lib/money";
import { adminFetch, ApiError, formatOrderTime } from "./api";

type DashboardData = {
  generated_at: string;
  today: {
    order_count: number;
    revenue_cents: number;
    avg_ticket_cents: number;
    revenue_change_pct: number;
    order_change_pct: number;
  };
  week: {
    order_count: number;
    revenue_cents: number;
    revenue_change_pct: number;
    order_change_pct: number;
  };
  kitchen: {
    active: number;
    paid: number;
    preparing: number;
    ready: number;
    pending_payment: number;
  };
  status_counts: Record<string, number>;
  print_counts: { queued: number; printed: number; failed: number };
  daily: { date: string; label: string; order_count: number; revenue_cents: number }[];
  top_items: { name: string; qty: number; revenue_cents: number }[];
  recent_orders: {
    id: number;
    order_number: string;
    customer_name: string;
    phone: string;
    status: string;
    total_cents: number;
    print_status: string;
    created_at: string;
    item_count: number;
  }[];
  menu: { sections: number; items_live: number; items_hidden: number };
  health: {
    stripe_configured: boolean;
    stripe_test_mode: boolean;
    smtp_ready: boolean;
    mail_print_configured: boolean;
    print_method: string;
    notify_configured: boolean;
  };
};

type DashboardTabProps = {
  onUnauthorized: () => void;
  onNavigate: (tab: "orders" | "transactions" | "menu" | "settings") => void;
};

const STATUS_PILL: Record<string, string> = {
  pending_payment: "bg-ink/10 text-ink/50",
  paid: "bg-mustard text-ink",
  preparing: "bg-chili text-cream",
  ready: "bg-ink text-mustard",
  done: "bg-ink/10 text-ink/45",
  cancelled: "bg-ink/10 text-ink/40",
};

function ChangeBadge({ pct }: { pct: number }) {
  if (pct === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 font-mono text-[11px] text-ink/40">
        <Minus className="h-3 w-3" aria-hidden />
        vs yesterday
      </span>
    );
  }
  const up = pct > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold ${
        up ? "text-chili" : "text-ember"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {up ? "+" : ""}
      {pct}% vs yesterday
    </span>
  );
}

function WeekChange({ pct }: { pct: number }) {
  if (pct === 0) {
    return <span className="font-mono text-[11px] text-ink/40">flat vs prior week</span>;
  }
  const up = pct > 0;
  return (
    <span className={`font-mono text-[11px] font-semibold ${up ? "text-chili" : "text-ember"}`}>
      {up ? "+" : ""}
      {pct}% vs prior week
    </span>
  );
}

function HealthRow({
  ok,
  warn,
  label,
  detail,
}: {
  ok: boolean;
  warn?: boolean;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-ink/8 py-3 last:border-0">
      {ok && !warn ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-chili" aria-hidden />
      ) : warn ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-mustard" aria-hidden />
      ) : (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-ember" aria-hidden />
      )}
      <div className="min-w-0">
        <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em]">{label}</p>
        <p className="mt-0.5 text-sm text-ink/55">{detail}</p>
      </div>
    </div>
  );
}

export default function DashboardTab({ onUnauthorized, onNavigate }: DashboardTabProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await adminFetch<DashboardData>("/api/admin/dashboard");
      setData(d);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    setLoading(true);
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return (
      <p className="py-20 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
        Loading dashboard…
      </p>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-lg border-2 border-ember/60 bg-ember/10 px-4 py-6 text-center">
        <p className="text-sm font-medium text-ember">{error}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const maxRevenue = Math.max(...data.daily.map((d) => d.revenue_cents), 1);
  const maxTopQty = Math.max(...data.top_items.map((t) => t.qty), 1);
  const printIssues = data.print_counts.failed + data.print_counts.queued;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/40">
            Overview · Chicago time
          </p>
          <p className="mt-1 text-sm text-ink/55">
            Live snapshot of sales, kitchen queue, and system health
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            void load();
          }}
          className="flex items-center gap-1.5 rounded-md border-2 border-ink/25 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border-2 border-ink bg-paper p-5 shadow-ticket">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Today revenue
            </p>
            <DollarSign className="h-4 w-4 text-chili" aria-hidden />
          </div>
          <p className="mt-2 font-display text-4xl tracking-wide text-chili">
            {formatCents(data.today.revenue_cents)}
          </p>
          <div className="mt-2">
            <ChangeBadge pct={data.today.revenue_change_pct} />
          </div>
        </div>

        <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Today orders
            </p>
            <ShoppingBag className="h-4 w-4 text-ink/40" aria-hidden />
          </div>
          <p className="mt-2 font-display text-4xl tracking-wide">{data.today.order_count}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ChangeBadge pct={data.today.order_change_pct} />
            <span className="font-mono text-[11px] text-ink/40">
              avg {formatCents(data.today.avg_ticket_cents)}
            </span>
          </div>
        </div>

        <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              7-day revenue
            </p>
            <TrendingUp className="h-4 w-4 text-ink/40" aria-hidden />
          </div>
          <p className="mt-2 font-display text-4xl tracking-wide">
            {formatCents(data.week.revenue_cents)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <WeekChange pct={data.week.revenue_change_pct} />
            <span className="font-mono text-[11px] text-ink/40">
              {data.week.order_count} orders
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate("orders")}
          className="rounded-lg border-2 border-ink/15 bg-paper p-5 text-left shadow-ticket transition-colors hover:border-chili"
        >
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50">
              Kitchen queue
            </p>
            <Flame className="h-4 w-4 text-chili" aria-hidden />
          </div>
          <p className="mt-2 font-display text-4xl tracking-wide">{data.kitchen.active}</p>
          <p className="mt-2 font-mono text-[11px] text-ink/50 sm:hidden">
            {data.kitchen.paid}/{data.kitchen.preparing}/{data.kitchen.ready} active
          </p>
          <p className="mt-2 hidden font-mono text-[11px] text-ink/50 sm:block">
            {data.kitchen.paid} new · {data.kitchen.preparing} prep · {data.kitchen.ready} ready
          </p>
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Revenue chart */}
        <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em]">
                Revenue · last 7 days
              </h3>
              <p className="mt-1 text-sm text-ink/50">Paid orders by Chicago calendar day</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("transactions")}
              className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-chili hover:underline"
            >
              All payments →
            </button>
          </div>
          <div className="-mx-1 mt-6 overflow-x-auto px-1 [scrollbar-width:thin]">
            <div className="flex h-44 min-w-[22rem] items-end gap-2 sm:min-w-0 sm:gap-3">
            {data.daily.map((d) => {
              const h = Math.max(4, Math.round((d.revenue_cents / maxRevenue) * 100));
              const isToday = d.date === data.daily[data.daily.length - 1]?.date;
              return (
                <div key={d.date} className="flex w-11 shrink-0 flex-col items-center gap-2 sm:w-auto sm:min-w-0 sm:flex-1">
                  <p className="font-mono text-[10px] text-ink/45">
                    {d.revenue_cents > 0 ? formatCents(d.revenue_cents) : "—"}
                  </p>
                  <div className="flex h-32 w-full items-end justify-center">
                    <div
                      className={`w-full max-w-[2.75rem] rounded-sm transition-all ${
                        isToday ? "bg-chili" : "bg-ink/20"
                      }`}
                      style={{ height: `${h}%` }}
                      title={`${d.label}: ${formatCents(d.revenue_cents)} · ${d.order_count} orders`}
                    />
                  </div>
                  <div className="text-center">
                    <p
                      className={`font-mono text-[10px] uppercase tracking-[0.08em] ${
                        isToday ? "font-semibold text-ink" : "text-ink/45"
                      }`}
                    >
                      {d.label.split(",")[0]}
                    </p>
                    <p className="font-mono text-[10px] text-ink/35">{d.order_count}</p>
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </div>

        {/* Kitchen + print */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <h3 className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em]">
              Ticket pipeline
            </h3>
            <div className="mt-4 space-y-3">
              {[
                { key: "paid", label: "New / paid", count: data.kitchen.paid, tone: "bg-mustard" },
                {
                  key: "preparing",
                  label: "Preparing",
                  count: data.kitchen.preparing,
                  tone: "bg-chili",
                },
                { key: "ready", label: "Ready", count: data.kitchen.ready, tone: "bg-ink" },
              ].map((row) => (
                <div key={row.key} className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.tone}`} />
                  <span className="flex-1 text-sm text-ink/70">{row.label}</span>
                  <span className="font-display text-2xl leading-none">{row.count}</span>
                </div>
              ))}
            </div>
            {data.kitchen.pending_payment > 0 && (
              <p className="mt-4 flex items-center gap-1.5 border-t border-ink/10 pt-3 font-mono text-[11px] text-ink/45">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {data.kitchen.pending_payment} awaiting payment
              </p>
            )}
          </div>

          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em]">
                Print status
              </h3>
              <Printer className="h-4 w-4 text-ink/35" aria-hidden />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md bg-cream px-2 py-3">
                <p className="font-display text-2xl">{data.print_counts.queued}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">
                  Queued
                </p>
              </div>
              <div className="rounded-md bg-cream px-2 py-3">
                <p className="font-display text-2xl">{data.print_counts.printed}</p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">
                  Printed
                </p>
              </div>
              <div
                className={`rounded-md px-2 py-3 ${
                  data.print_counts.failed > 0 ? "bg-ember/15" : "bg-cream"
                }`}
              >
                <p
                  className={`font-display text-2xl ${
                    data.print_counts.failed > 0 ? "text-ember" : ""
                  }`}
                >
                  {data.print_counts.failed}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">
                  Failed
                </p>
              </div>
            </div>
            {printIssues > 0 && (
              <button
                type="button"
                onClick={() => onNavigate("orders")}
                className="mt-3 w-full rounded-md border border-ink/15 px-3 py-2 text-left text-sm text-ink/65 transition-colors hover:border-chili hover:text-ink"
              >
                {data.print_counts.failed > 0
                  ? `${data.print_counts.failed} failed — check Orders`
                  : `${data.print_counts.queued} waiting to print`}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Recent orders */}
        <div className="rounded-lg border-2 border-ink/15 bg-paper shadow-ticket lg:col-span-3">
          <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
            <h3 className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em]">
              Recent orders
            </h3>
            <button
              type="button"
              onClick={() => onNavigate("orders")}
              className="font-mono text-[11px] uppercase tracking-[0.12em] text-chili hover:underline"
            >
              Open kitchen →
            </button>
          </div>
          {data.recent_orders.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-ink/45">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-ink/8">
              {data.recent_orders.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => onNavigate("orders")}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-cream/80"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[12px] font-semibold tracking-[0.08em]">
                          #{o.order_number}
                        </span>
                        <span
                          className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${
                            STATUS_PILL[o.status] || "bg-ink/10 text-ink/50"
                          }`}
                        >
                          {o.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-ink/60">
                        {o.customer_name}
                        <span className="text-ink/35"> · </span>
                        {o.item_count} {o.item_count === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold">
                        {formatCents(o.total_cents)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-ink/40">
                        {formatOrderTime(o.created_at)}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Top items + health */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em]">
                Top sellers · 7d
              </h3>
              <UtensilsCrossed className="h-4 w-4 text-ink/35" aria-hidden />
            </div>
            {data.top_items.length === 0 ? (
              <p className="mt-4 text-sm text-ink/45">No paid item data yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {data.top_items.map((item, i) => (
                  <li key={item.name}>
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm">
                        <span className="mr-1.5 font-mono text-[11px] text-ink/35">
                          {i + 1}.
                        </span>
                        {item.name}
                      </p>
                      <p className="shrink-0 font-mono text-[11px] text-ink/50">{item.qty}×</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-chili/80"
                        style={{ width: `${Math.round((item.qty / maxTopQty) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => onNavigate("menu")}
              className="mt-4 font-mono text-[11px] uppercase tracking-[0.12em] text-chili hover:underline"
            >
              Manage menu →
            </button>
          </div>

          <div className="rounded-lg border-2 border-ink/15 bg-paper p-5 shadow-ticket">
            <h3 className="font-mono text-[12px] font-semibold uppercase tracking-[0.16em]">
              System health
            </h3>
            <div className="mt-2">
              <HealthRow
                ok={data.health.stripe_configured}
                warn={data.health.stripe_configured && data.health.stripe_test_mode}
                label="Stripe"
                detail={
                  !data.health.stripe_configured
                    ? "Keys missing — online checkout won’t charge"
                    : data.health.stripe_test_mode
                      ? "Connected · test mode"
                      : "Connected · live mode"
                }
              />
              <HealthRow
                ok={data.health.mail_print_configured || data.health.print_method === "agent"}
                warn={
                  data.health.print_method === "both" && !data.health.mail_print_configured
                }
                label="Receipt print"
                detail={`Method: ${data.health.print_method}${
                  data.health.mail_print_configured
                    ? " · SMTP ready"
                    : data.health.smtp_ready
                      ? " · SMTP ok, printer email missing"
                      : data.health.print_method === "agent"
                        ? " · agent only"
                        : " · SMTP not configured"
                }`}
              />
              <HealthRow
                ok={data.health.notify_configured}
                label="Staff alerts"
                detail={
                  data.health.notify_configured
                    ? "Notify emails configured"
                    : "No notify emails set"
                }
              />
              <HealthRow
                ok={data.menu.items_live > 0}
                label="Menu"
                detail={`${data.menu.items_live} live · ${data.menu.items_hidden} hidden · ${data.menu.sections} sections`}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-ink/10 pt-3">
              <button
                type="button"
                onClick={() => onNavigate("settings")}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/55 hover:border-ink hover:text-ink"
              >
                <CreditCard className="h-3 w-3" aria-hidden />
                Settings
              </button>
              <button
                type="button"
                onClick={() => onNavigate("settings")}
                className="inline-flex items-center gap-1.5 rounded-md border border-ink/15 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/55 hover:border-ink hover:text-ink"
              >
                <Mail className="h-3 w-3" aria-hidden />
                SMTP / print
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
