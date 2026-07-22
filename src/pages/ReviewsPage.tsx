import { useEffect, useState } from "react";
import { ExternalLink, Star } from "lucide-react";
import { useRouteSeo } from "../hooks/usePageMeta";
import {
  STATIC_REVIEWS_PAYLOAD,
  type Review,
  type ReviewsPayload,
} from "../data/reviews";
import CtaBand from "../sections/CtaBand";
import { SITE } from "../lib/seo";
import ProtectedImg from "../components/ProtectedImg";

function formatReviewDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Chicago",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < full ? "fill-mustard text-mustard" : "fill-transparent text-ink/25"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [data, setData] = useState<ReviewsPayload>(STATIC_REVIEWS_PAYLOAD);
  const [loaded, setLoaded] = useState(false);

  useRouteSeo("/reviews", {
    jsonLd: {
      "@type": "Restaurant",
      "@id": `${SITE.url}/#restaurant`,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: data.summary.rating,
        reviewCount: data.summary.count,
        bestRating: 5,
        worstRating: 1,
      },
    },
  });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reviews")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: ReviewsPayload | null) => {
        if (!cancelled && json?.reviews?.length) setData(json);
      })
      .catch(() => {
        /* keep static fallback */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const { summary, reviews } = data;

  return (
    <div className="pt-16">
      <section className="paper-grain bg-cream py-20 text-ink md:py-24" aria-labelledby="reviews-heading">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-chili">From Google</p>
          <h1 id="reviews-heading" className="headline text-6xl md:text-8xl">
            What the <span className="text-chili">regulars</span> say
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70">
            Straight from Google — stools, Slinger challenges, 3 a.m. burritos,
            and the counter that never closes.
          </p>

          <div className="mt-10 flex flex-wrap items-end justify-between gap-6 border-b-2 border-ink/80 pb-8">
            <div>
              <p className="flex items-baseline gap-3">
                <span className="font-display text-6xl text-chili md:text-7xl">{summary.rating.toFixed(1)}</span>
                <Stars rating={summary.rating} />
              </p>
              <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.18em] text-ink/50">
                {summary.count.toLocaleString()} Google reviews
                {summary.live && summary.syncedAt ? " · live sync" : ""}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={summary.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md bg-ink px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Read on Google
              </a>
              <a
                href={summary.writeReviewUrl || summary.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border-2 border-ink/30 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-ink/70 transition-colors hover:border-ink hover:text-ink"
              >
                Leave a review
              </a>
            </div>
          </div>

          {!loaded && (
            <p className="mt-10 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/40">
              Loading reviews…
            </p>
          )}

          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id}>
                <ReviewCard review={r} />
              </li>
            ))}
          </ul>

          <p className="mt-10 font-mono text-[11px] uppercase leading-relaxed tracking-[0.14em] text-ink/40">
            Reviews shown here are from Google. Ratings and copy belong to their authors.
            {summary.live
              ? " Synced from Google Places."
              : " Showing a curated set — add GOOGLE_PLACES_API_KEY on the server for live Google photos & fresh reviews."}
          </p>
        </div>
      </section>

      <CtaBand />
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-lg border-2 border-ink/12 bg-paper shadow-ticket">
      {review.image && (
        <ProtectedImg
          src={review.image}
          alt=""
          loading="lazy"
          className="aspect-[16/9] w-full object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Stars rating={review.rating} />
          <span className="rounded-sm bg-ink px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-cream">
            Google
          </span>
        </div>
        <p className="mt-4 flex-1 text-[15px] leading-relaxed text-ink/80">“{review.text}”</p>
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-t border-dashed border-ink/20 pt-4">
          <p className="font-display text-xl uppercase tracking-[0.06em]">{review.author}</p>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/45">
            {formatReviewDate(review.date)}
          </p>
        </div>
        {review.imageCredit && (
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/35">
            Photo: {review.imageCredit}
          </p>
        )}
      </div>
    </article>
  );
}
