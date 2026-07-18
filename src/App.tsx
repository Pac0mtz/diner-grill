import { Routes, Route, Outlet } from "react-router";
import Navbar from "./sections/Navbar";
import Footer from "./sections/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import StoryPage from "./pages/StoryPage";
import MenuPage from "./pages/MenuPage";
import VisitPage from "./pages/VisitPage";
import GalleryPage from "./pages/GalleryPage";
import ReviewsPage from "./pages/ReviewsPage";
import OrderPage from "./pages/OrderPage";
import AdminPage from "./pages/AdminPage";
import NotFoundPage from "./pages/NotFoundPage";
import AccountPage from "./pages/account/AccountPage";
import AccountLoginPage from "./pages/account/AccountLoginPage";
import AccountRegisterPage from "./pages/account/AccountRegisterPage";
import AccountForgotPage from "./pages/account/AccountForgotPage";
import AccountResetPage from "./pages/account/AccountResetPage";
import { CustomerAuthProvider } from "./lib/customer-auth";

function Layout() {
  return (
    <CustomerAuthProvider>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </CustomerAuthProvider>
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
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/reviews" element={<ReviewsPage />} />
          <Route path="/order" element={<OrderPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/account/login" element={<AccountLoginPage />} />
          <Route path="/account/register" element={<AccountRegisterPage />} />
          <Route path="/account/forgot" element={<AccountForgotPage />} />
          <Route path="/account/reset" element={<AccountResetPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
        {/* Admin stands alone — no public navbar/footer, not linked in nav. */}
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </>
  );
}
