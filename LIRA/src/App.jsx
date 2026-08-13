import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import FaqSection from "./pages/FaqSection";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminLoginPage from "./pages/Admin-LoginPage";
import LoginPage from "./pages/LoginPage";

function ScrollToHash() {
  const { hash, pathname } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }

    requestAnimationFrame(() => {
      document.querySelector(hash)?.scrollIntoView({ behavior: "smooth" });
    });
  }, [hash, pathname]);

  return null;
}

function App() {
  return (
    <>
      <ScrollToHash />
      <Header />
      <Routes>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/help-center" element={<FaqSection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin/login" element={<AdminLoginPage />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;
