import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { HOME_GALLERY_PHOTOS } from "../data/gallery";
import ProtectedImg from "../components/ProtectedImg";

const PHOTOS = HOME_GALLERY_PHOTOS;

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
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <p className="font-mono text-[12px] uppercase tracking-[0.22em] text-cream/50">
              Real plates. Real counter. Tap a photo to look closer.
            </p>
            <Link
              to="/gallery"
              className="font-mono text-[12px] uppercase tracking-[0.18em] text-mustard transition-colors hover:text-cream"
            >
              See full gallery →
            </Link>
          </div>
        </div>
      </div>

      <div className="group mt-10 overflow-hidden py-[30px] md:py-10 motion-reduce:overflow-x-auto motion-reduce:[scrollbar-width:thin]">
        <div
          className={`flex w-max gap-5 pr-5 md:gap-7 ${
            active === null
              ? "animate-marquee [animation-duration:55s] group-hover:[animation-play-state:paused] motion-reduce:animate-none md:[animation-duration:70s]"
              : "animate-marquee [animation-duration:55s] [animation-play-state:paused] md:[animation-duration:70s]"
          }`}
        >
          {[...PHOTOS, ...PHOTOS].map((p, i) => (
            <button
              key={`${p.src}-${i}`}
              onClick={() => setActive(i % PHOTOS.length)}
              aria-label={`Enlarge photo: ${p.alt}`}
              className={`w-64 shrink-0 rounded-md border-4 border-cream/90 bg-cream p-2 text-left shadow-ticket transition-transform duration-300 hover:-translate-y-2 hover:rotate-0 md:w-[22rem] md:p-3 lg:w-[26rem] ${
                i % 2 === 0 ? "-rotate-1" : "rotate-1"
              }`}
            >
              <ProtectedImg src={p.src} alt={p.alt} loading="lazy" className="aspect-[4/3] w-full rounded-sm object-cover" />
              <span className="block px-1 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
                {p.alt}
              </span>
            </button>
          ))}
        </div>
      </div>

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
            className="max-w-4xl rounded-md border-4 border-cream/90 bg-cream p-3 shadow-ticket"
            onClick={(e) => e.stopPropagation()}
          >
            <ProtectedImg
              src={PHOTOS[active].src}
              alt={PHOTOS[active].alt}
              className="max-h-[72vh] w-full rounded-sm object-contain"
            />
            <figcaption className="flex items-center justify-between px-1 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
              <span>{PHOTOS[active].alt}</span>
              <span>
                {active + 1} / {PHOTOS.length}
              </span>
            </figcaption>
          </figure>
        </div>
      )}
    </section>
  );
}
