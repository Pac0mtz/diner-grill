// Online-order modifiers — resolved server-side so prices can't be spoofed.
// Groups are attached to menu items by section label + item name rules.

/**
 * @typedef {{ id: string, label: string, price_cents: number }} ModOption
 * @typedef {{
 *   id: string,
 *   label: string,
 *   required?: boolean,
 *   min?: number,
 *   max?: number,
 *   free_count?: number,
 *   options: ModOption[]
 * }} ModGroup
 */

/** @type {Record<string, ModGroup>} */
const GROUPS = {
  egg_style: {
    id: "egg_style",
    label: "Egg style",
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: "over_easy", label: "Over easy", price_cents: 0 },
      { id: "over_medium", label: "Over medium", price_cents: 0 },
      { id: "over_hard", label: "Over hard", price_cents: 0 },
      { id: "scrambled", label: "Scrambled", price_cents: 0 },
      { id: "sunny_side", label: "Sunny side up", price_cents: 0 },
      { id: "poached", label: "Poached", price_cents: 0 },
    ],
  },
  bread: {
    id: "bread",
    label: "Bread",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "white_toast", label: "White toast", price_cents: 0 },
      { id: "wheat_toast", label: "Wheat toast", price_cents: 0 },
      { id: "rye_toast", label: "Rye toast", price_cents: 0 },
      { id: "french_bread", label: "French bread", price_cents: 165 },
    ],
  },
  sandwich_bread: {
    id: "sandwich_bread",
    label: "Bread",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular bun / bread", price_cents: 0 },
      { id: "french_bread", label: "French bread", price_cents: 165 },
    ],
  },
  breakfast_sandwich_bread: {
    id: "breakfast_sandwich_bread",
    label: "Bread",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular", price_cents: 0 },
      { id: "french_bread", label: "French bread", price_cents: 165 },
    ],
  },
  chilaquiles_add: {
    id: "chilaquiles_add",
    label: "Add protein",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "none", label: "No add-on", price_cents: 0 },
      { id: "chorizo", label: "Chorizo", price_cents: 175 },
      { id: "chicken", label: "Chicken", price_cents: 215 },
      { id: "steak", label: "Steak", price_cents: 300 },
    ],
  },
  biscuits_add: {
    id: "biscuits_add",
    label: "Make it a plate",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "plain", label: "Just biscuits & gravy", price_cents: 0 },
      { id: "eggs", label: "Add 2 eggs", price_cents: 150 },
      { id: "eggs_meat", label: "Add 2 eggs & sausage or bacon", price_cents: 325 },
    ],
  },
  griddle_meat: {
    id: "griddle_meat",
    label: "Add meat",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "none", label: "No meat", price_cents: 0 },
      { id: "bacon_sausage", label: "Bacon or sausage", price_cents: 200 },
      { id: "ham", label: "Ham", price_cents: 300 },
    ],
  },
  short_stack_meat: {
    id: "short_stack_meat",
    label: "Add meat",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "none", label: "No meat", price_cents: 0 },
      { id: "meat", label: "Bacon, sausage or ham", price_cents: 125 },
    ],
  },
  french_toast_meat: {
    id: "french_toast_meat",
    label: "Add meat",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "none", label: "No meat", price_cents: 0 },
      { id: "bacon_sausage", label: "Bacon or sausage", price_cents: 150 },
      { id: "ham", label: "Ham", price_cents: 200 },
    ],
  },
  california_protein: {
    id: "california_protein",
    label: "Protein",
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: "steak", label: "Steak", price_cents: 0 },
      { id: "chicken", label: "Chicken", price_cents: 0 },
    ],
  },
  ice_cream: {
    id: "ice_cream",
    label: "Ice cream",
    required: true,
    min: 1,
    max: 1,
    options: [
      { id: "vanilla", label: "Vanilla", price_cents: 0 },
      { id: "strawberry", label: "Strawberry", price_cents: 0 },
    ],
  },
  size_soup: {
    id: "size_soup",
    label: "Size",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular", price_cents: 0 },
      { id: "large", label: "Large", price_cents: 50 },
    ],
  },
  size_chili: {
    id: "size_chili",
    label: "Size",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular", price_cents: 0 },
      { id: "large", label: "Large", price_cents: 125 },
    ],
  },
  size_coffee_go: {
    id: "size_coffee_go",
    label: "Size",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular", price_cents: 0 },
      { id: "large", label: "Large", price_cents: 25 },
    ],
  },
  size_soft: {
    id: "size_soft",
    label: "Size",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular", price_cents: 0 },
      { id: "large", label: "Large", price_cents: 25 },
    ],
  },
  size_juice: {
    id: "size_juice",
    label: "Size",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular", price_cents: 0 },
      { id: "large", label: "Large", price_cents: 30 },
    ],
  },
  size_milk: {
    id: "size_milk",
    label: "Size",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "regular", label: "Regular", price_cents: 0 },
      { id: "large", label: "Large", price_cents: 100 },
    ],
  },
  kids_meat: {
    id: "kids_meat",
    label: "Add meat",
    required: false,
    min: 0,
    max: 1,
    options: [
      { id: "none", label: "No meat", price_cents: 0 },
      { id: "bacon_sausage", label: "Bacon or sausage", price_cents: 200 },
    ],
  },
  byo_fillings: {
    id: "byo_fillings",
    label: "Fillings (first 4 included)",
    required: true,
    min: 1,
    max: 8,
    free_count: 4,
    options: [
      { id: "ham", label: "Ham", price_cents: 250 },
      { id: "bacon", label: "Bacon", price_cents: 250 },
      { id: "sausage", label: "Sausage", price_cents: 250 },
      { id: "chorizo", label: "Chorizo", price_cents: 250 },
      { id: "cheese", label: "Cheese", price_cents: 250 },
      { id: "swiss", label: "Swiss", price_cents: 250 },
      { id: "feta", label: "Feta", price_cents: 250 },
      { id: "onion", label: "Onion", price_cents: 250 },
      { id: "pepper", label: "Green pepper", price_cents: 250 },
      { id: "tomato", label: "Tomato", price_cents: 250 },
      { id: "mushroom", label: "Mushroom", price_cents: 250 },
      { id: "spinach", label: "Spinach", price_cents: 250 },
      { id: "broccoli", label: "Broccoli", price_cents: 250 },
    ],
  },
};

