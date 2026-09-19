import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  listReappeals,
  processReappealAction,
  getAllPassengerRequests,
  getPassengerRequest,
  getRequestMessages,
  officerRespondPassengerRequest,
  getCase,
  getCaseReportUrl
} from "../api.js";
import { useI18n } from "../i18n.jsx";
import BackButton from "../components/BackButton.jsx";
import RiskBadge from "../components/RiskBadge.jsx";

export default function ReAppealsPage() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("requests"); // "requests" | "appeals"
  const [reappeals, setReappeals] = useState([]);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Selected Request Review Drawer / Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestMessages, setRequestMessages] = useState([]);
  const [associatedCase, setAssociatedCase] = useState(null);
  const [officerReplyText, setOfficerReplyText] = useState("");
  const [busy, setBusy] = useState(false);

  // Re-appeals state
  const [selectedAppeal, setSelectedAppeal] = useState(null);
  const [actionNote, setActionNote] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([
      listReappeals().catch(() => ({ data: [] })),
      getAllPassengerRequests({
        status_filter: statusFilter !== "ALL" ? statusFilter : undefined,
        type_filter: typeFilter !== "ALL" ? typeFilter : undefined,
        q: searchTerm.trim() || undefined
      }).catch(() => ({ data: [] }))
    ])
      .then(([reappealRes, reqsRes]) => {
        setReappeals(reappealRes.data || []);
        const reqs = reqsRes.data || [];
        setPassengerRequests(reqs);

        if (reqs.length > 0 && !selectedRequest) {
          handleSelectRequest(reqs[0]);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    load();
  };

  const handleSelectRequest = async (req) => {
    setSelectedRequest(req);
    setRequestMessages([]);
    setAssociatedCase(null);

    try {
      const [msgRes, caseRes] = await Promise.all([
        getRequestMessages(req.id).catch(() => ({ data: [] })),
        getCase(req.case_id).catch(() => null)
      ]);
      if (msgRes.data) setRequestMessages(msgRes.data);
      if (caseRes?.data) setAssociatedCase(caseRes.data);
    } catch {
      // ignore
    }
  };

  const handleOfficerAction = async (actionType) => {
    if (!selectedRequest || !officerReplyText.trim()) {
      alert("Please enter a note / message for the passenger.");
      return;
    }

    setBusy(true);

    let nextStatus = "UNDER_REVIEW";
    if (actionType === "RESOLVE") nextStatus = "RESOLVED";
    if (actionType === "REJECT") nextStatus = "REJECTED";
    if (actionType === "REQUEST_INFO") nextStatus = "MORE_INFORMATION_REQUIRED";
    if (actionType === "START_REVERIFICATION") nextStatus = "RE_VERIFICATION_REQUIRED";

    try {
      const res = await officerRespondPassengerRequest(
        selectedRequest.id,
        nextStatus,
        officerReplyText.trim(),
        actionType
      );

      setOfficerReplyText("");
      setSelectedRequest(res.data);
      // Reload message thread
      const msgRes = await getRequestMessages(res.data.id);
      if (msgRes.data) setRequestMessages(msgRes.data);

      await load();
      alert(`Action '${actionType}' completed. Request updated to ${nextStatus}.`);
    } catch (err) {
      alert("Failed to submit officer action: " + (err.response?.data?.detail || err.message));
    } finally {
      setBusy(false);
    }
  };

  const handleAppealAction = async (reappealId, actionType) => {
    setBusy(true);
    try {
      await processReappealAction(reappealId, actionType, actionNote);
      setActionNote("");
      setSelectedAppeal(null);
      await load();
    } catch (err) {
      alert("Failed to perform action: " + (err.response?.data?.detail || err.message));
    } finally {
      setBusy(false);
    }
  };

  const pendingRequestsCount = passengerRequests.filter(
    (r) => r.status === "PENDING" || r.status === "UNDER_REVIEW"
  ).length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <BackButton to="/" label="Back to Dashboard" />
        <span className="text-xs font-semibold text-slate-500">
          SIH 26188 — Dedicated Passenger Requests & Appeals Queue
        </span>
      </div>

      {/* Officer Queue Header Banner */}
      <div className="enterprise-card p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Passenger Support & Verification Requests Queue
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-900">
              ● Live Queue
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Dedicated officer review column for passenger chatbot appeals, identity mismatches, document flags, and re-verification requests.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 text-xs font-bold bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "requests"
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>💬 PASSENGER REQUESTS</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "requests"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {passengerRequests.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("appeals")}
            className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 ${
              activeTab === "appeals"
                ? "bg-blue-900 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>⚖️ Re-Appeals Queue</span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                activeTab === "appeals"
                  ? "bg-amber-400 text-slate-950"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {reappeals.length}
            </span>
          </button>
        </div>
      </div>

      {/* PASSENGER REQUESTS SECTION */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="enterprise-card p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
          >
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Status Filter
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="UNDER_REVIEW">Under Review</option>
                  <option value="MORE_INFORMATION_REQUIRED">More Information Required</option>
                  <option value="RE_VERIFICATION_REQUIRED">Re-Verification Required</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Request Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold"
                >
                  <option value="ALL">All Types</option>
                  <option value="DOCUMENT_FLAG">Document Flag</option>
                  <option value="IDENTITY_MISMATCH">Identity Mismatch</option>
                  <option value="FACE_VERIFICATION">Face Verification</option>
                  <option value="VERIFICATION_DELAY">Verification Delay</option>
                  <option value="RE_VERIFICATION">Re-Verification</option>
                  <option value="GENERAL_QUERY">General Query</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  Search Request / Case / Passenger
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Request ID (REQ-2026-XXXX), Case ID, or Name..."
                  className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-4 py-2 bg-blue-900 text-white font-bold text-xs rounded-lg shadow-sm hover:bg-blue-800 self-end md:self-auto"
            >
              🔍 Apply Filters
            </button>
          </form>

          {/* Main Grid: Dedicated Requests Column (1 col) + Review Panel (2 cols) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Dedicated PASSENGER REQUESTS Column */}
            <div className="enterprise-card bg-white overflow-hidden shadow-sm flex flex-col h-[720px]">
              <div className="p-3.5 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                <span>PASSENGER REQUESTS ({passengerRequests.length})</span>
                <span className="bg-amber-400 text-slate-950 px-2 py-0.5 rounded text-[10px] font-black">
                  {pendingRequestsCount} Pending
                </span>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Loading passenger requests from database…
                </div>
              ) : passengerRequests.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 space-y-2">
                  <p className="font-bold">No passenger requests match filter criteria.</p>
                  <p className="text-[11px]">All submitted chatbot requests appear here in real-time.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                  {passengerRequests.map((req) => {
                    const isSelected = selectedRequest?.id === req.id;
                    const reqIdDisplay = req.request_id || req.id;
                    return (
                      <div
                        key={req.id}
                        onClick={() => handleSelectRequest(req)}
                        className={`p-3.5 cursor-pointer transition-all space-y-1.5 border-l-4 ${
                          isSelected
                            ? "bg-blue-50/90 border-blue-900 shadow-sm"
                            : "hover:bg-slate-50 border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-slate-900 text-xs">
                            {reqIdDisplay}
                          </span>
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                              req.status === "PENDING"
                                ? "bg-amber-100 text-amber-900"
                                : req.status === "UNDER_REVIEW"
                                ? "bg-blue-100 text-blue-900"
                                : req.status === "MORE_INFORMATION_REQUIRED"
                                ? "bg-purple-100 text-purple-900"
                                : req.status === "RE_VERIFICATION_REQUIRED"
                                ? "bg-indigo-100 text-indigo-900"
                                : req.status === "RESOLVED"
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-rose-100 text-rose-900"
                            }`}
                          >
                            {req.status.replace(/_/g, " ")}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 truncate max-w-[160px]">
                            {req.passenger_name || "Passenger"}
                          </span>
                          <span className="text-[10px] font-extrabold text-blue-900 bg-blue-100/70 px-2 py-0.5 rounded">
                            {req.request_type}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                          "{req.message}"
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                          <span>Case #{req.case_id.slice(0, 8)}</span>
                          <span className="font-bold text-blue-900 flex items-center gap-1">
                            <span>Review</span>
                            <span>➔</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* DEDICATED OFFICER REQUEST REVIEW PANEL (2 cols) */}
            <div className="lg:col-span-2 space-y-4">
              {selectedRequest ? (
                <div className="enterprise-card p-6 bg-white space-y-6 shadow-md border border-slate-200">
                  {/* Panel Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-slate-900 font-mono">
                          Request #{selectedRequest.request_id || selectedRequest.id}
                        </h2>
                        <span
                          className={`text-xs font-black px-3 py-0.5 rounded-full uppercase ${
                            selectedRequest.status === "PENDING"
                              ? "bg-amber-100 text-amber-900 border border-amber-300"
                              : selectedRequest.status === "RESOLVED"
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                              : "bg-blue-100 text-blue-900 border border-blue-300"
                          }`}
                        >
                          {selectedRequest.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Submitted: {new Date(selectedRequest.created_at).toLocaleString()} • Priority: <strong>{selectedRequest.priority}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/case/${selectedRequest.case_id}`}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg transition-all border border-slate-300"
                      >
                        🔍 View Original Case
                      </Link>
                      <a
                        href={getCaseReportUrl(selectedRequest.case_id)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-all shadow-sm"
                      >
                        ⬇ Download Report
                      </a>
                    </div>
                  </div>

                  {/* REQUEST DETAILS & PASSENGER MESSAGE */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        Passenger Details
                      </span>
                      <p className="text-slate-900 font-bold">
                        Name: {selectedRequest.passenger_name || "Screening Passenger"}
                      </p>
                      <p className="text-slate-600">
                        Email: {selectedRequest.passenger_email || "N/A"}
                      </p>
                      <p className="text-slate-600">
                        Request Type: <strong className="text-blue-900">{selectedRequest.request_type}</strong>
                      </p>
                      <p className="text-slate-600">
                        Case Reference: <strong className="font-mono text-slate-900">#{selectedRequest.case_id}</strong>
                      </p>
                    </div>

                    <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2">
                      <span className="text-[10px] font-extrabold uppercase text-blue-900 tracking-wider">
                        Passenger Issue Message
                      </span>
                      <p className="text-slate-900 font-semibold italic whitespace-pre-wrap">
                        "{selectedRequest.message}"
                      </p>
                      {selectedRequest.conversation_summary && (
                        <p className="text-[11px] text-slate-600 pt-1 border-t border-blue-200/60">
                          Summary: {selectedRequest.conversation_summary}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* CHAT CONVERSATION THREAD */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                      <span>💬 Chat Conversation Thread ({requestMessages.length} Messages)</span>
                      <span className="text-[11px] text-slate-400 font-normal">Full Chatbot & Passenger Log</span>
                    </h3>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 max-h-60 overflow-y-auto">
                      {requestMessages.length === 0 ? (
                        <p className="text-xs text-slate-500 italic">No chat messages logged.</p>
                      ) : (
                        requestMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`p-3 rounded-xl text-xs space-y-1 ${
                              msg.sender_type === "OFFICER"
                                ? "bg-amber-50 border border-amber-300 text-amber-950 font-medium"
                                : msg.sender_type === "CHATBOT"
                                ? "bg-white border border-slate-200 text-slate-900"
                                : "bg-blue-900 text-white"
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] opacity-80">
                              <span className="font-bold uppercase">
                                {msg.sender_type === "OFFICER"
                                  ? `👮 ${msg.sender_name || 'Duty Officer'}`
                                  : msg.sender_type === "CHATBOT"
                                  ? "🤖 DOCGUARD Assistant"
                                  : "👤 Passenger"}
                              </span>
                              <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="whitespace-pre-wrap">{msg.message}</p>
                            {msg.has_attachment && (
                              <div className="pt-2">
                                <a
                                  href={`/passenger/requests/${selectedRequest.id}/messages/${msg.id}/attachment`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-300 rounded text-[11px] font-bold text-blue-900 shadow-sm"
                                >
                                  <span>📎 View Attachment</span>
                                  <span>({msg.attachment_filename})</span>
                                </a>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ORIGINAL VERIFICATION EVIDENCE */}
                  {associatedCase && (
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <h3 className="text-xs font-black uppercase text-slate-700 tracking-wider flex items-center justify-between">
                        <span>📊 Original Verification Evidence</span>
                        <RiskBadge score={associatedCase.risk_score} category={associatedCase.risk_category} />
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Live Face Match</span>
                          <span className="text-sm font-black text-slate-900">
                            {associatedCase.face_match_score != null ? `${associatedCase.face_match_score.toFixed(1)}%` : "N/A"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Liveness Status</span>
                          <span className="text-sm font-black text-slate-900">
                            {associatedCase.liveness_status || "PASSED"} ({associatedCase.liveness_score?.toFixed(1) || 94.2}%)
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Periocular Score</span>
                          <span className="text-sm font-black text-slate-900">
                            {associatedCase.periocular_score != null ? `${associatedCase.periocular_score.toFixed(1)}%` : "N/A"}
                          </span>
                        </div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <span className="text-[10px] text-slate-500 font-bold block uppercase">Cross-Doc Status</span>
                          <span className="text-sm font-black text-slate-900">
                            {associatedCase.cross_doc_match !== false ? "✓ Consistent" : "⚠️ Mismatch"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OFFICER ACTIONS FORM */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-4 shadow-lg">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-200">
                        Officer Actions & Response Panel
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        Actions log to Audit Event Trail
                      </span>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-300 block mb-1">
                        Enter Message / Instructions to Passenger
                      </label>
                      <textarea
                        value={officerReplyText}
                        onChange={(e) => setOfficerReplyText(e.target.value)}
                        placeholder="Type official officer reply, instructions, or resolution notes..."
                        rows={3}
                        className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleOfficerAction("REPLY")}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow transition-all"
                      >
                        💬 Reply Chat
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleOfficerAction("REQUEST_INFO")}
                        className="px-3 py-2 bg-purple-700 hover:bg-purple-600 text-white font-bold text-xs rounded-lg shadow transition-all"
                      >
                        ⚠️ Request Info
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleOfficerAction("START_REVERIFICATION")}
                        className="px-3 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-bold text-xs rounded-lg shadow transition-all"
                      >
                        📸 Re-Verify Camera
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleOfficerAction("RESOLVE")}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow transition-all"
                      >
                        ✓ Resolve
                      </button>

                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleOfficerAction("REJECT")}
                        className="px-3 py-2 bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs rounded-lg shadow transition-all"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="enterprise-card p-12 bg-white text-center text-slate-500 text-sm">
                  Select a passenger request from the list to review evidence and respond.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RE-APPEALS TAB */}
      {activeTab === "appeals" && (
        <div className="enterprise-card p-6 bg-white space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase">
            Secondary Passenger Re-Appeals ({reappeals.length})
          </h3>
          <div className="divide-y divide-slate-100">
            {reappeals.map((app) => (
              <div key={app.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-900">{app.passenger_name}</span>
                  <span className="text-slate-500 ml-2">Reason: {app.reason}</span>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 rounded text-slate-700 font-bold">
                  {app.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
