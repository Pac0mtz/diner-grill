import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useRouteSeo } from "../../hooks/usePageMeta";
import { CustomerApiError, useCustomerAuth } from "../../lib/customer-auth";

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none";

export default function AccountLoginPage() {
  useRouteSeo("/account/login");
  const { customer, loading, login } = useCustomerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get("next") || "/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!loading && customer) return <Navigate to={next} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(next);
    } catch (err) {
      setError(err instanceof CustomerApiError ? err.message : "Could not sign in.");
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
        <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.06em]">Sign in</h1>
        <p className="mt-2 text-sm text-ink/60">
          Faster checkout, order history, and optional email offers.
        </p>

        <label htmlFor="login-email" className="mb-1 mt-6 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="login-password" className="mb-1 mt-4 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

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
          {busy ? "Signing in…" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-sm text-ink/55">
          <Link to="/account/forgot" className="font-semibold text-chili underline-offset-2 hover:underline">
            Forgot password?
          </Link>
        </p>
        <p className="mt-2 text-center text-sm text-ink/55">
          New here?{" "}
          <Link
            to={`/account/register${next !== "/account" ? `?next=${encodeURIComponent(next)}` : ""}`}
            className="font-semibold text-chili underline-offset-2 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}
