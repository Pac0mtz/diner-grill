import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Lock,
  LogOut,
  ClipboardList,
  CreditCard,
  UtensilsCrossed,
  Settings,
  Menu,
  X,
  ExternalLink,
  LayoutDashboard,
  Download,
} from "lucide-react";
import { useRouteSeo } from "../hooks/usePageMeta";
import { useAdminPwa } from "../hooks/useAdminPwa";
import {
  adminFetch,
  adminLogin,
  adminLogout,
  ApiError,
  clearAdminToken,
  getAdminToken,
} from "../sections/admin/api";
import DashboardTab from "../sections/admin/DashboardTab";
import OrdersTab from "../sections/admin/OrdersTab";
import MenuTab from "../sections/admin/MenuTab";
import SettingsTab from "../sections/admin/SettingsTab";
import TransactionsTab from "../sections/admin/TransactionsTab";
import NewOrderTakeover from "../sections/admin/NewOrderTakeover";

type Tab = "dashboard" | "orders" | "transactions" | "menu" | "settings";

const TABS: {
  id: Tab;
  label: string;
  hint: string;
  icon: typeof ClipboardList;
}[] = [
  { id: "dashboard", label: "Dashboard", hint: "Sales & kitchen overview", icon: LayoutDashboard },
  { id: "orders", label: "Orders", hint: "Kitchen tickets", icon: ClipboardList },
  { id: "transactions", label: "Transactions", hint: "Stripe payments", icon: CreditCard },
  { id: "menu", label: "Menu", hint: "Items & photos", icon: UtensilsCrossed },
  { id: "settings", label: "Settings", hint: "Stripe, print, alerts", icon: Settings },
];

