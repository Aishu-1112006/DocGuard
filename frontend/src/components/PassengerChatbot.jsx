import { useState, useEffect, useRef } from "react";
import {
  askPassengerChatbot,
  submitPassengerRequest,
  getPassengerRequestsForCase,
  getRequestMessages,
  addRequestMessage,
  uploadRequestAttachment,
  submitReverificationSelfie
} from "../api.js";
import CameraCapture from "./CameraCapture.jsx";

export default function PassengerChatbot({ caseId, caseData, onCaseRefresh }) {
  const [messages, setMessages] = useState([
    {
      id: "init-1",
      sender_type: "CHATBOT",
      sender_name: "DOCGUARD Assistant",
      message: `Hello! I am your DOCGUARD AI Assistant for Case #${caseId ? caseId.slice(0, 8) : ""}. How can I help you with your verification today?`,
      quick_actions: ["Explain My Result", "Raise a Request", "Track My Request"],
      created_at: new Date().toISOString()
    }
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState(null);

  // Request flow state
  const [activeRequest, setActiveRequest] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [showReverifyCamera, setShowReverifyCamera] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showReverifyCamera]);

  // Load existing request & chat messages on mount/caseId change
  useEffect(() => {
    if (!caseId) return;
    loadCaseRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const loadCaseRequests = async () => {
    try {
      const res = await getPassengerRequestsForCase(caseId);
      const reqs = res.data || [];
      if (reqs.length > 0) {
        const latest = reqs[0];
        setActiveRequest(latest);
        // Load messages for latest request
        const msgRes = await getRequestMessages(latest.id);
        if (msgRes.data && msgRes.data.length > 0) {
          const loadedMsgs = msgRes.data.map((m) => ({
            id: m.id,
            sender_type: m.sender_type,
            sender_name: m.sender_name || m.sender_type,
            message: m.message,
            has_attachment: m.has_attachment,
            attachment_url: m.has_attachment
              ? `/passenger/requests/${latest.id}/messages/${m.id}/attachment`
              : null,
            created_at: m.created_at
          }));
          setMessages((prev) => [
            ...prev,
            {
              id: "notice-req",
              sender_type: "CHATBOT",
              sender_name: "DOCGUARD Assistant",
              message: `📋 **Existing Request Found:** ${latest.request_id} (${latest.status.replace("_", " ")})`,
              quick_actions: ["Track Request", "Ask Question"]
            },
            ...loadedMsgs
          ]);
        }
      }
    } catch {
      // ignore
    }
  };

  // Create attachment preview URL when file selected
  const handleAttachmentChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAttachmentFile(file);
      const url = URL.createObjectURL(file);
      setAttachmentPreviewUrl(url);
    }
  };

  const clearAttachment = () => {
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
    }
    setAttachmentFile(null);
    setAttachmentPreviewUrl(null);
  };

  const handleSendMessage = async (textToSend, customSender = "PASSENGER") => {
    const text = (textToSend || inputMessage).trim();
    if ((!text && !attachmentFile) || busy) return;

    setInputMessage("");
    setBusy(true);

    const newMsg = {
      id: "temp-" + Date.now(),
      sender_type: customSender,
      sender_name: customSender === "PASSENGER" ? "You" : "Assistant",
      message: text || "Uploaded file",
      attachment_preview: attachmentPreviewUrl,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, newMsg]);

    try {
      // If there's an active request and passenger is replying to thread
      if (activeRequest && customSender === "PASSENGER" && !pendingDraft) {
        // Send to request thread API
        const msgRes = await addRequestMessage(activeRequest.id, text, "PASSENGER", "Passenger");
        if (attachmentFile) {
          await uploadRequestAttachment(activeRequest.id, attachmentFile);
        }

        // If status was RE_VERIFICATION_REQUIRED, prompt camera trigger
        if (activeRequest.status === "RE_VERIFICATION_REQUIRED") {
          setShowReverifyCamera(true);
        }

        clearAttachment();
        setBusy(false);
        return;
      }

      // Call Chatbot AI Assistant API
      const response = await askPassengerChatbot(caseId, text, messages.map(m => ({ sender: m.sender_type.toLowerCase(), text: m.message })));
      const data = response.data;

      const botReply = {
        id: "bot-" + Date.now(),
        sender_type: "CHATBOT",
        sender_name: "DOCGUARD Assistant",
        message: data.answer,
        quick_actions: data.quick_actions,
        request_draft: data.request_draft,
        created_at: new Date().toISOString()
      };

      if (data.request_draft) {
        setPendingDraft(data.request_draft);
      }

      setMessages((prev) => [...prev, botReply]);
      clearAttachment();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          sender_type: "CHATBOT",
          sender_name: "DOCGUARD Assistant",
          message: "I am having trouble connecting to the verification server. Please verify your Case ID.",
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickActionClick = (actionText) => {
    if (actionText === "Submit Request") {
      confirmSubmitRequest();
    } else if (actionText === "Edit Message") {
      setMessages((prev) => [
        ...prev,
        {
          id: "edit-" + Date.now(),
          sender_type: "CHATBOT",
          sender_name: "DOCGUARD Assistant",
          message: "Please type your updated message in the box below.",
          created_at: new Date().toISOString()
        }
      ]);
      setPendingDraft(null);
    } else if (actionText === "Cancel") {
      setPendingDraft(null);
      setMessages((prev) => [
        ...prev,
        {
          id: "cancel-" + Date.now(),
          sender_type: "CHATBOT",
          sender_name: "DOCGUARD Assistant",
          message: "Request creation cancelled. How else can I assist you?",
          quick_actions: ["Explain My Result", "Raise a Request", "Track My Request"],
          created_at: new Date().toISOString()
        }
      ]);
    } else if (actionText === "Track Request" || actionText === "Track My Request") {
      handleSendMessage("Track My Request");
    } else {
      handleSendMessage(actionText);
    }
  };

  const confirmSubmitRequest = async () => {
    if (!pendingDraft || busy) return;
    setBusy(true);

    try {
      const initialMsgs = messages.slice(-4).map((m) => ({
        sender_type: m.sender_type,
        sender_name: m.sender_name,
        message: m.message
      }));

      const res = await submitPassengerRequest(caseId, {
        request_type: pendingDraft.request_type || "RE_VERIFICATION",
        subject: `Request for ${pendingDraft.request_type}`,
        message: pendingDraft.message || "Passenger review request",
        conversation_summary: pendingDraft.conversation_summary || pendingDraft.message,
        passenger_name: caseData?.extracted_name || "Screening Passenger",
        initial_messages: initialMsgs
      });

      const reqData = res.data;
      setActiveRequest(reqData);
      setPendingDraft(null);

      const confirmBotMsg = {
        id: "confirm-" + Date.now(),
        sender_type: "CHATBOT",
        sender_name: "DOCGUARD Assistant",
        message: `Your request has been submitted successfully.\n\nRequest ID: **${reqData.request_id}**\nStatus: **${reqData.status.replace("_", " ")}**\n\nThe verification officer will review your case and verification evidence.`,
        request_card: reqData,
        quick_actions: ["Track Request", "Back to Chat"],
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, confirmBotMsg]);

      if (onCaseRefresh) onCaseRefresh();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: "err-sub-" + Date.now(),
          sender_type: "CHATBOT",
          sender_name: "DOCGUARD Assistant",
          message: "Failed to submit request: " + (err.response?.data?.detail || err.message),
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  // Re-verification live camera capture handler
  const handleReverifyCaptured = async (blob) => {
    if (!activeRequest || busy) return;
    setBusy(true);

    try {
      const file = new File([blob], "reverify_selfie.jpg", { type: "image/jpeg" });
      const res = await submitReverificationSelfie(activeRequest.id, file);

      setShowReverifyCamera(false);
      setMessages((prev) => [
        ...prev,
        {
          id: "rev-done-" + Date.now(),
          sender_type: "CHATBOT",
          sender_name: "DOCGUARD Assistant",
          message: `✓ **Re-Verification Frame Captured!**\nLive Face Similarity: ${res.data.face_match_score?.toFixed(1)}% • Status: ${res.data.liveness_status}\n\nYour fresh re-verification evidence has been forwarded to the duty officer.`,
          created_at: new Date().toISOString()
        }
      ]);

      if (onCaseRefresh) onCaseRefresh();
    } catch (err) {
      alert("Failed to submit re-verification selfie: " + (err.response?.data?.detail || err.message));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="enterprise-card bg-white border border-slate-200 rounded-2xl shadow-xl flex flex-col h-[640px] overflow-hidden">
      {/* Airtel-Style Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-4 text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-black shadow-md border-2 border-white/20">
              🤖
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-blue-900 rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm tracking-wide">DOCGUARD ASSISTANT</h3>
              <span className="text-[10px] bg-blue-700/60 text-blue-100 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Support
              </span>
            </div>
            <p className="text-xs text-blue-200">
              Case Ref: #{caseId ? caseId.slice(0, 8) : "N/A"} • AI Screening Assistant
            </p>
          </div>
        </div>

        {activeRequest && (
          <div className="text-right">
            <span className="text-[11px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full font-bold border border-emerald-500/30">
              {activeRequest.request_id} ({activeRequest.status.replace("_", " ")})
            </span>
          </div>
        )}
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/70">
        {messages.map((m) => {
          const isUser = m.sender_type === "PASSENGER";
          const isOfficer = m.sender_type === "OFFICER";

          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
            >
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-500 font-semibold">
                <span>{isUser ? "You" : isOfficer ? `👮 ${m.sender_name}` : "🤖 DOCGUARD Assistant"}</span>
                <span>•</span>
                <span>{m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
              </div>

              {/* Chat Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                  isUser
                    ? "bg-blue-900 text-white rounded-br-none"
                    : isOfficer
                    ? "bg-amber-50 border-2 border-amber-300 text-amber-950 rounded-bl-none font-medium"
                    : "bg-white border border-slate-200 text-slate-900 rounded-bl-none"
                }`}
              >
                {/* Instant Local Image Preview */}
                {m.attachment_preview && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-white/20">
                    <img
                      src={m.attachment_preview}
                      alt="Uploaded attachment preview"
                      className="max-h-48 w-full object-contain bg-black/20"
                    />
                  </div>
                )}

                {/* Streamed Image Attachment */}
                {m.attachment_url && (
                  <div className="mb-2 rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                    <img
                      src={m.attachment_url}
                      alt="Message Attachment"
                      className="max-h-48 w-full object-contain"
                    />
                  </div>
                )}

                {/* Message Text */}
                <div className="whitespace-pre-wrap">{m.message}</div>

                {/* Embedded Request Status Card */}
                {m.request_card && (
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-950 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-emerald-900">REQUEST CREATED</span>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-700 text-white rounded">
                        {m.request_card.request_id}
                      </span>
                    </div>
                    <p className="text-xs font-semibold">
                      Type: <strong>{m.request_card.request_type}</strong> • Status: <strong>{m.request_card.status.replace("_", " ")}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Action Pills */}
              {m.quick_actions && m.quick_actions.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1 pl-1 max-w-[85%]">
                  {m.quick_actions.map((act, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleQuickActionClick(act)}
                      className="px-3 py-1 bg-white hover:bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold rounded-full shadow-sm transition-all hover:border-blue-400 active:scale-95"
                    >
                      {act}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Live Re-Verification Camera Box in Chat */}
        {showReverifyCamera && (
          <div className="enterprise-card p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                <span>📸</span> Officer Requested Fresh Live Camera Verification
              </h4>
              <button
                onClick={() => setShowReverifyCamera(false)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800"
              >
                ✕ Cancel
              </button>
            </div>
            <p className="text-xs text-amber-800">
              Please position your face clearly in the camera frame below to perform live re-verification.
            </p>
            <CameraCapture
              onFrameCaptured={handleReverifyCaptured}
              onRetake={() => {}}
            />
          </div>
        )}

        {busy && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <span className="animate-spin text-blue-700">⌛</span> DOCGUARD Assistant is thinking…
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview Box above Composer */}
      {attachmentPreviewUrl && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={attachmentPreviewUrl}
              alt="Attachment preview thumbnail"
              className="w-10 h-10 object-cover rounded border border-blue-300 shadow-sm"
            />
            <div>
              <p className="text-xs font-bold text-slate-800 truncate max-w-[200px]">
                {attachmentFile?.name}
              </p>
              <p className="text-[10px] text-slate-500">
                {(attachmentFile?.size / 1024).toFixed(1)} KB • Image Attachment Ready
              </p>
            </div>
          </div>
          <button
            onClick={clearAttachment}
            className="text-xs font-bold text-red-600 hover:text-red-800 px-2 py-1 bg-white border border-red-200 rounded shadow-sm"
          >
            ✕ Remove
          </button>
        </div>
      )}

      {/* Chat Message Input Composer */}
      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
        <label className="cursor-pointer p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-300" title="Attach image / document preview">
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleAttachmentChange}
            className="hidden"
          />
          <span className="text-sm">📎</span>
        </label>

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask a question or describe your issue…"
          disabled={busy}
          className="flex-1 px-4 py-2.5 bg-slate-100 focus:bg-white text-xs text-slate-900 border border-slate-300 focus:border-blue-900 rounded-xl focus:outline-none transition-all"
        />

        <button
          type="submit"
          disabled={busy || (!inputMessage.trim() && !attachmentFile)}
          className="px-5 py-2.5 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-1"
        >
          <span>Send</span>
          <span>➔</span>
        </button>
      </form>
    </div>
  );
}
