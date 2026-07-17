import { Clock, MapPin, Phone, Armchair, ExternalLink } from "lucide-react";

const FACTS = [
  {
    icon: Clock,
    title: "Open 24 hours",
    body: "Every day, every night — 365 days a year. The coffee never stops.",
  },
  {
    icon: MapPin,
    title: "1635 W Irving Park Rd",
    body: "Lakeview, Chicago, IL 60613 — between Wrigleyville and the North Center strip.",
  },
  {
    icon: Armchair,
    title: "Counter seating only",
    body: "No booths, no reservations, no pretense. Grab a red stool at the griddle.",
  },
];

export default function Visit() {
  return (
    <section id="visit" className="grain bg-ink py-24" aria-labelledby="visit-heading">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-2">
          <div>
            <p className="mb-3 font-mono text-[12px] uppercase tracking-[0.3em] text-mustard">Find us</p>
            <h2 id="visit-heading" className="headline text-6xl text-cream md:text-8xl">
              The lights are <span className="neon-text neon-flicker">always on</span>
            </h2>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-cream/70">
              Night-shift nurses, Wrigleyville stragglers, early risers and
              insomniacs — the counter has a stool for all of them. Come hungry.
            </p>

            <ul className="mt-10 space-y-6">
              {FACTS.map((f) => (
                <li key={f.title} className="flex gap-4">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-cream/15 bg-coal text-mustard">
                    <f.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-display text-2xl uppercase tracking-[0.08em] text-cream">{f.title}</h3>
                    <p className="mt-1 max-w-md text-cream/60">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-4">
              <a
                href="tel:+17732482030"
                className="flex items-center gap-2 rounded-md bg-chili px-6 py-3.5 font-mono text-sm font-medium uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember"
              >
                <Phone className="h-4 w-4" aria-hidden />
                (773) 248-2030
              </a>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=1635+W+Irving+Park+Rd+Chicago+IL+60613"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-md border border-cream/25 px-6 py-3.5 font-mono text-sm uppercase tracking-[0.14em] text-cream transition-colors hover:border-mustard hover:text-mustard"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Get directions
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-lg border-2 border-cream/15 shadow-ticket">
              <iframe
                title="Map to Diner Grill, 1635 W Irving Park Rd, Chicago"
                src="https://maps.google.com/maps?q=Diner%20Grill%2C%201635%20W%20Irving%20Park%20Rd%2C%20Chicago%2C%20IL%2060613&t=&z=15&ie=UTF8&iwloc=&output=embed"
                className="h-[380px] w-full grayscale-[35%] contrast-[1.05]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <figure className="relative overflow-hidden rounded-lg border-2 border-cream/15 shadow-ticket">
              <img
                src="/photos/patio-2.jpg"
                alt="The Diner Grill garden patio with hanging wisteria and outdoor tables"
                loading="lazy"
                className="aspect-[16/9] w-full object-cover"
              />
              <figcaption className="absolute bottom-3 left-3 rounded-sm bg-ink/85 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-mustard">
                The garden patio · out back, weather permitting
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
