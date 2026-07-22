import { Award, Flame } from "lucide-react";
import ProtectedImg from "../components/ProtectedImg";

const LAYERS = [
  { n: "01", label: "Crispy hash browns" },
  { n: "02", label: "Two griddled hamburger patties" },
  { n: "03", label: "Melted American cheese" },
  { n: "04", label: "Grilled onions" },
  { n: "05", label: "Two eggs, over easy" },
  { n: "06", label: "Smothered in homemade chili" },
];

export default function Slinger() {
  return (
    <section id="slinger" className="grain relative overflow-hidden bg-coal py-24" aria-labelledby="slinger-heading">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 -translate-y-1/2 select-none font-display text-[24rem] leading-none text-cream/[0.03]"
      >
        24
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-14 px-5 md:grid-cols-2 md:px-8">
        <div>
          <p className="mb-3 flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.3em] text-mustard">
            <Flame className="h-4 w-4" aria-hidden />
            The one Chicago talks about
          </p>
          <h2 id="slinger-heading" className="headline text-7xl text-cream md:text-9xl">
            The <span className="neon-text neon-flicker">Slinger</span>
          </h2>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/75">
            A glorious mess of hash browns, two cheeseburger patties, grilled
            onions and over-easy eggs — all drowned in our homemade chili.
            It isn't pretty. It's legendary. First-timers order it by name;
            regulars just nod.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <span className="rounded-md bg-chili px-6 py-3 font-display text-4xl tracking-[0.06em] text-cream shadow-ticket">
              $16.50
            </span>
            <p className="flex max-w-xs items-start gap-2 text-sm leading-snug text-cream/60">
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-mustard" aria-hidden />
              Finish one and your certificate goes up on our wall — a Diner
              Grill tradition.
            </p>
          </div>

          <p className="mt-8 font-mono text-[12px] uppercase tracking-[0.22em] text-cream/40">
            Psst — ask about the off-menu “Dick Burger.”
          </p>
        </div>

        {/* layered build card */}
        <div className="relative">
          <ProtectedImg
            src="/photos/omelettes/slinger.webp"
            alt="A real Slinger fresh off the Diner Grill griddle, covered in chili"
            loading="lazy"
            className="swing absolute -top-12 right-6 z-10 w-40 rounded-sm border-4 border-cream object-cover shadow-ticket md:w-48"
          />
          <div className="rounded-md border-4 border-cream/20 bg-ink p-3 shadow-ticket">
            <div className="chase-lights rounded-sm" aria-hidden />
            <div className="my-3 rounded-sm bg-cream p-2">
          <div className="rounded-sm border-2 border-dashed border-ink/20 p-7 text-ink md:p-9">
            <div className="flex items-baseline justify-between border-b-2 border-ink/80 pb-4">
              <p className="font-display text-3xl uppercase tracking-[0.08em]">Anatomy of a Slinger</p>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">Order № 1937</p>
            </div>
            <ol className="mt-5 space-y-4">
              {LAYERS.map((l) => (
                <li key={l.n} className="flex items-baseline gap-4">
                  <span className="font-mono text-sm text-chili">{l.n}</span>
                  <span className="leader flex-1 font-display text-2xl uppercase tracking-[0.05em]">
                    <span>{l.label}</span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-7 border-t-2 border-ink/80 pt-4 text-center">
              <p className="font-mono text-[12px] uppercase tracking-[0.26em] text-ink/60">
                Served with a side of toast · 24 hrs a day
              </p>
            </div>
          </div>
            </div>
            <div className="chase-lights rounded-sm" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
