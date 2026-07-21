import { useCallback, useEffect, useMemo, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useRouteSeo } from "../hooks/usePageMeta";
import {
  GALLERY_CATEGORIES,
  GALLERY_PHOTOS,
  type GalleryCategory,
  type GalleryPhoto,
} from "../data/gallery";
import CtaBand from "../sections/CtaBand";

export default function GalleryPage() {
  useRouteSeo("/gallery");

  const [filter, setFilter] = useState<GalleryCategory | "all">("all");
  const [active, setActive] = useState<number | null>(null);

  const photos = useMemo(
    () =>
      filter === "all" ? GALLERY_PHOTOS : GALLERY_PHOTOS.filter((p) => p.category === filter),
    [filter]
  );

  const close = useCallback(() => setActive(null), []);
  const step = useCallback(
    (dir: 1 | -1) =>
      setActive((a) => (a === null ? a : (a + dir + photos.length) % photos.length)),
    [photos.length]
  );

  // Reset lightbox index when the filtered set changes.
  useEffect(() => {
    setActive(null);
  }, [filter]);

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
    <div className="pt-16">
      <section className="paper-grain bg-cream py-20 text-ink md:py-24" aria-labelledby="gallery-page-heading">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">Photos</p>
          <h1 id="gallery-page-heading" className="headline text-6xl md:text-8xl">
            From the <span className="text-chili">griddle</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
            Plates, the patio, and the counter — tap any shot to look closer.
          </p>

          <div
            className="mt-10 flex flex-wrap gap-2"
            role="tablist"
            aria-label="Gallery categories"
          >
            {GALLERY_CATEGORIES.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={filter === c.id}
                onClick={() => setFilter(c.id)}
                className={`rounded-full border-2 px-5 py-2.5 font-mono text-[12px] uppercase tracking-[0.14em] transition-all ${
                  filter === c.id
                    ? "border-ink bg-ink text-cream shadow-ticket"
                    : "border-ink/25 bg-transparent text-ink/70 hover:border-ink hover:text-ink"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
            {photos.length} photos
          </p>

          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {photos.map((p, i) => (
              <li key={`${p.src}-${i}`} className="min-w-0">
                <GalleryThumb photo={p} onOpen={() => setActive(i)} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand />

      {active !== null && photos[active] && (
        <Lightbox
          photos={photos}
          active={active}
          onClose={close}
          onStep={step}
        />
      )}
    </div>
  );
}

function GalleryThumb({ photo, onOpen }: { photo: GalleryPhoto; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Enlarge photo: ${photo.alt}`}
      className="group w-full overflow-hidden rounded-md border-2 border-ink/12 bg-paper p-2 text-left shadow-ticket transition-transform duration-300 hover:-translate-y-1"
    >
      <img
        src={photo.src}
        alt={photo.alt}
        loading="lazy"
        decoding="async"
        className="aspect-[4/3] w-full rounded-sm object-cover transition-[filter] duration-300 group-hover:brightness-105 group-hover:contrast-105"
      />
      <span className="mt-2 block truncate px-1 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink/55">
        {photo.alt}
      </span>
    </button>
  );
}

function Lightbox({
  photos,
  active,
  onClose,
  onStep,
}: {
  photos: GalleryPhoto[];
  active: number;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const photo = photos[active];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/92 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close photo viewer"
        className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard"
      >
        <X className="h-5 w-5" aria-hidden />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onStep(-1);
        }}
        aria-label="Previous photo"
        className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard md:left-6"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onStep(1);
        }}
        aria-label="Next photo"
        className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-cream/30 text-cream transition-colors hover:border-mustard hover:text-mustard md:right-6"
      >
        <ChevronRight className="h-5 w-5" aria-hidden />
      </button>

      <figure
        className="max-w-5xl rounded-md border-4 border-cream/90 bg-cream p-3 shadow-ticket"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={photo.src}
          alt={photo.alt}
          className="max-h-[72vh] w-full rounded-sm object-contain transition-opacity duration-300"
        />
        <figcaption className="flex items-center justify-between gap-4 px-1 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/60">
          <span>{photo.alt}</span>
          <span className="shrink-0">
            {active + 1} / {photos.length}
          </span>
        </figcaption>
      </figure>
    </div>
  );
}
