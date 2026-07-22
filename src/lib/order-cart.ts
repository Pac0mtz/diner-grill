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

const SKIP_SUMMARY_IDS = new Set(["none", "regular", "plain", "white_toast"]);

export function newLineKey(): string {
  return `L-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function optionById(group: ModifierGroup, optionId: string): ModifierOption | undefined {
  return group.options.find((o) => o.id === optionId);
}

function biscuitsNeedsEggStyle(selections: SelectedModifier[]): boolean {
  const choice = selections.find((s) => s.group_id === "biscuits_add");
  if (!choice) return false;
  return choice.option_id !== "plain";
}

/** Charged price for one option given current multi-select (free_count aware). */
export function optionDisplayPriceCents(
  group: ModifierGroup,
  optionId: string,
  selections: SelectedModifier[]
): number | "included" | null {
  const opt = optionById(group, optionId);
  if (!opt || opt.price_cents <= 0) return null;
  if (group.free_count == null) return opt.price_cents;

  const chosen = selections
    .filter((s) => s.group_id === group.id)
    .map((s) => optionById(group, s.option_id))
    .filter((o): o is ModifierOption => Boolean(o));

  const isSelected = selections.some((s) => s.group_id === group.id && s.option_id === optionId);
  if (!isSelected) {
    // Preview: if under free_count, next pick is included.
    if (chosen.length < group.free_count) return "included";
    return opt.price_cents;
  }

  // Selected: cheapest N are included (mirrors server).
  const sorted = [...chosen].sort(
    (a, b) => a.price_cents - b.price_cents || a.id.localeCompare(b.id)
  );
  const freeIds = new Set(sorted.slice(0, group.free_count).map((o) => o.id));
  return freeIds.has(optionId) ? "included" : opt.price_cents;
}

/** Compute unit price from item + selections (mirrors server free_count rules). */
export function computeUnitPrice(item: ApiMenuItem, selections: SelectedModifier[]): number {
  const groups = item.modifier_groups ?? [];
  let extra = 0;
  for (const group of groups) {
    const chosen = selections
      .filter((s) => s.group_id === group.id)
      .map((s) => optionById(group, s.option_id))
      .filter((o): o is ModifierOption => Boolean(o));

    if (group.free_count != null) {
      const sorted = [...chosen].sort(
        (a, b) => a.price_cents - b.price_cents || a.id.localeCompare(b.id)
      );
      sorted.forEach((opt, i) => {
        if (i >= group.free_count!) extra += opt.price_cents;
      });
    } else {
      for (const opt of chosen) extra += opt.price_cents;
    }
  }
  return item.price_cents + extra;
}

/** Human-readable modifier summary for cart lines (aligned with kitchen ticket skips). */
export function formatModifierSummary(item: ApiMenuItem, selections: SelectedModifier[]): string {
  const groups = item.modifier_groups ?? [];
  const parts: string[] = [];
  for (const group of groups) {
    const chosen = selections
      .filter((s) => s.group_id === group.id)
      .map((s) => optionById(group, s.option_id))
      .filter((o): o is ModifierOption => Boolean(o));

    let chargedIds = new Set<string>();
    if (group.free_count != null) {
      const sorted = [...chosen].sort(
        (a, b) => a.price_cents - b.price_cents || a.id.localeCompare(b.id)
      );
      chargedIds = new Set(sorted.slice(group.free_count).map((o) => o.id));
    }

    for (const opt of chosen) {
      if (SKIP_SUMMARY_IDS.has(opt.id) && opt.price_cents === 0) continue;
      const alwaysShow = [
        "egg_style",
        "california_protein",
        "ice_cream",
        "byo_fillings",
        "soft_flavor",
        "juice_flavor",
        "milkshake_flavor",
        "wing_sauce",
        "wing_dip",
        "catfish_style",
        "steak_temp",
        "churro_dip",
      ].includes(group.id);
      if (!alwaysShow && SKIP_SUMMARY_IDS.has(opt.id)) continue;

      const charged =
        group.free_count != null
          ? chargedIds.has(opt.id)
            ? opt.price_cents
            : 0
          : opt.price_cents;
      parts.push(charged > 0 ? `${opt.label} (+$${(charged / 100).toFixed(2)})` : opt.label);
    }
  }
  return parts.join(" · ");
}

export function selectionsComplete(item: ApiMenuItem, selections: SelectedModifier[]): boolean {
  const needsBiscuitEgg = biscuitsNeedsEggStyle(selections);
  const hasBiscuits = (item.modifier_groups ?? []).some((g) => g.id === "biscuits_add");

  for (const group of item.modifier_groups ?? []) {
    const count = selections.filter((s) => s.group_id === group.id).length;
    let min = group.min ?? (group.required ? 1 : 0);
    const max = group.max ?? 1;
    if (group.id === "egg_style" && hasBiscuits) {
      min = needsBiscuitEgg ? 1 : 0;
    }
    if (count < min || count > max) return false;
  }
  return true;
}

/** Default selections for single-choice groups (required + sensible optional defaults). */
export function defaultSelections(item: ApiMenuItem): SelectedModifier[] {
  const out: SelectedModifier[] = [];
  for (const group of item.modifier_groups ?? []) {
    if ((group.max ?? 1) !== 1 || !group.options[0]) continue;
    const min = group.min ?? (group.required ? 1 : 0);
    const preferred =
      group.options.find((o) => o.id === "over_easy") ||
      group.options.find((o) => o.id === "medium") ||
      group.options.find((o) => o.id === "grilled") ||
      group.options.find((o) => o.id === "steak") ||
      group.options.find((o) => o.id === "chocolate") ||
      group.options.find((o) => o.id === "vanilla") ||
      group.options.find((o) => o.id === "buffalo") ||
      group.options.find((o) => o.id === "ranch") ||
      group.options.find((o) => o.id === "strawberry") ||
      group.options.find((o) => o.id === "coke") ||
      group.options.find((o) => o.id === "orange") ||
      group.options.find((o) => o.id === "white_toast") ||
      group.options.find((o) => o.id === "regular" || o.id === "plain" || o.id === "none") ||
      group.options[0];

    // Always preselect single-choice groups so tickets are explicit (size, bread, etc.).
    if (min >= 1 || preferred.price_cents === 0) {
      out.push({ group_id: group.id, option_id: preferred.id });
    }
  }
  return out;
}

export function itemNeedsCustomize(item: ApiMenuItem): boolean {
  return (item.modifier_groups ?? []).length > 0;
}

/** True when item has any paid modifier option (show “from $X”). */
export function itemHasPaidOptions(item: ApiMenuItem): boolean {
  return (item.modifier_groups ?? []).some((g) => g.options.some((o) => o.price_cents > 0));
}

/** Stable compare for merging identical custom lines. */
export function sameCustomConfig(a: CartLine, b: Omit<CartLine, "key" | "qty" | "unit_price_cents">): boolean {
  if (a.item.id !== b.item.id) return false;
  if ((a.line_note || "") !== (b.line_note || "")) return false;
  if (a.modifiers.length !== b.modifiers.length) return false;
  const key = (m: SelectedModifier) => `${m.group_id}:${m.option_id}`;
  const aKeys = a.modifiers.map(key).sort().join("|");
  const bKeys = b.modifiers.map(key).sort().join("|");
  return aKeys === bKeys;
}
