import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const PHOTOS = [
  { src: "/photos/pancakes.jpg", alt: "Stack of buttermilk pancakes with butter and syrup" },
  { src: "/photos/burger-shake.jpg", alt: "Cheeseburger with a milkshake at the Diner Grill counter" },
  { src: "/photos/wings.jpg", alt: "Buffalo wings fresh off the grill" },
  { src: "/photos/skillet-eggs.jpg", alt: "Skillet topped with sunny-side eggs" },
  { src: "/photos/waffle.jpg", alt: "Belgian waffle with whipped cream and chocolate drizzle" },
  { src: "/photos/melt.jpg", alt: "Griddled sandwich melt with pickles" },
  { src: "/photos/pancakes-coffee.jpg", alt: "Pancakes and black coffee on the patio" },
  { src: "/photos/sandwich.jpg", alt: "Ham and egg breakfast sandwich on French bread" },
  { src: "/photos/patio-7.jpg", alt: "Sunflowers and signs on the garden patio tree" },
  { src: "/photos/patio-5.jpg", alt: "Hanging wisteria over the garden patio tables" },
];

export default function Gallery() {
  const [active, setActive] = useState<number | null>(null);

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (dir: 1 | -1) => setActive((a) => (a === null ? a : (a + dir + PHOTOS.length) % PHOTOS.length)),
    []
  );

  useEffect(() => {
    if (active === null) return;
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
  }, [active, close, step]);

  return (
    <section className="border-y-4 border-ink bg-smoke py-16" aria-labelledby="gallery-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="gallery-heading" className="headline text-5xl text-cream md:text-7xl">
            From the <span className="text-mustard">griddle</span>
          </h2>
          <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-cream/50">
            Real plates. Real counter. Tap a photo to look closer.
          </p>
        </div>
      </div>

      <div className="mt-10 flex gap-5 overflow-x-auto px-5 pb-4 [scrollbar-width:thin] md:px-8">
        {PHOTOS.map((p, i) => (
          <button
            key={p.src}
            onClick={() => setActive(i)}
            aria-label={`Enlarge photo: ${p.alt}`}
            className={`w-64 shrink-0 rounded-md border-4 border-cream/90 bg-cream p-2 text-left shadow-ticket transition-transform duration-300 hover:-translate-y-2 hover:rotate-0 md:w-72 ${
              i % 2 === 0 ? "-rotate-1" : "rotate-1"
            }`}
          >
            <img src={p.src} alt={p.alt} loading="lazy" className="aspect-[4/3] w-full rounded-sm object-cover" />
            <span className="block px-1 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
              {p.alt}
            </span>
          </button>
        ))}
      </div>

      {/* lightbox */}
      {active !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={PHOTOS[active].alt}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/92 p-4 backdrop-blur-sm"
          onClick={close}
        >
          <button
            onClick={close}
            aria-label="Close photo viewer"
            className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); step(-1); }}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard md:left-6"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); step(1); }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard md:right-6"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          <figure
            className="stamp-in max-w-4xl rounded-md border-4 border-cream/90 bg-cream p-3 shadow-ticket"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={PHOTOS[active].src}
              alt={PHOTOS[active].alt}
              className="max-h-[72vh] w-full rounded-sm object-contain"
            />
            <figcaption className="flex items-center justify-between px-1 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
              <span>{PHOTOS[active].alt}</span>
              <span>{active + 1} / {PHOTOS.length}</span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
