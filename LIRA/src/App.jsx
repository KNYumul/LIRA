import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation, Outlet } from "react-router-dom";
import WelcomePage from "./pages/WelcomePage";
import FaqSection from "./pages/FaqSection";
import Header from "./components/Header";
import Footer from "./components/Footer";
import AdminLoginPage from "./pages/Admin-LoginPage";
import LoginPage from "./pages/LoginPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import PasswordResetPage from "./pages/PasswordResetPage";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import StoryMode from "./pages/StoryMode";
import TeacherDashboardPage from "./pages/TeacherPages/TeacherDashboard";
import AdminPage from "./pages/AdminTeacherDashboard";

// Newly inserted pages — standalone screens, not part of the public site.
import Category from "./pages/Category";
import FlashcardDifficulty from "./pages/FlashcardDifficulty";
import FlashcardSession from "./pages/FlashcardSession";
import { getSession } from "./utils/session";
import StudentInactivityAlert from "./components/StudentInactivityAlert";

const PAGE_TITLES = {
  "/": "Home",
  "/help-center": "Help Center",
  "/login": "Login",
  "/verify-email": "Verify Email",
  "/forgot-password": "Forgot Password",
  "/reset-password": "Reset Password",
  "/admin/login": "Admin Login",
  "/privacy-policy": "Privacy Policy",
  "/terms-of-use": "Terms of Use",
  "/category": "Choose an Activity",
  "/story-mode": "Story Mode",
  "/flashcards": "Flashcards",
  "/flashcards/easy": "Easy Flashcards",
  "/flashcards/medium": "Medium Flashcards",
  "/flashcards/hard": "Hard Flashcards",
  "/teacher": "Teacher Dashboard",
  "/admin": "Admin Dashboard",
};

function PageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const path = pathname.replace(/\/+$/, "").toLowerCase() || "/";
    const title = PAGE_TITLES[path] || (path.startsWith("/flashcards/") ? "Flashcards" : "");
    document.title = title ? `${title} | LIRA` : "LIRA";
  }, [pathname]);

  return null;
}

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
  const session = getSession();
  const token = session?.role === role ? session.token : null;
  const { pathname } = useLocation();
  const [verification, setVerification] = useState(null);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/session?role=${role}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        const data = response.ok ? await response.json() : null;
        if (!controller.signal.aborted) {
          setVerification({ token, role, pathname, allowed: data?.role === role });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setVerification({ token, role, pathname, allowed: false });
        }
      });
    return () => controller.abort();
  }, [token, role, pathname]);

  if (!token) return <Navigate to="/" replace />;
  if (verification?.token !== token || verification?.role !== role || verification?.pathname !== pathname) {
    return <p role="status">Checking session...</p>;
  }
  return verification.allowed ? children : <Navigate to="/" replace />;
}

function App() {
  return (
    <>
      <PageTitle />
      <ScrollToHash />
      <StudentInactivityAlert />
      <Routes>
        {/* ---------- Existing public site (unchanged) ---------- */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/help-center" element={<FaqSection />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/forgot-password" element={<PasswordResetPage key="forgot" />} />
          <Route path="/reset-password" element={<PasswordResetPage key="reset" reset />} />
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-use" element={<TermsOfUse />} />
        </Route>

        {/* ---------- Newly inserted pages (standalone, own header) ---------- */}
        <Route element={<ProtectedRoute role="student"><Outlet /></ProtectedRoute>}>
          <Route path="/category" element={<Category />} />
          <Route path="/story-mode" element={<StoryMode />} />
          <Route path="/flashcards" element={<FlashcardDifficulty />} />
          <Route path="/flashcards/:difficulty" element={<FlashcardSession />} />
        </Route>
        <Route path="/teacher" element={<ProtectedRoute role="teacher"><TeacherDashboardPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
