import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { ModifierGroup, ModifierOption } from "../../lib/api-types";
import { dollarsToCents, formatCents } from "../../lib/money";

const inputClass =
  "w-full rounded-md border-2 border-ink/25 bg-cream px-2.5 py-1.5 text-sm text-ink placeholder:text-ink/35 focus:border-chili focus:outline-none";

function slug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 48);
}

function PriceField({ cents, onChange }: { cents: number; onChange: (cents: number) => void }) {
  const [text, setText] = useState((cents / 100).toFixed(2));
  useEffect(() => {
    setText((cents / 100).toFixed(2));
  }, [cents]);
  return (
    <input
      className={inputClass}
      inputMode="decimal"
      aria-label="Extra cost in dollars"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const next = dollarsToCents(e.target.value);
        if (next !== null) onChange(next);
      }}
      onBlur={() => setText((cents / 100).toFixed(2))}
    />
  );
}

function cloneGroups(groups: ModifierGroup[]): ModifierGroup[] {
  return groups.map((g) => ({
    ...g,
    options: g.options.map((o) => ({ ...o })),
  }));
}

type ModifierEditorProps = {
  groups: ModifierGroup[];
  templates: ModifierGroup[];
  onChange: (next: ModifierGroup[]) => void;
};

export default function ModifierEditor({ groups, templates, onChange }: ModifierEditorProps) {
  function patchGroup(index: number, next: ModifierGroup) {
    const copy = cloneGroups(groups);
    copy[index] = next;
    onChange(copy);
  }

  function removeGroup(index: number) {
    onChange(groups.filter((_, i) => i !== index));
  }

  function addTemplate(id: string) {
    if (id === "__custom") {
      onChange([
        ...groups,
        {
          id: `custom_${Date.now()}`,
          label: "New choice",
          required: true,
          min: 1,
          max: 1,
          options: [{ id: "option_1", label: "Option 1", price_cents: 0 }],
        },
      ]);
      return;
    }
    const t = templates.find((g) => g.id === id);
    if (!t || groups.some((g) => g.id === t.id)) return;
    onChange([...groups, { ...t, options: t.options.map((o) => ({ ...o })) }]);
  }

  function addOption(index: number) {
    const g = groups[index];
    const n = g.options.length + 1;
    patchGroup(index, {
      ...g,
      options: [...g.options, { id: `option_${n}`, label: `Option ${n}`, price_cents: 0 }],
    });
  }

  function patchOption(gi: number, oi: number, next: ModifierOption) {
    const g = groups[gi];
    const options = g.options.map((o, i) => (i === oi ? next : o));
    patchGroup(gi, { ...g, options });
  }

  const unused = templates.filter((t) => !groups.some((g) => g.id === t.id));

  return (
    <div className="mt-3 rounded-md border-2 border-ink/15 bg-paper p-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/60">
            Customizations
          </p>
          <p className="mt-0.5 text-[12px] text-ink/50">
            Egg style, toast, extras, and add-on prices. New items start with none.
          </p>
        </div>
        <label className="min-w-[12rem] flex-1 sm:flex-none">
          <span className="sr-only">Add customization</span>
          <select
            className={inputClass}
            value=""
            onChange={(e) => {
              if (e.target.value) addTemplate(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="">Add customization…</option>
            {unused.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
            <option value="__custom">Custom group…</option>
          </select>
        </label>
      </div>

      {groups.length === 0 ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/40">
          No extras — guests only pick this item
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {groups.map((group, gi) => (
            <li key={`${group.id}-${gi}`} className="rounded-md border border-ink/15 bg-cream/70 p-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className={`${inputClass} min-w-[8rem] flex-1`}
                  value={group.label}
                  aria-label="Customization name"
                  onChange={(e) => {
                    const label = e.target.value;
                    patchGroup(gi, {
                      ...group,
                      label,
                      id: group.id.startsWith("custom_") ? slug(label) || group.id : group.id,
                    });
                  }}
                />
                <label className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60">
                  <input
                    type="checkbox"
                    className="accent-chili"
                    checked={group.required !== false}
                    onChange={(e) =>
                      patchGroup(gi, {
                        ...group,
                        required: e.target.checked,
                        min: e.target.checked ? 1 : 0,
                      })
                    }
                  />
                  Required
                </label>
                <button
                  type="button"
                  onClick={() => removeGroup(gi)}
                  className="grid h-8 w-8 place-items-center rounded-md border border-ink/20 text-ink/50 hover:border-ember hover:text-ember"
                  aria-label={`Remove ${group.label}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
              <ul className="mt-2 space-y-1.5">
                {group.options.map((opt, oi) => (
                  <li key={`${opt.id}-${oi}`} className="grid grid-cols-[1fr_88px_32px] items-center gap-1.5">
                    <input
                      className={inputClass}
                      value={opt.label}
                      aria-label="Choice name"
                      onChange={(e) => {
                        const label = e.target.value;
                        patchOption(gi, oi, {
                          ...opt,
                          label,
                          id: slug(label) || opt.id,
                        });
                      }}
                    />
                    <PriceField
                      cents={opt.price_cents}
                      onChange={(cents) => patchOption(gi, oi, { ...opt, price_cents: cents })}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        patchGroup(gi, {
                          ...group,
                          options: group.options.filter((_, i) => i !== oi),
                        })
                      }
                      disabled={group.options.length <= 1}
                      className="grid h-8 w-8 place-items-center rounded-md border border-ink/20 text-ink/40 hover:border-ember hover:text-ember disabled:opacity-30"
                      aria-label={`Remove ${opt.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => addOption(gi)}
                className="mt-2 flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55 hover:text-ink"
              >
                <Plus className="h-3 w-3" aria-hidden />
                Add choice
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function modifierSummary(groups: ModifierGroup[] | undefined) {
  if (!groups || groups.length === 0) return "";
  return groups
    .map((g) => {
      const paid = g.options.filter((o) => o.price_cents > 0);
      if (paid.length === 0) return g.label;
      const extra = paid.map((o) => `${o.label} ${formatCents(o.price_cents)}`).join(", ");
      return `${g.label} (${extra})`;
    })
    .join(" · ");
}
