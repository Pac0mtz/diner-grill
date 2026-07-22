import { Link } from "react-router";
import { SITE } from "../data/site";

export default function Footer() {
  return (
    <footer className="border-t border-cream/10 bg-ink py-12" aria-label="Footer">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 px-5 md:flex-row md:justify-between md:px-8">
        <div className="flex items-center gap-3">
          <img
            src="/photos/logo-badge.webp"
            alt="Diner Grill logo"
            className="h-10 w-10 rounded-full border-2 border-chili object-cover"
          />
          <div>
            <p className="font-display text-xl tracking-[0.08em] text-cream">
              DINER <span className="text-chili">GRILL</span>
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cream/40">
              Built. Broken. Rebuilt.
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-2 font-mono text-[12px] uppercase tracking-[0.16em] text-cream/60" aria-label="Footer">
          <Link to="/" className="transition-colors hover:text-mustard">Home</Link>
          <Link to="/story" className="transition-colors hover:text-mustard">Story</Link>
          <Link to="/menu" className="transition-colors hover:text-mustard">Menu</Link>
          <Link to="/gallery" className="transition-colors hover:text-mustard">Gallery</Link>
          <Link to="/reviews" className="transition-colors hover:text-mustard">Reviews</Link>
          <Link to="/visit" className="transition-colors hover:text-mustard">Visit</Link>
          <Link to={SITE.orderUrl} className="text-mustard transition-colors hover:text-cream">
            Order Online
          </Link>
        </nav>

        <div className="text-center font-mono text-[12px] uppercase leading-relaxed tracking-[0.16em] text-cream/50 md:text-right">
          <p>1635 W Irving Park Rd, Chicago, IL 60613</p>
          <p>
            <a href="tel:+17732482030" className="transition-colors hover:text-mustard">
              (773) 248-2030
            </a>{" "}
            · Open 24 hours
          </p>
          <p className="mt-2 text-cream/30">© {new Date().getFullYear()} Diner Grill · Since 1937</p>
          <p className="mt-1 text-cream/40">
            Website by{" "}
            <a
              href="https://webprochicago.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-mustard transition-colors hover:text-cream"
            >
              WebProChicago.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
