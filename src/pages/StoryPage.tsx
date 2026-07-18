import Story from "../sections/Story";
import CtaBand from "../sections/CtaBand";
import { useRouteSeo } from "../hooks/usePageMeta";

export default function StoryPage() {
  useRouteSeo("/story");
  return (
    <div className="pt-16">
      <Story />
      <CtaBand />
    </div>
  );
}
