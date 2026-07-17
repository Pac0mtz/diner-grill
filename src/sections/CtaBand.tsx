import { Link } from "react-router";
import { ShoppingBag } from "lucide-react";
import { SITE } from "../data/site";

export default function CtaBand() {
  return (
    <section className="grain bg-chili py-16" aria-label="Order Diner Grill">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-5 text-center md:flex-row md:justify-between md:text-left">
        <div>
          <h2 className="headline text-5xl text-cream md:text-7xl">Hungry right now?</h2>
          <p className="mt-2 font-mono text-[13px] uppercase tracking-[0.2em] text-cream/80">
            Counter's open. It always is.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <a
            href={SITE.orderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-md bg-ink px-7 py-3.5 font-mono text-sm font-medium uppercase tracking-[0.14em] text-cream transition-transform hover:-translate-y-0.5"
          >
            <ShoppingBag className="h-4 w-4" aria-hidden />
            Order online
          </a>
          <Link
            to="/menu"
            className="rounded-md border-2 border-cream/70 px-7 py-3.5 font-mono text-sm uppercase tracking-[0.14em] text-cream transition-colors hover:bg-cream hover:text-chili"
          >
            Browse the menu
          </Link>
        </div>
      </div>
    </section>
  );
}
