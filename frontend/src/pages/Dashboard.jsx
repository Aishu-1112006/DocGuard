import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listCases, listReappeals, getAllPassengerRequests } from "../api.js";
import RiskBadge from "../components/RiskBadge.jsx";
import { useI18n } from "../i18n.jsx";

export default function Dashboard() {
  const { t } = useI18n();
  let officer = null;
  try {
    const userJson = localStorage.getItem("docguard_user");
    if (userJson && userJson !== "undefined") {
      officer = JSON.parse(userJson);
    }
  } catch (e) {
    officer = null;
  }

  const [cases, setCases] = useState([]);
  const [reappeals, setReappeals] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listCases().catch(() => ({ data: [] })),
      listReappeals().catch(() => ({ data: [] })),
      getAllPassengerRequests().catch(() => ({ data: [] }))
    ])
      .then(([casesRes, reappealsRes, reqsRes]) => {
        setCases(casesRes.data || []);
        setReappeals(reappealsRes.data || []);
        setPassengerRequests(reqsRes.data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Compute stats strictly for THIS officer's operational cases!
  const stats = {
    total: cases.length,
    approved: cases.filter((c) => c.final_status === "cleared").length,
    pending: cases.filter((c) => c.final_status === "pending" || c.final_status === "in_progress").length,
    flagged: cases.filter((c) => c.risk_category === "HIGH" || c.final_status === "flagged" || c.final_status === "rejected").length,
  };

  const pendingReappeals = reappeals.filter(
    (r) => r.status === "Submitted" || r.status === "Under Review" || r.status === "Need More Information"
  ).length;

  const pendingRequests = passengerRequests.filter(
    (r) => r.status === "PENDING" || r.status === "UNDER_REVIEW"
  ).length;

  return (
    <div className="space-y-6">
      {/* Officer Header Card */}
      <div className="enterprise-card p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/80 text-blue-200 text-xs font-semibold mb-2">
              <span>● DUTY ACTIVE</span>
              <span>•</span>
              <span>{officer?.role || "OFFICER"}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">
              Welcome, {officer?.full_name || "Inspector"}
            </h1>
            <p className="text-xs text-blue-200 mt-1 flex items-center gap-3">
              <span>Badge ID: <strong>{officer?.badge_number || "BADGE-101"}</strong></span>
              <span>•</span>
              <span>Checkpoint: <strong>{officer?.assigned_airport || "Chennai International Airport (MAA)"}</strong></span>
            </p>
          </div>

          <Link
            to="/new"
            className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-bold rounded-lg shadow-lg self-start md:self-auto"
          >
            + New Passenger Screening
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid - Strictly Officer Personal Operational Cases */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t("total_handled")}
          value={stats.total}
          subtitle="Cases by your duty badge"
          bgClass="pastel-lavender"
          textClass="text-indigo-900"
        />
        <StatCard
          label={t("approved_cleared")}
          value={stats.approved}
          subtitle="Your cases cleared"
          bgClass="pastel-mint"
          textClass="text-emerald-900"
        />
        <StatCard
          label={t("under_review")}
          value={stats.pending}
          subtitle="Awaiting verdict"
          bgClass="pastel-amber"
          textClass="text-amber-900"
        />
        <StatCard
          label={t("high_risk")}
          value={stats.flagged}
          subtitle="Flagged / High Risk"
          bgClass="pastel-rose"
          textClass="text-rose-900"
        />
      </div>

      {/* Prominent PASSENGER ASSISTANCE & RE-APPEAL REQUESTS Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="enterprise-card p-5 bg-gradient-to-r from-blue-950 to-indigo-900 text-white flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center font-bold text-xl border border-blue-500/30">
              💬
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Passenger Assistance Requests</span>
                {pendingRequests > 0 && (
                  <span className="bg-amber-400 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                    {pendingRequests} New
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Questions, chatbot inquiries, document rectifications, and appeal tickets submitted by passengers.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-blue-800/60">
            <span className="text-xs text-blue-200 font-semibold">Total: {passengerRequests.length} Requests</span>
            <Link
              to="/reappeals"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg transition-colors shadow"
            >
              Review Requests →
            </Link>
          </div>
        </div>

        <div className="enterprise-card p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xl border border-amber-500/30">
              ⚖️
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{t("reappeal_requests")}</span>
                {pendingReappeals > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 rounded-full">
                    {pendingReappeals} Pending
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Review passenger secondary appeal explanations, request info, or approve/reject appeals.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-700/60">
            <span className="text-xs text-slate-300 font-semibold">Total: {reappeals.length} Appeals</span>
            <Link
              to="/reappeals"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow"
            >
              {t("view_reappeals")} →
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Personal Cases Section */}
      <div className="enterprise-card overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {t("recent_cases")}
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            Personal Operational Cases: {cases.length}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading your screening queue…
          </div>
        ) : cases.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto text-xl">
              📂
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {t("no_cases")}
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your officer account starts cleanly at zero. Click "+ New Passenger Screening" to create your first duty screening session.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {cases.map((c) => (
              <Link
                key={c.id}
                to={c.final_status === "in_progress" ? `/case/${c.id}/workspace` : `/case/${c.id}`}
                className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Case #{c.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {c.airport_code || "MAA"}
                    </span>
                    {c.reappeal_status && c.reappeal_status !== "NONE" && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        APPEAL: {c.reappeal_status}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500">
                    Created: {new Date(c.created_at).toLocaleString()} • Status: <strong className="uppercase">{c.final_status}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <RiskBadge score={c.risk_score} category={c.risk_category} />
                  <span className="text-slate-400 text-base">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, subtitle, bgClass, textClass }) {
  return (
    <div className={`p-4 rounded-xl border border-slate-200 ${bgClass} space-y-1 shadow-sm`}>
      <p className={`text-2xl font-black ${textClass}`}>{value}</p>
      <p className="text-xs font-bold text-slate-800">{label}</p>
      <p className="text-[10px] text-slate-500">{subtitle}</p>
    </div>
  );
}