function cloneGroup(g) {
  return {
    ...g,
    options: g.options.map((o) => ({ ...o })),
  };
}

/**
 * Which modifier groups apply to this menu item.
 * @param {string} sectionLabel
 * @param {string} itemName
 * @returns {ModGroup[]}
 */
export function modifiersForItem(sectionLabel, itemName) {
  const section = String(sectionLabel || "").toLowerCase();
  const name = String(itemName || "").toLowerCase();
  /** @type {ModGroup[]} */
  const out = [];

  const isBreakfastFav = section.includes("breakfast favorite");
  const isSkillet = section.includes("skillet");
  const isOmelette = section.includes("omelette");
  const isBreakfastSand = section.includes("breakfast sandwich");
  const isSandwich = section === "sandwiches" || (section.includes("sandwich") && !isBreakfastSand);
  const isBurrito = section.includes("burrito");
  const isGriddle = section.includes("pancake") || section.includes("waffle") || section.includes("french toast") || section.includes("griddle");
  const isSides = section.includes("side");
  const isDrinks = section.includes("drink");
  const isKids = section.includes("kid");
  const isChef = section.includes("chef");

  if (isBreakfastFav || isSkillet || isOmelette) {
    out.push(cloneGroup(GROUPS.egg_style));
  }
  if (isBreakfastFav || isSkillet || isOmelette) {
    out.push(cloneGroup(GROUPS.bread));
  }
  if (isBreakfastSand) {
    if (!name.includes("cheese") || name.includes("egg")) {
      out.push(cloneGroup(GROUPS.egg_style));
    }
    out.push(cloneGroup(GROUPS.breakfast_sandwich_bread));
  }
  if (isSandwich) {
    out.push(cloneGroup(GROUPS.sandwich_bread));
  }
  if (isOmelette && name.includes("build your own")) {
    // Replace generic egg/bread still useful; BYO fillings are the main choice.
    out.push(cloneGroup(GROUPS.byo_fillings));
  }
  if (isChef) {
    if (name.includes("slinger") || name.includes("haystack")) {
      out.push(cloneGroup(GROUPS.egg_style));
    }
    if (name.includes("chilaquiles")) {
      out.push(cloneGroup(GROUPS.egg_style));
      out.push(cloneGroup(GROUPS.chilaquiles_add));
    }
    if (name.includes("biscuit")) {
      out.push(cloneGroup(GROUPS.biscuits_add));
    }
  }
  if (isBurrito && name.includes("california")) {
    out.push(cloneGroup(GROUPS.california_protein));
  }
  if (isGriddle) {
    if (name.includes("alaskan")) {
      out.push(cloneGroup(GROUPS.ice_cream));
    }
    if (name === "pancakes (3)" || name.includes("choco chip pancakes") || name === "french toast") {
      if (name.includes("french")) out.push(cloneGroup(GROUPS.french_toast_meat));
      else if (!name.includes("short")) out.push(cloneGroup(GROUPS.griddle_meat));
    }
    if (name.includes("short stack") && !name.includes("choco")) {
      out.push(cloneGroup(GROUPS.short_stack_meat));
    }
    if (name === "french toast") {
      // already handled
    }
  }
  if (isSides) {
    if (name === "soup") out.push(cloneGroup(GROUPS.size_soup));
    if (name === "chili") out.push(cloneGroup(GROUPS.size_chili));
  }
  if (isDrinks) {
    if (name.includes("coffee to go")) out.push(cloneGroup(GROUPS.size_coffee_go));
    if (name === "soft drinks") out.push(cloneGroup(GROUPS.size_soft));
    if (name === "juice") out.push(cloneGroup(GROUPS.size_juice));
    if (name === "milk") out.push(cloneGroup(GROUPS.size_milk));
  }
  if (isKids && name.includes("mickey")) {
    out.push(cloneGroup(GROUPS.kids_meat));
  }

  // Deduplicate by group id (BYO may have pushed egg+bread earlier).
  const seen = new Set();
  return out.filter((g) => {
    if (seen.has(g.id)) return false;
    seen.add(g.id);
    return true;
  });
}

