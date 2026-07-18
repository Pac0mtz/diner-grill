import type { ApiMenuItem, ModifierGroup, ModifierOption, SelectedModifier } from "./api-types";

export type CartLine = {
  key: string;
  item: ApiMenuItem;
  qty: number;
  /** Selected options (group_id + option_id). */
  modifiers: SelectedModifier[];
  line_note: string;
  /** Base + modifier deltas (per unit). */
  unit_price_cents: number;
};

export function newLineKey(): string {
  return `L-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function optionById(group: ModifierGroup, optionId: string): ModifierOption | undefined {
  return group.options.find((o) => o.id === optionId);
}

/** Compute unit price from item + selections (mirrors server free_count rules). */
export function computeUnitPrice(item: ApiMenuItem, selections: SelectedModifier[]): number {
  const groups = item.modifier_groups ?? [];
  let extra = 0;
  for (const group of groups) {
    const chosen = selections.filter((s) => s.group_id === group.id);
    if (group.free_count != null) {
      chosen.forEach((sel, i) => {
        const opt = optionById(group, sel.option_id);
        if (!opt) return;
        if (i >= group.free_count!) extra += opt.price_cents;
      });
    } else {
      for (const sel of chosen) {
        const opt = optionById(group, sel.option_id);
        if (opt) extra += opt.price_cents;
      }
    }
  }
  return item.price_cents + extra;
}

/** Human-readable modifier summary for cart lines. */
export function formatModifierSummary(item: ApiMenuItem, selections: SelectedModifier[]): string {
  const groups = item.modifier_groups ?? [];
  const parts: string[] = [];
  for (const group of groups) {
    const chosen = selections.filter((s) => s.group_id === group.id);
    for (const sel of chosen) {
      const opt = optionById(group, sel.option_id);
      if (!opt) continue;
      if (["none", "regular", "plain"].includes(opt.id) && opt.price_cents === 0) continue;
      parts.push(opt.price_cents > 0 ? `${opt.label} (+$${(opt.price_cents / 100).toFixed(2)})` : opt.label);
    }
  }
  return parts.join(" · ");
}

export function selectionsComplete(item: ApiMenuItem, selections: SelectedModifier[]): boolean {
  for (const group of item.modifier_groups ?? []) {
    const count = selections.filter((s) => s.group_id === group.id).length;
    const min = group.min ?? (group.required ? 1 : 0);
    const max = group.max ?? 1;
    if (count < min || count > max) return false;
  }
  return true;
}

/** Default selections for required single-choice groups. */
export function defaultSelections(item: ApiMenuItem): SelectedModifier[] {
  const out: SelectedModifier[] = [];
  for (const group of item.modifier_groups ?? []) {
    const min = group.min ?? (group.required ? 1 : 0);
    if (min >= 1 && (group.max ?? 1) === 1 && group.options[0]) {
      // Prefer a sensible default when present.
      const preferred =
        group.options.find((o) => o.id === "over_easy") ||
        group.options.find((o) => o.id === "steak") ||
        group.options.find((o) => o.id === "vanilla") ||
        group.options.find((o) => o.id === "regular" || o.id === "plain" || o.id === "none") ||
        group.options[0];
      out.push({ group_id: group.id, option_id: preferred.id });
    }
  }
  return out;
}

export function itemNeedsCustomize(item: ApiMenuItem): boolean {
  const groups = item.modifier_groups ?? [];
  if (groups.length === 0) return false;
  // Always open sheet when there are choices (even optional paid ones).
  return true;
}
