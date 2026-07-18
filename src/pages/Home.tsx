import Hero from "../sections/Hero";
import Marquee from "../sections/Marquee";
import Story from "../sections/Story";
import Slinger from "../sections/Slinger";
import MenuSection from "../sections/MenuSection";
import Gallery from "../sections/Gallery";
import Patio from "../sections/Patio";
import CtaBand from "../sections/CtaBand";
import Visit from "../sections/Visit";
import { useRouteSeo } from "../hooks/usePageMeta";

export default function Home() {
  useRouteSeo("/");
  return (
    <>
      <Hero />
      <Marquee />
      <Story />
      <Slinger />
      <MenuSection />
      <Gallery />
      <Patio />
      <CtaBand />
      <Visit />
    </>
  );
}
