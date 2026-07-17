const ITEMS = [
  "Open 24 hours",
  "Home of the Slinger",
  "Est. 1937",
  "Scratch-made chili",
  "Counter seating only",
  "Hash browns & eggs",
  "Lakeview · Chicago",
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="border-y-4 border-ink bg-chili" aria-hidden>
      <div className="group overflow-hidden py-3">
        <div className="flex w-max animate-marquee items-center gap-8 pr-8 [animation-play-state:running] group-hover:[animation-play-state:paused]">
          {row.map((item, i) => (
            <span key={i} className="flex items-center gap-8 whitespace-nowrap font-display text-2xl uppercase tracking-[0.14em] text-cream">
              {item}
              <span className="text-mustard">★</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
