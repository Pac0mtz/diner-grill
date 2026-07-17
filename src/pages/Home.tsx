import Hero from "../sections/Hero";
import Marquee from "../sections/Marquee";
import Story from "../sections/Story";
import Slinger from "../sections/Slinger";
import MenuSection from "../sections/MenuSection";
import Gallery from "../sections/Gallery";
import CtaBand from "../sections/CtaBand";
import Visit from "../sections/Visit";
import { usePageMeta } from "../hooks/usePageMeta";

export default function Home() {
  usePageMeta(
    "Diner Grill — Chicago's 24-Hour Diner Since 1937 | Home of the Slinger",
    "Diner Grill is Chicago's legendary 24-hour counter diner in Lakeview, serving scratch-made breakfast, burgers, skillets and the famous Slinger since 1937. Open 24 hours."
  );
  return (
    <>
      <Hero />
      <Marquee />
      <Story />
      <Slinger />
      <MenuSection />
      <Gallery />
      <CtaBand />
      <Visit />
    </>
  );
}
