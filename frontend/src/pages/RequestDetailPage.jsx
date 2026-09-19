import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton.jsx";
import {
  getPassengerRequest,
  getRequestMessages,
  addRequestMessage,
  uploadRequestAttachment,
  submitReverificationSelfie
} from "../api.js";
import CameraCapture from "../components/CameraCapture.jsx";

export default function RequestDetailPage() {
  const { request_id } = useParams();
  const navigate = useNavigate();

  const [req, setReq] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const [replyText, setReplyText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [sending, setSending] = useState(false);

  // Camera re-verification
  const [showCamera, setShowCamera] = useState(false);
  const [submittingCamera, setSubmittingCamera] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqRes, msgRes] = await Promise.all([
        getPassengerRequest(request_id),
        getRequestMessages(request_id).catch(() => ({ data: [] }))
      ]);
      setReq(reqRes.data);
      setMessages(msgRes.data || []);
    } catch (err) {
      console.warn("Could not load request details", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (request_id) loadData();
  }, [request_id]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith("image/")) {
        setFilePreviewUrl(URL.createObjectURL(file));
      } else {
        setFilePreviewUrl(null);
      }
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() && !selectedFile) return;

    setSending(true);
    try {
      if (replyText.trim()) {
        await addRequestMessage(request_id, replyText.trim(), "PASSENGER", "Passenger");
      }

      if (selectedFile) {
        await uploadRequestAttachment(request_id, selectedFile);
      }

      setReplyText("");
      setSelectedFile(null);
      setFilePreviewUrl(null);
      await loadData();
    } catch (err) {
      alert("Could not send reply.");
    } finally {
      setSending(false);
    }
  };

  const handleCameraCapture = async (blob) => {
    setSubmittingCamera(true);
    try {
      const file = new File([blob], "camera_selfie.png", { type: "image/png" });
      await submitReverificationSelfie(request_id, file);
      setShowCamera(false);
      await loadData();
    } catch (err) {
      alert("Camera submission failed. Please try again.");
    } finally {
      setSubmittingCamera(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-xs text-slate-500">
        Loading request details...
      </div>
    );
  }

  if (!req) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center space-y-4">
        <p className="text-xs text-slate-500">Request not found.</p>
        <button onClick={() => navigate("/passenger/requests")} className="btn-primary py-2 px-4 text-xs">
          Back to My Requests
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <BackButton to="/passenger/requests" label="Back to My Requests" />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              REQUEST DETAILS
              <span className="font-mono text-sm font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {req.request_id}
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Real-time communication thread attached to your screening case.
            </p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          req.status === "RESOLVED" ? "bg-emerald-100 text-emerald-900 border border-emerald-300" :
          req.status === "RE_VERIFICATION_REQUIRED" ? "bg-amber-100 text-amber-900 border border-amber-300" :
          "bg-blue-100 text-blue-900 border border-blue-300"
        }`}>
          {req.status.replace('_', ' ')}
        </span>
      </div>

      {/* Metadata Bar */}
      <div className="enterprise-card p-4 bg-white grid grid-cols-2 md:grid-cols-4 gap-4 text-xs rounded-xl border border-slate-200 shadow-sm">
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Request Type</span>
          <span className="font-bold text-slate-800">{req.request_type}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Screening Case</span>
          <span className="font-mono font-bold text-slate-800">#{req.case_id?.slice(0, 8)}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Created Date</span>
          <span className="font-medium text-slate-700">{new Date(req.created_at).toLocaleString()}</span>
        </div>
        <div>
          <span className="text-[10px] font-bold uppercase text-slate-400 block">Last Updated</span>
          <span className="font-medium text-slate-700">{new Date(req.updated_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Re-Verification Banner if action required */}
      {req.status === "RE_VERIFICATION_REQUIRED" && (
        <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-2xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
              <span>📸</span> SECONDARY CAMERA RE-VERIFICATION REQUIRED
            </h3>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-200 px-2.5 py-0.5 rounded-full">
              Officer Request
            </span>
          </div>

          <p className="text-xs text-amber-900 font-medium">
            The duty officer has requested a live selfie capture for secondary identity verification.
          </p>

          {!showCamera ? (
            <button
              onClick={() => setShowCamera(true)}
              className="btn-primary py-2.5 px-6 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow"
            >
              Open Camera for Re-Verification →
            </button>
          ) : (
            <div className="pt-2">
              <CameraCapture onCapture={handleCameraCapture} />
              {submittingCamera && (
                <p className="text-xs text-amber-900 font-bold mt-2 animate-pulse">
                  Submitting camera capture to officer queue...
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Conversation Thread */}
      <div className="enterprise-card p-6 bg-white space-y-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
          CONVERSATION THREAD
        </h3>

        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-700 font-medium">
              "{req.message}"
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender_type === "PASSENGER" ? "items-end" : "items-start"}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1 text-[10px] font-bold text-slate-400">
                  <span>{msg.sender_name || msg.sender_type}</span>
                  <span>•</span>
                  <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className={`max-w-[85%] p-4 rounded-2xl text-xs leading-relaxed ${
                  msg.sender_type === "PASSENGER"
                    ? "bg-blue-900 text-white rounded-br-none font-medium"
                    : msg.sender_type === "OFFICER"
                    ? "bg-amber-50 text-slate-900 border-2 border-amber-200 rounded-bl-none font-medium"
                    : "bg-slate-100 text-slate-900 border border-slate-200 rounded-bl-none"
                }`}>
                  <div className="whitespace-pre-wrap">{msg.message}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reply Box */}
        {req.status !== "RESOLVED" && req.status !== "REJECTED" && (
          <form onSubmit={handleSendReply} className="pt-4 border-t border-slate-100 space-y-3">
            <h4 className="text-xs font-bold text-slate-700">Reply to Officer</h4>

            {selectedFile && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-900 truncate">📄 {selectedFile.name}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedFile(null); setFilePreviewUrl(null); }}
                  className="text-rose-700 font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            )}

            <div className="flex gap-2">
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
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply to the officer..."
                className="flex-1 field-input py-2.5 text-xs rounded-xl"
              />

              <button
                type="submit"
                disabled={sending}
                className="btn-primary py-2.5 px-6 text-xs font-bold rounded-xl shadow"
              >
                {sending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
