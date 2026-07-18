import { MapPin, Clock, ArrowDown, ShoppingBag } from "lucide-react";
import { Link } from "react-router";
import { SITE } from "../data/site";

export default function Hero() {
  return (
    <section id="top" className="grain relative flex min-h-svh flex-col overflow-hidden bg-ink" aria-label="Welcome to Diner Grill">
      {/* oversized ghost type */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[26vw] leading-none text-cream/[0.035]"
      >
        SLINGER
      </div>

      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 pt-28 md:px-8 lg:grid-cols-[1fr_1fr] lg:gap-10">
        <div className="flex flex-col justify-center">
          <p className="mb-5 flex items-center gap-3 font-mono text-[12px] uppercase tracking-[0.3em] text-mustard">
            <span className="h-px w-10 bg-mustard/60" aria-hidden />
            Chicago · Lakeview · Est. 1937
          </p>

          <h1 className="headline text-cream">
            <span className="block text-[19vw] md:text-[10rem] lg:text-[8.5rem] xl:text-[10rem]">Diner</span>
            <span className="block text-[19vw] text-chili md:text-[10rem] lg:text-[8.5rem] xl:text-[10rem]">Grill</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream/75 md:text-xl">
            The 24-hour counter diner on Irving Park Road. Scratch-made breakfast,
            thin griddled burgers, and the legendary <strong className="text-cream">Slinger</strong> —
            built in 1937, rebuilt from the ashes in 2018.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              to="/menu"
              className="rounded-md bg-chili px-7 py-3.5 font-mono text-sm font-medium uppercase tracking-[0.14em] text-cream shadow-ticket transition-transform hover:-translate-y-0.5 hover:bg-ember"
            >
              See the menu
            </Link>
            <Link
              to={SITE.orderUrl}
              className="flex items-center gap-2 rounded-md bg-mustard px-7 py-3.5 font-mono text-sm font-medium uppercase tracking-[0.14em] text-ink transition-transform hover:-translate-y-0.5 hover:bg-cream"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden />
              Order online
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap gap-x-10 gap-y-4 pb-10">
            <div className="flex items-center gap-3 text-cream/70">
              <Clock className="h-5 w-5 text-mustard" aria-hidden />
              <div>
                <p className="neon-text neon-flicker font-display text-xl tracking-[0.12em]">OPEN 24 HOURS</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream/50">Every day. Every night.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-cream/70">
              <MapPin className="h-5 w-5 text-mustard" aria-hidden />
              <div>
                <p className="font-display text-xl tracking-[0.12em] text-cream">1635 W Irving Park Rd</p>
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-cream/50">Chicago, IL 60613</p>
              </div>
            </div>
          </div>
        </div>

        {/* hero photo card */}
        <div className="relative mx-auto mb-10 w-full max-w-lg self-center sm:max-w-xl lg:mb-0 lg:max-w-none lg:justify-self-end">
          <div className="rotate-2 rounded-md border-4 border-cream/90 bg-cream p-3 shadow-ticket transition-transform duration-500 hover:rotate-0 md:p-4">
            <img
              src="/photos/hero-diner.jpg"
              alt="The Diner Grill restaurant on Irving Park Road — open 24 hours"
              className="aspect-[4/3] w-full rounded-sm object-cover"
              loading="eager"
            />
            <p className="pt-3 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-ink/60 md:text-[12px]">
              Irving Park Rd · open 24 hours
            </p>
          </div>
          <img
            src="/photos/logo-badge.jpg"
            alt=""
            aria-hidden
            className="spin-slow absolute -top-8 left-6 w-24 rounded-full border-4 border-ink shadow-ticket md:-top-10 md:w-28"
          />
          <span className="swing absolute -bottom-4 right-6 rounded-sm bg-mustard px-4 py-2 font-display text-xl uppercase tracking-[0.1em] text-ink shadow-ticket md:text-2xl">
            Est. 1937
          </span>
        </div>
      </div>

      <a
        href="#slinger"
        aria-label="Scroll to the Slinger"
        className="relative z-10 mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-full border border-cream/20 text-cream/60 transition-colors hover:border-mustard hover:text-mustard"
      >
        <ArrowDown className="h-5 w-5 animate-bounce" aria-hidden />
      </a>
    </section>
  );
}
