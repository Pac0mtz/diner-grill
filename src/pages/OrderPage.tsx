import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Check, ShoppingBag, X } from "lucide-react";
import type { ApiMenuItem, ApiMenuSection } from "../lib/api-types";
import {
  type CartLine,
  computeUnitPrice,
  newLineKey,
} from "../lib/order-cart";
import { formatCents } from "../lib/money";
import { useRouteSeo } from "../hooks/usePageMeta";
import { SITE } from "../data/site";
import { getCustomerToken, useCustomerAuth } from "../lib/customer-auth";
import OrderMenu from "../sections/order/OrderMenu";
import OrderCart, { cartTotals, type CustomerInfo } from "../sections/order/OrderCart";
import PaymentStep from "../sections/order/PaymentStep";
import OrderSuccess from "../sections/order/OrderSuccess";

type Step = "shop" | "pay" | "done";

type PlacedOrder = {
  order_number: string;
  client_secret: string;
  total_cents: number;
};

const ENV_STRIPE_PK = (import.meta.env.VITE_STRIPE_PK as string | undefined) || "";

const PAY_FALLBACK = `Online payment is unavailable right now — call ${SITE.phone} and we'll take your order over the phone.`;

const STEPS: { id: Step; label: string }[] = [
  { id: "shop", label: "Menu" },
  { id: "pay", label: "Pay" },
  { id: "done", label: "Ready" },
];

