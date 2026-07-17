import { Routes, Route, Outlet } from "react-router";
import Navbar from "./sections/Navbar";
import Footer from "./sections/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import StoryPage from "./pages/StoryPage";
import MenuPage from "./pages/MenuPage";
import VisitPage from "./pages/VisitPage";
import OrderPage from "./pages/OrderPage";
import AdminPage from "./pages/AdminPage";

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
          <Route path="/order" element={<OrderPage />} />
          <Route path="*" element={<Home />} />
        </Route>
        {/* Admin stands alone — no public navbar/footer, not linked in nav. */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  );
}
