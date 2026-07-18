import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useRouteSeo } from "../../hooks/usePageMeta";
import { CustomerApiError, useCustomerAuth } from "../../lib/customer-auth";

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none";

export default function AccountRegisterPage() {
  useRouteSeo("/account/register");
  const { customer, loading, register } = useCustomerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [offers, setOffers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && customer) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        password,
        marketing_opt_in: offers,
      });
      navigate(next);
    } catch (err) {
      setError(err instanceof CustomerApiError ? err.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper-grain min-h-screen bg-cream px-5 pb-16 pt-24 text-ink md:px-8">
      <form
        onSubmit={onSubmit}
        className="mx-auto w-full max-w-md rounded-lg border-2 border-ink bg-paper p-6 shadow-ticket sm:p-8"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-chili">Account</p>
        <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.06em]">Create account</h1>
        <p className="mt-2 text-sm text-ink/60">
          Save your details for faster ordering and keep your ticket history in one place.
        </p>

        <label htmlFor="reg-name" className="mb-1 mt-6 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Name *
        </label>
        <input
          id="reg-name"
          className={inputClass}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <label htmlFor="reg-email" className="mb-1 mt-4 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Email *
        </label>
        <input
          id="reg-email"
          type="email"
          className={inputClass}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="reg-phone" className="mb-1 mt-4 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Phone
        </label>
        <input
          id="reg-phone"
          type="tel"
          className={inputClass}
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(773) 555-0123"
        />

        <label htmlFor="reg-password" className="mb-1 mt-4 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Password * <span className="normal-case tracking-normal text-ink/40">(min 8)</span>
        </label>
        <input
          id="reg-password"
          type="password"
          className={inputClass}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-md border-2 border-ink/15 px-3 py-3">
          <input
            type="checkbox"
            checked={offers}
            onChange={(e) => setOffers(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-chili"
          />
          <span className="text-sm leading-snug text-ink/70">
            Email me offers and specials from Diner Grill
          </span>
        </label>

        {error && (
          <p role="alert" className="mt-3 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2 text-sm text-ember">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-chili px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream hover:bg-ember disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create account"}
        </button>

        <p className="mt-4 text-center text-sm text-ink/55">
          Already have an account?{" "}
          <Link
            to={`/account/login${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-chili underline-offset-2 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
