import type { ComponentType, SVGProps } from "react";
import {
  EggFried,
  Sandwich,
  Flame,
  Egg,
  ChefHat,
  CakeSlice,
  Croissant,
  Hamburger,
  Wheat,
  Soup,
  Cookie,
  Dessert,
  CupSoda,
  UtensilsCrossed,
} from "lucide-react";
import { MENU } from "../data/menu";

export type MenuSectionIcon = ComponentType<
  SVGProps<SVGSVGElement> & { size?: string | number }
>;

/** Unique diner-style icon per menu category — scannable at a glance. */
export const SECTION_ICONS: Record<string, MenuSectionIcon> = {
  breakfast: EggFried,
  "breakfast-sandwiches": Sandwich,
  skillets: Flame,
  omelettes: Egg,
  "chefs-creations": ChefHat,
  "pancakes-waffles": CakeSlice,
  "french-toast": Croissant,
  sandwiches: Hamburger,
  burritos: Wheat,
  sides: Soup,
  kids: Cookie,
  desserts: Dessert,
  drinks: CupSoda,
};

/** Featured card image for each order-page section tab. */
export const SECTION_FEATURED: Record<string, string> = {
  breakfast: "/photos/breakfast/breakfast-bacon-eggs.webp",
  "breakfast-sandwiches": "/photos/breakfast-sandwiches/breakfast-bacon-egg.webp",
  skillets: "/photos/skillets/skillet-california.webp",
  omelettes: "/photos/omelettes/omelette-denver.webp",
  "chefs-creations": "/photos/chefs-creations/biscuits-gravy.webp",
  "pancakes-waffles": "/photos/pancakes-waffles/waffle-banana-nutella.webp",
  "french-toast": "/photos/french-toast/french-toast.webp",
  sandwiches: "/photos/sandwiches/cheeseburger.webp",
  burritos: "/photos/burritos/burrito-breakfast.webp",
  sides: "/photos/sides/fries.webp",
  kids: "/photos/kids/mickey-pancake.webp",
  desserts: "/photos/desserts/churros.webp",
  drinks: "/photos/drinks/soda-coke.webp",
};

function sectionIdFromLabel(label: string): string | null {
  const key = label.trim().toLowerCase();
  const exact = MENU.find((c) => c.label.toLowerCase() === key);
  if (exact) return exact.id;

  if (key.includes("breakfast sandwich")) return "breakfast-sandwiches";
  if (key.includes("skillet")) return "skillets";
  if (key.includes("omelette") || key.includes("omelet")) return "omelettes";
  if (key.includes("chef")) return "chefs-creations";
  if (key.includes("french toast")) return "french-toast";
  if (key.includes("pancake") || key.includes("waffle") || key.includes("griddle")) {
    return "pancakes-waffles";
  }
  if (key.includes("burrito")) return "burritos";
  if (key.includes("sandwich") || key.includes("burger")) return "sandwiches";
  if (key.includes("side")) return "sides";
  if (key.includes("kid")) return "kids";
  if (key.includes("dessert") || key.includes("ice cream") || key.includes("churro")) return "desserts";
  if (key.includes("drink") || key.includes("coffee") || key.includes("beverage")) return "drinks";
  if (key.includes("breakfast")) return "breakfast";
  return null;
}

/** Resolve an icon from an API / admin section label (matched to MENU). */
export function iconForSectionLabel(label: string): MenuSectionIcon {
  const id = sectionIdFromLabel(label);
  return (id && SECTION_ICONS[id]) || UtensilsCrossed;
}

/** Featured tab image — static map first, then first item photo in the section. */
export function featuredImageForSection(
  label: string,
  items?: Array<{ image?: string | null }>
): string | null {
  const id = sectionIdFromLabel(label);
  if (id && SECTION_FEATURED[id]) return SECTION_FEATURED[id];
  const fromItems = items?.find((i) => i.image)?.image;
  return fromItems || null;
}
