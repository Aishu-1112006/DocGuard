import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function FloatingAssistantButton() {
  const navigate = useNavigate();
  const location = useLocation();

  // Do not show on auth pages
  if (location.pathname === "/login" || location.pathname === "/signup") {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={() => navigate("/passenger/assistant")}
        className="flex items-center gap-2 bg-gradient-to-r from-blue-900 to-indigo-800 text-white px-4 py-3 rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all border border-blue-400/30 text-xs font-bold"
        title="Open DOCGUARD Assistant"
      >
        <span className="text-base">🤖</span>
        <span>DOCGUARD Assistant</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      </button>
    </div>
  );
}
