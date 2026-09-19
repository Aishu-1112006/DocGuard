import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../api.js";
import { useI18n } from "../i18n.jsx";
import BackButton from "../components/BackButton.jsx";
import docguardLogo from "../assets/docguard-logo.jpg";

export default function Login() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem("docguard_token", res.data.access_token);
      localStorage.setItem("docguard_user", JSON.stringify(res.data.user));
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-12 px-4 space-y-4">
      <div className="max-w-md w-full flex justify-between items-center">
        <BackButton />
        <span className="text-xs font-semibold text-slate-500">DOCGUARD — Official Access</span>
      </div>

      <div className="max-w-md w-full enterprise-card p-8 bg-white space-y-6">
        {/* Logo Banner */}
        <div className="text-center space-y-3">
          <img
            src={docguardLogo}
            alt="DOCGUARD Logo"
            className="h-20 w-auto mx-auto object-contain rounded-lg shadow-sm"
          />
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              DOCGUARD
            </h1>
            <p className="text-xs text-blue-900 font-semibold uppercase tracking-widest mt-1">
              AI-Powered Identity & Document Screening System
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="field-label">Officer Email or Badge ID</label>
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. ramesh@docguard.gov.in or officer1"
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="field-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-sm font-semibold shadow-md"
          >
            {loading ? "Authenticating Credentials…" : t("login")}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>New Duty Officer?</span>
          <Link to="/signup" className="font-semibold text-blue-800 hover:underline">
            Register Officer Account →
          </Link>
        </div>

        {/* Official Use Disclaimer */}
        <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-500 text-center leading-relaxed border border-slate-200">
          🔒 Restricted Official Access. Authorized immigration & airport checkpoint personnel only.
        </div>
      </div>
    </div>
  );
}
