import type { ComponentType, SVGProps } from "react";
import {
  EggFried,
  Sandwich,
  CookingPot,
  Egg,
  ChefHat,
  Layers,
  Ham,
  Bean,
  Utensils,
  Baby,
  IceCreamCone,
  Coffee,
} from "lucide-react";
import { MENU } from "../data/menu";

export type MenuSectionIcon = ComponentType<
  SVGProps<SVGSVGElement> & { size?: string | number }
>;

/** Unique icon per menu category — keeps tabs scannable at a glance. */
export const SECTION_ICONS: Record<string, MenuSectionIcon> = {
  breakfast: EggFried,
  "breakfast-sandwiches": Sandwich,
  skillets: CookingPot,
  omelettes: Egg,
  "chefs-creations": ChefHat,
  griddle: Layers,
  sandwiches: Ham,
  burritos: Bean,
  sides: Utensils,
  kids: Baby,
  desserts: IceCreamCone,
  drinks: Coffee,
};

/** Resolve an icon from an API / admin section label (matched to MENU). */
export function iconForSectionLabel(label: string): MenuSectionIcon {
  const key = label.trim().toLowerCase();
  const exact = MENU.find((c) => c.label.toLowerCase() === key);
  if (exact) return SECTION_ICONS[exact.id] ?? Utensils;

  if (key.includes("breakfast sandwich")) return SECTION_ICONS["breakfast-sandwiches"];
  if (key.includes("skillet")) return SECTION_ICONS.skillets;
  if (key.includes("omelette") || key.includes("omelet")) return SECTION_ICONS.omelettes;
  if (key.includes("chef")) return SECTION_ICONS["chefs-creations"];
  if (key.includes("pancake") || key.includes("waffle") || key.includes("french toast")) {
    return SECTION_ICONS.griddle;
  }
  if (key.includes("burrito")) return SECTION_ICONS.burritos;
  if (key.includes("sandwich") || key.includes("burger")) return SECTION_ICONS.sandwiches;
  if (key.includes("side")) return SECTION_ICONS.sides;
  if (key.includes("kid")) return SECTION_ICONS.kids;
  if (key.includes("dessert") || key.includes("ice cream")) return SECTION_ICONS.desserts;
  if (key.includes("drink") || key.includes("coffee") || key.includes("beverage")) {
    return SECTION_ICONS.drinks;
  }
  if (key.includes("breakfast")) return SECTION_ICONS.breakfast;

  return Utensils;
}
