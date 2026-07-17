import Story from "../sections/Story";
import CtaBand from "../sections/CtaBand";
import { usePageMeta } from "../hooks/usePageMeta";

export default function StoryPage() {
  usePageMeta(
    "Our Story — Built. Broken. Rebuilt. | Diner Grill, Chicago",
    "From a 1937 trolley-car diner to the Christmas Eve fire of 2016 and the 2018 rebuild — the eight-decade story of Chicago's Diner Grill on Irving Park Road."
  );
  return (
    <div className="pt-16">
      <Story />
      <CtaBand />
    </div>
  );
}
