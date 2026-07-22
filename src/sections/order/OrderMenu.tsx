import { useEffect, useRef, useState } from "react";
import { Minus, Plus, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import type { ApiMenuItem, ApiMenuSection } from "../../lib/api-types";
import type { CartLine } from "../../lib/order-cart";
import { itemHasPaidOptions, itemNeedsCustomize } from "../../lib/order-cart";
import { formatCents } from "../../lib/money";
import { featuredImageForSection, iconForSectionLabel } from "../../lib/menu-section-icons";


const TAG_STYLES: Record<string, string> = {
  signature: "bg-chili text-cream",
  popular: "bg-mustard text-ink",
  new: "bg-ink text-cream",
};

export type { CartLine };

type OrderMenuProps = {
  sections: ApiMenuSection[];
  cart: CartLine[];
  onAddSimple: (item: ApiMenuItem) => void;
  onCustomize: (item: ApiMenuItem) => void;
  onSetQty: (key: string, qty: number) => void;
};

function qtyForItem(cart: CartLine[], itemId: number) {
  return cart.filter((l) => l.item.id === itemId).reduce((n, l) => n + l.qty, 0);
}

export default function OrderMenu({
  sections,
  cart,
  onAddSimple,
  onCustomize,
  onSetQty,
}: OrderMenuProps) {
  const [activeId, setActiveId] = useState<number | null>(sections[0]?.id ?? null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(() => new Set());
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const tablistRef = useRef<HTMLDivElement>(null);

  function markImageBroken(src: string) {
    setBrokenImages((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  }

  useEffect(() => {
    if (!sections.length) {
      setActiveId(null);
      return;
    }
    setActiveId((prev) =>
      prev != null && sections.some((s) => s.id === prev) ? prev : sections[0].id
    );
  }, [sections]);

  // Keep the active tab visible in the horizontal scroller.
  useEffect(() => {
    if (activeId == null) return;
    const btn = tabRefs.current.get(activeId);
    btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [activeId]);

  const active = sections.find((s) => s.id === activeId) ?? sections[0] ?? null;

  function handleAddClick(item: ApiMenuItem) {
    if (itemNeedsCustomize(item)) onCustomize(item);
    else onAddSimple(item);
  }

  function priceLabel(item: ApiMenuItem) {
    const paid = itemHasPaidOptions(item);
    return paid ? `From ${formatCents(item.price_cents)}` : formatCents(item.price_cents);
  }

  function selectSection(id: number) {
    setActiveId(id);
  }

  if (!active) return null;

  const sectionHasImages = active.items.some((item) => item.image);
  const ActiveIcon = iconForSectionLabel(active.label);

  return (
    <div className="min-w-0 max-w-full pb-28">
      {/* Full-width featured section cards — image full-bleed on top */}
      <div className="sticky top-16 z-30 -mx-5 border-b-2 border-ink/10 bg-cream/95 backdrop-blur-md md:-mx-8">
        <div className="px-4 py-3 sm:px-5 md:px-8">
          <p className="mb-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/40">
            Menu sections
          </p>
          <div
            ref={tablistRef}
            className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain pb-1 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Menu sections"
          >
            {sections.map((s) => {
              const selected = active.id === s.id;
              const count = s.items.reduce((n, item) => n + qtyForItem(cart, item.id), 0);
              const Icon = iconForSectionLabel(s.label);
              const featured = featuredImageForSection(s.label, s.items);
              return (
                <button
                  key={s.id}
                  ref={(el) => {
                    if (el) tabRefs.current.set(s.id, el);
                    else tabRefs.current.delete(s.id);
                  }}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`order-panel-${s.id}`}
                  id={`order-tab-${s.id}`}
                  onClick={() => selectSection(s.id)}
                  className={`group relative w-[9.25rem] shrink-0 snap-start overflow-hidden rounded-lg border-2 text-left transition-all sm:w-[10.5rem] md:w-[11.25rem] ${
                    selected
                      ? "border-ink bg-ink shadow-ticket ring-2 ring-mustard/80"
                      : "border-ink/15 bg-paper hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-ticket"
                  }`}
                >
                  {/* Full-bleed featured image */}
                  <span className="relative block h-[5.75rem] w-full overflow-hidden bg-ink/10 sm:h-[6.75rem] md:h-[7.5rem]">
                    {featured ? (
                      <img
                        src={featured}
                        alt=""
                        loading="lazy"
                        className={`absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 ${
                          selected ? "scale-[1.12]" : "scale-[1.08] group-hover:scale-[1.14]"
                        } [filter:brightness(1.03)_contrast(1.06)_saturate(1.08)]`}
                      />
                    ) : (
                      <span className="absolute inset-0 grid place-items-center bg-cream">
                        <Icon className="h-9 w-9 text-chili/70" aria-hidden strokeWidth={2} />
                      </span>
                    )}
                    <span
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/25 to-transparent"
                      aria-hidden
                    />
                    <span
                      className={`absolute right-2 top-2 grid min-h-6 min-w-6 place-items-center rounded-full px-1.5 font-mono text-[11px] font-semibold tabular-nums shadow-sm ${
                        selected ? "bg-mustard text-ink" : "bg-cream/95 text-ink"
                      }`}
                    >
                      {s.items.length}
                    </span>
                    {count > 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-chili px-1.5 py-0.5 font-mono text-[10px] font-semibold text-cream shadow-sm">
                        {count}
                      </span>
                    )}
                    <span className="absolute bottom-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-cream/95 text-chili shadow-sm">
                      <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.25} />
                    </span>
                  </span>
                  <span
                    className={`block min-h-[2.75rem] px-2.5 py-2 font-mono text-[10px] font-semibold uppercase leading-snug tracking-[0.1em] sm:min-h-[3rem] sm:text-[11px] ${
                      selected ? "text-cream" : "text-ink/85"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active section panel — full width; ticket floats separately */}
      <div
        key={active.id}
        id={`order-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`order-tab-${active.id}`}
        className="stamp-in mt-5 min-w-0 rounded-lg border-2 border-ink/12 bg-paper p-3 shadow-ticket sm:mt-6 sm:p-5 md:p-7"
      >
        <div className="flex flex-col gap-2 border-b-2 border-ink/80 pb-3 sm:flex-row sm:items-end sm:justify-between sm:pb-4">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2.5 font-display text-2xl uppercase tracking-[0.06em] sm:gap-3 sm:text-3xl md:text-4xl">
              <ActiveIcon className="h-7 w-7 shrink-0 text-chili sm:h-8 sm:w-8 md:h-9 md:w-9" aria-hidden strokeWidth={2} />
              <span className="truncate">{active.label}</span>
            </h2>
            {active.note && (
              <p className="mt-2 max-w-xl font-mono text-[10px] uppercase leading-relaxed tracking-[0.1em] text-ink/50 sm:text-[11px]">
                {active.note}
              </p>
            )}
          </div>
          <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40 sm:text-[11px]">
            {active.items.length} on the board
          </p>
        </div>

        {active.items.length === 0 ? (
          <p className="py-12 text-center font-mono text-[12px] uppercase tracking-[0.16em] text-ink/40">
            Nothing in this section right now
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:mt-5 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            {active.items.map((item) => {
              const qty = qtyForItem(cart, item.id);
              const customizable = itemNeedsCustomize(item);
              const simpleLine = !customizable
                ? cart.find((l) => l.item.id === item.id)
                : undefined;
              const inTicket = qty > 0;
              const photoSrc = item.image && !brokenImages.has(item.image) ? item.image : null;
              const photoLed = Boolean(photoSrc);

              const actions = (
                <div
                  className={`mt-auto flex flex-wrap items-center gap-2 pt-3 ${
                    photoLed ? "justify-between" : "justify-end"
                  }`}
                >
                  {customizable ? (
                    <>
                      {inTicket && (
                        <span className="rounded-full bg-ink/10 px-2.5 py-1 font-mono text-[11px] font-medium text-ink/70">
                          {qty} in ticket
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddClick(item)}
                        className={`flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili ${
                          photoLed ? "ml-auto" : ""
                        }`}
                        aria-label={`Customize and add ${item.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        {inTicket ? "Add another" : "Customize"}
                      </button>
                    </>
                  ) : qty === 0 || !simpleLine ? (
                    <button
                      type="button"
                      onClick={() => handleAddClick(item)}
                      className={`flex items-center gap-1.5 rounded-md bg-ink px-3.5 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili ${
                        photoLed ? "w-full justify-center sm:ml-auto sm:w-auto" : ""
                      }`}
                      aria-label={`Add ${item.name} to order`}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                      Add
                    </button>
                  ) : (
                    <div
                      className={`flex items-center rounded-md border-2 border-ink bg-cream ${
                        photoLed ? "ml-auto" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => onSetQty(simpleLine.key, simpleLine.qty - 1)}
                        className="grid h-9 w-9 place-items-center text-ink transition-colors hover:bg-mustard"
                        aria-label={`Remove one ${item.name}`}
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </button>
                      <span className="w-8 text-center font-mono text-sm font-semibold">
                        {simpleLine.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSetQty(simpleLine.key, simpleLine.qty + 1)}
                        className="grid h-9 w-9 place-items-center text-ink transition-colors hover:bg-mustard"
                        aria-label={`Add one more ${item.name}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              );

              if (photoLed) {
                return (
                  <li
                    key={item.id}
                    className={`group flex min-w-0 flex-col overflow-hidden rounded-md border-2 bg-paper shadow-ticket transition-[border-color,box-shadow] ${
                      inTicket
                        ? "border-chili/50 shadow-[3px_3px_0_0_rgba(196,74,46,0.25)]"
                        : "border-ink/15 hover:border-ink/40"
                    }`}
                  >
                    <div className="relative aspect-[5/4] overflow-hidden bg-ink/5 sm:aspect-[4/3]">
                      <img
                        src={photoSrc!}
                        alt=""
                        loading="lazy"
                        onError={() => markImageBroken(photoSrc!)}
                        className="h-full w-full object-cover [filter:brightness(1.03)_contrast(1.08)_saturate(1.1)] transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/55 via-ink/10 to-transparent"
                        aria-hidden
                      />
                      {item.tag && (
                        <span
                          className={`absolute left-3 top-3 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] shadow-sm ${TAG_STYLES[item.tag] ?? "bg-ink text-cream"}`}
                        >
                          {item.tag}
                        </span>
                      )}
                      <span className="absolute bottom-3 right-3 rounded-md border-2 border-ink/80 bg-cream/95 px-2.5 py-1 font-mono text-sm font-semibold text-chili backdrop-blur-sm">
                        {priceLabel(item)}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col px-3.5 py-3.5 sm:px-4 sm:py-4">
                      <h3 className="font-display text-[1.35rem] uppercase leading-tight tracking-[0.04em] sm:text-[1.5rem]">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink/55">
                          {item.description}
                        </p>
                      )}
                      {customizable && (
                        <p className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
                          <SlidersHorizontal className="h-3 w-3" aria-hidden />
                          Options available
                        </p>
                      )}
                      {actions}
                    </div>
                  </li>
                );
              }

              return (
                <li
                  key={item.id}
                  className={`flex gap-3 rounded-md border-2 p-3 transition-colors sm:gap-4 sm:p-4 ${
                    inTicket
                      ? "border-chili/40 bg-chili/[0.04]"
                      : "border-ink/10 bg-cream/50 hover:border-ink/25"
                  }`}
                >
                  {sectionHasImages && (
                    <span
                      className="grid aspect-square h-[4.5rem] w-[4.5rem] shrink-0 place-items-center rounded-md border-2 border-dashed border-ink/15 text-ink/25 sm:h-24 sm:w-24"
                      aria-hidden
                    >
                      <UtensilsCrossed className="h-6 w-6" />
                    </span>
                  )}

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-display text-[1.2rem] uppercase leading-tight tracking-[0.04em] sm:text-[1.35rem]">
                          {item.name}
                        </h3>
                        {item.tag && (
                          <span
                            className={`mt-1.5 inline-block rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] ${TAG_STYLES[item.tag] ?? "bg-ink text-cream"}`}
                          >
                            {item.tag}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-sm font-semibold text-chili sm:text-base">
                        {priceLabel(item)}
                      </span>
                    </div>

                    {item.description && (
                      <p className="mt-1.5 line-clamp-2 text-sm leading-snug text-ink/55">
                        {item.description}
                      </p>
                    )}
                    {customizable && (
                      <p className="mt-1.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
                        <SlidersHorizontal className="h-3 w-3" aria-hidden />
                        Options available
                      </p>
                    )}
                    {actions}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
