import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router";
import { Phone, ShoppingBag, Menu as MenuIcon, X, UserRound } from "lucide-react";
import { SITE } from "../data/site";
import { useCustomerAuth } from "../lib/customer-auth";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/story", label: "Story" },
  { to: "/menu", label: "Menu" },
  { to: "/gallery", label: "Gallery" },
  { to: "/reviews", label: "Reviews" },
  { to: "/visit", label: "Visit" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { customer } = useCustomerAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const forceDark = pathname === "/menu" || pathname === "/order" || pathname.startsWith("/account");
  const solid = scrolled || open || forceDark;

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        solid ? "bg-ink/95 backdrop-blur-md border-b border-cream/10" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 md:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Diner Grill — home">
          <img
            src="/photos/logo-badge.webp"
            alt="Diner Grill logo — Home of the Slinger, est. 1937"
            className="h-10 w-10 rounded-full border-2 border-chili object-cover"
          />
          <span className="font-display text-2xl tracking-[0.08em] text-cream">
            DINER <span className="text-chili">GRILL</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `font-mono text-[13px] uppercase tracking-[0.18em] transition-colors hover:text-mustard ${
                  isActive ? "text-mustard" : "text-cream/70"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden items-center gap-2 rounded-full border border-mustard/40 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-mustard xl:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-mustard opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-mustard" />
            </span>
            Open now
          </span>
          <Link
            to={customer ? "/account" : "/account/login"}
            className="hidden items-center gap-2 rounded-md border border-cream/30 px-3 py-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-cream/85 transition-colors hover:border-cream hover:text-cream md:flex"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden />
            {customer ? "Account" : "Sign in"}
          </Link>
          <Link
            to={SITE.orderUrl}
            className="hidden items-center gap-2 rounded-md bg-mustard px-4 py-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-ink transition-colors hover:bg-cream sm:flex"
          >
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
            Order online
          </Link>
          <a
            href={SITE.phoneHref}
            className="flex items-center gap-2 rounded-md bg-chili px-4 py-2 font-mono text-[12px] font-medium uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember md:hidden"
          >
            <Phone className="h-3.5 w-3.5" aria-hidden />
            Call
          </a>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle navigation menu"
            className="grid h-10 w-10 place-items-center rounded-md border border-cream/25 text-cream md:hidden"
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <MenuIcon className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {/* mobile nav */}
      {open && (
        <nav className="border-t border-cream/10 bg-ink px-5 pb-5 pt-3 md:hidden" aria-label="Mobile">
          <ul className="space-y-1">
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  className={({ isActive }) =>
                    `block rounded-md px-3 py-3 font-mono text-sm uppercase tracking-[0.18em] ${
                      isActive ? "bg-smoke text-mustard" : "text-cream/75"
                    }`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
            <li>
              <Link
                to={customer ? "/account" : "/account/login"}
                className="mt-2 flex items-center justify-center gap-2 rounded-md border border-cream/25 px-3 py-3 font-mono text-sm uppercase tracking-[0.18em] text-cream"
              >
                <UserRound className="h-4 w-4" aria-hidden />
                {customer ? "Account" : "Sign in"}
              </Link>
            </li>
            <li>
              <Link
                to={SITE.orderUrl}
                className="mt-2 flex items-center justify-center gap-2 rounded-md bg-mustard px-3 py-3 font-mono text-sm font-medium uppercase tracking-[0.18em] text-ink"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden />
                Order online
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
