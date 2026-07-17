import { useEffect, useMemo, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { ApiMenuItem, ApiMenuSection } from "../lib/api-types";
import { usePageMeta } from "../hooks/usePageMeta";
import { SITE } from "../data/site";
import OrderMenu, { type CartEntry } from "../sections/order/OrderMenu";
import OrderCart, { type CustomerInfo } from "../sections/order/OrderCart";
import PaymentStep from "../sections/order/PaymentStep";
import OrderSuccess from "../sections/order/OrderSuccess";

type Step = "shop" | "pay" | "done";

type PlacedOrder = {
  order_number: string;
  client_secret: string;
  total_cents: number;
};

const STRIPE_PK = (import.meta.env.VITE_STRIPE_PK as string | undefined) || "";

const PAY_FALLBACK = `Online payment is unavailable right now — call ${SITE.phone} and we'll take your order over the phone.`;

export default function OrderPage() {
  usePageMeta(
    "Order Online — Pickup at the Counter | Diner Grill, Chicago",
    "Order Diner Grill online for counter pickup: all-day breakfast, skillets, burgers and the famous Slinger. Open 24 hours on Irving Park Rd, Chicago."
  );

  const [sections, setSections] = useState<ApiMenuSection[]>([]);
  const [menuState, setMenuState] = useState<"loading" | "ready" | "error">("loading");
  const [cart, setCart] = useState<Record<number, CartEntry>>({});
  const [customer, setCustomer] = useState<CustomerInfo>({ name: "", phone: "", notes: "" });
  const [step, setStep] = useState<Step>("shop");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payUnavailable, setPayUnavailable] = useState<string | null>(null);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  const stripePromise = useMemo(() => (STRIPE_PK ? loadStripe(STRIPE_PK) : null), []);

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

  function addToCart(item: ApiMenuItem) {
    setCart((prev) => ({ ...prev, [item.id]: { item, qty: (prev[item.id]?.qty ?? 0) + 1 } }));
    setPayUnavailable(null);
  }

  function setQty(itemId: number, qty: number) {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) delete next[itemId];
      else if (next[itemId]) next[itemId] = { ...next[itemId], qty };
      return next;
    });
  }

  async function placeOrder() {
    setError(null);
    setPayUnavailable(null);
    if (!customer.name.trim() || !customer.phone.trim()) {
      setError("We need a name and phone number for the order.");
      return;
    }
    const lines = Object.values(cart);
    if (lines.length === 0) {
      setError("Add at least one item to your ticket.");
      return;
    }
    // No publishable key bundled → we can't run the payment step at all.
    if (!stripePromise) {
      setPayUnavailable(PAY_FALLBACK);
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customer.name.trim(),
          phone: customer.phone.trim(),
          notes: customer.notes.trim() || undefined,
          items: lines.map((l) => ({ item_id: l.item.id, qty: l.qty })),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as Partial<PlacedOrder> & { error?: string };
      if (res.status === 503) {
        setPayUnavailable(data.error || PAY_FALLBACK);
        return;
      }
      if (!res.ok || !data.client_secret || !data.order_number || data.total_cents === undefined) {
        setError(data.error || "Could not place your order — please try again.");
        return;
      }
      setPlaced({
        order_number: data.order_number,
        client_secret: data.client_secret,
        total_cents: data.total_cents,
      });
      setStep("pay");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setPlacing(false);
    }
  }

  function resetOrder() {
    setCart({});
    setCustomer({ name: "", phone: "", notes: "" });
    setPlaced(null);
    setError(null);
    setPayUnavailable(null);
    setStep("shop");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="paper-grain min-h-screen bg-cream pt-16 text-ink">
      <header className="border-b-2 border-ink/10">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8 md:py-16">
          <p className="flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">
            <span className="h-px w-10 bg-chili/60" aria-hidden />
            Pickup at the counter · Open 24 hours
          </p>
          <h1 className="headline mt-4 text-6xl md:text-8xl">
            Order <span className="text-chili">Online</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink/65">
            Pay ahead, skip the wait. You get an order number — the kitchen gets a
            printed ticket. Show the number at the counter and eat.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8 md:py-14">
        {step === "done" && placed ? (
          <OrderSuccess
            orderNumber={placed.order_number}
            totalCents={placed.total_cents}
            customerName={customer.name || "friend"}
            onNewOrder={resetOrder}
          />
        ) : step === "pay" && placed && stripePromise ? (
          <PaymentStep
            stripePromise={stripePromise}
            clientSecret={placed.client_secret}
            orderNumber={placed.order_number}
            totalCents={placed.total_cents}
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
                <p className="font-display text-3xl uppercase tracking-[0.06em]">Kitchen's offline</p>
                <p className="mt-3 text-sm leading-relaxed text-ink/60">
                  We couldn't load the online menu. Call{" "}
                  <a href={SITE.phoneHref} className="font-semibold text-chili underline underline-offset-2">
                    {SITE.phone}
                  </a>{" "}
                  and we'll take your order the old-fashioned way.
                </p>
              </div>
            )}
            {menuState === "ready" && (
              <div className="grid gap-10 lg:grid-cols-[1fr_380px]">
                <OrderMenu sections={sections} cart={cart} onAdd={addToCart} onSetQty={setQty} />
                <OrderCart
                  cart={cart}
                  onSetQty={setQty}
                  customer={customer}
                  onCustomerChange={setCustomer}
                  placing={placing}
                  error={error}
                  payUnavailable={payUnavailable}
                  onPlaceOrder={placeOrder}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
