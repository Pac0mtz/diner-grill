import { Routes, Route, Outlet } from "react-router";
import Navbar from "./sections/Navbar";
import Footer from "./sections/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import StoryPage from "./pages/StoryPage";
import MenuPage from "./pages/MenuPage";
import VisitPage from "./pages/VisitPage";

function Layout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/story" element={<StoryPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/visit" element={<VisitPage />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </>
  );
}
