import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation, Outlet } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import FaqSection from "./pages/FaqSection";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminLoginPage from "./pages/Admin-LoginPage";
import LoginPage from "./pages/LoginPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import StoryMode from "./pages/StoryMode";
import TeacherDashboardPage from "./pages/TeacherPages/TeacherDashboard";
import AdminPage from "./pages/AdminTeacherDashboard";

// Newly inserted pages — standalone screens, not part of the public site.
import Category from "./pages/Category";
import FlashcardDifficulty from "./pages/FlashcardDifficulty";
import FlashcardSession from "./pages/FlashcardSession";

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

// Wraps the existing public/marketing pages with the site-wide Header + Footer,
// exactly as before. Nothing about these routes changed.
function PublicLayout() {
  return (
    <>
      <Header />
      <Outlet />
      <Footer />
    </>
  );
}

function ProtectedRoute({ role, children }) {
  try {
    const session = JSON.parse(localStorage.getItem("liraSession"));
    return session?.role === role ? children : <Navigate to="/" replace />;
  } catch {
    return <Navigate to="/" replace />;
  }
}

function App() {
  return (
    <>
      <ScrollToHash />
      <Routes>
        {/* ---------- Existing public site (unchanged) ---------- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/help-center" element={<FaqSection />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />
        </Route>

        {/* ---------- Newly inserted pages (standalone, own header) ---------- */}
        <Route path="/category" element={<Category />} />
        <Route path="/story-mode" element={<StoryMode />} />
        <Route path="/flashcards" element={<FlashcardDifficulty />} />
        <Route path="/flashcards/:difficulty" element={<FlashcardSession />} />
        <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboardPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

export default App;
