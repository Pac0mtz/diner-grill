import { useCallback, useEffect, useState } from "react";
import { Printer, Mail, ShieldCheck, Bell, Volume2, RotateCcw, CreditCard } from "lucide-react";
import { adminFetch, ApiError } from "./api";
import { playOrderAlert } from "../../lib/order-alert";

type Settings = {
  printer_ip: string;
  printer_device_id: string;
  print_method: "email" | "agent" | "both";
  printer_email: string;
  smtp_host: string;
  smtp_port: string;
  smtp_secure: string;
  smtp_user: string;
  smtp_from: string;
  smtp_pass_set: boolean;
  mail_configured: boolean;
  notify_emails: string;
  notify_email_cc: string;
  order_alert_sound: string;
  customer_emails_enabled: string;
  customer_email_receipt: string;
  customer_email_accepted: string;
  customer_email_ready: string;
  customer_email_completed: string;
  customer_email_cancelled: string;
  receipt_width: string;
  receipt_name: string;
  receipt_address: string;
  receipt_phone: string;
  receipt_footer_1: string;
  receipt_footer_2: string;
  receipt_tax_label: string;
  stripe_configured: boolean;
  stripe_test_mode: boolean;
  stripe_secret_key_set: boolean;
  stripe_webhook_secret_set: boolean;
  stripe_publishable_key: string;
  stripe_secret_key_hint: string;
  stripe_webhook_secret_hint: string;
};

type SettingsTabProps = {
  onUnauthorized: () => void;
};

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-chili focus:outline-none";

const labelClass = "mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60";

const emptySettings: Settings = {
  printer_ip: "",
  printer_device_id: "",
  print_method: "email",
  printer_email: "",
  smtp_host: "",
  smtp_port: "587",
  smtp_secure: "0",
  smtp_user: "",
  smtp_from: "",
  smtp_pass_set: false,
  mail_configured: false,
  notify_emails: "",
  notify_email_cc: "",
  order_alert_sound: "1",
  customer_emails_enabled: "1",
  customer_email_receipt: "1",
  customer_email_accepted: "1",
  customer_email_ready: "1",
  customer_email_completed: "0",
  customer_email_cancelled: "1",
  receipt_width: "42",
  receipt_name: "DINER GRILL",
  receipt_address: "1635 W Irving Park Rd, Chicago, IL 60613",
  receipt_phone: "(773) 248-2030",
  receipt_footer_1: "Thank you!",
  receipt_footer_2: "Show this ticket at the counter",
  receipt_tax_label: "Tax (10.25%)",
  stripe_configured: false,
  stripe_test_mode: false,
  stripe_secret_key_set: false,
  stripe_webhook_secret_set: false,
  stripe_publishable_key: "",
  stripe_secret_key_hint: "",
  stripe_webhook_secret_hint: "",
};

function normalizeSettings(data: Partial<Settings>): Settings {
  return {
    ...emptySettings,
    ...data,
    print_method:
      data.print_method === "agent" || data.print_method === "both" || data.print_method === "email"
        ? data.print_method
        : "email",
    smtp_port: data.smtp_port || "587",
    smtp_secure: data.smtp_secure === "1" ? "1" : "0",
    order_alert_sound: data.order_alert_sound === "0" ? "0" : "1",
    customer_emails_enabled: data.customer_emails_enabled === "0" ? "0" : "1",
    customer_email_receipt: data.customer_email_receipt === "0" ? "0" : "1",
    customer_email_accepted: data.customer_email_accepted === "0" ? "0" : "1",
    customer_email_ready: data.customer_email_ready === "0" ? "0" : "1",
    customer_email_completed: data.customer_email_completed === "1" ? "1" : "0",
    customer_email_cancelled: data.customer_email_cancelled === "0" ? "0" : "1",
    receipt_width: data.receipt_width || "42",
  };
}

