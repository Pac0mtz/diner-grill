import { Flame, Wrench, Store } from "lucide-react";
import { PRESS } from "../data/menu";
import { useReveal } from "../hooks/useReveal";

const CHAPTERS = [
  {
    icon: Store,
    year: "1937",
    title: "Built",
    body: "Diner Grill opens on Irving Park Road — a tiny counter diner built from a pair of old trolley cars, feeding Chicago scratch-made comfort food around the clock. Generations of regulars claim the same red stools for the next 79 years.",
  },
  {
    icon: Flame,
    year: "2016",
    title: "Broken",
    body: "On Christmas Eve, a fire tears through the restaurant and destroys everything. The damage is so catastrophic that many assume the Diner Grill is gone for good.",
  },
  {
    icon: Wrench,
    year: "2018",
    title: "Rebuilt",
    body: "558 days later, the doors reopen. New stools, new signage, same griddle soul — and the same menu Chicago has ordered from for decades. The Slinger never left.",
  },
];

export default function Story() {
  const cardsRef = useReveal<HTMLDivElement>();
  const pressRef = useReveal<HTMLDivElement>();

  return (
    <section id="story" className="paper-grain bg-cream py-24 text-ink" aria-labelledby="story-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">Since 1937</p>
        <h2 id="story-heading" className="headline text-6xl md:text-8xl">
          Built. Broken. <span className="text-chili">Rebuilt.</span>
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
          Eighty-some years, one fire, zero lessons learned — in the best way.
          The Diner Grill is still family-run, still counter-only, still cooking
          everything from scratch two feet in front of you.
        </p>

        <div ref={cardsRef} className="reveal mt-14 grid gap-6 md:grid-cols-3">
          {CHAPTERS.map((c) => (
            <article
              key={c.year}
              className="group relative overflow-hidden rounded-lg border-2 border-ink/12 bg-paper p-7 shadow-ticket transition-transform hover:-translate-y-1"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-6xl text-chili">{c.year}</span>
                <c.icon className="h-7 w-7 text-ink/30 transition-colors group-hover:text-chili" aria-hidden />
              </div>
              <h3 className="mt-4 font-display text-3xl uppercase tracking-[0.06em]">{c.title}</h3>
              <p className="mt-3 leading-relaxed text-ink/70">{c.body}</p>
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-chili/0 transition-colors group-hover:bg-chili" />
            </article>
          ))}
        </div>

        {/* press strip */}
        <div ref={pressRef} className="reveal mt-16 grid gap-px overflow-hidden rounded-lg border-2 border-ink/12 bg-ink/10 md:grid-cols-3">
          {PRESS.map((p) => (
            <blockquote key={p.source} className="bg-cream p-7">
              <p className="leading-relaxed text-ink/80">“{p.quote}”</p>
              <cite className="mt-4 block font-mono text-[12px] not-italic uppercase tracking-[0.2em] text-chili">
                — {p.source}
              </cite>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
