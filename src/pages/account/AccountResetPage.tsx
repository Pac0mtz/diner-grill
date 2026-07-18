import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { useRouteSeo } from "../../hooks/usePageMeta";
import {
  customerFetch,
  CustomerApiError,
  setCustomerToken,
  useCustomerAuth,
  type Customer,
} from "../../lib/customer-auth";

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none";

export default function AccountResetPage() {
  useRouteSeo("/account/reset");
  const { refresh } = useCustomerAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) return <Navigate to="/account/forgot" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const data = await customerFetch<{ token: string; customer: Customer }>(
        "/api/auth/reset-password",
        {
          method: "POST",
          body: { token, password },
          auth: false,
        }
      );
      setCustomerToken(data.token);
      await refresh();
      navigate("/account");
    } catch (err) {
      setError(err instanceof CustomerApiError ? err.message : "Could not reset password.");
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
        <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.06em]">New password</h1>
        <p className="mt-2 text-sm text-ink/60">Choose a new password (at least 8 characters).</p>

        <label htmlFor="reset-password" className="mb-1 mt-6 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          New password
        </label>
        <input
          id="reset-password"
          type="password"
          className={inputClass}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          required
        />

        <label htmlFor="reset-confirm" className="mb-1 mt-4 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Confirm password
        </label>
        <input
          id="reset-confirm"
          type="password"
          className={inputClass}
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
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
          {busy ? "Saving…" : "Save password"}
        </button>

        <p className="mt-4 text-center text-sm text-ink/55">
          <Link to="/account/login" className="font-semibold text-chili underline-offset-2 hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
