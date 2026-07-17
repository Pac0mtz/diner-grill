import MenuSection from "../sections/MenuSection";
import CtaBand from "../sections/CtaBand";
import { usePageMeta } from "../hooks/usePageMeta";

export default function MenuPage() {
  usePageMeta(
    "Menu — Breakfast, Skillets, Burgers & the Slinger | Diner Grill, Chicago",
    "Full Diner Grill menu: all-day breakfast, omelettes, skillets, pancakes, thin griddled burgers and the famous Slinger. Served 24 hours in Lakeview, Chicago."
  );
  return (
    <div className="pt-16">
      <MenuSection />
      <CtaBand />
    </div>
  );
}