function InstallAppButton({
  showInstall,
  canInstall,
  iosHint,
  onInstall,
  dark,
}: {
  showInstall: boolean;
  canInstall: boolean;
  iosHint: boolean;
  onInstall: () => void;
  dark?: boolean;
}) {
  if (!showInstall) return null;
  if (canInstall) {
    return (
      <button
        type="button"
        onClick={onInstall}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
          dark
            ? "bg-mustard/90 text-ink hover:bg-mustard"
            : "border-2 border-ink bg-ink text-cream hover:bg-chili"
        }`}
      >
        <Download className="h-3.5 w-3.5" aria-hidden />
        Install app
      </button>
    );
  }
  if (iosHint) {
    return (
      <p
        className={`rounded-md px-3 py-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] ${
          dark ? "bg-cream/10 text-cream/55" : "border border-ink/15 bg-cream text-ink/55"
        }`}
      >
        Install: Share → Add to Home Screen
      </p>
    );
  }
  return null;
}

export default function AdminPage() {
  useRouteSeo("/admin");
  const pwa = useAdminPwa();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const logout = useCallback(() => {
    void adminLogout();
    setAuthed(false);
    setUsername("");
    setPassword("");
    setMobileNavOpen(false);
  }, []);

  useEffect(() => {
    (async () => {
      if (!getAdminToken()) {
        setChecking(false);
        return;
      }
      try {
        await adminFetch("/api/admin/settings");
        setAuthed(true);
      } catch {
        clearAdminToken();
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // Close mobile drawer on Escape, and when viewport hits desktop.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    const onResize = () => {
      if (window.matchMedia("(min-width: 1024px)").matches) setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileNavOpen]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setBusy(true);
    setLoginError(null);
    try {
      await adminLogin(username.trim(), password);
      setAuthed(true);
      setUsername("");
      setPassword("");
    } catch (err) {
      clearAdminToken();
      setLoginError(
        err instanceof ApiError && err.status === 401
          ? "Invalid username or password."
          : "Could not reach the server. Is it running?"
      );
    } finally {
      setBusy(false);
    }
  }

  function selectTab(id: Tab) {
    setTab(id);
    setMobileNavOpen(false);
  }

  const active = TABS.find((t) => t.id === tab) ?? TABS[0];

  if (checking) {
    return (
      <div className="paper-grain grid min-h-screen place-items-center bg-cream text-ink">
        <p className="font-mono text-[12px] uppercase tracking-[0.2em] text-ink/50">Checking…</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="paper-grain grid min-h-screen place-items-center bg-cream px-5 text-ink">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-lg border-2 border-ink bg-paper p-8 shadow-ticket"
        >
          <Lock className="h-8 w-8 text-chili" aria-hidden />
          <h1 className="mt-3 font-display text-4xl uppercase tracking-[0.06em]">Counter admin</h1>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">
            Staff only. Sign in to manage orders, the menu and the receipt printer.
          </p>
          <label
            htmlFor="admin-username"
            className="mb-1 mt-5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60"
          >
            Username
          </label>
          <input
            id="admin-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none"
          />
          <label
            htmlFor="admin-password"
            className="mb-1 mt-4 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60"
          >
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none"
          />
          {loginError && (
            <p role="alert" className="mt-3 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2 text-sm font-medium text-ember">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !username.trim() || !password}
            className="mt-5 w-full rounded-md bg-chili px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream transition-colors hover:bg-ember disabled:opacity-40"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <div className="mt-4">
            <InstallAppButton
              showInstall={pwa.showInstall}
              canInstall={pwa.canInstall}
              iosHint={pwa.iosHint}
              onInstall={() => void pwa.install()}
            />
          </div>
        </form>
      </div>
    );
  }

  const navItems = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Admin sections">
      <p className="mb-2 px-3 font-mono text-[10px] uppercase tracking-[0.22em] text-cream/35">
        Navigate
      </p>
      {TABS.map((t) => {
        const Icon = t.icon;
        const selected = tab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            aria-current={selected ? "page" : undefined}
            className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
              selected
                ? "bg-mustard text-ink shadow-ticket"
                : "text-cream/70 hover:bg-cream/10 hover:text-cream"
            }`}
          >
            <Icon
              className={`h-5 w-5 shrink-0 ${selected ? "text-chili" : "text-cream/45 group-hover:text-cream/80"}`}
              aria-hidden
            />
            <span className="min-w-0">
              <span className="block font-mono text-[12px] font-semibold uppercase tracking-[0.14em]">
                {t.label}
              </span>
              <span
                className={`mt-0.5 block text-[11px] leading-tight ${
                  selected ? "text-ink/55" : "text-cream/35"
                }`}
              >
                {t.hint}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="paper-grain min-h-screen bg-cream text-ink lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r-2 border-ink bg-ink text-cream lg:flex">
        <div className="border-b border-cream/10 px-5 py-5">
          <p className="font-display text-2xl tracking-[0.08em]">
            DINER <span className="text-chili">GRILL</span>
          </p>
          <p className="mt-1 inline-block rounded-sm bg-mustard px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">
            Counter admin
          </p>
        </div>

        {navItems}

        <div className="mt-auto space-y-2 border-t border-cream/10 p-3">
          <InstallAppButton
            showInstall={pwa.showInstall}
            canInstall={pwa.canInstall}
            iosHint={pwa.iosHint}
            onInstall={() => void pwa.install()}
            dark
          />
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/45 transition-colors hover:bg-cream/10 hover:text-cream"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            View site
          </a>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/55 transition-colors hover:bg-cream/10 hover:text-cream"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-40 border-b-2 border-ink bg-ink text-cream lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-display text-xl tracking-[0.08em]">
              DINER <span className="text-chili">GRILL</span>
            </p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.16em] text-cream/50">
              {active.label}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-md border border-cream/25 p-2 text-cream transition-colors hover:border-cream"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        {/* Quick tab strip */}
        <div
          className="flex gap-1.5 overflow-x-auto px-3 pb-3 [scrollbar-width:none]"
          role="tablist"
          aria-label="Admin sections"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => selectTab(t.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                tab === t.id
                  ? "bg-mustard text-ink"
                  : "bg-cream/10 text-cream/65 hover:bg-cream/15 hover:text-cream"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button
            type="button"
            className="absolute inset-0 bg-ink/60"
            aria-label="Close menu"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="relative flex h-full w-[min(18rem,88vw)] flex-col bg-ink text-cream shadow-ticket">
            <div className="flex items-start justify-between border-b border-cream/10 px-5 py-5">
              <div>
                <p className="font-display text-2xl tracking-[0.08em]">
                  DINER <span className="text-chili">GRILL</span>
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-cream/40">
                  Counter admin
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded-md border border-cream/25 p-1.5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {navItems}
            <div className="mt-auto space-y-2 border-t border-cream/10 p-3">
              <InstallAppButton
                showInstall={pwa.showInstall}
                canInstall={pwa.canInstall}
                iosHint={pwa.iosHint}
                onInstall={() => void pwa.install()}
                dark
              />
              <a
                href="/"
                className="flex items-center gap-2 rounded-md px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/45"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                View site
              </a>
              <button
                type="button"
                onClick={logout}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-cream/55"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                Sign out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content pane — new-order overlay fills this box only (not the sidebar) */}
      <div className="relative min-h-svh min-w-0 flex-1 lg:h-svh lg:overflow-hidden">
        <main className="h-full overflow-y-auto px-4 py-5 sm:px-6 lg:px-6 lg:py-6 xl:px-8">
          <div className="mb-4 lg:hidden">
            <h1 className="font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">
              {active.label}
            </h1>
            <p className="mt-0.5 text-sm text-ink/55">{active.hint}</p>
          </div>
          {tab === "dashboard" && (
            <DashboardTab
              onUnauthorized={logout}
              onNavigate={(id) => selectTab(id)}
            />
          )}
          {tab === "orders" && <OrdersTab onUnauthorized={logout} />}
          {tab === "transactions" && <TransactionsTab onUnauthorized={logout} />}
          {tab === "menu" && <MenuTab onUnauthorized={logout} />}
          {tab === "settings" && <SettingsTab onUnauthorized={logout} />}
        </main>

        {/* Kitchen alert — absolute over this pane only */}
        <NewOrderTakeover onUnauthorized={logout} />
      </div>
    </div>
  );
}
