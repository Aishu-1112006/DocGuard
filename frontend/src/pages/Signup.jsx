import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api.js";
import { INDIAN_AIRPORTS } from "../components/AirportSelector.jsx";
import BackButton from "../components/BackButton.jsx";
import docguardLogo from "../assets/docguard-logo.jpg";

export default function Signup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("OFFICER");
  const [badgeNumber, setBadgeNumber] = useState("BADGE-MAA-101");
  const [assignedAirport, setAssignedAirport] = useState("MAA - Chennai International Airport");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        username,
        password,
        role,
        badge_number: badgeNumber,
        assigned_airport: assignedAirport
      });
      
      setSuccessMsg("Account created successfully! Redirecting to Sign In...");
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed. Please check inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center py-10 px-4 space-y-4">
      <div className="max-w-lg w-full flex justify-between items-center">
        <BackButton />
        <span className="text-xs font-semibold text-slate-500">DOCGUARD — Registration</span>
      </div>

      <div className="max-w-lg w-full enterprise-card p-8 bg-white space-y-6">
        <div className="text-center space-y-2">
          <img
            src={docguardLogo}
            alt="DOCGUARD Logo"
            className="h-16 w-auto mx-auto object-contain rounded-md"
          />
          <h1 className="text-xl font-bold text-slate-900">
            Register Officer Account
          </h1>
          <p className="text-xs text-slate-500">
            Create an official DOCGUARD duty account. Account will start with 0 personal cases.
          </p>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs p-3 rounded-lg font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Inspector Ramesh Kumar"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ramesh_officer"
                className="field-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Officer Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ramesh@docguard.gov.in"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Phone Number</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="field-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">User Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="field-input"
              >
                <option value="OFFICER">OFFICER (Screening Officer)</option>
                <option value="SUPERVISOR">SUPERVISOR (Shift Lead)</option>
                <option value="ADMIN">ADMIN (System Administrator)</option>
              </select>
            </div>
            <div>
              <label className="field-label">Badge Number</label>
              <input
                type="text"
                value={badgeNumber}
                onChange={(e) => setBadgeNumber(e.target.value)}
                placeholder="BADGE-MAA-101"
                className="field-input"
              />
            </div>
          </div>

          <div>
            <label className="field-label">Assigned Duty Airport</label>
            <select
              value={assignedAirport}
              onChange={(e) => setAssignedAirport(e.target.value)}
              className="field-input"
            >
              {INDIAN_AIRPORTS.map((apt) => (
                <option key={apt.code} value={`${apt.code} - ${apt.name}`}>
                  {apt.code} — {apt.name} ({apt.city})
                </option>
              ))}
            </select>
          </div>

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-3 rounded-lg font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              {successMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Password (min 6 chars)</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="field-input"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary py-3 text-sm font-semibold shadow-md"
          >
            {loading ? "Creating Account…" : "Register Officer Profile"}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-blue-800 hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </div>
  );
}
