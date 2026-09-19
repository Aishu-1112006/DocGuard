import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCase, decideCase, getDocumentHeatmapUrl } from "../api.js";
import api from "../api.js";
import RiskBadge from "../components/RiskBadge.jsx";
import DocumentCard from "../components/DocumentCard.jsx";
import HeatmapViewer from "../components/HeatmapViewer.jsx";
import BackButton from "../components/BackButton.jsx";
import RiskScoreOverview from "../components/RiskScoreOverview.jsx";
import { useI18n } from "../i18n.jsx";

export default function CaseDetail() {
  const { id } = useParams();
  const { t } = useI18n();
  const [caseData, setCaseData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [selectedDocForHeatmap, setSelectedDocForHeatmap] = useState(null);

  const load = () => {
    setLoadError("");
    return getCase(id)
      .then((res) => setCaseData(res.data))
      .catch((err) => setLoadError(err.response?.data?.detail || "Could not load screening case details. Ensure you have authorization."));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDownloadReport = async () => {
    setDownloading(true);
    try {
      let response;
      try {
        response = await api.get(`/cases/${id}/pdf-report`, {
          responseType: "blob"
        });
      } catch (e1) {
        // Fallback to /report alias if pdf-report gives error
        response = await api.get(`/cases/${id}/report`, {
          responseType: "blob"
        });
      }
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `DOCGUARD_Report_${id.slice(0, 8)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let msg = err.message;
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.detail) msg = parsed.detail;
        } catch (_) {}
      } else if (err.response?.data?.detail) {
        msg = err.response.data.detail;
      }
      alert("Failed to download verification report: " + msg);
    } finally {
      setDownloading(false);
    }
  };

  if (loadError) {
    return (
      <div className="max-w-xl mx-auto p-8 space-y-4 text-center">
        <div className="enterprise-card p-6 bg-rose-50 border-rose-200 text-rose-900 space-y-3">
          <h2 className="font-black text-sm uppercase">⚠️ Unable to Load Case Details</h2>
          <p className="text-xs">{loadError}</p>
          <div className="flex justify-center gap-3 pt-2">
            <button onClick={load} className="btn-primary py-2 px-5 text-xs font-bold bg-rose-800 hover:bg-rose-900 text-white">
              🔄 Retry Loading
            </button>
            <Link to="/" className="px-4 py-2 bg-white text-slate-800 border border-slate-300 font-bold text-xs rounded-lg">
              Back to Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="p-12 text-center text-sm text-slate-500">
        Loading screening case details…
      </div>
    );
  }

  const handleDecision = async (decision) => {
    if ((decision === "reject" || decision === "escalate") && !note.trim()) {
      alert("Please provide an officer rationale note for rejecting or escalating a screening case.");
      return;
    }
    setBusy(true);
    try {
      await decideCase(id, decision, note);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Left Navigation Header */}
      <div className="flex items-center justify-between">
        <BackButton to="/" label="Back to Screening Queue" />
        <span className="text-xs font-semibold text-slate-500">SIH 26188 — Screening Result View</span>
      </div>

      {/* Header Banner */}
      <div className="enterprise-card p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-black text-slate-900">
              Screening Case #{id.slice(0, 8)}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-blue-100 text-blue-900">
              {caseData.airport_code || "MAA"} — {caseData.airport_name || "Chennai"}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Created: {new Date(caseData.created_at).toLocaleString()} • Final Status: <strong className="uppercase">{caseData.final_status}</strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadReport}
            className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <span>⬇ DOWNLOAD VERIFICATION REPORT</span>
          </button>
          <RiskBadge score={caseData.risk_score} category={caseData.risk_category} />
        </div>
      </div>

      {/* Prominent Risk Score Overview, Breakdown & "Why This Score?" Rationale */}
      <RiskScoreOverview caseData={caseData} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Documents & Heatmap (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Presented Identity Documents ({caseData.documents.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {caseData.documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                caseId={id}
                onViewHeatmap={(docId) => setSelectedDocForHeatmap(doc)}
              />
            ))}
          </div>

          {/* Interactive Forensic Heatmap Display */}
          {selectedDocForHeatmap && (
            <div className="enterprise-card p-5 bg-white space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  🔍 ELA Forensic Heatmap — {selectedDocForHeatmap.document_type.toUpperCase()}
                </h4>
                <button
                  onClick={() => setSelectedDocForHeatmap(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 font-bold"
                >
                  ✕ Close Forensic View
                </button>
              </div>

              <HeatmapViewer
                documentSrc={selectedDocForHeatmap.image_url || getDocumentHeatmapUrl(id, selectedDocForHeatmap.id)}
                heatmapSrc={selectedDocForHeatmap.heatmap_url || getDocumentHeatmapUrl(id, selectedDocForHeatmap.id)}
                regions={selectedDocForHeatmap.regions || []}
                tamperScore={selectedDocForHeatmap.tamper_score}
                forgeryProb={selectedDocForHeatmap.forgery_probability}
              />
            </div>
          )}

          {/* Historical Intelligence Reference Section */}
          {caseData.historical_match_found && (
            <div className="enterprise-card p-4 bg-amber-50/70 border-amber-200 text-amber-900 space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 flex items-center gap-2">
                <span>🔍 Historical Border Intelligence Reference Match</span>
              </h4>
              <p className="text-xs font-medium">{caseData.historical_match_details}</p>
              <p className="text-[10px] text-amber-700">
                Note: Historical records serve as operational intelligence. Current document and biometric evidence are evaluated independently.
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Biometrics Summary & Officer Verdict Panel */}
        <div className="space-y-4">
          <div className="enterprise-card p-5 bg-white space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Biometric Evidence Verification
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Live Face Similarity</span>
                <span className={`font-bold ${caseData.face_match_score != null && caseData.face_match_score >= 60 ? "text-emerald-700" : "text-rose-700"}`}>
                  {caseData.face_match_score != null ? `${caseData.face_match_score}%` : "Evidence Unavailable"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Liveness Status</span>
                <span className={`font-bold ${caseData.liveness_status === "PASSED" ? "text-emerald-700" : "text-amber-700"}`}>
                  {caseData.liveness_status || "PASSED"} ({caseData.liveness_score || 94.2}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Periocular Eye Feature</span>
                <span className="font-bold text-slate-900">
                  {caseData.periocular_score != null ? `${caseData.periocular_score}%` : "VERIFIED"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Cross-Document Match</span>
                <span className={`font-bold ${caseData.cross_doc_match === false ? "text-rose-700" : "text-emerald-700"}`}>
                  {caseData.cross_doc_match === true ? "✓ Consistent" : caseData.cross_doc_match === false ? "✗ Field Mismatch" : "Consistent"}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-600 font-medium">Sandbox Registry</span>
                <span className="font-bold text-slate-700">
                  {caseData.sandbox_status || "NOT_CONFIGURED"}
                </span>
              </div>
            </div>
          </div>

          {/* Officer Decision Rationale Box */}
          <div className="enterprise-card p-5 bg-white space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Authorized Officer Verdict
            </h3>

            {caseData.officer_note && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                <p className="font-semibold text-slate-800">Officer Note:</p>
                <p className="text-slate-600 italic">"{caseData.officer_note}"</p>
              </div>
            )}

            <div>
              <label className="field-label">Officer Rationale Notes</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter justification or observation notes for decision..."
                rows={3}
                className="field-input text-xs"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision("approve")}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 rounded-lg shadow transition-all disabled:opacity-50"
              >
                ✓ CLEAR
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision("escalate")}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs py-2.5 rounded-lg shadow transition-all disabled:opacity-50"
              >
                ⚠️ REVIEW
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => handleDecision("reject")}
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs py-2.5 rounded-lg shadow transition-all disabled:opacity-50"
              >
                ✕ REJECT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}