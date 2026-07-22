import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useReveal } from "../hooks/useReveal";

const PHOTOS = [
  {
    src: "/photos/patio-3.webp",
    alt: "Garden patio tables under hanging wisteria and string lights",
  },
  {
    src: "/photos/patio-5.webp",
    alt: "Wisteria canopy and a tree growing through the patio",
  },
  {
    src: "/photos/patio-6.webp",
    alt: "Patio seating along the brick wall under hanging flowers",
  },
];

/** Punch up patio photos without re-exporting the files. */
const PHOTO_LOOK =
  "object-cover [filter:brightness(1.06)_contrast(1.12)_saturate(1.18)]";

export default function Patio() {
  const revealRef = useReveal<HTMLDivElement>();
  const [featured, setFeatured] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  const close = useCallback(() => setLightbox(null), []);
  const step = useCallback((dir: 1 | -1) => {
    setLightbox((a) => {
      if (a === null) return a;
      const next = (a + dir + PHOTOS.length) % PHOTOS.length;
      setFeatured(next);
      return next;
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

  // Auto-advance the featured photo; timer resets when the user picks one.
  useEffect(() => {
    if (lightbox !== null) return;
    const id = window.setInterval(() => {
      setFeatured((i) => (i + 1) % PHOTOS.length);
    }, 4000);
    return () => window.clearInterval(id);
  }, [lightbox, featured]);

  const lead = PHOTOS[featured];

  return (
    <section
      id="patio"
      className="paper-grain overflow-hidden bg-cream py-24 text-ink"
      aria-labelledby="patio-heading"
    >
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div ref={revealRef} className="reveal max-w-3xl">
          <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">Out back</p>
          <h2 id="patio-heading" className="headline text-6xl md:text-8xl">
            The garden <span className="text-chili">patio</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-ink/70">
            Wisteria overhead, string lights, and mesh chairs against the brick —
            same scratch-made plates, with a little air when the weather plays nice.
          </p>
        </div>
      </div>

      {/* Featured large image — crossfade every 4s; tap to open full view */}
      <button
        type="button"
        onClick={() => setLightbox(featured)}
        aria-label={`View full size: ${lead.alt}`}
        className="relative mt-12 block w-full cursor-zoom-in overflow-hidden aspect-square md:aspect-[2.4/1]"
      >
        {PHOTOS.map((p, i) => (
          <img
            key={p.src}
            src={p.src}
            alt={i === featured ? p.alt : ""}
            aria-hidden={i !== featured}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className={`absolute inset-0 h-full w-full transition-opacity duration-700 ease-in-out ${PHOTO_LOOK} ${
              i === featured ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
      </button>

      {/* Three patio shots in one row — tap to change the large image */}
      <ul
        className="mx-auto mt-6 grid max-w-7xl grid-cols-3 gap-2 px-4 py-6 sm:gap-4 sm:px-5 md:gap-5 md:px-8 md:py-8"
        aria-label="Patio photos"
      >
        {PHOTOS.map((p, index) => {
          const selected = index === featured;
          return (
            <li key={p.src} className="min-w-0">
              <button
                type="button"
                onClick={() => setFeatured(index)}
                aria-label={`Show in large view: ${p.alt}`}
                aria-pressed={selected}
                className={`w-full overflow-hidden rounded-md border-2 bg-cream p-1 text-left shadow-ticket transition-all duration-300 hover:-translate-y-1 sm:p-1.5 md:p-2 ${
                  selected
                    ? "border-chili ring-2 ring-chili/30"
                    : "border-ink/15 hover:border-ink/40"
                }`}
              >
                <img
                  src={p.src}
                  alt={p.alt}
                  loading="lazy"
                  decoding="async"
                  className={`aspect-[4/3] w-full rounded-sm ${PHOTO_LOOK}`}
                />
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mx-auto max-w-7xl px-5 font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45 md:px-8">
        Weather permitting · Out back behind the counter · Same menu, same hours · Tap a photo to feature it
      </p>

      {lightbox !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={PHOTOS[lightbox].alt}
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
            onClick={(e) => {
              e.stopPropagation();
              step(-1);
            }}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard md:left-6"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              step(1);
            }}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard md:right-6"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>

          <figure
            className="stamp-in max-w-5xl rounded-md border-4 border-cream/90 bg-cream p-3 shadow-ticket"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={PHOTOS[lightbox].src}
              alt={PHOTOS[lightbox].alt}
              className={`max-h-[78vh] w-full rounded-sm object-contain ${PHOTO_LOOK}`}
            />
            <figcaption className="flex items-center justify-between gap-4 px-1 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
              <span>{PHOTOS[lightbox].alt}</span>
              <span className="shrink-0">
                {lightbox + 1} / {PHOTOS.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
