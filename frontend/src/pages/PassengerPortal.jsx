import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import docguardLogo from "../assets/docguard-logo.jpg";
import {
  submitPassengerRequest,
  getPassengerRequestsForCase,
  getCase
} from "../api.js";
import { useI18n } from "../i18n.jsx";
import BackButton from "../components/BackButton.jsx";
import PassengerChatbot from "../components/PassengerChatbot.jsx";

export default function PassengerPortal() {
  const navigate = useNavigate();
  const { lang, t } = useI18n();
  const [caseIdInput, setCaseIdInput] = useState("");
  const [activeCaseId, setActiveCaseId] = useState("");
  const [caseData, setCaseData] = useState(null);

  // Active view tabs: 'chat', 'request', 'requests_list'
  const [activeTab, setActiveTab] = useState("chat");

  // Form states for raising a request
  const [requestType, setRequestType] = useState("re_verification");
  const [passengerName, setPassengerName] = useState("");
  const [passengerEmail, setPassengerEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [supportingInfo, setSupportingInfo] = useState("");
  
  const [submittedRequest, setSubmittedRequest] = useState(null);
  const [passengerRequests, setPassengerRequests] = useState([]);
  const [selectedRequestDetails, setSelectedRequestDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Chatbot state
  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState([
    {
      role: "assistant",
      text: "Hello. I can help you understand your verification result or raise a review request."
    }
  ]);
  const [asking, setAsking] = useState(false);

  const fetchCaseDetails = async (cid) => {
    try {
      const [caseRes, reqsRes] = await Promise.all([
        getCase(cid).catch(() => null),
        getPassengerRequestsForCase(cid).catch(() => null)
      ]);

      if (caseRes) setCaseData(caseRes.data);
      if (reqsRes) setPassengerRequests(reqsRes.data || []);
    } catch {
      // ignore
    }
  };

  const handleLookupCase = async (e) => {
    e.preventDefault();
    if (!caseIdInput.trim()) return;
    const cid = caseIdInput.trim();
    setActiveCaseId(cid);
    setFormError("");
    setSubmittedRequest(null);
    await fetchCaseDetails(cid);
  };

  const sendChatMessage = async (qText) => {
    if (!qText || !activeCaseId || asking) return;
    setAsking(true);
    const userMsg = { role: "user", text: qText };
    setChatHistory((prev) => [...prev, userMsg]);

    try {
      const res = await askPassengerChatbot(activeCaseId, qText);
      const botMsg = {
        role: "assistant",
        text: res.data.answer,
        quickActions: res.data.quick_actions
      };
      setChatHistory((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg = {
        role: "assistant",
        text: "Could not fetch verification details for that Case ID. Please check your Case ID."
      };
      setChatHistory((prev) => [...prev, errMsg]);
    } finally {
      setAsking(false);
    }
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatQuestion.trim()) return;
    const q = chatQuestion.trim();
    setChatQuestion("");
    sendChatMessage(q);
  };

  const handleQuickAction = (actionText) => {
    if (actionText === "Raise a review request" || actionText === "Request a re-verification") {
      setActiveTab("request");
    } else {
      sendChatMessage(actionText);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!activeCaseId) {
      setFormError("Please enter your Screening Case ID first.");
      return;
    }
    if (!message.trim()) {
      setFormError("Please enter your concern message.");
      return;
    }

    setSubmitting(true);
    setFormError("");
    setSubmittedRequest(null);

    try {
      const res = await submitPassengerRequest(activeCaseId, {
        request_type: requestType,
        subject: subject || requestType,
        message,
        supporting_information: supportingInfo,
        passenger_name: passengerName,
        passenger_email: passengerEmail
      });

      setSubmittedRequest(res.data);
      setMessage("");
      setSupportingInfo("");
      await fetchCaseDetails(activeCaseId);
    } catch (err) {
      setFormError(err.response?.data?.detail || "Could not submit request to server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Request status counts
  const pendingCount = passengerRequests.filter((r) => r.status === "PENDING").length;
  const reviewCount = passengerRequests.filter((r) => r.status === "UNDER_REVIEW").length;
  const resolvedCount = passengerRequests.filter((r) => r.status === "RESOLVED").length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-8">
      {/* Top Left Navigation Header */}
      <div className="flex items-center justify-between">
        <BackButton to="/" label="Back to Main" />
        <span className="text-xs font-semibold text-slate-500">SIH 26188 — Passenger Self-Service & Assistance Portal</span>
      </div>

      {/* Hero Card */}
      <div className="enterprise-card p-6 bg-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <img src={docguardLogo} alt="Logo" className="h-8 w-auto rounded" />
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Passenger Self-Service & Appeals Portal
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Verify screening results, ask evidence-grounded questions to DOCGUARD Assistant, or raise a review request.
          </p>
        </div>

        <div className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
          ✈️ Airport Passenger Assistant
        </div>
      </div>

      {/* Case Lookup Bar */}
      <form onSubmit={handleLookupCase} className="enterprise-card p-5 bg-white space-y-3">
        <label className="field-label">Enter Your Screening Case Reference ID</label>
        <div className="flex gap-3">
          <input
            type="text"
            required
            value={caseIdInput}
            onChange={(e) => setCaseIdInput(e.target.value)}
            placeholder="e.g. 548a27af-4f42-436e-91d8-55a3658d1140"
            className="field-input font-mono text-sm"
          />
          <button type="submit" className="btn-primary py-2.5 px-6 whitespace-nowrap text-xs font-bold">
            🔍 Check Case
          </button>
        </div>
      </form>

      {/* ENTRY POINT 1: PASSENGER DASHBOARD SUPPORT AREA */}
      {!activeCaseId && (
        <div className="enterprise-card p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-6 border border-blue-800">
          <div className="space-y-1">
            <h2 className="text-lg font-black tracking-tight flex items-center gap-2">
              <span>🤖</span> Need help with your verification?
            </h2>
            <p className="text-xs text-blue-200">
              Get help with your verification, raise a request, or track an existing request with DOCGUARD Assistant.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/passenger/assistant")}
              className="btn-primary py-3 px-6 text-xs font-bold bg-white text-blue-900 hover:bg-blue-50 shadow-md"
            >
              Chat with Assistant
            </button>
            <button
              onClick={() => navigate("/passenger/requests")}
              className="px-5 py-3 rounded-xl text-xs font-bold bg-blue-800 text-white hover:bg-blue-700 border border-blue-400/30 shadow-md"
            >
              My Requests
            </button>
          </div>
        </div>
      )}

      {/* HELP BANNER WHEN CASE IS ACTIVE */}
      {activeCaseId && (
        <div className="space-y-6">
          {/* ENTRY POINT 2: VERIFICATION RESULT SUPPORT SECTION */}
          <div className="enterprise-card p-5 bg-amber-50 border border-amber-300 rounded-2xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-black text-amber-950 flex items-center gap-2">
                <span>⚠️</span> Need help with this result?
              </h3>
              <p className="text-xs text-amber-900">
                If you believe something is incorrect, you can contact the verification officer handling your case.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(`/passenger/assistant?case_id=${activeCaseId}`)}
                className="btn-primary py-2 px-4 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                Ask DOCGUARD Assistant
              </button>
              <button
                onClick={() => navigate(`/passenger/assistant?case_id=${activeCaseId}&action=raise_request`)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-800 border border-amber-300 hover:bg-amber-100"
              >
                Raise a Request
              </button>
            </div>
          </div>
          <div className="enterprise-card p-5 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold">NEED HELP WITH YOUR VERIFICATION?</h2>
              <p className="text-xs text-blue-200 mt-0.5">
                Case ID: <strong className="font-mono text-white">#{activeCaseId.slice(0, 8)}</strong>
                {caseData && (
                  <span> • Risk Score: <strong>{caseData.risk_score?.toFixed(1) || 0}/100</strong> ({caseData.risk_category || "LOW"} RISK)</span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "chat" ? "bg-white text-blue-900 shadow" : "bg-blue-800 text-blue-100 hover:bg-blue-700"
                }`}
              >
                💬 Chat with DOCGUARD
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("request")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "request" ? "bg-amber-400 text-slate-950 shadow" : "bg-amber-500 text-slate-950 hover:bg-amber-400"
                }`}
              >
                📝 Raise a Request
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("requests_list")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "requests_list" ? "bg-white text-blue-900 shadow" : "bg-blue-800 text-blue-100 hover:bg-blue-700"
                }`}
              >
                📋 My Requests ({passengerRequests.length})
              </button>
            </div>
          </div>

          {/* MAIN TABBED WORKSPACE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Active Main Feature */}
            <div className="lg:col-span-2 space-y-4">
              {/* TAB 1: PASSENGER CHATBOT (AIRTEL-STYLE SUPPORT ASSISTANT) */}
              {activeTab === "chat" && (
                <PassengerChatbot
                  caseId={activeCaseId}
                  caseData={caseData}
                  onCaseRefresh={() => fetchCaseDetails(activeCaseId)}
                />
              )}

              {/* TAB 2: RAISE A VERIFICATION REQUEST */}
              {activeTab === "request" && (
                <div className="enterprise-card p-6 bg-white space-y-5 shadow-sm">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-wider">
                      RAISE A VERIFICATION REQUEST
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Submit a formal request to authorized border control officers regarding Case <strong className="font-mono text-slate-900">#{activeCaseId.slice(0, 8)}</strong>
                    </p>
                  </div>

                  {submittedRequest && (
                    <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-xs text-emerald-950">
                      <div className="flex items-center justify-between font-bold text-sm text-emerald-900">
                        <span>✓ REQUEST SUBMITTED</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-200 font-mono text-xs">{submittedRequest.id}</span>
                      </div>
                      <p>Your request has been sent to an authorized officer for evaluation.</p>
                      <p className="font-semibold">Status: <span className="uppercase">{submittedRequest.status}</span></p>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRequestDetails(submittedRequest);
                          setActiveTab("requests_list");
                        }}
                        className="btn-primary py-1.5 px-4 text-xs font-bold bg-emerald-700 hover:bg-emerald-800"
                      >
                        View Request Details →
                      </button>
                    </div>
                  )}

                  {formError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg font-medium">
                      ⚠️ {formError}
                    </div>
                  )}

                  <form onSubmit={handleSubmitRequest} className="space-y-4 text-xs">
                    <div>
                      <label className="field-label">Appeal / Request Reason</label>
                      <select
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                        className="field-input text-xs font-semibold"
                      >
                        <option value="Face verification appears incorrect">Face verification appears incorrect</option>
                        <option value="Document information is incorrect">Document information is incorrect</option>
                        <option value="Document was incorrectly flagged for tampering">Document was incorrectly flagged for tampering</option>
                        <option value="Cross-document mismatch is incorrect">Cross-document mismatch is incorrect</option>
                        <option value="I have a valid supporting document">I have a valid supporting document</option>
                        <option value="I want a manual re-verification">I want a manual re-verification</option>
                        <option value="I need an explanation of the result">I need an explanation of the result</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="field-label">Passenger Full Name</label>
                        <input
                          type="text"
                          required
                          value={passengerName}
                          onChange={(e) => setPassengerName(e.target.value)}
                          placeholder="e.g. Anand Mohan"
                          className="field-input text-xs"
                        />
                      </div>

                      <div>
                        <label className="field-label">Contact Email</label>
                        <input
                          type="email"
                          required
                          value={passengerEmail}
                          onChange={(e) => setPassengerEmail(e.target.value)}
                          placeholder="anand@example.com"
                          className="field-input text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="field-label">Subject / Short Summary</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Request review for face verification score"
                        className="field-input text-xs"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="field-label mb-0">Message / Concern Explanation</label>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {message.length} / 2000 chars
                        </span>
                      </div>
                      <textarea
                        required
                        minLength={10}
                        maxLength={2000}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Explain why you believe the verification result should be reviewed by an authorized officer (10 to 2000 characters)..."
                        rows={4}
                        className="field-input text-xs"
                      />
                    </div>

                    <div>
                      <label className="field-label">Optional Supporting Information</label>
                      <textarea
                        value={supportingInfo}
                        onChange={(e) => setSupportingInfo(e.target.value)}
                        placeholder="Additional context, flight number, or reference IDs..."
                        rows={2}
                        className="field-input text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full btn-primary py-3 text-xs font-bold shadow-md"
                    >
                      {submitting ? "Submitting Request to Officer Queue…" : "Submit Verification Request"}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: MY REQUESTS HISTORY */}
              {activeTab === "requests_list" && (
                <div className="enterprise-card p-5 bg-white space-y-4 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      MY REQUESTS HISTORY
                    </h3>
                    <span className="text-xs font-bold text-slate-500">
                      Total: {passengerRequests.length}
                    </span>
                  </div>

                  {passengerRequests.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 italic">
                      No requests submitted yet for Case #{activeCaseId.slice(0, 8)}.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {passengerRequests.map((req) => (
                        <div
                          key={req.id}
                          onClick={() => setSelectedRequestDetails(req)}
                          className="p-3.5 hover:bg-slate-50 cursor-pointer transition-colors space-y-1 rounded-lg border border-slate-100 mb-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-blue-900 text-xs">{req.id}</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                              req.status === "UNDER_REVIEW" ? "bg-blue-100 text-blue-800" :
                              req.status === "RESOLVED" ? "bg-emerald-100 text-emerald-800" :
                              "bg-rose-100 text-rose-800"
                            }`}>
                              {req.status}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800">{req.subject || req.request_type}</p>
                          <p className="text-[11px] text-slate-600 line-clamp-2">"{req.message}"</p>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                            <span>Created: {new Date(req.created_at).toLocaleString()}</span>
                            <span className="text-blue-800 font-bold hover:underline">View Request Details →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Status Summary & Request Details Modal */}
            <div className="space-y-4">
              {/* Summary Counter Card */}
              <div className="enterprise-card p-5 bg-white space-y-3 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Request Status Overview
                </h3>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-lg font-black text-amber-900 block">{pendingCount}</span>
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Pending</span>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <span className="text-lg font-black text-blue-900 block">{reviewCount}</span>
                    <span className="text-[10px] font-bold text-blue-800 uppercase">Under Review</span>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <span className="text-lg font-black text-emerald-900 block">{resolvedCount}</span>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Resolved</span>
                  </div>
                </div>
              </div>

              {/* Selected Request Details Drawer */}
              {selectedRequestDetails && (
                <div className="enterprise-card p-5 bg-white space-y-4 border-2 border-blue-200 shadow-md">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h4 className="font-black text-slate-900 text-xs">
                      REQUEST DETAILS — {selectedRequestDetails.id}
                    </h4>
                    <button
                      onClick={() => setSelectedRequestDetails(null)}
                      className="text-slate-400 hover:text-slate-700 font-bold text-sm"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Request Type</span>
                      <p className="font-bold text-slate-800">{selectedRequestDetails.request_type}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400">Passenger Message</span>
                      <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-800 font-medium">
                        "{selectedRequestDetails.message}"
                      </p>
                    </div>

                    {selectedRequestDetails.supporting_information && (
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Supporting Context</span>
                        <p className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700">
                          {selectedRequestDetails.supporting_information}
                        </p>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Officer Response</span>
                      <p className={`p-2.5 rounded border mt-1 font-semibold ${
                        selectedRequestDetails.officer_response ? "bg-blue-50 border-blue-200 text-blue-950" : "bg-slate-50 border-slate-200 text-slate-500 italic"
                      }`}>
                        {selectedRequestDetails.officer_response || "Pending review by authorized border officer."}
                      </p>
                    </div>

                    <div className="pt-1 text-[10px] text-slate-400 flex justify-between">
                      <span>Submitted: {new Date(selectedRequestDetails.created_at).toLocaleString()}</span>
                      <span>Updated: {new Date(selectedRequestDetails.updated_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
