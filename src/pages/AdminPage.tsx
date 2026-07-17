import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Lock, LogOut } from "lucide-react";
import { usePageMeta } from "../hooks/usePageMeta";
import {
  adminFetch,
  ApiError,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from "../sections/admin/api";
import OrdersTab from "../sections/admin/OrdersTab";
import MenuTab from "../sections/admin/MenuTab";
import SettingsTab from "../sections/admin/SettingsTab";

type Tab = "orders" | "menu" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "orders", label: "Orders" },
  { id: "menu", label: "Menu" },
  { id: "settings", label: "Settings" },
];

export default function AdminPage() {
  usePageMeta("Counter Admin | Diner Grill", "Diner Grill order and menu admin.");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tokenInput, setTokenInput] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<Tab>("orders");

  const logout = useCallback(() => {
    clearAdminToken();
    setAuthed(false);
    setTokenInput("");
  }, []);

  // Verify a stored token on first load.
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

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    setBusy(true);
    setLoginError(null);
    setAdminToken(tokenInput.trim());
    try {
      await adminFetch("/api/admin/settings");
      setAuthed(true);
      setTokenInput("");
    } catch (err) {
      clearAdminToken();
      setLoginError(
        err instanceof ApiError && err.status === 401
          ? "Wrong token — check ADMIN_TOKEN on the server."
          : "Could not reach the server. Is it running?"
      );
    } finally {
      setBusy(false);
    }
  }

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
            Staff only. Enter the admin token to manage orders, the menu and the
            receipt printer.
          </p>
          <label
            htmlFor="admin-token"
            className="mb-1 mt-5 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60"
          >
            Admin token
          </label>
          <input
            id="admin-token"
            type="password"
            autoComplete="current-password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            className="w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none"
          />
          {loginError && (
            <p role="alert" className="mt-3 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2 text-sm font-medium text-ember">
              {loginError}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !tokenInput.trim()}
            className="mt-5 w-full rounded-md bg-chili px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream transition-colors hover:bg-ember disabled:opacity-40"
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="paper-grain min-h-screen bg-cream text-ink">
      <header className="border-b-2 border-ink/10 bg-ink text-cream">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-2xl tracking-[0.08em]">
              DINER <span className="text-chili">GRILL</span>
            </span>
            <span className="rounded-sm bg-mustard px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink">
              Counter admin
            </span>
          </div>
          <nav className="flex items-center gap-2" aria-label="Admin sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                className={`rounded-md px-4 py-2 font-mono text-[12px] uppercase tracking-[0.14em] transition-colors ${
                  tab === t.id ? "bg-mustard text-ink" : "text-cream/60 hover:text-cream"
                }`}
              >
                {t.label}
              </button>
            ))}
            <button
              onClick={logout}
              className="ml-2 flex items-center gap-1.5 rounded-md border border-cream/25 px-3 py-2 font-mono text-[12px] uppercase tracking-[0.14em] text-cream/60 transition-colors hover:border-cream hover:text-cream"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        {tab === "orders" && <OrdersTab onUnauthorized={logout} />}
        {tab === "menu" && <MenuTab onUnauthorized={logout} />}
        {tab === "settings" && <SettingsTab onUnauthorized={logout} />}
      </main>
    </div>
  );
}
