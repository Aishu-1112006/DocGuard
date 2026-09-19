import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import {
  askPassengerAssistant,
  createDirectPassengerRequest,
  uploadRequestAttachment,
  listCases
} from "../api.js";

export default function PassengerAssistantPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCaseId = searchParams.get("case_id") || "";
  const initialAction = searchParams.get("action") || "";

  const [caseId, setCaseId] = useState(initialCaseId);
  const [availableCases, setAvailableCases] = useState([]);
  const [messages, setMessages] = useState([
    {
      id: "m1",
      sender: "CHATBOT",
      text: "🤖 Hello! I can help you with your verification. You can ask me about your result or raise a request for officer review.",
      quickActions: ["Explain My Result", "Raise a Request", "Track My Request", "Request Re-verification", "Help"]
    }
  ]);

  const [inputText, setInputText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);

  // Request drafting state inside chatbot
  const [inRequestFlow, setInRequestFlow] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState("");
  const [requestDraft, setRequestDraft] = useState(null); // { type, message, caseId }
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load available screening cases for passenger selection
    async function loadCases() {
      try {
        const res = await listCases();
        if (res.data && res.data.length > 0) {
          setAvailableCases(res.data);
          if (!caseId) {
            setCaseId(res.data[0].id);
          }
        }
      } catch (err) {
        console.warn("Could not load cases list", err);
      }
    }
    loadCases();
  }, []);

  useEffect(() => {
    if (initialAction === "raise_request") {
      startRaiseRequestFlow();
    }
  }, [initialAction]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, requestDraft, submittedRequest]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        const previewUrl = URL.createObjectURL(file);
        setFilePreviewUrl(previewUrl);
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleRemoveFile = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
  };

  const startRaiseRequestFlow = () => {
    setInRequestFlow(true);
    const botMsg = {
      id: `m_${Date.now()}`,
      sender: "CHATBOT",
      text: "Sure! I can help you raise a request for your verification case. What do you need help with?",
      issueOptions: [
        { label: "My document was flagged", type: "DOCUMENT_FLAG" },
        { label: "Face verification issue", type: "FACE_VERIFICATION" },
        { label: "Identity mismatch", type: "IDENTITY_MISMATCH" },
        { label: "Verification delayed", type: "VERIFICATION_DELAY" },
        { label: "Request re-verification", type: "RE_VERIFICATION" },
        { label: "Other issue", type: "OTHER" }
      ]
    };
    setMessages((prev) => [...prev, botMsg]);
  };

  const handleIssueSelect = (option) => {
    setSelectedIssueType(option.type);
    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "PASSENGER",
      text: option.label
    };
    const botPrompt = {
      id: `b_${Date.now()}`,
      sender: "CHATBOT",
      text: `Please describe what happened regarding your ${option.label.toLowerCase()}.`
    };
    setMessages((prev) => [...prev, userMsg, botPrompt]);
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() && !selectedFile) return;

    const currentText = inputText.trim();
    setInputText("");

    const userMsg = {
      id: `u_${Date.now()}`,
      sender: "PASSENGER",
      text: currentText,
      filePreview: filePreviewUrl,
      fileName: selectedFile?.name
    };
    setMessages((prev) => [...prev, userMsg]);

    // If currently in request creation flow, create request draft card
    if (inRequestFlow || selectedIssueType) {
      const draft = {
        request_type: selectedIssueType || "DOCUMENT_FLAG",
        message: currentText || "Passenger submitted attachment for verification review.",
        case_id: caseId || "GENERAL",
        attachment: selectedFile
      };
      setRequestDraft(draft);

      const botConfirm = {
        id: `b_${Date.now()}`,
        sender: "CHATBOT",
        text: "I understand your request. Here is the summary before sending to the duty officer:"
      };
      setMessages((prev) => [...prev, botConfirm]);
      return;
    }

    // Normal assistant chat query
    try {
      const targetCase = caseId || (availableCases.length > 0 ? availableCases[0].id : "GENERAL");
      const res = await askPassengerAssistant(targetCase, currentText);
      const botReply = {
        id: `b_${Date.now()}`,
        sender: "CHATBOT",
        text: res.data.answer,
        quickActions: res.data.quick_actions
      };
      setMessages((prev) => [...prev, botReply]);

      if (res.data.request_draft) {
        setRequestDraft({
          request_type: res.data.request_draft.request_type,
          message: res.data.request_draft.message,
          case_id: targetCase
        });
      }
    } catch (err) {
      const botErr = {
        id: `b_err_${Date.now()}`,
        sender: "CHATBOT",
        text: "I am ready to help. You can select an option below or raise a review request directly."
      };
      setMessages((prev) => [...prev, botErr]);
    }
  };

  const handleQuickActionClick = (action) => {
    if (action === "Raise a Request" || action === "Request Re-verification") {
      startRaiseRequestFlow();
    } else if (action === "Track My Request") {
      navigate("/passenger/requests");
    } else {
      setInputText(action);
    }
  };

  const handleConfirmSubmitRequest = async () => {
    if (!requestDraft) return;
    setSubmittingRequest(true);

    try {
      const res = await createDirectPassengerRequest({
        case_id: requestDraft.case_id,
        request_type: requestDraft.request_type,
        subject: `${requestDraft.request_type.replace('_', ' ')} Issue`,
        message: requestDraft.message,
        passenger_name: "Passport Holder",
        passenger_email: "passenger@docguard.gov"
      });

      const newReq = res.data;

      // Upload attachment if present
      if (selectedFile) {
        try {
          await uploadRequestAttachment(newReq.id, selectedFile);
        } catch (attErr) {
          console.warn("Attachment upload warning:", attErr);
        }
      }

      setSubmittedRequest(newReq);
      setRequestDraft(null);
      handleRemoveFile();

      const botSuccess = {
        id: `b_succ_${Date.now()}`,
        sender: "CHATBOT",
        text: "Your request has been submitted successfully."
      };
      setMessages((prev) => [...prev, botSuccess]);
    } catch (err) {
      alert("Could not submit request. Please try again.");
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <BackButton to="/passenger" label="Back" />
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>🤖</span> DOCGUARD Assistant
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              How can we help you with your verification?
            </p>
          </div>
        </div>

        {/* Case selector dropdown if multiple */}
        {availableCases.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-semibold">Case:</span>
            <select
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              className="field-input py-1 px-2.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
            >
              {availableCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.passenger_name || `Case #${c.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Chat Container */}
      <div className="enterprise-card p-6 bg-white flex flex-col min-h-[520px] shadow-sm rounded-2xl border border-slate-200">
        {/* Chat Thread */}
        <div className="flex-1 space-y-4 overflow-y-auto mb-4 pr-1">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.sender === "PASSENGER" ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-1.5 mb-1 px-1">
                <span className="text-[10px] font-bold text-slate-400">
                  {m.sender === "PASSENGER" ? "You" : "DOCGUARD Assistant"}
                </span>
              </div>

              <div
                className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  m.sender === "PASSENGER"
                    ? "bg-blue-900 text-white rounded-br-none font-medium"
                    : "bg-slate-100 text-slate-900 border border-slate-200/80 rounded-bl-none"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Instant image preview thumbnail in chat message */}
                {m.filePreview && (
                  <div className="mt-3 p-2 bg-white/10 rounded-xl border border-white/20">
                    <img
                      src={m.filePreview}
                      alt="Attachment Preview"
                      className="max-h-48 w-auto rounded-lg object-cover"
                    />
                    <span className="text-[10px] mt-1 block opacity-80 font-mono truncate">{m.fileName}</span>
                  </div>
                )}

                {/* Quick Action Pills */}
                {m.quickActions && m.quickActions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-slate-200/60">
                    {m.quickActions.map((action, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickActionClick(action)}
                        className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-white text-blue-900 border border-blue-200 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        {action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Issue Selection Options */}
                {m.issueOptions && m.issueOptions.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-slate-200/60">
                    {m.issueOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleIssueSelect(opt)}
                        className="p-2.5 rounded-xl text-left text-[11px] font-bold bg-white text-slate-800 border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm"
                      >
                        • {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* REQUEST SUMMARY CONFIRMATION CARD INSIDE CHATBOT */}
          {requestDraft && (
            <div className="p-5 bg-amber-50/90 border-2 border-amber-300 rounded-2xl shadow-md space-y-3 my-4">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>📋</span> REQUEST SUMMARY
                </h3>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2 py-0.5 rounded-full">
                  Draft Confirmation
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Request Type</span>
                  <span className="font-bold text-slate-900">{requestDraft.request_type.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block">Screening Case</span>
                  <span className="font-mono font-bold text-slate-900">#{requestDraft.case_id.slice(0, 8)}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Your Message</span>
                <p className="bg-white p-2.5 rounded-xl border border-amber-200 text-slate-900 font-medium text-xs mt-0.5">
                  "{requestDraft.message}"
                </p>
              </div>

              {selectedFile && (
                <div>
                  <span className="text-[10px] font-bold uppercase text-amber-800 block mb-1">Attachment</span>
                  {filePreviewUrl ? (
                    <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-amber-200">
                      <img src={filePreviewUrl} alt="Preview" className="h-12 w-12 rounded object-cover border" />
                      <span className="text-xs font-mono font-semibold text-slate-700 truncate">{selectedFile.name}</span>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-lg border border-amber-200 block">
                      📄 {selectedFile.name}
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleConfirmSubmitRequest}
                  disabled={submittingRequest}
                  className="flex-1 btn-primary py-2.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow"
                >
                  {submittingRequest ? "Submitting..." : "Submit Request"}
                </button>
                <button
                  type="button"
                  onClick={() => setRequestDraft(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100"
                >
                  Go Back
                </button>
              </div>
            </div>
          )}

          {/* SUBMITTED REQUEST CARD INSIDE CHATBOT */}
          {submittedRequest && (
            <div className="p-5 bg-emerald-50 border-2 border-emerald-300 rounded-2xl shadow-md space-y-3 my-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                  <span>✓</span> REQUEST SUBMITTED
                </h3>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-200 px-2.5 py-0.5 rounded-full">
                  Real Database Record
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Request ID</span>
                  <span className="font-mono font-black text-emerald-950 text-sm">{submittedRequest.request_id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-emerald-800 block">Status</span>
                  <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                    PENDING OFFICER REVIEW
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-emerald-900">
                <span>Submitted: </span>
                <strong className="font-semibold">{new Date(submittedRequest.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/passenger/requests/${submittedRequest.id}`)}
                className="w-full btn-primary py-2.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 shadow"
              >
                Track Request →
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Instant Upload Preview Bar */}
        {selectedFile && (
          <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 overflow-hidden">
              {filePreviewUrl ? (
                <img src={filePreviewUrl} alt="Upload preview" className="h-12 w-12 rounded object-cover border border-blue-300" />
              ) : (
                <span className="text-xl">📄</span>
              )}
              <div className="truncate">
                <span className="font-bold text-blue-950 block truncate">{selectedFile.name}</span>
                <span className="text-[10px] text-blue-700">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemoveFile}
              className="px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 rounded-lg transition-all"
            >
              Remove
            </button>
          </div>
        )}

        {/* Input Controls */}
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <label className="p-2.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-xl cursor-pointer transition-all border border-slate-200 bg-white">
            <span className="text-base">📎</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 field-input py-3 text-xs rounded-xl border border-slate-300"
          />

          <button
            type="submit"
            className="btn-primary py-3 px-6 text-xs font-bold rounded-xl shadow"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
