import { Link } from "react-router";
import { usePageMeta } from "../hooks/usePageMeta";

export default function NotFoundPage() {
  usePageMeta({
    path: "/404",
    title: "Page Not Found | Diner Grill",
    description:
      "That page isn’t on the menu. Head back to Diner Grill’s home, menu, or visit page.",
    robots: "noindex, follow",
    ogTitle: "Page Not Found | Diner Grill",
    ogDescription: "This page doesn’t exist. Try the menu, story, or visit pages instead.",
  });

  return (
    <div className="paper-grain flex min-h-[70vh] items-center justify-center bg-cream px-5 py-24 text-ink">
      <div className="mx-auto max-w-lg text-center">
        <p className="font-mono text-[12px] uppercase tracking-[0.3em] text-chili">404</p>
        <h1 className="mt-3 font-display text-6xl uppercase tracking-[0.06em] md:text-7xl">
          Not on the <span className="text-chili">menu</span>
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink/65">
          That page doesn’t exist — or it burned down with the old diner. Pick a real stop
          below.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-md bg-chili px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember"
          >
            Home
          </Link>
          <Link
            to="/menu"
            className="rounded-md border-2 border-ink px-5 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] transition-colors hover:bg-ink hover:text-cream"
          >
            Menu
          </Link>
          <Link
            to="/visit"
            className="rounded-md border-2 border-ink/25 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-ink/70 transition-colors hover:border-ink hover:text-ink"
          >
            Visit
          </Link>
        </div>
      </div>
    </div>
  );
}
