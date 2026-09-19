import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import NewCase from "./pages/NewCase.jsx";
import CaseWorkspace from "./pages/CaseWorkspace.jsx";
import CaseDetail from "./pages/CaseDetail.jsx";
import ReAppealsPage from "./pages/ReAppealsPage.jsx";
import PassengerPortal from "./pages/PassengerPortal.jsx";
import HistoricalSearch from "./pages/HistoricalSearch.jsx";
import Analytics from "./pages/Analytics.jsx";
import AuditLogsPage from "./pages/AuditLogsPage.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Navbar from "./components/Navbar.jsx";
import { I18nProvider } from "./i18n.jsx";
import { getMe } from "./api.js";

import PassengerAssistantPage from "./pages/PassengerAssistantPage.jsx";
import MyRequestsPage from "./pages/MyRequestsPage.jsx";
import RequestDetailPage from "./pages/RequestDetailPage.jsx";
import FloatingAssistantButton from "./components/FloatingAssistantButton.jsx";
import SplashScreen from "./components/SplashScreen.jsx";

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authVerified, setAuthVerified] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    async function verifyAuthOnBoot() {
      const token = localStorage.getItem("docguard_token");
      if (token) {
        try {
          const res = await getMe();
          if (isMounted) {
            localStorage.setItem("docguard_user", JSON.stringify(res.data));
            setAuthVerified(true);
          }
        } catch (err) {
          console.warn("Boot auth verification failed. Token invalid/expired.", err);
          localStorage.removeItem("docguard_token");
          localStorage.removeItem("docguard_user");
          if (isMounted) setAuthVerified(false);
        }
      } else {
        if (isMounted) setAuthVerified(false);
      }
    }

    verifyAuthOnBoot();

    return () => {
      isMounted = false;
    };
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <I18nProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Routes>
            <Route path="/docguard/*" element={<Navigate to="/" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/passenger" element={<PassengerPortal />} />
            <Route path="/passenger-portal" element={<PassengerPortal />} />

            <Route path="/passenger/assistant" element={<PassengerAssistantPage />} />
            <Route path="/passenger/requests" element={<MyRequestsPage />} />
            <Route path="/passenger/requests/:request_id" element={<RequestDetailPage />} />

            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/new" element={<ProtectedRoute><NewCase /></ProtectedRoute>} />
            <Route path="/case/:id/workspace" element={<ProtectedRoute><CaseWorkspace /></ProtectedRoute>} />
            <Route path="/case/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
            <Route path="/reappeals" element={<ProtectedRoute><ReAppealsPage /></ProtectedRoute>} />
            <Route path="/historical" element={<ProtectedRoute><HistoricalSearch /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/audit" element={<ProtectedRoute><AuditLogsPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <FloatingAssistantButton />

        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          DOCGUARD AI-Powered Identity & Document Screening System • SIH 26188 • Confidential Government & Border Security Platform
        </footer>
      </div>
    </I18nProvider>
  );
}