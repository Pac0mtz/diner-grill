import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useRouteSeo } from "../../hooks/usePageMeta";
import { customerFetch, CustomerApiError } from "../../lib/customer-auth";

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink focus:border-chili focus:outline-none";

export default function AccountForgotPage() {
  useRouteSeo("/account/forgot");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await customerFetch<{ message?: string }>("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
        auth: false,
      });
      setNotice(data.message || "If an account exists for that email, a reset link is on its way.");
    } catch (err) {
      setError(err instanceof CustomerApiError ? err.message : "Could not send reset email.");
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
        <h1 className="mt-2 font-display text-4xl uppercase tracking-[0.06em]">Forgot password</h1>
        <p className="mt-2 text-sm text-ink/60">
          Enter your email and we&apos;ll send a reset link if an account exists.
        </p>

        <label htmlFor="forgot-email" className="mb-1 mt-6 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          className={inputClass}
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {error && (
          <p role="alert" className="mt-3 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2 text-sm text-ember">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 rounded-md border-2 border-mustard bg-mustard/15 px-3 py-2 text-sm">
            {notice}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-5 w-full rounded-md bg-chili px-6 py-3 font-mono text-sm font-semibold uppercase tracking-[0.16em] text-cream hover:bg-ember disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send reset link"}
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
