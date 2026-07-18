import Visit from "../sections/Visit";
import Patio from "../sections/Patio";
import { useRouteSeo } from "../hooks/usePageMeta";

export default function VisitPage() {
  useRouteSeo("/visit");
  return (
    <div className="pt-16">
      <Visit />
      <Patio />
    </div>
  );
}
