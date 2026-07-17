import Visit from "../sections/Visit";
import { usePageMeta } from "../hooks/usePageMeta";

export default function VisitPage() {
  usePageMeta(
    "Visit — Open 24 Hours at 1635 W Irving Park Rd | Diner Grill, Chicago",
    "Find Diner Grill at 1635 W Irving Park Rd, Chicago, IL 60613. Open 24 hours, 365 days. Counter seating, garden patio, call (773) 248-2030."
  );
  return (
    <div className="pt-16">
      <Visit />
    </div>
  );
}
