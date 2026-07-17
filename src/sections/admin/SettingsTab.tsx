import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { adminFetch, ApiError } from "./api";

type Settings = { printer_ip: string; printer_device_id: string };

type SettingsTabProps = {
  onUnauthorized: () => void;
};

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-chili focus:outline-none";

export default function SettingsTab({ onUnauthorized }: SettingsTabProps) {
  const [settings, setSettings] = useState<Settings>({ printer_ip: "", printer_device_id: "" });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await adminFetch<Settings>("/api/admin/settings");
        setSettings({
          printer_ip: data.printer_ip ?? "",
          printer_device_id: data.printer_device_id ?? "",
        });
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

  async function save() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminFetch<Settings>("/api/admin/settings", {
        method: "PUT",
        body: settings,
      });
      setSettings({
        printer_ip: data.printer_ip ?? "",
        printer_device_id: data.printer_device_id ?? "",
      });
      setNotice("Settings saved.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function testPrint() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const data = await adminFetch<{ message?: string }>("/api/admin/test-print", { method: "POST" });
      setNotice(data.message ?? "Test ticket queued.");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Test print failed.");
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

  return (
    <div className="max-w-xl">
      <section className="rounded-lg border-2 border-ink bg-paper p-6 shadow-ticket" aria-label="Receipt printer settings">
        <h3 className="font-display text-3xl uppercase tracking-[0.06em]">Receipt printer</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">
          The Epson TM printer on the restaurant network. The print agent on the
          counter computer polls for paid orders and prints them here.
        </p>

        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="printer-ip" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Printer IP address
            </label>
            <input
              id="printer-ip"
              className={inputClass}
              placeholder="192.168.1.50"
              value={settings.printer_ip}
              onChange={(e) => setSettings({ ...settings, printer_ip: e.target.value })}
              inputMode="decimal"
            />
          </div>
          <div>
            <label htmlFor="printer-device-id" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Device ID
            </label>
            <input
              id="printer-device-id"
              className={inputClass}
              placeholder="local_printer"
              value={settings.printer_device_id}
              onChange={(e) => setSettings({ ...settings, printer_device_id: e.target.value })}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 rounded-md border-2 border-mustard bg-mustard/15 px-3 py-2.5 text-sm font-medium text-ink">
            {notice}
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-md bg-ink px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili disabled:opacity-40"
          >
            {busy ? "Working…" : "Save settings"}
          </button>
          <button
            onClick={testPrint}
            disabled={busy}
            className="flex items-center gap-1.5 rounded-md border-2 border-ink px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-ink transition-colors hover:bg-ink hover:text-cream disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" aria-hidden />
            Test print
          </button>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase leading-relaxed tracking-[0.12em] text-ink/40">
          Test print queues a sample ticket — the print agent picks it up within a few seconds.
        </p>
      </section>
    </div>
  );
}