export default function OrderPage() {
  useRouteSeo("/order");
  const { customer: account } = useCustomerAuth();

  const [sections, setSections] = useState<ApiMenuSection[]>([]);
  const [menuState, setMenuState] = useState<"loading" | "ready" | "error">("loading");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: "",
    phone: "",
    email: "",
    notes: "",
    marketing_opt_in: false,
  });
  const [step, setStep] = useState<Step>("shop");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payUnavailable, setPayUnavailable] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [stripePk, setStripePk] = useState(ENV_STRIPE_PK);

  const stripePromise = useMemo(() => (stripePk ? loadStripe(stripePk) : null), [stripePk]);
  const totals = cartTotals(cart);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/menu")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<{ sections: ApiMenuSection[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setSections(data.sections);
        setMenuState("ready");
      })
      .catch(() => {
        if (!cancelled) setMenuState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Publishable key from Admin → Settings (falls back to VITE_STRIPE_PK).
  useEffect(() => {
    let cancelled = false;
    fetch("/api/stripe/config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { publishable_key?: string | null } | null) => {
        if (cancelled || !data?.publishable_key) return;
        setStripePk(data.publishable_key);
      })
      .catch(() => {
        /* keep env fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill pickup details when signed in (don't overwrite notes).
  useEffect(() => {
    if (!account) return;
    setCustomer((prev) => ({
      ...prev,
      name: prev.name.trim() ? prev.name : account.name,
      phone: prev.phone.trim() ? prev.phone : account.phone,
      email: prev.email.trim() ? prev.email : account.email,
      marketing_opt_in: account.marketing_opt_in,
    }));
  }, [account]);

  function addSimple(item: ApiMenuItem) {
    setCart((prev) => {
      const existing = prev.find(
        (l) => l.item.id === item.id && l.modifiers.length === 0 && !l.line_note
      );
      if (existing) {
        return prev.map((l) =>
          l.key === existing.key ? { ...l, qty: Math.min(50, l.qty + 1) } : l
        );
      }
      return [
        ...prev,
        {
          key: newLineKey(),
          item,
          qty: 1,
          modifiers: [],
          line_note: "",
          unit_price_cents: item.price_cents,
        },
      ];
    });
    setPayUnavailable(null);
  }

  function addCustom(line: Omit<CartLine, "key"> & { key?: string }) {
    setCart((prev) => [
      ...prev,
      {
        key: line.key || newLineKey(),
        item: line.item,
        qty: line.qty,
        modifiers: line.modifiers,
        line_note: line.line_note,
        unit_price_cents: line.unit_price_cents || computeUnitPrice(line.item, line.modifiers),
      },
    ]);
    setPayUnavailable(null);
    setMobileCartOpen(true);
  }

  function setQty(key: string, qty: number) {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((l) => l.key !== key);
      return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(50, qty) } : l));
    });
  }

  async function placeOrder() {
    setError(null);
    setPayUnavailable(null);
    if (!customer.name.trim() || !customer.phone.trim()) {
      setError("We need a name and phone number for the order.");
      setMobileCartOpen(true);
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim())) {
      setError("Add a valid email so we can send your receipt and order updates.");
      setMobileCartOpen(true);
      return;
    }
    if (cart.length === 0) {
      setError("Add at least one item to your ticket.");
      return;
    }
    if (!stripePromise) {
      setPayUnavailable(PAY_FALLBACK);
      setMobileCartOpen(true);
      return;
    }
    setPlacing(true);
    try {
      const token = getCustomerToken();
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          customer_name: customer.name.trim(),
          phone: customer.phone.trim(),
          customer_email: customer.email.trim().toLowerCase(),
          notes: customer.notes.trim() || undefined,
          marketing_opt_in: customer.marketing_opt_in,
          items: cart.map((l) => ({
            item_id: l.item.id,
            qty: l.qty,
            modifiers: l.modifiers,
            line_note: l.line_note || undefined,
          })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<PlacedOrder> & { error?: string };
      if (res.status === 503) {
        setPayUnavailable(data.error || PAY_FALLBACK);
        setMobileCartOpen(true);
        return;
      }
      if (!res.ok || !data.client_secret || !data.order_number || data.total_cents === undefined) {
        setError(data.error || "Could not place your order — please try again.");
        setMobileCartOpen(true);
        return;
      }
      setPlaced({
        order_number: data.order_number,
        client_secret: data.client_secret,
        total_cents: data.total_cents,
      });
      setMobileCartOpen(false);
      setStep("pay");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error — check your connection and try again.");
      setMobileCartOpen(true);
    } finally {
      setPlacing(false);
    }
  }

  function resetOrder() {
    setCart([]);
    setCustomer({
      name: account?.name || "",
      phone: account?.phone || "",
      email: account?.email || "",
      notes: "",
      marketing_opt_in: account?.marketing_opt_in ?? false,
    });
    setPlaced(null);
    setError(null);
    setPayUnavailable(null);
    setStep("shop");
    setMobileCartOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <div className="paper-grain min-h-screen overflow-x-hidden bg-cream pt-16 text-ink">
      <header className="border-b-2 border-ink/10 bg-gradient-to-b from-paper/80 to-cream">
        <div className="mx-auto max-w-7xl px-5 py-8 md:px-8 md:py-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="min-w-0">
              <p className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">
                <span className="h-px w-10 bg-chili/60" aria-hidden />
                Pickup · Open 24 hours
              </p>
              <h1 className="headline mt-2 text-5xl md:text-6xl lg:text-7xl">
                Order <span className="text-chili">Online</span>
              </h1>
              {step === "shop" && (
                <p className="mt-3 max-w-lg text-base leading-relaxed text-ink/65">
                  Pick a section, customize your plate, pay ahead — show your order number at
                  the counter.
                </p>
              )}
              {step === "pay" && (
                <p className="mt-2 text-sm text-ink/60">Secure checkout · counter pickup only</p>
              )}
            </div>

            {/* Step indicator */}
            <ol
              className="flex w-full max-w-sm items-stretch gap-2 sm:w-auto"
              aria-label="Order steps"
            >
              {STEPS.map((s, i) => {
                const done = i < stepIndex;
                const current = i === stepIndex;
                return (
                  <li key={s.id} className="min-w-0 flex-1 sm:flex-none">
                    <div
                      className={`flex items-center gap-2 rounded-md border-2 px-3 py-2 ${
                        current
                          ? "border-ink bg-ink text-cream"
                          : done
                            ? "border-chili/40 bg-chili/10 text-chili"
                            : "border-ink/15 bg-paper/60 text-ink/35"
                      }`}
                    >
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold ${
                          current
                            ? "bg-mustard text-ink"
                            : done
                              ? "bg-chili text-cream"
                              : "bg-ink/10 text-ink/40"
                        }`}
                      >
                        {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
                      </span>
                      <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                        {s.label}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-6 md:px-8 md:py-10">
        {step === "done" && placed ? (
          <OrderSuccess
            orderNumber={placed.order_number}
            totalCents={placed.total_cents}
            customerName={customer.name || "friend"}
            customerEmail={customer.email.trim() || undefined}
            lines={cart}
            onNewOrder={resetOrder}
          />
        ) : step === "pay" && placed && stripePromise ? (
          <PaymentStep
            stripePromise={stripePromise}
            clientSecret={placed.client_secret}
            orderNumber={placed.order_number}
            totalCents={placed.total_cents}
            lines={cart}
            customerName={customer.name}
            onPaid={() => {
              setStep("done");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onBack={() => setStep("shop")}
          />
        ) : (
          <>
            {menuState === "loading" && (
              <p className="py-20 text-center font-mono text-[13px] uppercase tracking-[0.2em] text-ink/50">
                Loading the menu…
              </p>
            )}
            {menuState === "error" && (
              <div className="mx-auto max-w-md rounded-lg border-2 border-ink bg-paper p-8 text-center shadow-ticket">
                <p className="font-display text-3xl uppercase tracking-[0.06em]">Kitchen&apos;s offline</p>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  We couldn&apos;t load the online menu. Call{" "}
                  <a href={SITE.phoneHref} className="font-semibold text-chili underline underline-offset-2">
                    {SITE.phone}
                  </a>{" "}
                  and we&apos;ll take your order the old-fashioned way.
                </p>
              </div>
            )}
            {menuState === "ready" && (
              <OrderMenu
                sections={sections}
                cart={cart}
                onAddSimple={addSimple}
                onAddCustom={addCustom}
                onSetQty={setQty}
                sidebar={
                  <OrderCart
                    cart={cart}
                    onSetQty={setQty}
                    customer={customer}
                    onCustomerChange={setCustomer}
                    placing={placing}
                    error={error}
                    payUnavailable={payUnavailable}
                    onPlaceOrder={placeOrder}
                    signedIn={Boolean(account)}
                    signedInEmail={account?.email}
                  />
                }
              />
            )}
          </>
        )}
      </div>

      {/* Mobile cart bar + sheet */}
      {step === "shop" && menuState === "ready" && (
        <>
          <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper p-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] lg:hidden">
            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              className="flex w-full items-center justify-between gap-3 rounded-md bg-chili px-4 py-3.5 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-cream"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" aria-hidden />
                View ticket
                {totals.count > 0 && (
                  <span className="rounded-full bg-cream/20 px-2 py-0.5 text-cream">{totals.count}</span>
                )}
              </span>
              <span>{formatCents(totals.total)}</span>
            </button>
          </div>

          {mobileCartOpen && (
            <div
              className="fixed inset-0 z-50 flex items-end bg-ink/60 lg:hidden"
              onClick={() => setMobileCartOpen(false)}
            >
              <div
                className="max-h-[88vh] w-full overflow-y-auto rounded-t-xl border-2 border-ink bg-cream"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b-2 border-ink/10 bg-cream px-4 py-3">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">Your ticket</p>
                  <button
                    type="button"
                    onClick={() => setMobileCartOpen(false)}
                    className="rounded-md border-2 border-ink/20 p-1.5"
                    aria-label="Close cart"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3 pb-6">
                  <OrderCart
                    compact
                    cart={cart}
                    onSetQty={setQty}
                    customer={customer}
                    onCustomerChange={setCustomer}
                    placing={placing}
                    error={error}
                    payUnavailable={payUnavailable}
                    onPlaceOrder={placeOrder}
                    signedIn={Boolean(account)}
                    signedInEmail={account?.email}
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
