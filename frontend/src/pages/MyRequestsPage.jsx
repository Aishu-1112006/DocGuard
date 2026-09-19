import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import { getPassengerRequests } from "../api.js";

export default function MyRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        const res = await getPassengerRequests();
        setRequests(res.data || []);
      } catch (err) {
        console.warn("Could not load requests", err);
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">Pending Officer Review</span>;
      case "UNDER_REVIEW":
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-300">Officer is reviewing your request</span>;
      case "MORE_INFORMATION_REQUIRED":
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">More information is required</span>;
      case "RE_VERIFICATION_REQUIRED":
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">New verification requested</span>;
      case "RESOLVED":
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">Request Resolved</span>;
      case "REJECTED":
      case "CANCELLED":
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300">Request Closed</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <BackButton to="/passenger" label="Back to Dashboard" />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              My Requests
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Track requests submitted to the verification team.
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate("/passenger/assistant?action=raise_request")}
          className="btn-primary py-2.5 px-4 text-xs font-bold shadow"
        >
          + Raise New Request
        </button>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="enterprise-card p-12 text-center text-xs text-slate-500">
          Loading your submitted requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="enterprise-card p-12 bg-white text-center space-y-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="text-4xl">📋</div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No requests yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              If you need help with your verification, you can raise a request through the DOCGUARD Assistant.
            </p>
          </div>
          <button
            onClick={() => navigate("/passenger/assistant")}
            className="btn-primary py-2.5 px-6 text-xs font-bold shadow"
          >
            Chat with Assistant
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="enterprise-card p-5 bg-white space-y-3 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-blue-900 text-sm">{req.request_id}</span>
                  <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                    {req.request_type.replace('_', ' ').title ? req.request_type.replace('_', ' ') : req.request_type}
                  </span>
                </div>
                {getStatusBadge(req.status)}
              </div>

              <p className="text-xs text-slate-800 font-medium line-clamp-2">
                "{req.message}"
              </p>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400 font-medium">
                  Submitted: {new Date(req.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                <button
                  onClick={() => navigate(`/passenger/requests/${req.id}`)}
                  className="btn-primary py-1.5 px-4 text-xs font-bold bg-blue-900 hover:bg-blue-800 shadow-sm"
                >
                  View Request Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