/**
 * Validate client selections and compute unit price.
 * @returns {{ ok: true, unit_price_cents: number, modifiers: object[], name_suffix: string } | { ok: false, error: string }}
 */
export function priceLineWithModifiers(item, sectionLabel, selections) {
  const groups = modifiersForItem(sectionLabel, item.name);
  const picked = Array.isArray(selections) ? selections : [];
  const resolved = [];

  for (const group of groups) {
    const chosenIds = picked
      .filter((s) => s && s.group_id === group.id)
      .map((s) => String(s.option_id));
    const unique = [...new Set(chosenIds)];
    const min = group.min ?? (group.required ? 1 : 0);
    const max = group.max ?? 1;

    if (unique.length < min) {
      return { ok: false, error: `Choose ${group.label.toLowerCase()} for ${item.name}.` };
    }
    if (unique.length > max) {
      return { ok: false, error: `Too many choices for ${group.label}.` };
    }

    const opts = [];
    for (const oid of unique) {
      const opt = group.options.find((o) => o.id === oid);
      if (!opt) return { ok: false, error: `Invalid option for ${group.label}.` };
      opts.push(opt);
    }

    if (group.free_count != null && group.free_count >= 0) {
      // First N fillings included in base price; extras charged at option price.
      opts.forEach((opt, i) => {
        const charge = i < group.free_count ? 0 : opt.price_cents;
        resolved.push({
          group_id: group.id,
          group_label: group.label,
          option_id: opt.id,
          label: opt.label,
          price_cents: charge,
        });
      });
    } else {
      for (const opt of opts) {
        // Skip zero-dollar "none"/"regular" noise on the ticket unless it's the only signal.
        resolved.push({
          group_id: group.id,
          group_label: group.label,
          option_id: opt.id,
          label: opt.label,
          price_cents: opt.price_cents,
        });
      }
    }
  }

  // Reject unknown group_ids from client.
  for (const s of picked) {
    if (!s || !s.group_id) continue;
    if (!groups.some((g) => g.id === s.group_id)) {
      return { ok: false, error: `Unknown modifier group for ${item.name}.` };
    }
  }

  const modTotal = resolved.reduce((sum, m) => sum + m.price_cents, 0);
  const printable = resolved.filter((m) => {
    if (m.price_cents > 0) return true;
    // Always print egg style, protein, ice cream, BYO fillings.
    return ["egg_style", "california_protein", "ice_cream", "byo_fillings"].includes(m.group_id)
      || !["none", "regular", "plain", "white_toast"].includes(m.option_id);
  });

  const name_suffix = printable.map((m) => m.label).join(", ");

  return {
    ok: true,
    unit_price_cents: item.price_cents + modTotal,
    modifiers: printable,
    name_suffix,
  };
}

/** Attach modifier_groups onto each item for GET /api/menu. */
export function attachModifiersToSections(sections) {
  return sections.map((s) => ({
    ...s,
    items: (s.items || []).map((item) => ({
      ...item,
      modifier_groups: modifiersForItem(s.label, item.name),
    })),
  }));
}
