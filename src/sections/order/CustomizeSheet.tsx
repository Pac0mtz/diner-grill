import { useEffect, useMemo, useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import type { ApiMenuItem, SelectedModifier } from "../../lib/api-types";
import {
  computeUnitPrice,
  defaultSelections,
  selectionsComplete,
} from "../../lib/order-cart";
import { formatCents } from "../../lib/money";

type CustomizeSheetProps = {
  item: ApiMenuItem;
  onClose: () => void;
  onConfirm: (payload: {
    modifiers: SelectedModifier[];
    line_note: string;
    qty: number;
    unit_price_cents: number;
  }) => void;
};

export default function CustomizeSheet({ item, onClose, onConfirm }: CustomizeSheetProps) {
  const groups = item.modifier_groups ?? [];
  const [selections, setSelections] = useState<SelectedModifier[]>(() => defaultSelections(item));
  const [lineNote, setLineNote] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const unitPrice = useMemo(() => computeUnitPrice(item, selections), [item, selections]);
  const complete = selectionsComplete(item, selections);

  function selectSingle(groupId: string, optionId: string) {
    setSelections((prev) => [
      ...prev.filter((s) => s.group_id !== groupId),
      { group_id: groupId, option_id: optionId },
    ]);
  }

  function toggleMulti(groupId: string, optionId: string, max: number) {
    setSelections((prev) => {
      const exists = prev.some((s) => s.group_id === groupId && s.option_id === optionId);
      if (exists) return prev.filter((s) => !(s.group_id === groupId && s.option_id === optionId));
      const count = prev.filter((s) => s.group_id === groupId).length;
      if (count >= max) return prev;
      return [...prev, { group_id: groupId, option_id: optionId }];
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/70 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl border-2 border-ink bg-paper shadow-ticket sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b-2 border-ink/15 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-chili">Customize</p>
            <h2 id="customize-title" className="mt-1 font-display text-3xl uppercase tracking-[0.06em]">
              {item.name}
            </h2>
            <p className="mt-1 font-mono text-sm text-ink/55">
              From {formatCents(item.price_cents)}
              {unitPrice !== item.price_cents && (
                <span className="text-chili"> → {formatCents(unitPrice)} each</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border-2 border-ink/20 p-2 text-ink/70 transition-colors hover:border-ink hover:text-ink"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
          {item.description && (
            <p className="text-sm leading-relaxed text-ink/60">{item.description}</p>
          )}

          {groups.map((group) => {
            const multi = (group.max ?? 1) > 1;
            const selectedIds = new Set(
              selections.filter((s) => s.group_id === group.id).map((s) => s.option_id)
            );
            return (
              <fieldset key={group.id}>
                <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
                  {group.label}
                  {group.required ? " *" : ""}
                  {group.free_count != null && (
                    <span className="ml-2 text-ink/40">
                      · first {group.free_count} included, extras +$2.50
                    </span>
                  )}
                </legend>
                <div className={`grid gap-2 ${multi ? "sm:grid-cols-2" : ""}`}>
                  {group.options.map((opt) => {
                    const checked = selectedIds.has(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-md border-2 px-3 py-2.5 text-sm transition-colors ${
                          checked
                            ? "border-ink bg-ink text-cream"
                            : "border-ink/15 bg-cream/70 text-ink hover:border-ink/40"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <input
                            type={multi ? "checkbox" : "radio"}
                            name={group.id}
                            checked={checked}
                            onChange={() =>
                              multi
                                ? toggleMulti(group.id, opt.id, group.max ?? 8)
                                : selectSingle(group.id, opt.id)
                            }
                            className="sr-only"
                          />
                          <span
                            aria-hidden
                            className={`grid h-4 w-4 shrink-0 place-items-center border-2 ${
                              multi ? "rounded-sm" : "rounded-full"
                            } ${checked ? "border-mustard bg-mustard" : "border-ink/40"}`}
                          >
                            {checked && <span className="h-1.5 w-1.5 rounded-full bg-ink" />}
                          </span>
                          {opt.label}
                        </span>
                        <span className={`shrink-0 font-mono text-[11px] ${checked ? "text-mustard" : "text-ink/45"}`}>
                          {opt.price_cents > 0 && !(group.free_count != null && selectedIds.size < (group.free_count || 0) && !checked)
                            ? `+${formatCents(opt.price_cents)}`
                            : opt.price_cents > 0 && group.free_count != null
                              ? `+${formatCents(opt.price_cents)}`
                              : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <div>
            <label htmlFor="line-note" className="mb-1 block font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
              Note for this item
            </label>
            <input
              id="line-note"
              value={lineNote}
              onChange={(e) => setLineNote(e.target.value.slice(0, 120))}
              placeholder="No onions, extra crispy…"
              className="w-full rounded-md border-2 border-ink/25 bg-cream px-3 py-2.5 text-sm text-ink placeholder:text-ink/35 focus:border-chili focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t-2 border-ink/15 bg-cream/50 px-5 py-4">
          <div className="flex items-center rounded-md border-2 border-ink bg-cream">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-10 w-10 place-items-center hover:bg-mustard"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center font-mono text-sm font-medium">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              className="grid h-10 w-10 place-items-center hover:bg-mustard"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            disabled={!complete}
            onClick={() =>
              onConfirm({
                modifiers: selections,
                line_note: lineNote.trim(),
                qty,
                unit_price_cents: unitPrice,
              })
            }
            className="flex-1 rounded-md bg-chili px-4 py-3 font-mono text-[12px] font-semibold uppercase tracking-[0.14em] text-cream shadow-ticket transition-colors hover:bg-ember disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add · {formatCents(unitPrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
