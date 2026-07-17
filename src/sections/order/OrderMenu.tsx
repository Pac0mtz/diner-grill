import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { ApiMenuItem, ApiMenuSection } from "../../lib/api-types";
import { formatCents } from "../../lib/money";

const TAG_STYLES: Record<string, string> = {
  signature: "bg-chili text-cream",
  popular: "bg-mustard text-ink",
  new: "bg-ink text-cream",
};

export type CartEntry = { item: ApiMenuItem; qty: number };

type OrderMenuProps = {
  sections: ApiMenuSection[];
  cart: Record<number, CartEntry>;
  onAdd: (item: ApiMenuItem) => void;
  onSetQty: (itemId: number, qty: number) => void;
};

export default function OrderMenu({ sections, cart, onAdd, onSetQty }: OrderMenuProps) {
  const [activeId, setActiveId] = useState<number | null>(sections[0]?.id ?? null);

  // Simple scroll-spy for the sticky section nav.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActiveId(Number(e.target.getAttribute("data-section-id")));
        }
      },
      { rootMargin: "-30% 0px -60% 0px" }
    );
    document.querySelectorAll("[data-section-id]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div>
      {/* sticky section nav */}
      <div className="sticky top-16 z-30 -mx-5 border-b-2 border-ink/10 bg-cream/95 px-5 py-3 backdrop-blur-md md:-mx-8 md:px-8">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Menu sections">
          {sections.map((s) => (
            <button
              key={s.id}
              role="tab"
              aria-selected={activeId === s.id}
              onClick={() => {
                setActiveId(s.id);
                document
                  .getElementById(`order-section-${s.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className={`whitespace-nowrap rounded-full border-2 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-all ${
                activeId === s.id
                  ? "border-ink bg-ink text-cream shadow-ticket"
                  : "border-ink/25 bg-transparent text-ink/70 hover:border-ink hover:text-ink"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* sections */}
      <div className="space-y-10 pt-8">
        {sections.map((s) => (
          <section
            key={s.id}
            id={`order-section-${s.id}`}
            data-section-id={s.id}
            className="scroll-mt-36 rounded-lg border-2 border-ink/12 bg-paper p-6 shadow-ticket md:p-8"
            aria-labelledby={`order-section-heading-${s.id}`}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink/80 pb-4">
              <h3
                id={`order-section-heading-${s.id}`}
                className="font-display text-3xl uppercase tracking-[0.08em] md:text-4xl"
              >
                {s.label}
              </h3>
              {s.note && (
                <p className="max-w-md font-mono text-[11px] uppercase leading-relaxed tracking-[0.12em] text-ink/50">
                  {s.note}
                </p>
              )}
            </div>

            <ul className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
              {s.items.map((item) => {
                const qty = cart[item.id]?.qty ?? 0;
                return (
                  <li
                    key={item.id}
                    className="flex gap-4 rounded-md border border-ink/10 bg-cream/60 p-4 transition-shadow hover:shadow-ticket"
                  >
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        className="h-20 w-20 shrink-0 self-start rounded-md border-2 border-ink/15 object-cover md:h-24 md:w-24"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-3">
                        <span className="leader flex-1 font-display text-[1.4rem] uppercase tracking-[0.04em]">
                          {item.name}
                          {item.tag && (
                            <span
                              className={`ml-3 inline-block -translate-y-0.5 rounded-sm px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-[0.14em] ${TAG_STYLES[item.tag] ?? "bg-ink text-cream"}`}
                            >
                              {item.tag}
                            </span>
                          )}
                        </span>
                        <span className="font-mono text-base font-medium text-chili">
                          {formatCents(item.price_cents)}
                        </span>
                      </div>
                      {item.description && (
                        <p className="mt-1 text-sm leading-relaxed text-ink/60">{item.description}</p>
                      )}
                      <div className="mt-3 flex justify-end">
                        {qty === 0 ? (
                          <button
                            onClick={() => onAdd(item)}
                            className="flex items-center gap-1.5 rounded-md bg-ink px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili"
                            aria-label={`Add ${item.name} to order`}
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            Add
                          </button>
                        ) : (
                          <div className="flex items-center gap-1 rounded-md border-2 border-ink bg-cream">
                            <button
                              onClick={() => onSetQty(item.id, qty - 1)}
                              className="grid h-8 w-8 place-items-center text-ink transition-colors hover:bg-mustard"
                              aria-label={`Remove one ${item.name}`}
                            >
                              <Minus className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="w-8 text-center font-mono text-sm font-medium">{qty}</span>
                            <button
                              onClick={() => onSetQty(item.id, qty + 1)}
                              className="grid h-8 w-8 place-items-center text-ink transition-colors hover:bg-mustard"
                              aria-label={`Add one more ${item.name}`}
                            >
                              <Plus className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
