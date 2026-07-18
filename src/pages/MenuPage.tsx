import MenuSection from "../sections/MenuSection";
import CtaBand from "../sections/CtaBand";
import { useRouteSeo } from "../hooks/usePageMeta";

export default function MenuPage() {
  useRouteSeo("/menu");
  return (
    <div className="pt-16">
      <MenuSection />
      <CtaBand />
    </div>
  );
}
