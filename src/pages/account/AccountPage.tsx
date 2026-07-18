import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router";
import { LogOut, ShoppingBag } from "lucide-react";
import { useRouteSeo } from "../../hooks/usePageMeta";
import { formatCents } from "../../lib/money";
import {
  customerFetch,
  CustomerApiError,
  useCustomerAuth,
} from "../../lib/customer-auth";

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none";

type HistoryOrder = {
  id: number;
  order_number: string;
  status: string;
  total_cents: number;
  created_at: string;
  items: { name: string; qty: number }[];
};

function formatWhen(iso: string) {
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", {
    timeZone: "America/Chicago",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AccountPage() {
  useRouteSeo("/account");
  const { customer, loading, logout, updateProfile } = useCustomerAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [offers, setOffers] = useState(false);
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!customer) return;
    setName(customer.name);
    setPhone(customer.phone);
    setOffers(customer.marketing_opt_in);
  }, [customer]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await customerFetch<{ orders: HistoryOrder[] }>("/api/me/orders");
      setOrders(data.orders);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customer) void loadOrders();
  }, [customer, loadOrders]);

  if (loading) {
    return (
      <div className="paper-grain grid min-h-screen place-items-center bg-cream pt-16 text-ink">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">Loading…</p>
      </div>
    );
  }

  if (!customer) {
    return <Navigate to="/account/login?next=/account" replace />;
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        marketing_opt_in: offers,
      });
      setNotice("Profile saved.");
    } catch (err) {
      setError(err instanceof CustomerApiError ? err.message : "Could not save profile.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper-grain min-h-screen bg-cream px-5 pb-20 pt-24 text-ink md:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-chili">Your account</p>
            <h1 className="mt-1 font-display text-4xl uppercase tracking-[0.06em] sm:text-5xl">
              {customer.name || "Guest"}
            </h1>
            <p className="mt-1 text-sm text-ink/55">{customer.email}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/order"
              className="inline-flex items-center gap-1.5 rounded-md bg-chili px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream hover:bg-ember"
            >
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
              Order now
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-ink/25 px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 hover:border-ink hover:text-ink"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </div>
        </div>

        <form
          onSubmit={onSave}
          className="mt-8 rounded-lg border-2 border-ink bg-paper p-5 shadow-ticket sm:p-6"
        >
          <h2 className="font-display text-2xl uppercase tracking-[0.06em]">Profile</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="acct-name" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
                Name
              </label>
              <input
                id="acct-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="acct-phone" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
                Phone
              </label>
              <input
                id="acct-phone"
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border-2 border-ink/15 px-3 py-3">
            <input
              type="checkbox"
              checked={offers}
              onChange={(e) => setOffers(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-chili"
            />
            <span className="text-sm leading-snug text-ink/70">
              Email me offers and specials from Diner Grill
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-3 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2 text-sm text-ember">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="mt-3 rounded-md border-2 border-mustard bg-mustard/15 px-3 py-2 text-sm">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded-md bg-ink px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream hover:bg-chili disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save profile"}
          </button>
        </form>

        <section className="mt-8">
          <h2 className="font-display text-2xl uppercase tracking-[0.06em]">Order history</h2>
          <p className="mt-1 text-sm text-ink/55">
            Orders placed while signed in. Guest checkouts are not listed here.
          </p>

          {ordersLoading ? (
            <p className="mt-6 font-mono text-[12px] uppercase tracking-[0.16em] text-ink/40">
              Loading orders…
            </p>
          ) : orders.length === 0 ? (
            <div className="mt-6 rounded-lg border-2 border-dashed border-ink/25 px-5 py-10 text-center">
              <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink/45">
                No orders yet
              </p>
              <Link
                to="/order"
                className="mt-4 inline-flex rounded-md bg-chili px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream"
              >
                Start an order
              </Link>
            </div>
          ) : (
            <ul className="mt-5 space-y-3">
              {orders.map((o) => (
                <li
                  key={o.id}
                  className="rounded-lg border-2 border-ink/15 bg-paper p-4 shadow-ticket"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-2xl uppercase tracking-[0.04em]">
                        {o.order_number}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.12em] text-ink/40">
                        {formatWhen(o.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-base font-semibold text-chili">
                        {formatCents(o.total_cents)}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/45">
                        {o.status.replace(/_/g, " ")}
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-ink/60">
                    {o.items.map((i) => `${i.qty}× ${i.name}`).join(" · ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
