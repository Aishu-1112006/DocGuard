import { Link, useNavigate, useLocation } from "react-router-dom";
import { useI18n } from "../i18n.jsx";
import docguardLogo from "../assets/docguard-logo.jpg";

export default function Navbar() {
  const token = localStorage.getItem("docguard_token");
  let user = null;
  try {
    const userJson = localStorage.getItem("docguard_user");
    if (userJson && userJson !== "undefined") {
      user = JSON.parse(userJson);
    }
  } catch (e) {
    user = null;
  }

  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("docguard_token");
    localStorage.removeItem("docguard_user");
    navigate("/login");
  };

  const isPublicPage = ["/login", "/signup", "/passenger", "/passenger-portal"].includes(location.pathname);

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src={docguardLogo}
              alt="DOCGUARD Logo"
              className="h-10 w-auto object-contain rounded-md"
            />
            <div>
              <span className="text-xl font-bold tracking-tight text-slate-900 block leading-none">
                DOCGUARD
              </span>
              <span className="text-[10px] font-semibold text-blue-800 tracking-wider uppercase block mt-0.5">
                Airport Screening System
              </span>
            </div>
          </Link>

          {/* Navigation Links for Authenticated Users on Internal Pages */}
          {token && !isPublicPage && (
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
              <Link
                to="/"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === "/" ? "bg-slate-100 text-blue-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t("screening_queue")}
              </Link>

              <Link
                to="/reappeals"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.startsWith("/reappeals") ? "bg-slate-100 text-blue-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t("reappeal_requests")}
              </Link>

              <Link
                to="/historical"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === "/historical" ? "bg-slate-100 text-blue-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t("historical_intelligence")}
              </Link>

              <Link
                to="/analytics"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === "/analytics" ? "bg-slate-100 text-blue-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t("analytics")}
              </Link>

              <Link
                to="/audit"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === "/audit" ? "bg-slate-100 text-blue-900 font-semibold" : "hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {t("audit_logs")}
              </Link>
            </nav>
          )}

          {/* Passenger Navigation Links when viewing passenger portal */}
          {location.pathname.startsWith("/passenger") && (
            <nav className="hidden md:flex items-center gap-1 text-xs font-semibold text-slate-700">
              <Link
                to="/passenger"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === "/passenger" ? "bg-blue-50 text-blue-900 font-bold" : "hover:bg-slate-100"
                }`}
              >
                Dashboard
              </Link>
              <Link
                to="/passenger?tab=verification"
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                My Verification
              </Link>
              <Link
                to="/passenger?tab=documents"
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Documents
              </Link>
              <Link
                to="/passenger/assistant"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === "/passenger/assistant" ? "bg-blue-50 text-blue-900 font-bold" : "hover:bg-slate-100"
                }`}
              >
                🤖 Assistant
              </Link>
              <Link
                to="/passenger/requests"
                className={`px-3 py-2 rounded-lg transition-colors ${
                  location.pathname.startsWith("/passenger/requests") ? "bg-blue-50 text-blue-900 font-bold" : "hover:bg-slate-100"
                }`}
              >
                📋 My Requests
              </Link>
              <Link
                to="/passenger?tab=profile"
                className="px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Profile
              </Link>
            </nav>
          )}

          {/* Right Action Items */}
          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === "en" ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLang("ta")}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === "ta" ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                தமிழ்
              </button>
              <button
                type="button"
                onClick={() => setLang("hi")}
                className={`px-2 py-1 rounded-md transition-all ${
                  lang === "hi" ? "bg-white text-blue-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* User Profile Badge (hidden on public pages) */}
            {token && user && !isPublicPage && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-900 flex items-center justify-center font-bold text-xs">
                  {user.full_name?.charAt(0) || "O"}
                </div>
                <div className="text-left text-xs">
                  <p className="font-semibold text-slate-800 leading-tight">
                    {user.full_name}
                  </p>
                  <p className="text-slate-500 text-[10px]">
                    {user.badge_number || "Inspector"} • {user.assigned_airport?.split("-")[0]?.trim() || "MAA"}
                  </p>
                </div>
              </div>
            )}

            {token ? (
              <button
                onClick={handleLogout}
                className="text-xs font-medium text-slate-500 hover:text-red-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
              >
                {t("logout")}
              </button>
            ) : (
              <Link to="/login" className="btn-primary text-xs px-3.5 py-1.5">
                {t("login")}
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}