export default function SettingsTab({ onUnauthorized }: SettingsTabProps) {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [smtpPass, setSmtpPass] = useState("");
  const [stripeSecret, setStripeSecret] = useState("");
  const [stripeWebhook, setStripeWebhook] = useState("");
  const [testCustomerTo, setTestCustomerTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState("");
  const [previewWidth, setPreviewWidth] = useState(42);
  const [showPreviewMobile, setShowPreviewMobile] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch<Partial<Settings>>("/api/admin/settings");
        setSettings(normalizeSettings(data));
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setError(err instanceof Error ? err.message : "Could not load settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [onUnauthorized]);

  const refreshPreview = useCallback(
    async (draft: Settings) => {
      try {
        const data = await adminFetch<{ text: string; width: number }>("/api/admin/receipt-preview", {
          method: "POST",
          body: {
            receipt_width: draft.receipt_width,
            receipt_name: draft.receipt_name,
            receipt_address: draft.receipt_address,
            receipt_phone: draft.receipt_phone,
            receipt_footer_1: draft.receipt_footer_1,
            receipt_footer_2: draft.receipt_footer_2,
            receipt_tax_label: draft.receipt_tax_label,
          },
        });
        setPreview(data.text);
        setPreviewWidth(data.width);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) onUnauthorized();
      }
    },
    [onUnauthorized]
  );

  useEffect(() => {
    if (loading) return;
    const t = window.setTimeout(() => {
      void refreshPreview(settings);
    }, 250);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- preview only on receipt field edits
  }, [
    loading,
    settings.receipt_width,
    settings.receipt_name,
    settings.receipt_address,
    settings.receipt_phone,
    settings.receipt_footer_1,
    settings.receipt_footer_2,
    settings.receipt_tax_label,
    refreshPreview,
  ]);

  function patch<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save(extra: Record<string, unknown> = {}) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const body: Record<string, string | boolean> = {
        printer_ip: settings.printer_ip,
        printer_device_id: settings.printer_device_id,
        print_method: settings.print_method,
        printer_email: settings.printer_email,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_secure: settings.smtp_secure,
        smtp_user: settings.smtp_user,
        smtp_from: settings.smtp_from,
        notify_emails: settings.notify_emails,
        notify_email_cc: settings.notify_email_cc,
        order_alert_sound: settings.order_alert_sound,
        customer_emails_enabled: settings.customer_emails_enabled,
        customer_email_receipt: settings.customer_email_receipt,
        customer_email_accepted: settings.customer_email_accepted,
        customer_email_ready: settings.customer_email_ready,
        customer_email_completed: settings.customer_email_completed,
        customer_email_cancelled: settings.customer_email_cancelled,
        receipt_width: settings.receipt_width,
        receipt_name: settings.receipt_name,
        receipt_address: settings.receipt_address,
        receipt_phone: settings.receipt_phone,
        receipt_footer_1: settings.receipt_footer_1,
        receipt_footer_2: settings.receipt_footer_2,
        receipt_tax_label: settings.receipt_tax_label,
        stripe_publishable_key: settings.stripe_publishable_key,
        ...extra,
      };
      if (smtpPass.trim()) body.smtp_pass = smtpPass.trim();
      if (stripeSecret.trim()) body.stripe_secret_key = stripeSecret.trim();
      if (stripeWebhook.trim()) body.stripe_webhook_secret = stripeWebhook.trim();

      const data = await adminFetch<Partial<Settings>>("/api/admin/settings", {
        method: "PUT",
        body,
      });
      setSettings(normalizeSettings(data));
      setSmtpPass("");
      setStripeSecret("");
      setStripeWebhook("");
      setNotice(extra.reset_receipt_defaults ? "Receipt reset to Epson defaults." : "Settings saved.");
      void refreshPreview(normalizeSettings(data));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function testSmtp() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminFetch<{ ok?: boolean; message?: string }>("/api/admin/test-smtp", {
        method: "POST",
      });
      if (data.ok) setNotice(data.message ?? "SMTP connection OK.");
      else setError(data.message ?? "SMTP test failed.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "SMTP test failed.");
    } finally {
      setBusy(false);
    }
  }

  async function testPrint() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminFetch<{ ok?: boolean; message?: string }>("/api/admin/test-print", {
        method: "POST",
      });
      if (data.ok === false) setError(data.message ?? "Test print failed.");
      else setNotice(data.message ?? "Test ticket sent.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Test print failed.");
    } finally {
      setBusy(false);
    }
  }

  async function testNotify() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await save();
      const data = await adminFetch<{ ok?: boolean; skipped?: boolean; message?: string }>(
        "/api/admin/test-notify",
        { method: "POST" }
      );
      if (data.ok) setNotice(data.message ?? "Notification sent.");
      else setError(data.message ?? "Notification failed.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Notification failed.");
    } finally {
      setBusy(false);
    }
  }

  async function testCustomerEmail() {
    const to = testCustomerTo.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      setError("Enter a valid email to send the sample customer receipt.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await save();
      const data = await adminFetch<{ ok?: boolean; skipped?: boolean; message?: string }>(
        "/api/admin/test-customer-email",
        { method: "POST", body: { to, kind: "receipt" } }
      );
      if (data.ok) setNotice(data.message ?? "Customer test email sent.");
      else setError(data.message ?? "Customer test email failed.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Customer test email failed.");
    } finally {
      setBusy(false);
    }
  }

  async function testStripe() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Persist any typed keys first so verify uses the latest values.
      if (stripeSecret.trim() || stripeWebhook.trim() || settings.stripe_publishable_key) {
        await save();
      }
      const data = await adminFetch<{ ok?: boolean; message?: string }>("/api/admin/test-stripe", {
        method: "POST",
      });
      if (data.ok) setNotice(data.message ?? "Stripe OK.");
      else setError(data.message ?? "Stripe test failed.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Stripe test failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="py-16 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
        Loading settings…
      </p>
    );
  }

  const usesEmail = settings.print_method === "email" || settings.print_method === "both";
  const usesAgent = settings.print_method === "agent" || settings.print_method === "both";

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-24">
      {/* Stripe */}
      <section className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket sm:p-6" aria-label="Stripe payments">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">
              <CreditCard className="h-6 w-6 shrink-0 text-chili sm:h-7 sm:w-7" aria-hidden />
              Stripe payments
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/60">
              Keys from{" "}
              <a
                href="https://dashboard.stripe.com/apikeys"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-chili underline underline-offset-2"
              >
                Stripe Dashboard → Developers → API keys
              </a>
              . Use test keys while you&apos;re setting up; switch to live when you go live.
            </p>
          </div>
          <span
            className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
              settings.stripe_configured ? "bg-mustard/25 text-ink" : "bg-ink/10 text-ink/50"
            }`}
          >
            {settings.stripe_configured
              ? settings.stripe_test_mode
                ? "Test mode ready"
                : "Live mode ready"
              : "Not configured"}
          </span>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="stripe-pk" className={labelClass}>
              Publishable key (pk_…)
            </label>
            <input
              id="stripe-pk"
              className={inputClass}
              autoComplete="off"
              spellCheck={false}
              placeholder="pk_test_…"
              value={settings.stripe_publishable_key}
              onChange={(e) => patch("stripe_publishable_key", e.target.value)}
            />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
              Used by the online order checkout page
            </p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="stripe-sk" className={labelClass}>
              Secret key (sk_…){" "}
              {settings.stripe_secret_key_set
                ? `— saved ${settings.stripe_secret_key_hint}`
                : ""}
            </label>
            <input
              id="stripe-sk"
              className={inputClass}
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={settings.stripe_secret_key_set ? "•••••••• (leave blank to keep)" : "sk_test_…"}
              value={stripeSecret}
              onChange={(e) => setStripeSecret(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="stripe-wh" className={labelClass}>
              Webhook signing secret (whsec_…){" "}
              {settings.stripe_webhook_secret_set
                ? `— saved ${settings.stripe_webhook_secret_hint}`
                : ""}
            </label>
            <input
              id="stripe-wh"
              className={inputClass}
              type="password"
              autoComplete="new-password"
              spellCheck={false}
              placeholder={
                settings.stripe_webhook_secret_set ? "•••••••• (leave blank to keep)" : "whsec_…"
              }
              value={stripeWebhook}
              onChange={(e) => setStripeWebhook(e.target.value)}
            />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
              Stripe Dashboard → Developers → Webhooks → endpoint for /api/stripe/webhook · event
              payment_intent.succeeded
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void testStripe()}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-ink hover:text-cream disabled:opacity-40"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
            Test Stripe
          </button>
          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border-2 border-ink/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/70 hover:border-ink hover:text-ink"
          >
            Open Stripe Dashboard
          </a>
        </div>
      </section>

      {/* Receipt editor */}
      <section className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket sm:p-6" aria-label="Receipt editor">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">Receipt editor</h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink/60">
              Preview uses Epson TM defaults — Font A on 80mm paper is about{" "}
              <strong className="font-semibold text-ink">42 characters</strong> wide. What you see
              here is what mail-to-print and the LAN agent send.
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save({ reset_receipt_defaults: true })}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink/25 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70 hover:border-ink hover:text-ink disabled:opacity-40"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            Epson defaults
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_minmax(280px,340px)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="receipt-name" className={labelClass}>
                Header name
              </label>
              <input
                id="receipt-name"
                className={inputClass}
                value={settings.receipt_name}
                onChange={(e) => patch("receipt_name", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="receipt-address" className={labelClass}>
                Address
              </label>
              <input
                id="receipt-address"
                className={inputClass}
                value={settings.receipt_address}
                onChange={(e) => patch("receipt_address", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="receipt-phone" className={labelClass}>
                Phone
              </label>
              <input
                id="receipt-phone"
                className={inputClass}
                value={settings.receipt_phone}
                onChange={(e) => patch("receipt_phone", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="receipt-width" className={labelClass}>
                Characters per line
              </label>
              <input
                id="receipt-width"
                className={inputClass}
                inputMode="numeric"
                value={settings.receipt_width}
                onChange={(e) => patch("receipt_width", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="receipt-footer-1" className={labelClass}>
                Footer line 1
              </label>
              <input
                id="receipt-footer-1"
                className={inputClass}
                value={settings.receipt_footer_1}
                onChange={(e) => patch("receipt_footer_1", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="receipt-footer-2" className={labelClass}>
                Footer line 2
              </label>
              <input
                id="receipt-footer-2"
                className={inputClass}
                value={settings.receipt_footer_2}
                onChange={(e) => patch("receipt_footer_2", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="receipt-tax" className={labelClass}>
                Tax label
              </label>
              <input
                id="receipt-tax"
                className={inputClass}
                value={settings.receipt_tax_label}
                onChange={(e) => patch("receipt_tax_label", e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => setShowPreviewMobile((v) => !v)}
              className="mb-2 flex items-center justify-between rounded-md border-2 border-ink/15 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60 lg:hidden"
              aria-expanded={showPreviewMobile}
            >
              Live preview · {previewWidth} cols
              <span className="text-chili">{showPreviewMobile ? "Hide" : "Show"}</span>
            </button>
            <p className="mb-2 hidden font-mono text-[11px] uppercase tracking-[0.16em] text-ink/50 lg:block">
              Live preview · {previewWidth} cols
            </p>
            <div
              className={`relative flex-1 overflow-hidden rounded-md border-2 border-ink bg-[#f7f2e4] shadow-ticket ${
                showPreviewMobile ? "block" : "hidden lg:block"
              }`}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-ink/10 to-transparent" />
              <pre
                className="max-h-[420px] overflow-auto p-4 font-mono text-[11px] leading-[1.35] text-ink [tab-size:4]"
                style={{ width: `${Math.max(240, previewWidth * 7.2)}px`, maxWidth: "100%" }}
              >
                {preview || "Loading preview…"}
              </pre>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-ink/10 to-transparent" />
            </div>
            <p
              className={`mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40 ${
                showPreviewMobile ? "block" : "hidden lg:block"
              }`}
            >
              Sample ticket DG-1042 — not a real order
            </p>
          </div>
        </div>
      </section>

      {/* Alerts */}
      <section className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket sm:p-6" aria-label="Order alerts">
        <h3 className="font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">Order alerts</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Sound plays in the admin Orders tab when a new paid order arrives. Email notifications go
          to your staff list (separate from the Epson printer ticket).
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border-2 border-ink/15 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.order_alert_sound === "1"}
            onChange={(e) => patch("order_alert_sound", e.target.checked ? "1" : "0")}
          />
          <span>
            <span className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em]">
              <Volume2 className="h-4 w-4 text-chili" aria-hidden />
              Play sound on new order
            </span>
            <span className="mt-0.5 block text-sm text-ink/60">
              Browser must stay open on the Orders screen. Click Test sound once to allow audio.
            </span>
          </span>
        </label>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="notify-emails" className={labelClass}>
              Notification To
            </label>
            <input
              id="notify-emails"
              className={inputClass}
              placeholder="owner@dinergrill.com, manager@dinergrill.com"
              value={settings.notify_emails}
              onChange={(e) => patch("notify_emails", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="notify-cc" className={labelClass}>
              Notification CC
            </label>
            <input
              id="notify-cc"
              className={inputClass}
              placeholder="kitchen@dinergrill.com"
              value={settings.notify_email_cc}
              onChange={(e) => patch("notify_email_cc", e.target.value)}
            />
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
              Comma-separated. Uses the same SMTP settings as mail-to-print.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void playOrderAlert()}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-ink hover:text-cream"
          >
            <Volume2 className="h-3.5 w-3.5" aria-hidden />
            Test sound
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void testNotify()}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-ink hover:text-cream disabled:opacity-40"
          >
            <Bell className="h-3.5 w-3.5" aria-hidden />
            Test notification email
          </button>
        </div>
      </section>

      {/* Customer emails */}
      <section
        className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket sm:p-6"
        aria-label="Customer emails"
      >
        <h3 className="font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">Customer emails</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Guests enter an email at checkout. We send a payment receipt when Stripe confirms payment,
          then updates when you Accept, Mark ready, Complete, or Cancel. Uses the same SMTP as
          kitchen print.
        </p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-md border-2 border-ink/15 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={settings.customer_emails_enabled === "1"}
            onChange={(e) => patch("customer_emails_enabled", e.target.checked ? "1" : "0")}
          />
          <span>
            <span className="flex items-center gap-2 font-mono text-[12px] uppercase tracking-[0.14em]">
              <Mail className="h-4 w-4 text-chili" aria-hidden />
              Send customer emails
            </span>
            <span className="mt-0.5 block text-sm text-ink/60">
              Master switch. Turn off to pause all guest messages (kitchen print &amp; staff alerts
              still work).
            </span>
          </span>
        </label>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {(
            [
              ["customer_email_receipt", "Payment receipt", "When the order is paid"],
              ["customer_email_accepted", "Accepted / cooking", "When you tap Accept order"],
              ["customer_email_ready", "Ready for pickup", "When you Mark ready"],
              ["customer_email_completed", "Thank-you note", "When you Complete (optional)"],
              ["customer_email_cancelled", "Cancelled notice", "When an order is cancelled"],
            ] as const
          ).map(([key, label, hint]) => (
            <label
              key={key}
              className="flex cursor-pointer items-start gap-3 rounded-md border border-ink/10 px-3 py-2.5"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={settings[key] === "1"}
                disabled={settings.customer_emails_enabled !== "1"}
                onChange={(e) => patch(key, e.target.checked ? "1" : "0")}
              />
              <span>
                <span className="block font-mono text-[11px] uppercase tracking-[0.12em]">
                  {label}
                </span>
                <span className="mt-0.5 block text-[12px] text-ink/50">{hint}</span>
              </span>
            </label>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-end gap-2">
          <div className="min-w-[14rem] flex-1">
            <label htmlFor="test-customer-to" className={labelClass}>
              Test receipt to
            </label>
            <input
              id="test-customer-to"
              type="email"
              className={inputClass}
              placeholder="you@email.com"
              value={testCustomerTo}
              onChange={(e) => setTestCustomerTo(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void testCustomerEmail()}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] hover:bg-ink hover:text-cream disabled:opacity-40"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden />
            Send test receipt
          </button>
        </div>
      </section>

      {/* Print method */}
      <section className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket sm:p-6" aria-label="Print method">
        <h3 className="font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">Print method</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          Epson mail-to-print (cloud) or LAN print agent (ePOS on the restaurant network).
        </p>
        <fieldset className="mt-5 space-y-2">
          <legend className="sr-only">How to print kitchen tickets</legend>
          {(
            [
              {
                value: "email" as const,
                title: "Epson mail-to-print",
                body: "Server emails the ticket to your Epson Connect printer address.",
              },
              {
                value: "agent" as const,
                title: "LAN print agent",
                body: "Counter computer polls and prints over the restaurant network.",
              },
              {
                value: "both" as const,
                title: "Both",
                body: "Email immediately, and also queue for the LAN agent.",
              },
            ] as const
          ).map((opt) => (
            <label
              key={opt.value}
              className={`flex cursor-pointer gap-3 rounded-md border-2 px-4 py-3 transition-colors ${
                settings.print_method === opt.value
                  ? "border-ink bg-ink/5"
                  : "border-ink/15 hover:border-ink/40"
              }`}
            >
              <input
                type="radio"
                name="print_method"
                className="mt-1"
                checked={settings.print_method === opt.value}
                onChange={() => patch("print_method", opt.value)}
              />
              <span>
                <span className="block font-mono text-[12px] uppercase tracking-[0.14em] text-ink">
                  {opt.title}
                </span>
                <span className="mt-0.5 block text-sm text-ink/60">{opt.body}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      {usesEmail && (
        <section className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket sm:p-6" aria-label="SMTP mail-to-print">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">SMTP · Mail to print</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">
                Epson Connect print email + your SMTP provider (Gmail app password, Microsoft 365,
                SendGrid, etc.).
              </p>
            </div>
            <span
              className={`shrink-0 rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] ${
                settings.mail_configured ? "bg-mustard/25 text-ink" : "bg-ink/10 text-ink/50"
              }`}
            >
              {settings.mail_configured ? "Configured" : "Incomplete"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="printer-email" className={labelClass}>
                Epson printer email
              </label>
              <input
                id="printer-email"
                className={inputClass}
                type="email"
                autoComplete="off"
                placeholder="yourprinter@print.epsonconnect.com"
                value={settings.printer_email}
                onChange={(e) => patch("printer_email", e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="smtp-host" className={labelClass}>
                SMTP host
              </label>
              <input
                id="smtp-host"
                className={inputClass}
                placeholder="smtp.gmail.com"
                value={settings.smtp_host}
                onChange={(e) => patch("smtp_host", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="smtp-port" className={labelClass}>
                Port
              </label>
              <input
                id="smtp-port"
                className={inputClass}
                inputMode="numeric"
                placeholder="587"
                value={settings.smtp_port}
                onChange={(e) => patch("smtp_port", e.target.value)}
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-ink/80">
                <input
                  type="checkbox"
                  checked={settings.smtp_secure === "1"}
                  onChange={(e) => patch("smtp_secure", e.target.checked ? "1" : "0")}
                />
                Use TLS/SSL (port 465)
              </label>
            </div>
            <div>
              <label htmlFor="smtp-user" className={labelClass}>
                SMTP username
              </label>
              <input
                id="smtp-user"
                className={inputClass}
                autoComplete="off"
                placeholder="you@gmail.com"
                value={settings.smtp_user}
                onChange={(e) => patch("smtp_user", e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="smtp-pass" className={labelClass}>
                SMTP password {settings.smtp_pass_set ? "(saved — leave blank to keep)" : ""}
              </label>
              <input
                id="smtp-pass"
                className={inputClass}
                type="password"
                autoComplete="new-password"
                placeholder={settings.smtp_pass_set ? "••••••••" : "App password"}
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="smtp-from" className={labelClass}>
                From address
              </label>
              <input
                id="smtp-from"
                className={inputClass}
                type="email"
                placeholder="orders@dinergrill.com"
                value={settings.smtp_from}
                onChange={(e) => patch("smtp_from", e.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      {usesAgent && (
        <section className="rounded-lg border-2 border-ink bg-paper p-4 shadow-ticket sm:p-6" aria-label="Receipt printer LAN">
          <h3 className="font-display text-2xl uppercase tracking-[0.06em] sm:text-3xl">LAN printer (ePOS)</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink/60">
            Used by <code className="font-mono text-[12px]">npm run print-agent</code> on the
            restaurant network.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="printer-ip" className={labelClass}>
                Printer IP address
              </label>
              <input
                id="printer-ip"
                className={inputClass}
                placeholder="192.168.1.50"
                value={settings.printer_ip}
                onChange={(e) => patch("printer_ip", e.target.value)}
                inputMode="decimal"
              />
            </div>
            <div>
              <label htmlFor="printer-device-id" className={labelClass}>
                Device ID
              </label>
              <input
                id="printer-device-id"
                className={inputClass}
                placeholder="local_printer"
                value={settings.printer_device_id}
                onChange={(e) => patch("printer_device_id", e.target.value)}
              />
            </div>
          </div>
        </section>
      )}

      {error && (
        <p role="alert" className="rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-md border-2 border-mustard bg-mustard/15 px-3 py-2.5 text-sm font-medium text-ink">
          {notice}
        </p>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-ink bg-paper/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md lg:sticky lg:inset-x-auto lg:bottom-0 lg:rounded-lg lg:border-2 lg:shadow-ticket">
        <div className="mx-auto flex max-w-5xl flex-wrap gap-2 sm:gap-3">
          <button
            onClick={() => void save()}
            disabled={busy}
            className="rounded-md bg-ink px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili disabled:opacity-40"
          >
            {busy ? "Working…" : "Save settings"}
          </button>
          <button
            onClick={() => void testStripe()}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
          >
            <CreditCard className="h-3.5 w-3.5" aria-hidden />
            <span className="hidden sm:inline">Test Stripe</span>
            <span className="sm:hidden">Stripe</span>
          </button>
          {(usesEmail || settings.notify_emails || settings.notify_email_cc) && (
            <button
              onClick={() => void testSmtp()}
              disabled={busy}
              className="flex items-center gap-1.5 rounded-md border-2 border-ink px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
            >
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Test SMTP</span>
              <span className="sm:hidden">SMTP</span>
            </button>
          )}
          <button
            onClick={() => void testPrint()}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
          >
            {usesEmail ? <Mail className="h-3.5 w-3.5" aria-hidden /> : <Printer className="h-3.5 w-3.5" aria-hidden />}
            <span className="hidden sm:inline">Test print</span>
            <span className="sm:hidden">Print</span>
          </button>
        </div>
      </div>
    </div>
  );
}
