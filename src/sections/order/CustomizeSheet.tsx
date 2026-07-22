import { useEffect, useMemo, useState } from "react";
import { X, Minus, Plus } from "lucide-react";
import type { ApiMenuItem, SelectedModifier } from "../../lib/api-types";
import {
  computeUnitPrice,
  defaultSelections,
  optionDisplayPriceCents,
  selectionsComplete,
} from "../../lib/order-cart";
import { formatCents } from "../../lib/money";

type CustomizeSheetProps = {
  item: ApiMenuItem;
  /** Prefill when editing an existing cart line. */
  initialModifiers?: SelectedModifier[];
  initialLineNote?: string;
  initialQty?: number;
  mode?: "add" | "edit";
  onClose: () => void;
  onConfirm: (payload: {
    modifiers: SelectedModifier[];
    line_note: string;
    qty: number;
    unit_price_cents: number;
  }) => void;
};

export default function CustomizeSheet({
  item,
  initialModifiers,
  initialLineNote = "",
  initialQty = 1,
  mode = "add",
  onClose,
  onConfirm,
}: CustomizeSheetProps) {
  const groups = item.modifier_groups ?? [];
  const [selections, setSelections] = useState<SelectedModifier[]>(
    () => initialModifiers ?? defaultSelections(item)
  );
  const [lineNote, setLineNote] = useState(initialLineNote);
  const [qty, setQty] = useState(initialQty);

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
  const modExtra = unitPrice - item.price_cents;
  const hasOptions = groups.length > 0;

  function selectSingle(groupId: string, optionId: string) {
    setSelections((prev) => {
      let next = [...prev.filter((s) => s.group_id !== groupId), { group_id: groupId, option_id: optionId }];
      // Clear egg style when switching biscuits back to plain.
      if (groupId === "biscuits_add" && optionId === "plain") {
        next = next.filter((s) => s.group_id !== "egg_style");
      }
      // Default egg style when adding eggs to biscuits.
      if (groupId === "biscuits_add" && optionId !== "plain") {
        if (!next.some((s) => s.group_id === "egg_style")) {
          next.push({ group_id: "egg_style", option_id: "over_easy" });
        }
      }
      return next;
    });
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

  const biscuitsPlain =
    selections.find((s) => s.group_id === "biscuits_add")?.option_id === "plain";

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
        {item.image && (
          <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-ink/5 sm:aspect-[5/3]">
            <img
              src={item.image}
              alt=""
              className="h-full w-full object-cover object-[center_40%] [filter:brightness(1.03)_contrast(1.06)_saturate(1.08)]"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" aria-hidden />
          </div>
        )}

        <div className="flex items-start justify-between gap-3 border-b-2 border-ink/15 px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-chili">
              {mode === "edit" ? "Edit item" : hasOptions ? "Customize" : "Details"}
            </p>
            <h2 id="customize-title" className="mt-1 font-display text-3xl uppercase tracking-[0.06em]">
              {item.name}
            </h2>
            <p className="mt-1 font-mono text-sm text-ink/55">
              Base {formatCents(item.price_cents)}
              {modExtra > 0 && <span className="text-chili"> + {formatCents(modExtra)} options</span>}
              <span className="text-ink/80"> · {formatCents(unitPrice)} each</span>
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
            // Hide egg style on biscuits until eggs are added.
            if (group.id === "egg_style" && groups.some((g) => g.id === "biscuits_add") && biscuitsPlain) {
              return null;
            }

            const multi = (group.max ?? 1) > 1;
            const selectedIds = new Set(
              selections.filter((s) => s.group_id === group.id).map((s) => s.option_id)
            );
            const selectedCount = selectedIds.size;
            const freeLeft =
              group.free_count != null ? Math.max(0, group.free_count - selectedCount) : null;

            return (
              <fieldset key={group.id}>
                <legend className="mb-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink/60">
                  {group.label}
                  {(group.required || (group.id === "egg_style" && !biscuitsPlain)) ? " *" : ""}
                  {group.free_count != null && (
                    <span className="ml-2 text-ink/40">
                      · {freeLeft === 0
                        ? "extras +$2.50 each"
                        : `${freeLeft} of ${group.free_count} included left`}
                    </span>
                  )}
                </legend>
                <div className={`grid gap-2 ${multi ? "sm:grid-cols-2" : ""}`}>
                  {group.options.map((opt) => {
                    const checked = selectedIds.has(opt.id);
                    const display = optionDisplayPriceCents(group, opt.id, selections);
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
                        <span
                          className={`shrink-0 font-mono text-[11px] ${
                            checked ? "text-mustard" : "text-ink/45"
                          }`}
                        >
                          {display === "included"
                            ? "Included"
                            : typeof display === "number"
                              ? `+${formatCents(display)}`
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
            {mode === "edit" ? "Update" : "Add"} · {formatCents(unitPrice * qty)}
          </button>
        </div>
      </div>
    </div>
  );
}
