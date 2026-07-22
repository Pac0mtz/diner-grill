import { useState } from "react";
import { MENU } from "../data/menu";
import { SECTION_FEATURED, SECTION_ICONS } from "../lib/menu-section-icons";

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

        {/* Featured category cards — full-bleed image on top, scroll on mobile */}
        <div
          className="-mx-5 mt-12 flex min-w-0 snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain px-5 pb-2 touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
          aria-label="Menu categories"
        >
          {MENU.map((c) => {
            const Icon = SECTION_ICONS[c.id];
            const selected = active === c.id;
            const featured = SECTION_FEATURED[c.id] || c.items.find((i) => i.image)?.image;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(c.id)}
                className={`group relative w-[9.25rem] shrink-0 snap-start overflow-hidden rounded-lg border-2 text-left transition-all sm:w-[10.5rem] md:w-[11.25rem] ${
                  selected
                    ? "border-ink bg-ink shadow-ticket ring-2 ring-mustard/80"
                    : "border-ink/15 bg-paper hover:-translate-y-0.5 hover:border-ink/40 hover:shadow-ticket"
                }`}
              >
                <span className="relative block h-[5.75rem] w-full overflow-hidden bg-ink/10 sm:h-[6.75rem] md:h-[7.5rem]">
                  {featured ? (
                    <img
                      src={featured}
                      alt=""
                      loading="lazy"
                      className={`absolute inset-0 h-full w-full object-cover object-[center_42%] transition-transform duration-500 sm:object-center ${
                        selected ? "scale-105 sm:scale-[1.08]" : "scale-100 group-hover:scale-105"
                      }`}
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center bg-cream">
                      {Icon && <Icon className="h-9 w-9 text-chili/70" aria-hidden />}
                    </span>
                  )}
                  <span
                    className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/15 to-transparent"
                    aria-hidden
                  />
                  {Icon && (
                    <span className="absolute bottom-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-cream/95 text-chili shadow-sm">
                      <Icon className="h-3.5 w-3.5" aria-hidden strokeWidth={2.25} />
                    </span>
                  )}
                </span>
                <span
                  className={`block min-h-[2.75rem] px-2.5 py-2 font-mono text-[10px] font-semibold uppercase leading-snug tracking-[0.1em] sm:min-h-[3rem] sm:text-[11px] ${
                    selected ? "text-cream" : "text-ink/85"
                  }`}
                >
                  {c.label}
                </span>
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
                      onError={(e) => {
                        e.currentTarget.style.visibility = "hidden";
                      }}
                      className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-md border-2 border-ink/15 object-cover object-[center_40%] sm:h-20 sm:w-20"
                    />
                  ) : (
                    <span className="h-[4.5rem] w-[4.5rem] shrink-0 sm:h-20 sm:w-20" aria-hidden />
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
