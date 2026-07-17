import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { AdminItem, AdminSection } from "../../lib/api-types";
import { dollarsToCents, formatCents } from "../../lib/money";
import { adminFetch, ApiError } from "./api";

export type AdminMenuSection = AdminSection & { items: AdminItem[] };

type MenuTabProps = {
  onUnauthorized: () => void;
};

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-2.5 py-2 text-sm text-ink placeholder:text-ink/35 focus:border-chili focus:outline-none";
const labelClass = "mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55";

function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

/* ------------------------------------------------------------------ */
/* Item row (view / inline edit)                                       */
/* ------------------------------------------------------------------ */

function ItemRow({
  item,
  onSaved,
  onUnauthorized,
}: {
  item: AdminItem;
  onSaved: () => void;
  onUnauthorized: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(centsToDollars(item.price_cents));
  const [description, setDescription] = useState(item.description ?? "");
  const [tag, setTag] = useState(item.tag ?? "");
  const [sort, setSort] = useState(String(item.sort));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setName(item.name);
    setPrice(centsToDollars(item.price_cents));
    setDescription(item.description ?? "");
    setTag(item.tag ?? "");
    setSort(String(item.sort));
    setError(null);
    setEditing(true);
  }

  async function handleError(err: unknown) {
    if (err instanceof ApiError && err.status === 401) {
      onUnauthorized();
      return true;
    }
    setError(err instanceof Error ? err.message : "Save failed.");
    return false;
  }

  async function save() {
    const cents = dollarsToCents(price);
    if (!name.trim()) return setError("Name is required.");
    if (cents === null) return setError("Price must be a valid dollar amount.");
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/items/${item.id}`, {
        method: "PUT",
        body: {
          name: name.trim(),
          price_cents: cents,
          description: description.trim() || null,
          tag: tag || null,
          sort: Number(sort) || 0,
        },
      });
      setEditing(false);
      onSaved();
    } catch (err) {
      await handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailable() {
    setBusy(true);
    try {
      await adminFetch(`/api/admin/items/${item.id}`, {
        method: "PUT",
        body: { available: item.available ? 0 : 1 },
      });
      onSaved();
    } catch (err) {
      await handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/items/${item.id}`, { method: "DELETE" });
      onSaved();
    } catch (err) {
      await handleError(err);
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <li className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2.5 ${item.available ? "border-ink/15 bg-cream/60" : "border-ink/10 bg-ink/5 opacity-60"}`}>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">
            {item.name}
            {item.tag && (
              <span className="ml-2 rounded-sm bg-ink px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-cream">
                {item.tag}
              </span>
            )}
          </span>
          {item.description && (
            <span className="block truncate text-xs text-ink/55">{item.description}</span>
          )}
        </span>
        <span className="font-mono text-sm text-chili">{formatCents(item.price_cents)}</span>
        <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60">
          <input
            type="checkbox"
            checked={!!item.available}
            onChange={toggleAvailable}
            disabled={busy}
            className="h-4 w-4 accent-chili"
          />
          On menu
        </label>
        <button
          onClick={startEdit}
          className="grid h-8 w-8 place-items-center rounded-md border border-ink/25 text-ink/60 transition-colors hover:border-ink hover:text-ink"
          aria-label={`Edit ${item.name}`}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="grid h-8 w-8 place-items-center rounded-md border border-ink/25 text-ink/60 transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
          aria-label={`Delete ${item.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-md border-2 border-ink bg-cream p-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
        <div>
          <label className={labelClass} htmlFor={`item-name-${item.id}`}>Name</label>
          <input id={`item-name-${item.id}`} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className={labelClass} htmlFor={`item-price-${item.id}`}>Price $</label>
          <input id={`item-price-${item.id}`} className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
        </div>
      </div>
      <div className="mt-2">
        <label className={labelClass} htmlFor={`item-desc-${item.id}`}>Description</label>
        <input id={`item-desc-${item.id}`} className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_80px]">
        <div>
          <label className={labelClass} htmlFor={`item-tag-${item.id}`}>Tag</label>
          <select id={`item-tag-${item.id}`} className={inputClass} value={tag} onChange={(e) => setTag(e.target.value)}>
            <option value="">None</option>
            <option value="signature">Signature</option>
            <option value="popular">Popular</option>
            <option value="new">New</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor={`item-sort-${item.id}`}>Sort</label>
          <input id={`item-sort-${item.id}`} className={inputClass} value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" />
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-ember">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-ink px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili disabled:opacity-40"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={busy}
          className="rounded-md border-2 border-ink/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* New item form                                                       */
/* ------------------------------------------------------------------ */

function NewItemForm({
  sectionId,
  onSaved,
  onUnauthorized,
}: {
  sectionId: number;
  onSaved: () => void;
  onUnauthorized: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    const cents = dollarsToCents(price);
    if (!name.trim()) return setError("Name is required.");
    if (cents === null) return setError("Price must be a valid dollar amount.");
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/items", {
        method: "POST",
        body: {
          section_id: sectionId,
          name: name.trim(),
          price_cents: cents,
          description: description.trim() || null,
          tag: tag || null,
          sort: 999,
        },
      });
      setName("");
      setPrice("");
      setDescription("");
      setTag("");
      setOpen(false);
      onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 rounded-md border-2 border-dashed border-ink/35 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add item
      </button>
    );
  }

  return (
    <div className="mt-3 rounded-md border-2 border-dashed border-ink/40 bg-cream/70 p-3">
      <p className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/60">New item</p>
      <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
        <input className={inputClass} placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} aria-label="New item name" />
        <input className={inputClass} placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" aria-label="New item price in dollars" />
      </div>
      <input className={`${inputClass} mt-2`} placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} aria-label="New item description" />
      <select className={`${inputClass} mt-2`} value={tag} onChange={(e) => setTag(e.target.value)} aria-label="New item tag">
        <option value="">No tag</option>
        <option value="signature">Signature</option>
        <option value="popular">Popular</option>
        <option value="new">New</option>
      </select>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-ember">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={create}
          disabled={busy}
          className="rounded-md bg-chili px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember disabled:opacity-40"
        >
          {busy ? "Adding…" : "Add item"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-md border-2 border-ink/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section card                                                        */
/* ------------------------------------------------------------------ */

function SectionCard({
  section,
  onChanged,
  onUnauthorized,
}: {
  section: AdminMenuSection;
  onChanged: () => void;
  onUnauthorized: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(section.label);
  const [note, setNote] = useState(section.note ?? "");
  const [sort, setSort] = useState(String(section.sort));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!label.trim()) return setError("Label is required.");
    setBusy(true);
    setError(null);
    try {
      await adminFetch(`/api/admin/sections/${section.id}`, {
        method: "PUT",
        body: { label: label.trim(), note: note.trim() || null, sort: Number(sort) || 0 },
      });
      setEditing(false);
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (
      !window.confirm(
        `Delete section “${section.label}” and its ${section.items.length} items? This cannot be undone.`
      )
    )
      return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/sections/${section.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border-2 border-ink bg-paper p-5 shadow-ticket md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink/80 pb-4">
        {editing ? (
          <div className="w-full space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_90px]">
              <div>
                <label className={labelClass} htmlFor={`sec-label-${section.id}`}>Label</label>
                <input id={`sec-label-${section.id}`} className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor={`sec-sort-${section.id}`}>Sort</label>
                <input id={`sec-sort-${section.id}`} className={inputClass} value={sort} onChange={(e) => setSort(e.target.value)} inputMode="numeric" />
              </div>
            </div>
            <div>
              <label className={labelClass} htmlFor={`sec-note-${section.id}`}>Note</label>
              <input id={`sec-note-${section.id}`} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {error && <p role="alert" className="text-xs font-medium text-ember">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={busy}
                className="rounded-md bg-ink px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-chili disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save section"}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={busy}
                className="rounded-md border-2 border-ink/25 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <h3 className="font-display text-3xl uppercase tracking-[0.06em]">{section.label}</h3>
              {section.note && (
                <p className="mt-1 max-w-lg font-mono text-[11px] uppercase leading-relaxed tracking-[0.1em] text-ink/50">
                  {section.note}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
                sort {section.sort} · {section.items.length} items
              </span>
              <button
                onClick={() => {
                  setLabel(section.label);
                  setNote(section.note ?? "");
                  setSort(String(section.sort));
                  setError(null);
                  setEditing(true);
                }}
                className="grid h-8 w-8 place-items-center rounded-md border border-ink/25 text-ink/60 transition-colors hover:border-ink hover:text-ink"
                aria-label={`Edit section ${section.label}`}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                onClick={remove}
                disabled={busy}
                className="grid h-8 w-8 place-items-center rounded-md border border-ink/25 text-ink/60 transition-colors hover:border-ember hover:text-ember disabled:opacity-40"
                aria-label={`Delete section ${section.label}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {section.items.map((item) => (
          <ItemRow key={item.id} item={item} onSaved={onChanged} onUnauthorized={onUnauthorized} />
        ))}
        {section.items.length === 0 && (
          <li className="py-3 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-ink/40">
            No items yet
          </li>
        )}
      </ul>
      <NewItemForm sectionId={section.id} onSaved={onChanged} onUnauthorized={onUnauthorized} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Menu tab                                                            */
/* ------------------------------------------------------------------ */

export default function MenuTab({ onUnauthorized }: MenuTabProps) {
  const [sections, setSections] = useState<AdminMenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [newNote, setNewNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await adminFetch<{ sections: AdminMenuSection[] }>("/api/admin/menu");
      setSections(data.sections);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "Could not load menu.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function addSection() {
    if (!newLabel.trim()) return setError("Section label is required.");
    setBusy(true);
    setError(null);
    try {
      await adminFetch("/api/admin/sections", {
        method: "POST",
        body: {
          label: newLabel.trim(),
          note: newNote.trim() || null,
          sort: sections.length ? Math.max(...sections.map((s) => s.sort)) + 1 : 0,
        },
      });
      setNewLabel("");
      setNewNote("");
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof Error ? err.message : "Create failed.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <p className="py-16 text-center font-mono text-[12px] uppercase tracking-[0.2em] text-ink/45">
        Loading menu…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <p role="alert" className="rounded-md border-2 border-ember/60 bg-ember/10 px-3 py-2.5 text-sm font-medium text-ember">
          {error}
        </p>
      )}

      {sections.map((s) => (
        <SectionCard key={s.id} section={s} onChanged={load} onUnauthorized={onUnauthorized} />
      ))}

      {/* new section */}
      <div className="rounded-lg border-2 border-dashed border-ink/40 bg-paper/60 p-5">
        <h3 className="font-display text-2xl uppercase tracking-[0.06em] text-ink/70">New section</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className={inputClass}
            placeholder="Section label (e.g. Shakes)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            aria-label="New section label"
          />
          <input
            className={inputClass}
            placeholder="Note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            aria-label="New section note"
          />
        </div>
        <button
          onClick={addSection}
          disabled={busy || !newLabel.trim()}
          className="mt-3 flex items-center gap-1.5 rounded-md bg-chili px-4 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cream transition-colors hover:bg-ember disabled:opacity-40"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          {busy ? "Adding…" : "Add section"}
        </button>
      </div>
    </div>
  );
}
