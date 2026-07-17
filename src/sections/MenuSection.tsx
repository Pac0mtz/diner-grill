import { useState } from "react";
import { MENU } from "../data/menu";

const TAG_STYLES: Record<string, string> = {
  signature: "bg-chili text-cream",
  popular: "bg-mustard text-ink",
  new: "bg-ink text-cream",
};

export default function MenuSection() {
  const [active, setActive] = useState(MENU[0].id);
  const category = MENU.find((c) => c.id === active) ?? MENU[0];

  return (
    <section id="menu" className="paper-grain bg-cream py-24 text-ink" aria-labelledby="menu-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">The menu</p>
            <h2 id="menu-heading" className="headline text-6xl md:text-8xl">
              Eat like <span className="text-chili">it's 3 a.m.</span>
            </h2>
          </div>
          <p className="max-w-sm text-right font-mono text-[12px] uppercase leading-relaxed tracking-[0.18em] text-ink/50">
            Everything made from scratch · Breakfast served all day · Prices include the attitude-free service
          </p>
        </div>

        {/* category tabs — horizontally scrollable on small screens */}
        <div className="-mx-5 mt-12 flex gap-2 overflow-x-auto px-5 pb-2 md:mx-0 md:flex-wrap md:px-0 md:pb-0" role="tablist" aria-label="Menu categories">
          {MENU.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={active === c.id}
              onClick={() => setActive(c.id)}
              className={`whitespace-nowrap rounded-full border-2 px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] transition-all ${
                active === c.id
                  ? "border-ink bg-ink text-cream shadow-ticket"
                  : "border-ink/25 bg-transparent text-ink/70 hover:border-ink hover:text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* active category */}
        <div className="mt-10 rounded-lg border-2 border-ink/12 bg-paper p-7 shadow-ticket md:p-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink/80 pb-5">
            <h3 className="font-display text-4xl uppercase tracking-[0.08em]">{category.label}</h3>
            {category.note && (
              <p className="max-w-md font-mono text-[11.5px] uppercase leading-relaxed tracking-[0.12em] text-ink/50">
                {category.note}
              </p>
            )}
          </div>

          <ul key={category.id} className="mt-8 grid gap-x-14 gap-y-7 md:grid-cols-2">
            {category.items.map((item, i) => (
              <li key={item.name} className="stamp-in flex gap-4" style={{ animationDelay: `${i * 45}ms` }}>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-md border-2 border-ink/15 object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-3">
                    <span className="leader flex-1 font-display text-[1.55rem] uppercase tracking-[0.04em]">
                      {item.name}
                      {item.tag && (
                        <span
                          className={`ml-3 inline-block -translate-y-0.5 rounded-sm px-2 py-0.5 align-middle font-mono text-[10px] uppercase tracking-[0.14em] ${TAG_STYLES[item.tag]}`}
                        >
                          {item.tag}
                        </span>
                      )}
                    </span>
                    <span className="font-mono text-lg font-medium text-chili">${item.price}</span>
                  </div>
                  {item.description && (
                    <p className="mt-1.5 max-w-md text-sm leading-relaxed text-ink/60">{item.description}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
          On French bread add $1.65 · Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness
        </p>
      </div>
    </section>
  );
}
