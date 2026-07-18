import { useCallback, useEffect, useState } from "react";
import { Flame, Wrench, Store, X } from "lucide-react";
import { PRESS } from "../data/menu";
import { useReveal } from "../hooks/useReveal";

/** Built · Broken · Rebuilt — photo + chapter copy in one card each. */
const CHAPTERS = [
  {
    icon: Store,
    year: "1937",
    title: "Built",
    body: "Diner Grill opens on Irving Park Road — a tiny counter diner built from a pair of old trolley cars, feeding Chicago scratch-made comfort food around the clock. Generations of regulars claim the same red stools for the next 79 years.",
    src: "/photos/story/before-exterior.jpeg",
    photoLabel: "Before",
    alt: "Historic trolley-car Diner Grill exterior in the snow — lace curtains in the windows",
  },
  {
    icon: Flame,
    year: "2016",
    title: "Broken",
    body: "On Christmas Eve, a fire tears through the restaurant and destroys everything. The damage is so catastrophic that many assume the Diner Grill is gone for good.",
    src: "/photos/story/fire-christmas-eve-2016.jpg",
    photoLabel: "Fire",
    alt: "Firefighters and ladder trucks at Diner Grill as smoke rises from the roof on Christmas Eve 2016",
  },
  {
    icon: Wrench,
    year: "2018",
    title: "Rebuilt",
    body: "558 days later, the doors reopen. New stools, new signage, same griddle soul — and the same menu Chicago has ordered from for decades. The Slinger never left.",
    src: "/photos/story/rebuild-now.jpg",
    photoLabel: "Now",
    alt: "Diner Grill exterior — Open 24 Hours sign, counter visible through the window, bike out front",
  },
] as const;

const PHOTO_LOOK =
  "object-cover [filter:brightness(1.04)_contrast(1.1)_saturate(1.12)]";

export default function Story() {
  const cardsRef = useReveal<HTMLDivElement>();
  const pressRef = useReveal<HTMLDivElement>();
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback((dir: 1 | -1) => {
    setLightbox((a) => {
      if (a === null) return a;
      return (a + dir + CHAPTERS.length) % CHAPTERS.length;
    });
  }, []);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, close, step]);

  const active = lightbox !== null ? CHAPTERS[lightbox] : null;

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

        <div ref={cardsRef} className="reveal mt-12 grid gap-6 md:grid-cols-3">
          {CHAPTERS.map((c, i) => (
            <article
              key={c.year}
              className="group relative flex flex-col overflow-hidden rounded-lg border-2 border-ink/12 bg-paper shadow-ticket transition-transform hover:-translate-y-1"
            >
              <button
                type="button"
                onClick={() => setLightbox(i)}
                className="relative aspect-[4/3] w-full overflow-hidden bg-ink/5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-chili"
                aria-label={`View larger: ${c.alt}`}
              >
                <img
                  src={c.src}
                  alt={c.alt}
                  className={`h-full w-full transition-transform duration-500 group-hover:scale-[1.03] ${PHOTO_LOOK}`}
                  loading="lazy"
                  decoding="async"
                />
                <span className="absolute left-3 top-3 rounded-sm bg-ink/80 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-mustard backdrop-blur-sm">
                  {c.photoLabel}
                </span>
              </button>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-5xl text-chili sm:text-6xl">{c.year}</span>
                  <c.icon className="h-7 w-7 text-ink/30 transition-colors group-hover:text-chili" aria-hidden />
                </div>
                <h3 className="mt-3 font-display text-3xl uppercase tracking-[0.06em]">{c.title}</h3>
                <p className="mt-3 leading-relaxed text-ink/70">{c.body}</p>
              </div>
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-1 bg-chili/0 transition-colors group-hover:bg-chili"
              />
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

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 p-4"
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-4 top-4 rounded-full bg-cream/10 p-2 text-cream transition-colors hover:bg-cream/20"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
          <figure className="relative max-h-[90vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <img
              src={active.src}
              alt={active.alt}
              className={`max-h-[80vh] w-full rounded-sm object-contain ${PHOTO_LOOK}`}
            />
            <figcaption className="mt-3 text-center font-mono text-[12px] uppercase tracking-[0.22em] text-cream/80">
              {active.photoLabel} — {active.year} {active.title}
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
