import { useEffect, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import type { ApiMenuItem, ApiMenuSection } from "../../lib/api-types";
import type { CartLine } from "../../lib/order-cart";
import { itemNeedsCustomize } from "../../lib/order-cart";
import { formatCents } from "../../lib/money";
import { iconForSectionLabel } from "../../lib/menu-section-icons";
import CustomizeSheet from "./CustomizeSheet";

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
  onAddCustom: (line: Omit<CartLine, "key"> & { key?: string }) => void;
  onSetQty: (key: string, qty: number) => void;
  /** Desktop ticket column — rendered under the full-width tabs */
  sidebar?: ReactNode;
};

function qtyForItem(cart: CartLine[], itemId: number) {
  return cart.filter((l) => l.item.id === itemId).reduce((n, l) => n + l.qty, 0);
}

export default function OrderMenu({
  sections,
  cart,
  onAddSimple,
  onAddCustom,
  onSetQty,
  sidebar,
}: OrderMenuProps) {
  const [activeId, setActiveId] = useState<number | null>(sections[0]?.id ?? null);
  const [customizing, setCustomizing] = useState<ApiMenuItem | null>(null);
  const tabRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
  const tablistRef = useRef<HTMLDivElement>(null);

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
    if (itemNeedsCustomize(item)) setCustomizing(item);
    else onAddSimple(item);
  }

  function selectSection(id: number) {
    setActiveId(id);
  }

  if (!active) return null;

  const sectionHasImages = active.items.some((item) => item.image);
  const ActiveIcon = iconForSectionLabel(active.label);

  return (
    <div className="min-w-0 max-w-full pb-28 lg:pb-0">
      {/* Full-width category tabs — menu + ticket sit below */}
      <div className="sticky top-16 z-30 -mx-5 border-b-2 border-ink/10 bg-cream/95 backdrop-blur-md md:-mx-8">
        <div className="px-5 py-3 md:px-8">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ink/40">
            Menu sections
          </p>
          <div
            ref={tablistRef}
            className="flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Menu sections"
          >
            {sections.map((s) => {
              const selected = active.id === s.id;
              const count = s.items.reduce((n, item) => n + qtyForItem(cart, item.id), 0);
              const Icon = iconForSectionLabel(s.label);
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
                  className={`relative shrink-0 rounded-md px-3.5 py-2.5 text-left transition-colors ${
                    selected
                      ? "bg-ink text-cream shadow-ticket"
                      : "bg-paper text-ink/70 ring-1 ring-ink/15 hover:bg-cream hover:text-ink hover:ring-ink/35"
                  }`}
                >
                  <span className="flex max-w-[12rem] items-center gap-2">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${selected ? "text-mustard" : "text-chili/80"}`}
                      aria-hidden
                      strokeWidth={2.25}
                    />
                    <span className="truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em]">
                      {s.label}
                    </span>
                  </span>
                  <span
                    className={`mt-0.5 block pl-6 font-mono text-[10px] uppercase tracking-[0.1em] ${
                      selected ? "text-cream/55" : "text-ink/35"
                    }`}
                  >
                    {s.items.length} {s.items.length === 1 ? "item" : "items"}
                    {count > 0 ? ` · ${count} in ticket` : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_380px]">
      {/* Active section panel */}
      <div
        key={active.id}
        id={`order-panel-${active.id}`}
        role="tabpanel"
        aria-labelledby={`order-tab-${active.id}`}
        className="stamp-in min-w-0 rounded-lg border-2 border-ink/12 bg-paper p-4 shadow-ticket sm:p-6 md:p-7"
      >
        <div className="flex flex-col gap-2 border-b-2 border-ink/80 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-3 font-display text-3xl uppercase tracking-[0.06em] md:text-4xl">
              <ActiveIcon className="h-8 w-8 shrink-0 text-chili md:h-9 md:w-9" aria-hidden strokeWidth={2} />
              {active.label}
            </h2>
            {active.note && (
              <p className="mt-2 max-w-xl font-mono text-[11px] uppercase leading-relaxed tracking-[0.1em] text-ink/50">
                {active.note}
              </p>
            )}
          </div>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/40">
            {active.items.length} on the board
          </p>
        </div>

        {active.items.length === 0 ? (
          <p className="py-12 text-center font-mono text-[12px] uppercase tracking-[0.16em] text-ink/40">
            Nothing in this section right now
          </p>
        ) : (
          <ul
            className={`mt-5 grid gap-3 sm:gap-4 ${
              sectionHasImages ? "sm:grid-cols-2 xl:grid-cols-2" : "md:grid-cols-2"
            }`}
          >
            {active.items.map((item) => {
              const qty = qtyForItem(cart, item.id);
              const customizable = itemNeedsCustomize(item);
              const simpleLine = !customizable
                ? cart.find((l) => l.item.id === item.id)
                : undefined;
              const inTicket = qty > 0;
              const photoLed = Boolean(item.image);

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
                        src={item.image!}
                        alt=""
                        loading="lazy"
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
                        {formatCents(item.price_cents)}
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
                        {formatCents(item.price_cents)}
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

      {sidebar ? <div className="hidden min-w-0 lg:block">{sidebar}</div> : null}
      </div>

      {customizing && (
        <CustomizeSheet
          item={customizing}
          onClose={() => setCustomizing(null)}
          onConfirm={({ modifiers, line_note, qty, unit_price_cents }) => {
            onAddCustom({
              item: customizing,
              qty,
              modifiers,
              line_note,
              unit_price_cents,
            });
            setCustomizing(null);
          }}
        />
      )}
    </div>
  );
}
