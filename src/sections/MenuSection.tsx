import { useState } from "react";
import { MENU } from "../data/menu";
import { SECTION_ICONS } from "../lib/menu-section-icons";

const TAG_STYLES: Record<string, string> = {
  signature: "bg-chili text-cream",
  popular: "bg-mustard text-ink",
  new: "bg-ink text-cream",
};

export default function MenuSection() {
  const [active, setActive] = useState(MENU[0].id);
  const category = MENU.find((c) => c.id === active) ?? MENU[0];
  const categoryHasImages = category.items.some((item) => item.image);
  const ActiveIcon = SECTION_ICONS[category.id];

  return (
    <section id="menu" className="paper-grain bg-cream py-24 text-ink" aria-labelledby="menu-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">The menu</p>
            <h2 id="menu-heading" className="headline text-5xl sm:text-6xl md:text-8xl">
              Eat like <span className="text-chili">it's 3 a.m.</span>
            </h2>
          </div>
          <p className="max-w-sm font-mono text-[12px] uppercase leading-relaxed tracking-[0.18em] text-ink/50 md:text-right">
            Everything made from scratch · Breakfast served all day · Prices include the attitude-free service
          </p>
        </div>

        {/* category tabs — horizontally scrollable on small screens */}
        <div
          className="-mx-5 mt-12 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-5 pb-2 [scrollbar-width:thin] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0"
          role="tablist"
          aria-label="Menu categories"
        >
          {MENU.map((c) => {
            const Icon = SECTION_ICONS[c.id];
            const selected = active === c.id;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(c.id)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 px-4 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] transition-all sm:px-5 ${
                  selected
                    ? "border-ink bg-ink text-cream shadow-ticket"
                    : "border-ink/25 bg-transparent text-ink/70 hover:border-ink hover:text-ink"
                }`}
              >
                {Icon && (
                  <Icon
                    className={`h-4 w-4 shrink-0 ${selected ? "text-mustard" : "text-chili/80"}`}
                    aria-hidden
                    strokeWidth={2.25}
                  />
                )}
                {c.label}
              </button>
            );
          })}
        </div>

        {/* active category */}
        <div className="mt-10 rounded-lg border-2 border-ink/12 bg-paper p-5 shadow-ticket sm:p-7 md:p-10">
          <div className="flex flex-col gap-3 border-b-2 border-ink/80 pb-5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between">
            <h3 className="flex items-center gap-3 font-display text-3xl uppercase tracking-[0.08em] sm:text-4xl">
              {ActiveIcon && (
                <ActiveIcon className="h-8 w-8 shrink-0 text-chili sm:h-9 sm:w-9" aria-hidden strokeWidth={2} />
              )}
              {category.label}
            </h3>
            {category.note && (
              <p className="max-w-md font-mono text-[11.5px] uppercase leading-relaxed tracking-[0.12em] text-ink/50">
                {category.note}
              </p>
            )}
          </div>

          <ul key={category.id} className="mt-8 grid gap-x-14 gap-y-7 md:grid-cols-2">
            {category.items.map((item, i) => (
              <li key={item.name} className="stamp-in flex items-start gap-4" style={{ animationDelay: `${i * 45}ms` }}>
                {categoryHasImages &&
                  (item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-md border-2 border-ink/15 object-cover"
                    />
                  ) : (
                    <span className="h-16 w-16 shrink-0" aria-hidden />
                  ))}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="leader flex-1 font-display text-[1.35rem] uppercase tracking-[0.04em] sm:text-[1.55rem]">
                      <span>
                        {item.name}
                        {item.tag && (
                          <span
                            className={`ml-2 inline-block -translate-y-0.5 rounded-sm px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-[0.14em] ${TAG_STYLES[item.tag]}`}
                          >
                            {item.tag}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 whitespace-nowrap font-mono text-base font-medium text-chili sm:text-lg">
                      ${item.price}
                    </span>
                  </div>
                  {item.description && (
                    <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{item.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-center font-mono text-[11px] uppercase leading-relaxed tracking-[0.16em] text-ink/45 sm:text-[12px] sm:tracking-[0.2em]">
          On French bread add $1.65 · Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness
        </p>
      </div>
    </section>
  );
}
